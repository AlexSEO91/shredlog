// @ts-nocheck — le calcul (data.js, stock.js, notify.js) est du JS partagé avec l'app, embarqué tel quel.
// Edge Function shredlog-notify (projet Shredlog zucsemhdglkuifqvhusi).
//
// Appels :
//  - pg_cron (4 passages, voir supabase/notifications.sql) : POST {mode: morning|evening|neck|weekly} + en-tête x-cron-secret
//  - l'app, avec le jeton de l'utilisateur connecté : POST {mode: catchup|test}
// Secret à définir dans Edge Functions → Secrets : VAPID_PRIVATE_KEY.
// Le secret cron est lu dans Vault (fonction public.shredlog_cron_secret), rien à copier.
// À déployer avec « Verify JWT » désactivé : la fonction vérifie elle-même le secret cron ou le jeton.
//
// Source : supabase/functions/shredlog-notify/. Fichier à coller dans le dashboard : supabase/deploy/shredlog-notify.ts
// (généré par tools/build_edge.sh, qui remplace le marqueur ci-dessous par data.js + stock.js + notify.js).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const window = globalThis;
// @@EMBED@@

const D = globalThis.SHRED_DATA, S = globalThis.ShredStock, N = globalThis.ShredNotify;
const VAPID_PUBLIC_KEY = "BO67--Fy4TjmV936flvXOAOwJv2eO4tqsHZDygQmeTtGUtSRfHtC2mHmLAcKRWpzIU1E84H8mCwIUqULEOQf5eg";
const VAPID_SUBJECT = "https://alexseo91.github.io/shredlog/";
const CRON_MODES = ["morning", "evening", "neck", "weekly"];
const USER_MODES = ["catchup", "test"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const errorMessage = (e) => (e && e.message) || String(e);

// Bangkok = UTC+7 toute l'année (pas d'heure d'été).
const bangkokToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

function sameSecret(given, expected) {
  if (!expected || !given || given.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function loadDocs(db, uid, today) {
  const q = (build) => build(db.from("docs").select("path,data").eq("user_id", uid)).then(({ data, error }) => { if (error) throw error; return data || []; });
  const base = await q((x) => x.in("collection", ["stock", "supplements", "nutrition", "program"]));
  const docs = Object.fromEntries(base.map((r) => [r.path, r.data]));
  const from = N.since(docs, D) || today;
  const logs = await Promise.all([
    q((x) => x.eq("collection", "supplementLogs").gte("path", "supplementLogs/" + from)),
    q((x) => x.eq("collection", "nutritionLogs").gte("path", "nutritionLogs/" + from)),
    q((x) => x.eq("collection", "sessions").like("path", `sessions/${today}%`)),
    q((x) => x.eq("path", "measurements/" + today)),
  ]);
  logs.flat().forEach((r) => (docs[r.path] = r.data));
  return docs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const db = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode;
    let users;
    if (CRON_MODES.includes(mode)) {
      const { data: secret, error } = await db.rpc("shredlog_cron_secret");
      if (error) throw error;
      if (!sameSecret(req.headers.get("x-cron-secret") || "", secret)) return json({ error: "Unauthorized" }, 401);
      const { data, error: se } = await db.from("shredlog_push_subscriptions").select("user_id");
      if (se) throw se;
      users = [...new Set((data || []).map((r) => r.user_id))];
    } else if (USER_MODES.includes(mode)) {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data, error } = await db.auth.getUser(jwt);
      if (error || !data || !data.user) return json({ error: "Unauthorized" }, 401);
      users = [data.user.id];
    } else return json({ error: "mode inconnu" }, 400);

    const priv = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!priv) throw new Error("Secret VAPID_PRIVATE_KEY manquant (Edge Functions → Secrets).");
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, priv);

    const today = bangkokToday();
    const report = [];
    for (const uid of users) {
      const { data: subs, error: se } = await db.from("shredlog_push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", uid);
      if (se) throw se;
      if (!subs || !subs.length) { report.push({ sent: 0, skipped: ["aucun appareil abonné"] }); continue; }
      const { data: logRows, error: le } = await db.from("shredlog_notification_log").select("key, last_sent").eq("user_id", uid);
      if (le) throw le;
      const logs = Object.fromEntries((logRows || []).map((r) => [r.key, r.last_sent]));
      const docs = await loadDocs(db, uid, today);
      const out = N.plan({ mode, today, docs, logs, D, S });

      let sent = 0; const errors = [];
      for (const m of out.messages) {
        for (const s of subs) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m), { TTL: 86400, urgency: "normal" });
            sent++;
            await db.from("shredlog_push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
          } catch (e) {
            const status = e && e.statusCode;
            // Abonnement expiré ou révoqué (app supprimée, autorisation retirée) : on l'oublie.
            if (status === 404 || status === 410) await db.from("shredlog_push_subscriptions").delete().eq("id", s.id);
            else errors.push(`${status || ""} ${errorMessage(e)}`.trim());
          }
        }
      }
      // Le journal n'avance que si au moins une notification est partie : sinon le passage suivant réessaie.
      if (sent && out.logKeys.length) {
        const { error: ue } = await db.from("shredlog_notification_log").upsert(out.logKeys.map((key) => ({ user_id: uid, key, last_sent: today })), { onConflict: "user_id,key" });
        if (ue) throw ue;
      }
      report.push({ sent, messages: out.messages.map((m) => m.title), skipped: out.skipped, errors });
    }
    return json({ mode, today, report });
  } catch (e) {
    return json({ error: errorMessage(e) }, 500);
  }
});
