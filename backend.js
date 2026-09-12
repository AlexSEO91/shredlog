/* Shredlog — backend Supabase (PWA autonome). Aucune librairie : appels REST directs.
   Config dans config.js : window.SHRED_CONFIG = { supabaseUrl, supabaseAnonKey }. */
window.ShredBackend = (function () {
  const C = window.SHRED_CONFIG || {};
  const configured = !!(C.supabaseUrl && C.supabaseAnonKey);
  const LS = "shredlog.session";
  let session = null;
  try { session = JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { session = null; }

  const save = () => { try { if (session) localStorage.setItem(LS, JSON.stringify(session)); else localStorage.removeItem(LS); } catch (e) { /* ignore */ } };
  const headers = (extra = {}) => ({ apikey: C.supabaseAnonKey, Authorization: "Bearer " + (session ? session.access_token : C.supabaseAnonKey), "Content-Type": "application/json", ...extra });

  async function refreshIfNeeded() {
    if (!session) return;
    if (Date.now() / 1000 < (session.expires_at || 0) - 60) return;
    const r = await fetch(`${C.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: headers(), body: JSON.stringify({ refresh_token: session.refresh_token }) });
    if (!r.ok) { session = null; save(); throw new Error("session expirée"); }
    setSession(await r.json());
  }
  function setSession(j) { session = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user ? { id: j.user.id, email: j.user.email } : (session && session.user) }; save(); }

  async function login(email, password) {
    const r = await fetch(`${C.supabaseUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: C.supabaseAnonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error_description || j.msg || "connexion refusée");
    setSession(j); return session.user;
  }
  function logout() { session = null; save(); }

  async function rest(path, opts = {}) {
    await refreshIfNeeded();
    const r = await fetch(`${C.supabaseUrl}/rest/v1/${path}`, { ...opts, headers: headers(opts.headers || {}) });
    if (r.status === 401) { session = null; save(); throw new Error("non connecté"); }
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  }
  async function list(collection) { const rows = await rest(`docs?collection=eq.${encodeURIComponent(collection)}&select=path,data`); return rows.map((x) => ({ path: x.path, data: x.data })); }
  async function set(path, data) { await rest("docs", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ path, collection: path.split("/")[0], data, updated_at: new Date().toISOString() }) }); }
  async function del(path) { await rest(`docs?path=eq.${encodeURIComponent(path)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); }
  async function upload(blob) {
    await refreshIfNeeded();
    const uid = session && session.user ? session.user.id : "anon"; const name = `${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const r = await fetch(`${C.supabaseUrl}/storage/v1/object/photos/${name}`, { method: "POST", headers: { apikey: C.supabaseAnonKey, Authorization: "Bearer " + session.access_token, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: blob });
    if (!r.ok) throw new Error("upload : " + (await r.text()));
    const s = await fetch(`${C.supabaseUrl}/storage/v1/object/sign/photos/${name}`, { method: "POST", headers: headers(), body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 365 * 5 }) });
    const j = await s.json(); if (!s.ok) throw new Error("url signée : " + JSON.stringify(j));
    return { id: name, url: `${C.supabaseUrl}/storage/v1${j.signedURL}`, sizeBytes: blob.size, contentType: "image/jpeg" };
  }
  return { kind: "supabase", configured, get user() { return session ? session.user : null; }, get connected() { return !!session; }, login, logout, list, set, del, upload };
})();
