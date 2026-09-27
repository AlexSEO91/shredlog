/* Shredlog — décide quelles notifications envoyer (logique pure, sans réseau).
   Embarqué dans l'Edge Function shredlog-notify et testé par tools/check_notify.js.

   plan({ mode, today, docs, logs, D, S }) → { messages[{title, body, url, tag}], logKeys[], skipped[] }
   - today : date du jour à Bangkok (YYYY-MM-DD) ; docs : { "collection/id": data } comme dans l'app
   - logs : { clé: "YYYY-MM-DD" du dernier envoi } ; D = SHRED_DATA ; S = ShredStock
   Modes : morning (stock + cycles, 08:00), evening (séance non enregistrée, 20:30),
           neck (bloc cou du mercredi, 07:30), weekly (mensurations + recomptage mensuel, dimanche 21:00),
           catchup (rattrapage stock à l'abonnement), test. */
(function (root) {
  "use strict";
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmt = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };
  const weekdayOf = (iso) => new Date(iso + "T00:00:00Z").getUTCDay(); // 0 = dimanche
  const REMIND_EVERY = 3; // jours entre deux rappels de stock tant que rien n'est commandé
  const NECK = (d) => d.kind === "neck"; // contrat avec le chantier 4 : le bloc cou est un jour { kind: "neck" }

  function context(docs, D, S) {
    const get = (p) => docs[p] || null;
    const list = (c) => Object.keys(docs).filter((k) => k.startsWith(c + "/")).map((k) => ({ id: k.slice(c.length + 1), data: docs[k] }));
    const plan = get("supplements/plan") || D.SUPPLEMENTS;
    const def = Object.fromEntries(D.SUPPLEMENTS.items.map((i) => [i.id, i]));
    const cycleOf = (id) => { const i = plan.items.find((x) => x.id === id); return i && i.cycleStart ? i : def[id] || null; };
    const ctx = { supLog: (d) => get("supplementLogs/" + d), nutLog: (d) => get("nutritionLogs/" + d), nutPlan: get("nutrition/plan") || D.NUTRITION, cycleOf };
    const ids = new Set(D.STOCK.map((l) => l.id));
    const lines = D.STOCK.map((l) => ({ ...l, ...(get("stock/" + l.id) || {}) })).concat(list("stock").filter((x) => !ids.has(x.id)).map((x) => x.data));
    return { get, list, plan, def, ctx, lines, cycleOf };
  }

  // Date du plus ancien comptage : les journaux de prises à charger commencent là.
  function since(docs, D) {
    const ds = D.STOCK.map((l) => (docs["stock/" + l.id] || l).lastCountedAt).concat(Object.keys(docs).filter((k) => k.startsWith("stock/")).map((k) => docs[k].lastCountedAt)).filter(Boolean).sort();
    return ds[0] || null;
  }

  // Une notification = une commande groupée : les ancres (seuil atteint) puis les ajouts (seuil dans les 7 jours).
  function stockMessage(g, today, catchup) {
    const n = g.anchors.length + g.extras.length;
    const anchor = ({ line: l, st }) => `${l.name} — ${st.daysLeft === 0 ? "en rupture" : "seuil atteint, rupture " + (st.rupture ? fmt(st.rupture) : "?")}${st.ordered ? " (commandé)" : ""}`;
    const extra = ({ line: l, st }) => `${l.name} — à ajouter à la commande (seuil ${st.alertDate === addDays1(today) ? "demain" : "le " + fmt(st.alertDate)})`;
    return {
      title: `${catchup ? "Stock : commande groupée" : "À commander"} — ${n} complément${n > 1 ? "s" : ""}`,
      body: g.anchors.map(anchor).concat(g.extras.map(extra)).join("\n"),
      url: "#stock", tag: "stock",
    };
  }
  const addDays1 = (iso) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

  function cycleEvents(c, today, S) {
    const seen = new Set(); const out = [];
    const items = c.plan.items.concat(Object.values(c.def));
    items.forEach((raw) => {
      if (seen.has(raw.id)) return; seen.add(raw.id);
      const it = c.cycleOf(raw.id); if (!it || !it.cycleEnabled) return;
      const on = (d) => S.isOn(it, d); const t = today; const add = S.addDays;
      if (on(add(t, 3)) && !on(add(t, 4))) out.push({ id: it.id, name: it.name, type: "stop-3", text: `arrêt dans 3 jours (${fmt(add(t, 3))})` });
      if (!on(t) && on(add(t, -1))) out.push({ id: it.id, name: it.name, type: "off", text: "phase OFF à partir d'aujourd'hui" });
      if (!on(t) && on(add(t, 1))) out.push({ id: it.id, name: it.name, type: "resume-1", text: "reprise demain" });
      if (on(t) && !on(add(t, -1))) out.push({ id: it.id, name: it.name, type: "resume", text: "reprise aujourd'hui" });
    });
    return out;
  }

  function plan({ mode, today, docs, logs, D, S }) {
    const c = context(docs, D, S); const wd = weekdayOf(today);
    const messages = []; const logKeys = []; const skipped = [];
    const once = (key, build) => { if (logs[key]) { skipped.push(`${key} : déjà envoyé`); return; } const m = build(); if (m) { messages.push(m); logKeys.push(key); } };
    const stockRows = () => c.lines.map((line) => ({ line, st: S.status(line, today, c.ctx) }));
    const program = c.get("program/current"); const days = (program && program.days) || [];
    const doneToday = (dayId) => c.list("sessions").some((x) => x.data.date === today && x.data.dayId === dayId && x.data.status === "done");

    if (mode === "test") messages.push({ title: "Test Shredlog", body: "Les notifications fonctionnent sur cet appareil.", url: "#settings", tag: "test" });

    else if (mode === "catchup") {
      // Rattrapage : tout ce qui est en zone rouge, même déjà commandé (signalé « commandé »), + les ajouts à 7 jours.
      const g = S.orderGroup(stockRows(), today, true);
      if (g.anchors.length) { messages.push(stockMessage(g, today, true)); g.anchors.concat(g.extras).filter((x) => !x.st.ordered).forEach((x) => logKeys.push("stock:" + x.line.id)); }
      else skipped.push("stock : rien en alerte");
    }

    else if (mode === "morning") {
      // Stock : dès que aujourd'hui >= seuil, puis tous les 3 jours tant que rien n'est marqué « recommandé ».
      // Un item inclus dans un regroupement est journalisé ce jour-là : l'arrivée de son propre seuil ne
      // déclenche donc rien de plus ; il suit ensuite le rappel tous les 3 jours avec le groupe.
      const g = S.orderGroup(stockRows(), today, false);
      const due = g.anchors.some((x) => !logs["stock:" + x.line.id] || S.diffDays(logs["stock:" + x.line.id], today) >= REMIND_EVERY);
      if (due) { messages.push(stockMessage(g, today, false)); g.anchors.concat(g.extras).forEach((x) => logKeys.push("stock:" + x.line.id)); }
      else skipped.push(g.anchors.length ? "stock : déjà notifié il y a moins de 3 jours (seul ou dans un regroupement)" : "stock : rien à commander");
      // Cycles : J-3 avant l'arrêt, jour de l'arrêt, veille de reprise, jour de reprise (regroupés par message identique).
      const evs = cycleEvents(c, today, S).filter((e) => { const k = `cycle:${e.id}:${e.type}:${today}`; if (logs[k]) { skipped.push(k + " : déjà envoyé"); return false; } return true; });
      if (evs.length) {
        const groups = {}; evs.forEach((e) => { (groups[e.text] = groups[e.text] || []).push(e.name); });
        messages.push({ title: "Cycles de compléments", body: Object.entries(groups).map(([t, names]) => `${names.join(", ")} : ${t}`).join("\n"), url: "#supps", tag: "cycles" });
        evs.forEach((e) => logKeys.push(`cycle:${e.id}:${e.type}:${today}`));
      }
    }

    else if (mode === "evening") {
      // Seulement si une séance est prévue aujourd'hui (pas de repos, pas de jour vide) et pas encore enregistrée.
      const planned = days.filter((d) => d.weekday === wd && !d.rest && !NECK(d) && (d.exercises || []).length);
      if (!planned.length) skipped.push("séance : repos ou rien de prévu aujourd'hui");
      else {
        const missing = planned.filter((d) => !doneToday(d.id));
        if (!missing.length) skipped.push("séance : déjà enregistrée");
        else once("evening:" + today, () => ({ title: "Séance du jour non enregistrée", body: `${missing.map((d) => d.name).join(" + ")} : pense à l'enregistrer (ou à la marquer faite).`, url: "#session", tag: "session" }));
      }
    }

    else if (mode === "neck") {
      if (wd !== 3) skipped.push("cou : on n'est pas mercredi à Bangkok");
      else {
        // Uniquement si le bloc cou existe vraiment dans le programme (chantier 4), prévu le mercredi.
        const neck = days.filter((d) => NECK(d) && d.weekday === 3 && (d.exercises || []).length);
        if (!neck.length) skipped.push("cou : bloc absent du programme");
        else if (neck.every((d) => doneToday(d.id))) skipped.push("cou : déjà fait");
        else once("neck:" + today, () => ({ title: "Bloc cou du mercredi", body: `${neck[0].name} : ~10 min, avec charge, tempo 3-1-3.`, url: "#session", tag: "neck" }));
      }
    }

    else if (mode === "weekly") {
      if (wd !== 0) skipped.push("hebdo : on n'est pas dimanche à Bangkok");
      else {
        if (c.get("measurements/" + today)) skipped.push("mensurations : déjà saisies");
        else once("weekly:" + today, () => ({ title: "Mensurations de la semaine", body: "Poids à jeun, tour de taille, bras, cuisses + photos face / profil / dos.", url: "#track", tag: "measures" }));
        // Recomptage mensuel : 1er dimanche du mois, sauf si tout a été recompté dans les 7 derniers jours.
        if (Number(today.slice(8)) > 7) skipped.push("recomptage : pas le 1er dimanche du mois");
        else {
          const counted = c.lines.filter(S.countable).map((l) => l.lastCountedAt).filter(Boolean).sort()[0];
          if (counted && S.diffDays(counted, today) < 7) skipped.push("recomptage : fait il y a moins de 7 jours");
          else once("recount:" + today, () => ({ title: "Recompte tes boîtes", body: "Capsules et softgels : 2 minutes pour que le stock reste juste.", url: "#recount", tag: "recount" }));
        }
      }
    }

    else skipped.push("mode inconnu : " + mode);
    return { messages, logKeys, skipped };
  }

  const api = { plan, since, weekdayOf };
  root.ShredNotify = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
