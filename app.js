/* Shredlog — logique de l'app. Stockage local d'abord (localStorage), synchronisé avec la base de l'artifact (db) quand elle est disponible. */
(function () {
  "use strict";
  const D = window.SHRED_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmtDate = (s, long) => { const d = parseDate(s); return long ? `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}` : `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`; };
  const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return isoDate(d); };
  const toLbs = (kg) => kg == null || kg === "" ? null : Math.round(Number(kg) * 2.20462 * 2) / 2;
  const toKg = (lbs) => lbs == null || lbs === "" ? null : Math.round(Number(lbs) / 2.20462 * 2) / 2;
  const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  const fmtK = (v) => v == null ? "–" : String(Math.round(v * 10) / 10);

  /* ───────────────────────── Store : local-first + db ───────────────────────── */
  const COLLECTIONS = ["program", "programVersions", "sessions", "measurements", "photos", "supplementLogs", "nutritionLogs", "reviews", "settings", "nutrition", "supplements", "meta"];
  const Store = {
    docs: {}, pending: new Set(), db: null, assets: null, downloads: null, mode: "local", listeners: [],
    loadLocal() {
      try { this.docs = JSON.parse(localStorage.getItem("shredlog.docs") || "{}"); this.pending = new Set(JSON.parse(localStorage.getItem("shredlog.pending") || "[]")); } catch (e) { this.docs = {}; this.pending = new Set(); }
    },
    saveLocal() {
      try { localStorage.setItem("shredlog.docs", JSON.stringify(this.docs)); localStorage.setItem("shredlog.pending", JSON.stringify([...this.pending])); } catch (e) { /* quota */ }
    },
    get(path) { return this.docs[path] || null; },
    list(coll) { const p = coll + "/"; return Object.keys(this.docs).filter((k) => k.startsWith(p) && k.split("/").length === 2).sort().map((k) => ({ id: k.slice(p.length), path: k, data: this.docs[k] })); },
    set(path, data) {
      data = clone(data); data.updatedAt = new Date().toISOString(); this.docs[path] = data; this.pending.add(path); this.saveLocal(); this.flush(); this.emit();
    },
    del(path) { delete this.docs[path]; this.pending.add("-" + path); this.saveLocal(); this.flush(); this.emit(); },
    onChange(fn) { this.listeners.push(fn); },
    emit() { this.listeners.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); },
    async flush() {
      if (!this.db || this._flushing) return; this._flushing = true;
      for (const p of [...this.pending]) {
        try {
          if (p.startsWith("-")) await this.db.doc(p.slice(1)).delete(); else if (this.docs[p]) await this.db.doc(p).set(this.docs[p]);
          this.pending.delete(p);
        } catch (e) { console.warn("sync fail", p, e); break; }
      }
      this.saveLocal(); this._flushing = false; this.updateBanner();
    },
    async connect() {
      if (!window.claude || !window.claude.use) { await this.connectSupabase(); this.updateBanner(); return; }
      try {
        const [db, assets, downloads] = await Promise.all([claude.use("db"), claude.use("assets"), claude.use("downloads")]);
        this.assets = assets; this.downloads = downloads;
        if (!db) { this.updateBanner(); return; }
        this.db = db; this.mode = "db";
        for (const c of COLLECTIONS) {
          try {
            const snap = await db.collection(c).get();
            snap.docs.forEach((d) => { const path = c + "/" + d.id; if (!this.pending.has(path) && !this.pending.has("-" + path) && d.exists) this.docs[path] = d.data(); });
          } catch (e) { console.warn("read", c, e); }
        }
        this.saveLocal(); this.emit();
        await this.flush();
        // Mises à jour en direct (bilans / programme écrits par l'IA)
        ["reviews", "program", "nutrition", "supplements"].forEach((c) => {
          try { db.collection(c).onSnapshot((snap) => { let changed = false; snap.docChanges().forEach((ch) => { const path = c + "/" + ch.doc.id; if (this.pending.has(path)) return; if (ch.type === "removed") { delete this.docs[path]; } else { this.docs[path] = ch.doc.data(); } changed = true; }); if (changed) { this.saveLocal(); this.emit(); } }); } catch (e) { /* ignore */ }
        });
      } catch (e) { console.warn("connect", e); }
      this.updateBanner();
    },
    async connectSupabase() {
      const B = window.ShredBackend; if (!B || !B.configured) return;
      this.kind = "supabase";
      if (!B.connected) { this.needLogin = true; return; }
      const db = {
        doc: (path) => ({ set: (data) => B.set(path, data), delete: () => B.del(path) }),
        collection: (c) => ({ get: async () => { const rows = await B.list(c); return { docs: rows.map((r) => ({ id: r.path.split("/")[1], exists: true, data: () => r.data })) }; }, onSnapshot: () => () => {} }),
      };
      this.db = db; this.mode = "db"; this.assets = { upload: (blob) => B.upload(blob) }; this.needLogin = false;
      try {
        for (const c of COLLECTIONS) { try { const snap = await db.collection(c).get(); snap.docs.forEach((d) => { const path = c + "/" + d.id; if (!this.pending.has(path) && !this.pending.has("-" + path)) this.docs[path] = d.data(); }); } catch (e) { console.warn("read", c, e); } }
        this.saveLocal(); this.emit(); await this.flush();
        // rafraîchissement périodique des bilans / programme écrits par l'IA
        clearInterval(this._poll); this._poll = setInterval(async () => { if (document.hidden) return; let changed = false; for (const c of ["reviews", "program", "nutrition", "supplements"]) { try { const snap = await db.collection(c).get(); snap.docs.forEach((d) => { const path = c + "/" + d.id; if (this.pending.has(path)) return; const nd = d.data(); if (JSON.stringify(nd) !== JSON.stringify(this.docs[path])) { this.docs[path] = nd; changed = true; } }); } catch (e) { /* hors ligne */ } } if (changed) { this.saveLocal(); this.emit(); } }, 60000);
      } catch (e) { console.warn("supabase", e); }
    },
    updateBanner() {
      const b = $("#sync-banner"); const v = $("#ver-sync");
      if (this.db) { v.textContent = (this.pending.size ? `${this.pending.size} à synchroniser` : "synchronisé") + (this.kind === "supabase" ? " · Supabase" : ""); b.classList.add("hidden"); }
      else if (this.needLogin) { v.textContent = "non connecté"; b.innerHTML = `Connecte-toi pour synchroniser tes données. <a href="#settings">Se connecter</a>`; b.classList.remove("hidden"); }
      else { v.textContent = "stockage local (hors ligne)"; if (this.pending.size) { b.textContent = `Hors connexion : ${this.pending.size} modification(s) en attente. Elles seront envoyées à la prochaine ouverture connectée.`; b.classList.remove("hidden"); } else b.classList.add("hidden"); }
    },
  };

  /* ───────────────────────── Accès aux données ───────────────────────── */
  const Data = {
    program() { return Store.get("program/current") || null; },
    ensureProgram() { if (!Store.get("program/current")) { const p = clone(D.PROGRAM); Store.set("program/current", p); Store.set("programVersions/v1", { ...clone(p), savedAt: new Date().toISOString(), reason: "Programme initial (salle : machines + alternatives haltères)" }); } },
    settings() { return Store.get("settings/app") || { theme: "auto", heightCm: 172, name: "Alex", unit: "kg", startDate: isoDate() }; },
    saveSettings(s) { Store.set("settings/app", s); },
    supplements() { return Store.get("supplements/plan") || D.SUPPLEMENTS; },
    nutrition() { return Store.get("nutrition/plan") || D.NUTRITION; },
    dayByWeekday(wd) { const p = this.program(); return p ? p.days.find((d) => d.weekday === wd) : null; },
    dayById(id) { const p = this.program(); return p ? p.days.find((d) => d.id === id) : null; },
    sessions() { return Store.list("sessions").map((x) => x.data).sort((a, b) => (a.date < b.date ? 1 : -1)); },
    lastDoneSession(dayId, beforeDate) { return this.sessions().find((s) => s.dayId === dayId && s.status === "done" && (!beforeDate || s.date < beforeDate)); },
    measurements() { const m = Store.list("measurements").map((x) => x.data); if (!m.find((x) => x.date === D.BASELINE.date)) m.push({ ...D.BASELINE, baseline: true }); return m.sort((a, b) => (a.date < b.date ? -1 : 1)); },
    photos() { return Store.list("photos").map((x) => x.data).sort((a, b) => (a.date < b.date ? 1 : -1)); },
    reviews() { return Store.list("reviews").map((x) => ({ id: x.id, ...x.data })).sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1)); },
    unseenReviews() { return this.reviews().filter((r) => !r.seen).length; },
    exInfo(variant) { if (!variant) return null; const base = D.EX[variant.ex]; if (base) return { ...base, ...(variant.custom || {}) }; return variant.custom ? { name: variant.custom.name || "Exercice", img: null, primary: variant.custom.primary || [], secondary: [], cues: variant.custom.cues || [] } : { name: variant.ex, img: null, primary: [], secondary: [], cues: [] }; },
  };

  /* ───────────────────────── UI helpers ───────────────────────── */
  const UI = { view: "home", sessionDay: null, trackTab: "week", supDate: isoDate(), nutDate: isoDate(), cmpA: null, cmpB: null, cuesOpen: false, progDay: null, editingSession: null };
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }
  function ask(title, text, okLabel, onOk, danger) { UI._confirm = onOk; sheet(`<div class="confirm"><h3>${esc(title)}</h3><p class="small muted" style="margin-top:6px">${esc(text)}</p><div class="btnrow"><button class="btn ghost" data-act="close-sheet">Annuler</button><button class="btn ${danger ? "danger" : "primary"}" data-act="confirm-ok">${esc(okLabel)}</button></div></div>`); }
  function sheet(html) { UI.sheetHtml = html; render(); window.scrollTo(0, 0); }
  function closeSheet() { UI.sheetHtml = null; UI._confirm = null; render(); }
  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L9 12l9 6M6 6v12"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l9 6-9 6M18 6v12"/></svg>',
    timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6M12 2v3"/></svg>',
    dumb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12"/></svg>',
    prog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h16M4 10h16M4 15h10M4 20h7"/></svg>',
    track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 4 5-8 4 5"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 2-3 5-3 8h3v10"/></svg>',
    pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M8.5 15.5l7-7"/></svg>',
    review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    posture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 6v8M12 14l-3 7M12 14l3 7M7 9l5 1 5-1"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  };
  const checkbox = (on, act, extra = "") => `<button class="check ${on ? "on" : ""}" data-act="${act}" ${extra} aria-pressed="${on}">${ICON.check}</button>`;

  /* ───────────────────────── Carte musculaire (SVG) ───────────────────────── */
  function muscleMap(primary = [], secondary = []) {
    const cls = (m) => primary.includes(m) ? "m p" : secondary.includes(m) ? "m s" : "m";
    const F = (id, d) => `<path class="${cls(id)}" d="${d}"/>`;
    // Silhouette de face (0-100) et de dos (110-210), viewBox 0 0 210 230
    const front = `
      <path class="body" d="M50 6a8 8 0 0 1 8 8v6l6 4c10 3 13 8 14 16l3 30-6 2-2-24-2 24 3 60c0 4-1 20-2 42h-8l-1-42-3-30-3 30-1 42h-8c-1-22-2-38-2-42l3-60-2-24-2 24-6-2 3-30c1-8 4-13 14-16l6-4v-6a8 8 0 0 1 8-8z"/>
      ${F("neck", "M46 20h8v5l-4 2-4-2z")}
      ${F("shoulders", "M31 27c4-3 8-4 11-4l1 9-9 4c-2-1-4-4-3-9z")}${F("shoulders", "M69 27c-4-3-8-4-11-4l-1 9 9 4c2-1 4-4 3-9z")}
      ${F("chest", "M42 31l8 2v14l-9-2c-3-2-3-10 1-14z")}${F("chest", "M58 31l-8 2v14l9-2c3-2 3-10-1-14z")}
      ${F("abdominals", "M43 47h14v26l-7 4-7-4z")}
      ${F("biceps", "M32 37l7-2 2 14-6 3-3-5z")}${F("biceps", "M68 37l-7-2-2 14 6 3 3-5z")}
      ${F("forearms", "M30 52l6-2 2 18-5 1-3-8z")}${F("forearms", "M70 52l-6-2-2 18 5 1 3-8z")}
      ${F("quadriceps", "M38 78l10 2-1 40-6 2-4-14z")}${F("quadriceps", "M62 78l-10 2 1 40 6 2 4-14z")}
      ${F("calves", "M40 126l6 1-1 22-4 1-2-10z")}${F("calves", "M60 126l-6 1 1 22 4 1 2-10z")}`;
    const back = `
      <g transform="translate(110 0)">
      <path class="body" d="M50 6a8 8 0 0 1 8 8v6l6 4c10 3 13 8 14 16l3 30-6 2-2-24-2 24 3 60c0 4-1 20-2 42h-8l-1-42-3-30-3 30-1 42h-8c-1-22-2-38-2-42l3-60-2-24-2 24-6-2 3-30c1-8 4-13 14-16l6-4v-6a8 8 0 0 1 8-8z"/>
      ${F("neck", "M46 20h8v5l-4 2-4-2z")}
      ${F("traps", "M38 26l12-4 12 4-4 12h-16z")}
      ${F("shoulders", "M31 27c4-3 8-4 11-4l1 9-9 4c-2-1-4-4-3-9z")}${F("shoulders", "M69 27c-4-3-8-4-11-4l-1 9 9 4c2-1 4-4 3-9z")}
      ${F("lats", "M40 40l9 1v22l-7-2c-3-3-4-12-2-21z")}${F("lats", "M60 40l-9 1v22l7-2c3-3 4-12 2-21z")}
      ${F("middle back", "M45 38h10v14H45z")}
      ${F("lower back", "M44 63h12v9l-6 3-6-3z")}
      ${F("triceps", "M32 37l7-2 2 14-6 3-3-5z")}${F("triceps", "M68 37l-7-2-2 14 6 3 3-5z")}
      ${F("forearms", "M30 52l6-2 2 18-5 1-3-8z")}${F("forearms", "M70 52l-6-2-2 18 5 1 3-8z")}
      ${F("glutes", "M38 76l11 2v14l-10 1c-3-4-4-11-1-17z")}${F("glutes", "M62 76l-11 2v14l10 1c3-4 4-11 1-17z")}
      ${F("hamstrings", "M39 95l9 1-1 26-6 2-3-14z")}${F("hamstrings", "M61 95l-9 1 1 26 6 2 3-14z")}
      ${F("calves", "M40 126l6 1-1 22-4 1-2-10z")}${F("calves", "M60 126l-6 1 1 22 4 1 2-10z")}
      </g>`;
    return `<svg viewBox="0 0 210 160" aria-hidden="true">${front}${back}</svg>`;
  }
  function demoBlock(info, label) {
    if (!info) return "";
    const base = info.img;
    const img2 = info.img2;
    if (!base) return `<div class="demo empty">${esc(info.name)} — pas d'image</div>`;
    const f0 = `img/${base}_0.jpg`, f1 = img2 ? `img/${img2}_0.jpg` : `img/${base}_1.jpg`;
    return `<div class="demo"><img class="f0" src="${f0}" alt="${esc(info.name)} — position de départ"><img class="f1" src="${f1}" alt="${esc(info.name)} — position d'arrivée"><span class="badge acc tag">${esc(label)}</span><span class="step">départ ⇄ arrivée</span></div>`;
  }
  function musclesBlock(info) {
    if (!info) return "";
    const lab = (arr) => arr.map((m) => D.MUSCLE_LABELS[m] || m).join(", ");
    return `<div class="muscles">${muscleMap(info.primary, info.secondary)}<div class="small"><div><span class="eyebrow">Muscles ciblés</span><br><b>${esc(lab(info.primary) || "–")}</b></div>${info.secondary.length ? `<div class="faint" style="margin-top:4px">Secondaires : ${esc(lab(info.secondary))}</div>` : ""}</div></div>`;
  }

  /* ───────────────────────── Router ───────────────────────── */
  const VIEWS = { home: "Aujourd'hui", session: "Séance", program: "Programme", track: "Suivi", supps: "Compléments", nutrition: "Nutrition", reviews: "Bilan & ajustements", export: "Export / Import", settings: "Réglages", more: "Plus", posture: "Routine posture" };
  function route() {
    const v = (location.hash || "#home").slice(1).split("?")[0];
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const nv = VIEWS[v] ? v : "home"; if (nv !== UI.view) { UI.sheetHtml = null; UI._confirm = null; } UI.view = nv;
    $$(".view").forEach((el) => el.classList.toggle("on", el.id === "v-" + UI.view));
    $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.v === UI.view || (UI.view !== "home" && !["session", "track", "nutrition"].includes(UI.view) && a.dataset.v === "more")));
    $("#hdr-title").textContent = VIEWS[UI.view];
    $("#hdr-eyebrow").textContent = UI.view === "home" ? "Shredlog" : "Shredlog · " + (Data.settings().name || "");
    window.scrollTo(0, 0);
    render();
  }
  function render() {
    const t = isoDate(); $("#hdr-date").textContent = fmtDate(t, true);
    const p = Data.program(); $("#ver-prog").textContent = p ? p.version : "–";
    $("#more-dot").classList.toggle("hidden", Data.unseenReviews() === 0);
    const fn = { home: renderHome, session: renderSession, program: renderProgram, track: renderTrack, supps: renderSupps, nutrition: renderNutrition, reviews: renderReviews, export: renderExport, settings: renderSettings, more: renderMore, posture: renderPosture }[UI.view];
    $("#v-" + UI.view).innerHTML = (UI.sheetHtml ? `<div class="card inline-sheet"><div class="row between" style="margin-bottom:8px"><span class="eyebrow">Fenêtre</span><button class="btn sm ghost" data-act="close-sheet">✕ Fermer</button></div>${UI.sheetHtml}</div>` : "") + fn();
    $$(".topnav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + UI.view || (a.getAttribute("href") === "#more" && !["home", "session", "track", "nutrition"].includes(UI.view))));
  }

  /* ───────────────────────── Accueil ───────────────────────── */
  function weekStrip() {
    const today = isoDate(); const d = parseDate(today); const dow = (d.getDay() + 6) % 7; // lundi=0
    const monday = addDays(today, -dow);
    const sessions = Data.sessions();
    let html = '<div class="week">';
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i); const wd = parseDate(date).getDay(); const day = Data.dayByWeekday(wd);
      const done = sessions.find((s) => s.date === date && s.status === "done");
      const rest = !day || day.rest;
      const start = Data.settings().startDate || today; const cls = [done ? "done" : "", date === today ? "today" : "", rest ? "rest" : "", !done && !rest && date < today && date >= start ? "missed" : ""].join(" ");
      html += `<div class="${cls}"><span>${DAYS_SHORT[wd]}</span><i>${done ? "✓" : rest ? "·" : (day ? day.name[0] : "")}</i></div>`;
    }
    return html + "</div>";
  }
  function renderHome() {
    const today = isoDate(); const wd = parseDate(today).getDay(); const day = Data.dayByWeekday(wd);
    const active = Data.sessions().find((s) => s.status === "in_progress");
    const doneToday = Data.sessions().find((s) => s.date === today && s.status === "done");
    const unseen = Data.unseenReviews();
    const sup = Data.supplements(); const supLog = Store.get("supplementLogs/" + today) || { taken: {} };
    const supDone = sup.items.filter((i) => supLog.taken[i.id]).length;
    const lastM = Data.measurements().slice(-1)[0]; const lastP = Data.photos()[0];
    const daysSince = (s) => s ? Math.round((parseDate(today) - parseDate(s)) / 864e5) : 99;
    let cta;
    if (active) cta = `<a class="btn wide" style="background:#fff;color:var(--accent)" href="#session">Reprendre ${esc(active.dayName)} · ${sessionProgress(active)} %</a>`;
    else if (doneToday) cta = `<div class="row"><span class="badge" style="background:rgba(255,255,255,.25);color:#fff">Séance faite ✓</span><span class="small">${esc(doneToday.dayName)} · ${doneToday.exercises.filter((e) => e.doneSets > 0).length} exos</span></div>`;
    else if (day && !day.rest) cta = `<a class="btn wide" style="background:#fff;color:var(--accent)" href="#session">Commencer ${esc(day.name)} · ${day.exercises.length} exos · ~${day.duration} min</a>`;
    else cta = `<a class="btn wide" style="background:#fff;color:var(--accent)" href="#posture">Routine posture 5 min</a>`;
    return `
    <div class="band">
      <div class="eyebrow">${esc(fmtDate(today, true))}</div>
      <h1 style="margin:4px 0 10px">${day ? esc(day.name) : "Repos"}</h1>
      <p class="muted small" style="margin-bottom:12px">${day ? esc(day.focus) : ""}</p>
      ${cta}
    </div>
    ${unseen ? `<a href="#reviews" class="card amberc row between" style="text-decoration:none;color:inherit"><div><b>${unseen} ajustement${unseen > 1 ? "s" : ""} du programme</b><div class="small muted">Voir ce qui a changé et pourquoi</div></div><span class="chev">›</span></a>` : ""}
    <div class="card">${weekStrip()}<div class="row between" style="margin-top:12px"><span class="small muted">Programme de la semaine</span><b class="num">${weekStats(0).setPct} %</b></div><div class="progress" style="margin-top:6px"><i style="width:${weekStats(0).setPct}%"></i></div></div>
    <div class="tiles">
      <a class="tile" href="#session"><span>Séance<span class="sub">${active ? "en cours" : day && !day.rest ? day.name : "repos"}</span></span><span class="ic">${ICON.dumb}</span></a>
      <a class="tile" href="#supps"><span>Compléments<span class="sub">${supDone}/${sup.items.length} pris</span></span><span class="ic">${ICON.pill}</span></a>
      <a class="tile" href="#track"><span>Suivi<span class="sub">${lastM ? "mesuré il y a " + daysSince(lastM.date) + " j" : "à mesurer"}</span></span><span class="ic">${ICON.track}</span></a>
      <a class="tile" href="#track?photos"><span>Photos<span class="sub">${lastP ? "il y a " + daysSince(lastP.date) + " j" : "aucune"}</span></span><span class="ic">${ICON.photo}</span></a>
      <a class="tile" href="#nutrition"><span>Nutrition<span class="sub">${Data.nutrition().meals.length} repas</span></span><span class="ic">${ICON.food}</span></a>
      <a class="tile" href="#program"><span>Programme<span class="sub">v${Data.program() ? Data.program().version : "–"}</span></span><span class="ic">${ICON.prog}</span></a>
    </div>
    <div class="card" style="margin-top:14px">
      <div class="eyebrow" style="margin-bottom:8px">À faire</div>
      <div class="list">
        ${wd === 0 || daysSince(lastM && lastM.date) >= 7 ? `<a class="item" href="#track" style="text-decoration:none;color:inherit"><div class="grow"><div class="t">Mensurations de la semaine</div><div class="s">Poids à jeun, tour de taille, bras, cuisses</div></div><span class="chev">›</span></a>` : ""}
        ${daysSince(lastP && lastP.date) >= 7 ? `<a class="item" href="#track?photos" style="text-decoration:none;color:inherit"><div class="grow"><div class="t">Photos face / profil / dos</div><div class="s">Même lumière, même heure, torse nu</div></div><span class="chev">›</span></a>` : ""}
        <a class="item" href="#posture" style="text-decoration:none;color:inherit"><div class="grow"><div class="t">Routine posture 5 min</div><div class="s">Anti-bascule du bassin, tous les jours</div></div><span class="chev">›</span></a>
        <a class="item" href="#supps" style="text-decoration:none;color:inherit"><div class="grow"><div class="t">Compléments</div><div class="s">${supDone}/${sup.items.length} pris aujourd'hui</div></div><div class="progress" style="width:70px"><i style="width:${Math.round(100 * supDone / sup.items.length)}%"></i></div></a>
      </div>
    </div>`;
  }

  /* ───────────────────────── Séance ───────────────────────── */
  function sessionProgress(s) { const ex = s.exercises.filter((e) => !e.warmup); const done = ex.filter((e) => e.doneSets > 0 || e.skipped).length; return Math.round(100 * done / Math.max(1, ex.length)); }
  function newSession(day) {
    const p = Data.program(); const today = isoDate();
    const prev = Data.lastDoneSession(day.id);
    const exercises = day.exercises.map((e) => {
      const variant = e.primary; const v = e[variant] || e.machine || e.dumbbell;
      const prevEx = prev && prev.exercises.find((x) => x.id === e.id);
      const kg = prevEx && prevEx.variant === variant && prevEx.sets && prevEx.sets[0] && prevEx.sets[0].kg != null ? prevEx.sets[0].kg : (v ? v.kg : null);
      const sets = []; for (let i = 0; i < e.sets; i++) sets.push({ kg, lbs: toLbs(kg), reps: e.reps, done: false });
      return { id: e.id, block: e.block, superset: e.superset, warmup: e.warmup, variant, targetSets: e.sets, reps: e.reps, rest: e.rest, sets, doneSets: 0, difficulty: "", pain: false, note: "", skipped: false };
    });
    return { id: `${today}_${day.id}`, date: today, dayId: day.id, dayName: day.name, programVersion: p.version, status: "in_progress", startedAt: new Date().toISOString(), cursor: 0, exercises, note: "" };
  }
  function saveSession(s) { Store.set("sessions/" + s.id, s); }
  function activeSession() { return Data.sessions().find((s) => s.status === "in_progress") || null; }
  function renderSession() {
    const s = activeSession();
    if (s) return renderExercise(s);
    const p = Data.program(); if (!p) return `<div class="card">Programme absent. <button class="btn sm primary" data-act="load-default">Charger le programme</button></div>`;
    const today = isoDate(); const wd = parseDate(today).getDay();
    const dayId = UI.sessionDay || (Data.dayByWeekday(wd) && !Data.dayByWeekday(wd).rest ? Data.dayByWeekday(wd).id : "lun");
    const day = Data.dayById(dayId);
    const doneToday = Data.sessions().find((x) => x.date === today && x.dayId === dayId && x.status === "done");
    const chips = p.days.filter((d) => !d.rest).map((d) => `<button class="chip ${d.id === dayId ? "on" : ""}" data-act="pick-day" data-id="${d.id}">${DAYS_SHORT[d.weekday]} · ${esc(d.name)}</button>`).join("");
    const list = day.exercises.map((e, i) => { const v = e[e.primary] || e.machine || e.dumbbell; const info = Data.exInfo(v); return `<div class="item"><span class="n">${e.warmup ? "éch." : e.block + (e.superset ? "" : "")}</span><div class="grow"><div class="t">${esc(info.name)}</div><div class="s">${e.warmup ? esc(e.reps) : `${e.sets} × ${esc(e.reps)}${v && v.kg != null ? ` · ${fmtK(v.kg)} kg / ${fmtK(v.lbs)} lbs` : ""}${e.rest ? ` · repos ${e.rest} s` : ""}`}</div></div></div>`; }).join("");
    return `
    <div class="chips" style="margin-bottom:14px">${chips}</div>
    <div class="card">
      <div class="row between"><div><h2>${esc(day.name)}</h2><p class="muted small">${esc(day.focus)} · ~${day.duration} min</p></div>${doneToday ? '<span class="badge acc">faite aujourd\'hui</span>' : ""}</div>
      <div class="list exlist" style="margin-top:10px">${list}</div>
    </div>
    <button class="btn primary wide" data-act="start-session" data-id="${day.id}">${doneToday ? "Refaire la séance" : "Commencer la séance"}</button>
    ${doneToday ? `<p class="tiny faint" style="text-align:center;margin-top:8px">Une nouvelle séance remplacera celle d'aujourd'hui pour ce jour.</p>` : ""}`;
  }
  function renderExercise(s) {
    const day = Data.dayById(s.dayId); const idx = Math.min(s.cursor, s.exercises.length - 1); const se = s.exercises[idx]; const pe = day.exercises.find((e) => e.id === se.id) || {};
    const total = s.exercises.length; const pct = sessionProgress(s);
    const v = pe[se.variant]; const info = Data.exInfo(v);
    const hasM = !!pe.machine, hasD = !!pe.dumbbell;
    const prev = Data.lastDoneSession(s.dayId, s.date); const prevEx = prev && prev.exercises.find((x) => x.id === se.id);
    const prevStr = (i) => { if (!prevEx || prevEx.variant !== se.variant || !prevEx.sets[i] || !prevEx.sets[i].done) return "–"; const ps = prevEx.sets[i]; return `${ps.kg != null ? fmtK(ps.kg) + " kg" : "PDC"} × ${esc(ps.reps)}`; };
    const rows = se.sets.map((st, i) => `<tr class="${st.done ? "done" : ""}"><td class="idx">${i + 1}</td><td class="prev">${prevStr(i)}</td><td><input type="number" inputmode="decimal" step="0.5" value="${st.kg ?? ""}" placeholder="PDC" data-bind="kg" data-i="${i}" aria-label="kg série ${i + 1}"></td><td><input type="number" inputmode="decimal" step="0.5" value="${st.lbs ?? ""}" placeholder="–" data-bind="lbs" data-i="${i}" aria-label="lbs série ${i + 1}"></td><td><input type="text" inputmode="numeric" value="${esc(st.reps)}" data-bind="reps" data-i="${i}" aria-label="reps série ${i + 1}"></td><td class="chk">${checkbox(st.done, "toggle-set", `data-i="${i}"`)}</td></tr>`).join("");
    const diff = ["facile", "moyen", "difficile"].map((d) => `<button class="chip ${se.difficulty === d ? "on " + (d === "facile" ? "easy" : d === "difficile" ? "hard" : "") : ""}" data-act="difficulty" data-v="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join("");
    return `
    <div class="pct">${pct} % · exercice ${idx + 1} / ${total}${se.superset ? ` · ${esc(se.superset)}` : ""}</div>
    <div class="progress" style="margin-bottom:12px"><i style="width:${pct}%"></i></div>
    <div class="card" style="padding:12px">
      ${hasM && hasD ? `<div class="tabs" style="margin-bottom:10px"><button class="${se.variant === "machine" ? "on" : ""}" data-act="variant" data-v="machine">Machine</button><button class="${se.variant === "dumbbell" ? "on" : ""}" data-act="variant" data-v="dumbbell">Sans machine · haltères</button></div>` : ""}
      ${demoBlock(info, se.variant === "machine" ? "Machine" : "Haltères / PDC")}
      <div class="row between" style="margin-top:12px"><h2 style="font-size:22px">${esc(info.name)}</h2>${se.warmup ? '<span class="badge">échauffement</span>' : `<span class="badge">bloc ${esc(se.block)}</span>`}</div>
      <p class="muted small" style="margin-top:4px">${se.warmup ? esc(se.reps) : `<b>${se.targetSets} séries × ${esc(se.reps)}</b>${se.rest ? ` · repos ${se.rest} s` : ""}${v && v.kg != null ? ` · ${fmtK(v.kg)} kg / ${fmtK(v.lbs)} lbs` : ""}${v && v.note ? ` · <span class="faint">${esc(v.note)}</span>` : ""}`}${pe.info ? `<br><span class="faint">${esc(pe.info)}</span>` : ""}</p>
      <div style="margin-top:10px">${musclesBlock(info)}</div>
      ${info.cues && info.cues.length ? `<button class="small" style="color:var(--accent);font-weight:600;margin-top:8px" data-act="toggle-cues">${UI.cuesOpen ? "Masquer les consignes" : "Consignes d'exécution"} ›</button>${UI.cuesOpen ? `<ul class="cues">${info.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}` : ""}
    </div>
    ${se.warmup ? `<div class="card"><div class="row between"><div><b>Échauffement fait ?</b><div class="small muted">1 tour, pas de charge</div></div>${checkbox(se.doneSets > 0, "warmup-done")}</div></div>` : `
    <div class="card" style="padding:12px">
      <div class="scroll"><table class="settbl"><thead><tr><th>Série</th><th>Précédent</th><th>KG</th><th>LBS</th><th>Reps</th><th>Fait</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row between" style="margin-top:8px"><button class="small" style="color:var(--accent);font-weight:600" data-act="add-set">+ Ajouter une série</button>
        <div class="row"><span class="small muted">Séries faites</span><div class="stepper" style="width:150px"><button data-act="sets-minus" aria-label="moins">−</button><input type="number" inputmode="numeric" min="0" value="${se.doneSets}" data-bind="doneSets" aria-label="séries faites"><button data-act="sets-plus" aria-label="plus">+</button></div></div>
      </div>
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:8px">Ressenti</div>
      <div class="chips">${diff}<button class="chip ${se.pain ? "on hard" : ""}" data-act="pain">Douleur</button></div>
      <div class="row" style="margin-top:10px"><input type="text" placeholder="Note (machine, réglage siège, sensation…)" value="${esc(se.note)}" data-bind="note"></div>
    </div>`}
    <div class="ctrl">
      <button class="round" data-act="ex-prev" ${idx === 0 ? "disabled" : ""} aria-label="Exercice précédent">${ICON.prev}</button>
      <button class="round big" data-act="rest" data-s="${se.rest || 60}" aria-label="Lancer le repos">${Timer.running() ? `<b>${Math.floor(Math.max(0, Timer.left) / 60)}:${pad(Math.max(0, Timer.left) % 60)}</b>` : ICON.timer}</button>
      <button class="round" data-act="ex-next" aria-label="${idx === total - 1 ? "Terminer" : "Exercice suivant"}">${idx === total - 1 ? ICON.check : ICON.next}</button>
    </div>
    <p class="tiny faint" style="text-align:center;margin:6px 0 14px">Repos ${se.rest || 60} s · le bouton central lance le chrono</p>
    <div class="btnrow">
      <button class="btn line sm" data-act="skip-ex">Passer cet exercice</button>
      <button class="btn line sm" data-act="finish-session">Terminer la séance</button>
      <button class="btn danger sm" data-act="abandon-session">Abandonner</button>
    </div>`;
  }

  /* ───────────────────────── Timer de repos ───────────────────────── */
  const Timer = {
    left: 0, iv: null, ctx: null,
    start(sec) { this.stop(false); this.left = sec; $("#timer").classList.add("on"); $("#timer").classList.remove("over"); this.tick(); this.iv = setInterval(() => { this.left--; this.tick(); if (this.left <= 0) { this.finish(); } }, 1000); try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } },
    tick() { const l = Math.max(0, this.left); const t = `${Math.floor(l / 60)}:${pad(l % 60)}`; $("#timer-val").textContent = t; const big = $(".ctrl .round.big"); if (big) big.innerHTML = `<b>${t}</b>`; },
    add(n) { this.left += n; this.tick(); },
    finish() { clearInterval(this.iv); this.iv = null; $("#timer").classList.add("over"); $("#timer-val").textContent = "GO"; this.beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); setTimeout(() => this.stop(false), 4000); },
    stop() { clearInterval(this.iv); this.iv = null; $("#timer").classList.remove("on", "over"); const big = $(".ctrl .round.big"); if (big) big.innerHTML = ICON.timer; },
    running() { return !!this.iv; },
    beep() { if (!this.ctx) return; try { const c = this.ctx; [0, 0.25, 0.5].forEach((t) => { const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.25, c.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.2); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.22); }); } catch (e) { /* ignore */ } },
  };

  /* ───────────────────────── Programme ───────────────────────── */
  function renderProgram() {
    const p = Data.program(); if (!p) return "";
    const versions = Store.list("programVersions").map((x) => ({ id: x.id, ...x.data })).sort((a, b) => b.version - a.version);
    if (UI.progDay) {
      const day = Data.dayById(UI.progDay);
      const ex = day.exercises.map((e) => {
        const block = (vk, label) => { const v = e[vk]; if (!v) return ""; const info = Data.exInfo(v); return `<div class="card flat" style="padding:10px;margin:8px 0 0"><div class="row between"><b class="small">${label} · ${esc(info.name)}</b><span class="tiny faint">${esc(v.note || "")}</span></div>${e.warmup ? "" : `<div class="grid2" style="margin-top:8px"><div class="field"><label>kg</label><input type="number" step="0.5" inputmode="decimal" value="${v.kg ?? ""}" placeholder="PDC" data-bind="prog-kg" data-ex="${e.id}" data-vk="${vk}"></div><div class="field"><label>lbs</label><input type="number" step="0.5" inputmode="decimal" value="${v.lbs ?? ""}" data-bind="prog-lbs" data-ex="${e.id}" data-vk="${vk}"></div></div>`}</div>`; };
        return `<div class="card" style="padding:12px"><div class="row between"><div><span class="badge">${e.warmup ? "échauffement" : "bloc " + esc(e.block)}</span> <b>${e.warmup ? esc(e.reps) : `${e.sets} × ${esc(e.reps)}`}</b>${e.rest ? ` <span class="small muted">· repos ${e.rest} s</span>` : ""}</div>${e.superset ? `<span class="tiny faint">${esc(e.superset)}</span>` : ""}</div>
          <div class="grid2" style="margin-top:6px"><div class="field"><label>Séries</label><input type="number" min="1" max="8" value="${e.sets}" data-bind="prog-sets" data-ex="${e.id}"></div><div class="field"><label>Reps</label><input type="text" value="${esc(e.reps)}" data-bind="prog-reps" data-ex="${e.id}"></div></div>
          ${block("machine", "Machine")}${block("dumbbell", "Haltères / PDC")}
          <div class="row" style="margin-top:8px"><span class="small muted">Version par défaut :</span><div class="tabs grow"><button class="${e.primary === "machine" ? "on" : ""}" data-act="prog-primary" data-ex="${e.id}" data-v="machine" ${e.machine ? "" : "disabled"}>Machine</button><button class="${e.primary === "dumbbell" ? "on" : ""}" data-act="prog-primary" data-ex="${e.id}" data-v="dumbbell" ${e.dumbbell ? "" : "disabled"}>Haltères</button></div></div></div>`;
      }).join("");
      return `<button class="small" style="color:var(--accent);font-weight:600;margin-bottom:10px" data-act="prog-back">‹ Tous les jours</button><h2>${esc(day.name)}</h2><p class="muted small" style="margin-bottom:12px">${esc(day.focus)}</p>${ex}<p class="tiny faint">Les modifications de charges/séries s'enregistrent immédiatement (sans changer le numéro de version).</p>`;
    }
    const days = p.days.map((d) => `<button class="item" style="width:100%;text-align:left" data-act="prog-day" data-id="${d.id}" ${d.rest ? "disabled" : ""}><div class="n" style="width:40px;font-family:var(--disp);font-weight:700;color:var(--ink3)">${DAYS_SHORT[d.weekday]}</div><div class="grow"><div class="t">${esc(d.name)}</div><div class="s">${esc(d.focus)}${d.rest ? "" : ` · ${d.exercises.length} exos · ~${d.duration} min`}</div></div>${d.rest ? "" : '<span class="chev">›</span>'}</button>`).join("");
    return `
    <div class="card"><div class="row between"><div><h2>${esc(p.name)}</h2><p class="small muted">Version ${p.version} · ${esc(p.createdAt || "")}</p></div></div>
      <ul class="cues" style="margin-top:10px">${(p.notes || []).map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>
    <div class="card"><div class="list">${days}</div></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:8px">Versions</div><div class="list">${versions.map((v) => `<div class="item"><div class="grow"><div class="t">v${v.version} ${v.version === p.version ? '<span class="badge acc">active</span>' : ""}</div><div class="s">${esc((v.savedAt || "").slice(0, 10))} · ${esc(v.reason || "")}</div></div>${v.version !== p.version ? `<button class="btn sm ghost" data-act="restore-version" data-id="${v.id}">Restaurer</button>` : ""}</div>`).join("")}</div></div>
    <div class="btnrow"><a class="btn ghost" href="#export">Importer / exporter</a></div>`;
  }

  /* ───────────────────────── Suivi : mensurations & photos ───────────────────────── */
  function navyBF(waist, neck, heightCm) { if (!waist || !neck || !heightCm || waist <= neck) return null; const v = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450; return Math.round(v * 10) / 10; }
  function sparkline(points, unit) {
    if (!points.length) return `<p class="tiny faint">Aucune mesure.</p>`;
    const W = 320, H = 120, P = 26; const vals = points.map((p) => p.v); let min = Math.min(...vals), max = Math.max(...vals); if (max - min < 1) { max += 0.5; min -= 0.5; }
    const x = (i) => points.length < 2 ? P : P + (i * (W - 2 * P)) / (points.length - 1); const y = (v) => H - P + 6 - ((v - min) * (H - 2 * P)) / (max - min);
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
    const area = `${d} L${x(points.length - 1).toFixed(1)} ${H - P + 6} L${x(0).toFixed(1)} ${H - P + 6} Z`;
    const last = points[points.length - 1];
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="courbe"><line class="gd" x1="${P}" y1="${y(max)}" x2="${W - P}" y2="${y(max)}"/><line class="gd" x1="${P}" y1="${y(min)}" x2="${W - P}" y2="${y(min)}"/><text class="tx" x="2" y="${y(max) + 4}">${max}</text><text class="tx" x="2" y="${y(min) + 4}">${min}</text><path class="ar" d="${area}"/><path class="ln" d="${d}"/><circle class="pt" cx="${x(points.length - 1)}" cy="${y(last.v)}" r="3.5"/><text class="tx" x="${x(0)}" y="${H - 2}">${fmtDate(points[0].date)}</text>${points.length > 1 ? `<text class="tx" x="${x(points.length - 1) - 40}" y="${H - 2}">${fmtDate(last.date)}</text>` : `<text class="tx" x="${x(0) + 40}" y="${H - 2}">la courbe se trace dès la 2e mesure (dimanche)</text>`}<text class="tx" x="${Math.min(x(points.length - 1) + 6, W - 34)}" y="${y(last.v) - 6}" style="fill:var(--accent);font-weight:700">${last.v} ${unit}</text></svg>`;
  }
  function renderTrack() {
    if (location.hash.includes("photos")) UI.trackTab = "photos";
    const tabs = `<div class="tabs" style="margin-bottom:14px"><button class="${UI.trackTab === "week" ? "on" : ""}" data-act="track-tab" data-v="week">Semaine</button><button class="${UI.trackTab === "measures" ? "on" : ""}" data-act="track-tab" data-v="measures">Mensurations</button><button class="${UI.trackTab === "photos" ? "on" : ""}" data-act="track-tab" data-v="photos">Photos</button></div>`;
    return tabs + (UI.trackTab === "photos" ? renderPhotos() : UI.trackTab === "week" ? renderWeek() : renderMeasures());
  }
  function renderMeasures() {
    const all = Data.measurements(); const last = all[all.length - 1]; const first = all[0]; const s = Data.settings();
    const today = isoDate(); const existing = Store.get("measurements/" + (UI.mDate || today)) || {};
    const fields = D.MEASURE_FIELDS.map((f) => `<div class="field"><label>${esc(f.label)}</label><div class="unit"><input type="number" step="${f.step}" inputmode="decimal" id="m-${f.id}" value="${existing[f.id] ?? ""}" placeholder="${last && last[f.id] != null ? last[f.id] : ""}"><span>${f.unit}</span></div></div>`).join("");
    const w = all.filter((m) => m.weight != null).map((m) => ({ date: m.date, v: m.weight })); const wa = all.filter((m) => m.waistRelaxed != null).map((m) => ({ date: m.date, v: m.waistRelaxed }));
    const bf = last ? navyBF(last.waistRelaxed, last.neck, s.heightCm) : null;
    const delta = (k) => last && first && last[k] != null && first[k] != null ? (last[k] - first[k] > 0 ? "+" : "") + Math.round((last[k] - first[k]) * 10) / 10 : "–";
    const hist = all.slice().reverse().slice(0, 12).map((m) => `<tr><td>${fmtDate(m.date)}${m.baseline ? ' <span class="tiny faint">S0</span>' : ""}</td><td class="r">${fmtK(m.weight)}</td><td class="r">${fmtK(m.waistRelaxed)}</td><td class="r">${fmtK(m.chest)}</td><td class="r">${fmtK(m.armR)}</td><td class="r">${fmtK(navyBF(m.waistRelaxed, m.neck, s.heightCm))}</td>${m.baseline ? "<td></td>" : `<td class="r"><button class="tiny" style="color:var(--red)" data-act="del-measure" data-id="${m.date}">suppr.</button></td>`}</tr>`).join("");
    return `
    <div class="card"><div class="grid3">
      <div><div class="eyebrow">Poids</div><div class="big">${last ? fmtK(last.weight) : "–"}</div><div class="tiny muted">kg · ${delta("weight")} depuis S0</div></div>
      <div><div class="eyebrow">Taille</div><div class="big">${last ? fmtK(last.waistRelaxed) : "–"}</div><div class="tiny muted">cm · ${delta("waistRelaxed")} depuis S0</div></div>
      <div><div class="eyebrow">Masse grasse</div><div class="big">${bf != null ? bf : "–"}</div><div class="tiny muted">% estimée (US Navy)</div></div>
    </div></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:6px">Poids (kg)</div>${sparkline(w, "kg")}<div class="eyebrow" style="margin:10px 0 6px">Tour de taille relâché (cm)</div>${sparkline(wa, "cm")}</div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><h3>Nouvelle mesure</h3><input type="date" id="m-date" value="${UI.mDate || today}" style="width:auto" data-bind="m-date"></div>
      <div class="grid2">${fields}</div>
      <div class="field" style="margin-top:10px"><label>Note (sommeil, énergie, faim…)</label><input type="text" id="m-note" value="${esc(existing.note || "")}"></div>
      <button class="btn primary wide" style="margin-top:12px" data-act="save-measure">Enregistrer</button>
      <p class="tiny faint" style="margin-top:8px">Le matin à jeun, avant de boire. Le tour de taille au nombril est ton meilleur indicateur shred. Masse grasse estimée à partir du cou + taille + ${s.heightCm} cm (formule US Navy, ± 3 %).</p></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:8px">Historique</div><div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th class="r">Poids</th><th class="r">Taille</th><th class="r">Poitrine</th><th class="r">Bras D</th><th class="r">MG %</th><th></th></tr></thead><tbody>${hist}</tbody></table></div></div>`;
  }
  function weekBounds(offset) { const today = isoDate(); const dow = (parseDate(today).getDay() + 6) % 7; const monday = addDays(today, -dow - 7 * offset); return { start: monday, end: addDays(monday, 6) }; }
  function weekStats(offset) {
    const { start, end } = weekBounds(offset); const p = Data.program(); const planned = p ? p.days.filter((d) => !d.rest) : [];
    const sessions = Data.sessions().filter((s) => s.date >= start && s.date <= end && s.status === "done");
    const exs = sessions.flatMap((s) => s.exercises.filter((e) => !e.warmup).map((e) => ({ ...e, session: s })));
    const nameOf = (e) => { const day = Data.dayById(e.session.dayId); const pe = day && day.exercises.find((x) => x.id === e.id); const info = pe ? Data.exInfo(pe[e.variant]) : null; return info ? info.name : e.id; };
    const volume = exs.reduce((a, e) => a + e.sets.filter((x) => x.done).reduce((b, x) => b + (x.kg || 0) * (parseInt(x.reps, 10) || 0), 0), 0);
    const m = Data.measurements().filter((x) => x.date >= start && x.date <= end);
    const sup = Store.list("supplementLogs").map((x) => x.data).filter((l) => l.date >= start && l.date <= end); const plan = Data.supplements();
    const supPct = sup.length ? Math.round(100 * sup.reduce((a, l) => a + plan.items.filter((i) => l.taken[i.id]).length, 0) / (sup.length * plan.items.length)) : null;
    const plannedSets = planned.reduce((a, d) => a + d.exercises.filter((e) => !e.warmup).reduce((b, e) => b + e.sets, 0), 0);
    const doneSets = exs.reduce((a, e) => a + Math.min(e.doneSets, e.targetSets), 0);
    const setPct = plannedSets ? Math.round(100 * doneSets / plannedSets) : 0;
    return { start, end, planned, sessions, exs, nameOf, volume, m, supPct, plannedSets, doneSets, setPct, missed: planned.filter((d) => !sessions.find((s) => s.dayId === d.id) && addDays(start, (d.weekday + 6) % 7) < isoDate()) };
  }
  function renderWeek() {
    const off = UI.weekOffset || 0; const w = weekStats(off);
    const easy = w.exs.filter((e) => e.difficulty === "facile"), hard = w.exs.filter((e) => e.difficulty === "difficile"), pain = w.exs.filter((e) => e.pain), skipped = w.exs.filter((e) => e.skipped), partial = w.exs.filter((e) => !e.skipped && e.doneSets < e.targetSets);
    const pct = Math.round(100 * w.sessions.length / Math.max(1, w.planned.length));
    const li = (arr, lab, cls) => arr.length ? `<div class="reviewchg"><b class="${cls || ""}">${lab}</b><div class="tiny muted">${arr.map((e) => esc(w.nameOf(e)) + (e.doneSets < e.targetSets ? ` (${e.doneSets}/${e.targetSets})` : "")).join(" · ")}</div></div>` : "";
    return `
    <div class="card"><div class="row between"><button class="btn sm ghost" data-act="week-off" data-v="${off + 1}">‹</button><div style="text-align:center"><div class="eyebrow">Semaine</div><b>${fmtDate(w.start)} → ${fmtDate(w.end)}</b></div><button class="btn sm ghost" data-act="week-off" data-v="${Math.max(0, off - 1)}" ${off === 0 ? "disabled" : ""}>›</button></div>
      <div style="text-align:center;margin-top:12px"><div class="eyebrow">Programme réalisé</div><div class="big" style="font-size:52px;color:${w.setPct >= 90 ? "var(--accent)" : w.setPct >= 70 ? "var(--amber)" : "var(--red)"}">${w.setPct} %</div><div class="tiny muted">${w.doneSets} séries faites sur ${w.plannedSets} prévues</div></div>
      <div class="grid3" style="margin-top:12px"><div><div class="eyebrow">Séances</div><div class="big">${w.sessions.length}<span style="font-size:20px;color:var(--ink3)">/${w.planned.length}</span></div></div><div><div class="eyebrow">Volume</div><div class="big" style="font-size:28px">${Math.round(w.volume / 1000 * 10) / 10}<span style="font-size:14px;color:var(--ink3)"> t</span></div><div class="tiny muted">kg × reps</div></div><div><div class="eyebrow">Compléments</div><div class="big" style="font-size:28px">${w.supPct == null ? "–" : w.supPct + " %"}</div></div></div>
      <div class="progress" style="margin-top:10px"><i style="width:${w.setPct}%"></i></div>
      <p class="small muted" style="margin-top:8px">${pct === 100 ? "Programme suivi à 100 %." : w.missed.length ? "Manquées : " + w.missed.map((d) => d.name).join(", ") + "." : "Semaine en cours."}</p></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:6px">Difficultés & signaux</div>
      ${li(pain, "Douleur signalée", "") ? li(pain, "Douleur signalée").replace('<b class="">', '<b style="color:var(--red)">') : ""}${li(hard, "Difficile")}${li(easy, "Facile → charge à monter")}${li(partial, "Séries incomplètes")}${li(skipped, "Exercices passés")}
      ${!w.exs.length ? '<p class="small muted">Aucune séance enregistrée cette semaine.</p>' : (!pain.length && !hard.length && !easy.length && !partial.length && !skipped.length ? '<p class="small muted">Rien à signaler : tout est « moyen » et complet.</p>' : "")}</div>
    <div class="card"><div class="eyebrow" style="margin-bottom:6px">Séances de la semaine</div><div class="list">${w.sessions.map((s) => `<div class="item"><div class="grow"><div class="t">${DAYS_SHORT[parseDate(s.date).getDay()]} · ${esc(s.dayName)}</div><div class="s">${sessionProgress(s)} % · ${s.exercises.filter((e) => !e.warmup && e.doneSets > 0).length} exos${s.note ? " · " + esc(s.note) : ""}</div></div></div>`).join("") || '<p class="small muted">—</p>'}</div></div>
    ${w.m.length ? `<div class="card"><div class="eyebrow" style="margin-bottom:6px">Mesures de la semaine</div>${w.m.map((x) => `<p class="small">${fmtDate(x.date)} : ${fmtK(x.weight)} kg · taille ${fmtK(x.waistRelaxed)} cm</p>`).join("")}</div>` : ""}
    <div class="btnrow"><button class="btn ghost" data-act="exp-csv" data-w="sessions" data-week="${off}">CSV de cette semaine</button><button class="btn ghost" data-act="exp-summary" data-week="${off}">Copier le résumé</button></div>`;
  }
  const PHOTO_SLOTS = [["face", "Face"], ["profil", "Profil"], ["dos", "Dos"]];
  function photoUrl(p) { return p ? (p.url || "/_blob/" + p.id) : null; }
  function renderPhotos() {
    const today = UI.pDate || isoDate(); const doc = Store.get("photos/" + today) || { date: today };
    const all = Data.photos(); const canUpload = !!Store.assets;
    const slots = PHOTO_SLOTS.map(([k, lab]) => { const p = doc[k]; return `<div class="ph">${p ? `<img src="${photoUrl(p)}" alt="${lab} ${today}">` : `<span>${lab}<br><span class="tiny">${canUpload ? "toucher pour ajouter" : "upload indisponible hors artifact"}</span></span>`}<span class="badge lab">${lab}</span>${canUpload ? `<input type="file" accept="image/*" data-bind="photo" data-k="${k}" aria-label="Photo ${lab}">` : ""}</div>`; }).join("");
    const dates = all.map((p) => p.date);
    const opt = (sel) => `<option value="">—</option>` + dates.map((d) => `<option value="${d}" ${sel === d ? "selected" : ""}>${fmtDate(d)}</option>`).join("");
    const cmp = (d) => { const p = d && Store.get("photos/" + d); if (!p) return `<div class="photos">${PHOTO_SLOTS.map(([k, l]) => `<div class="ph"><span>${l}</span></div>`).join("")}</div>`; return `<div class="photos">${PHOTO_SLOTS.map(([k, l]) => `<button class="ph" data-act="zoom" data-k="${k}" aria-label="Agrandir ${l}">${p[k] ? `<img src="${photoUrl(p[k])}" alt="${l} ${d}">` : `<span>${l}</span>`}</button>`).join("")}</div>`; };
    const zoom = UI.zoom ? (() => { const k = UI.zoom; const lab = (PHOTO_SLOTS.find(([x]) => x === k) || [])[1]; const side = (d) => { const p = d && Store.get("photos/" + d); return `<div class="zside"><div class="eyebrow" style="color:#fff">${d ? fmtDate(d) : "—"} · ${lab}</div>${p && p[k] ? `<img src="${photoUrl(p[k])}" alt="${lab} ${d}">` : '<div class="zempty">pas de photo</div>'}</div>`; }; return `<div class="zoom" data-act="zoom-close"><div class="zbar"><span class="eyebrow" style="color:#fff">Comparaison · ${lab}</span><div class="chips">${PHOTO_SLOTS.map(([x, l]) => `<button class="chip ${x === k ? "on" : ""}" data-act="zoom" data-k="${x}">${l}</button>`).join("")}</div><button class="btn sm" style="background:#fff;color:#000" data-act="zoom-close">Fermer</button></div><div class="zgrid">${side(UI.cmpA)}${side(UI.cmpB)}</div></div>`; })() : "";
    const gallery = all.slice(0, 12).map((p) => `<div class="item"><div class="grow"><div class="t">${fmtDate(p.date, true)}</div><div class="s">${PHOTO_SLOTS.filter(([k]) => p[k]).map(([, l]) => l).join(" · ") || "vide"}${p.note ? " · " + esc(p.note) : ""}</div></div><button class="btn sm ghost" data-act="photo-date" data-id="${p.date}">Ouvrir</button></div>`).join("");
    return `
    <div class="card"><div class="row between" style="margin-bottom:10px"><h3>Photos de la semaine</h3><input type="date" value="${today}" style="width:auto" data-bind="p-date"></div>
      <div class="photos">${slots}</div>
      <div class="field" style="margin-top:10px"><label>Ressenti / évolution visible</label><input type="text" value="${esc(doc.note || "")}" data-bind="p-note" placeholder="ventre plus plat, épaules qui ressortent…"></div>
      <p class="tiny faint" style="margin-top:8px">Même lumière, même heure, torse nu. Les photos sont compressées (max 1400 px) puis stockées dans l'artifact.</p></div>
    ${zoom}
    <div class="card"><div class="eyebrow" style="margin-bottom:8px">Comparer deux dates</div>
      <div class="grid2"><select data-bind="cmpA">${opt(UI.cmpA)}</select><select data-bind="cmpB">${opt(UI.cmpB)}</select></div>
      <div class="grid2" style="margin-top:10px">${cmp(UI.cmpA)}${cmp(UI.cmpB)}</div></div>
    <div class="card"><div class="eyebrow" style="margin-bottom:8px">Historique</div><div class="list">${gallery || '<p class="small muted">Aucune photo pour l\'instant.</p>'}</div></div>`;
  }
  async function uploadPhoto(file, k) {
    if (!Store.assets) return toast("Upload indisponible");
    toast("Compression…");
    const blob = await compressImage(file, 1400, 0.82);
    try {
      const r = await Store.assets.upload(blob, { type: "image/jpeg" });
      const date = UI.pDate || isoDate(); const doc = Store.get("photos/" + date) || { date };
      doc[k] = { id: r.id, url: r.url, at: new Date().toISOString() }; Store.set("photos/" + date, doc); toast("Photo enregistrée"); render();
    } catch (e) { toast("Échec upload : " + (e.code || e.message)); }
  }
  function compressImage(file, max, q) {
    return new Promise((res) => { const img = new Image(); const url = URL.createObjectURL(file); img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => { URL.revokeObjectURL(url); res(b || file); }, "image/jpeg", q); }; img.onerror = () => res(file); img.src = url; });
  }

  /* ───────────────────────── Compléments ───────────────────────── */
  function renderSupps() {
    const plan = Data.supplements(); const date = UI.supDate; const log = Store.get("supplementLogs/" + date) || { date, taken: {} };
    const done = plan.items.filter((i) => log.taken[i.id]).length;
    const groups = plan.moments.map((m) => { const items = plan.items.filter((i) => i.moment === m.id); if (!items.length) return ""; const allOn = items.every((i) => log.taken[i.id]);
      return `<div class="card" style="padding:12px 14px"><div class="row between" style="margin-bottom:4px"><div><b>${esc(m.label)}</b> <span class="tiny faint">${esc(m.time || "")}</span></div><button class="btn sm ${allOn ? "ghost" : "primary"}" data-act="sup-all" data-m="${m.id}">${allOn ? "Tout décocher" : "Tout pris"}</button></div>
        ${items.map((i) => `<div class="sup ${UI.supOpen === i.id ? "open" : ""}">${checkbox(!!log.taken[i.id], "sup-toggle", `data-id="${i.id}"`)}<div class="grow"><button style="text-align:left;width:100%" data-act="sup-info" data-id="${i.id}"><div class="t">${esc(i.name)} <span class="tiny faint">ⓘ</span>${i.fat ? ' <span class="badge amber" title="avec un repas gras">gras</span>' : ""}${i.cycle ? ` <span class="badge">${esc(i.cycle)}</span>` : ""}</div><div class="s">${esc(i.dose)} · ${esc(i.brand)}</div></button><div class="why">${esc(i.why)}</div></div></div>`).join("")}</div>`; }).join("");
    return `
    <div class="card"><div class="row between"><div><div class="eyebrow">Prises du jour</div><div class="big">${done}<span style="font-size:22px;color:var(--ink3)">/${plan.items.length}</span></div></div><input type="date" value="${date}" style="width:auto" data-bind="sup-date"></div><div class="progress" style="margin-top:8px"><i style="width:${Math.round(100 * done / plan.items.length)}%"></i></div></div>
    ${groups}
    <div class="notice small">Règles : Zinc et Magnésium séparés de 2 h · liposolubles (D3+K2, CoQ10, Oméga-3, Astaxanthine) avec ≥ 10 g de gras · Tongkat + Boron 8 sem ON / 4 OFF · Rhodiola 6 ON / 2 OFF, jamais le soir · 3-4 L d'eau/jour.</div>`;
  }

  /* ───────────────────────── Nutrition ───────────────────────── */
  function mealTotals(foods) { return foods.reduce((a, f) => ({ kcal: a.kcal + (f.kcal || 0), protein: a.protein + (f.protein || 0), carbs: a.carbs + (f.carbs || 0), fat: a.fat + (f.fat || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }); }
  function dayFoods(plan, log) { return plan.meals.map((m) => { const l = (log.meals || {})[m.id] || {}; const foods = l.foods || m.foods; return { meal: m, eaten: !!l.eaten, foods, modified: !!l.foods }; }); }
  function renderNutrition() {
    const plan = Data.nutrition(); const date = UI.nutDate; const log = Store.get("nutritionLogs/" + date) || { date, meals: {} };
    const rows = dayFoods(plan, log); const eaten = rows.filter((r) => r.eaten); const tot = mealTotals(eaten.flatMap((r) => r.foods)); const t = plan.targets;
    const macro = (k, lab, unit) => `<div><b>${Math.round(tot[k])}<span class="tiny faint">/${t[k]}</span></b><span>${lab}</span><div class="progress" style="height:4px;margin-top:4px"><i style="width:${Math.min(100, Math.round(100 * tot[k] / Math.max(1, t[k])))}%"></i></div></div>`;
    const meals = rows.map((r) => { const mt = mealTotals(r.foods); return `<div class="card" style="padding:12px 14px"><div class="row between"><div class="row">${checkbox(r.eaten, "meal-eaten", `data-id="${r.meal.id}"`)}<div><b>${esc(r.meal.name)}</b> <span class="tiny faint">${esc(r.meal.time || "")}${r.modified ? " · modifié" : ""}</span><div class="s tiny muted">${Math.round(mt.kcal)} kcal · P ${Math.round(mt.protein)} · G ${Math.round(mt.carbs)} · L ${Math.round(mt.fat)}</div></div></div><button class="btn sm ghost" data-act="meal-edit" data-id="${r.meal.id}">Modifier</button></div>
      ${r.foods.length ? `<div class="scroll"><table class="tbl" style="margin-top:8px"><tbody>${r.foods.map((f) => `<tr><td>${esc(f.name)}</td><td class="r">${f.grams} g</td><td class="r">${Math.round(f.kcal)} kcal</td><td class="r tiny muted">P ${Math.round(f.protein)} · G ${Math.round(f.carbs)} · L ${Math.round(f.fat)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="tiny faint" style="margin-top:6px">Aucun aliment défini — le plan sera importé plus tard.</p>'}</div>`; }).join("");
    return `
    <div class="card"><div class="row between" style="margin-bottom:8px"><div class="eyebrow">Journée</div><input type="date" value="${date}" style="width:auto" data-bind="nut-date"></div>
      <div class="macro">${macro("kcal", "kcal")}${macro("protein", "prot. g")}${macro("carbs", "gluc. g")}${macro("fat", "lip. g")}</div>
      ${plan.note ? `<p class="tiny faint" style="margin-top:8px">${esc(plan.note)}</p>` : ""}</div>
    ${meals}
    <div class="btnrow"><button class="btn ghost" data-act="nut-targets">Objectifs</button><button class="btn ghost" data-act="nut-add-meal">+ Repas</button><a class="btn ghost" href="#export">Importer un plan</a></div>`;
  }
  function mealEditSheet(mealId, foodsOverride) {
    const plan = Data.nutrition(); const m = plan.meals.find((x) => x.id === mealId); const date = UI.nutDate; const log = Store.get("nutritionLogs/" + date) || { date, meals: {} };
    const l = (log.meals || {})[mealId] || {}; const foods = foodsOverride || clone(l.foods || m.foods);
    const rows = foods.map((f, i) => `<div class="row" style="margin-top:8px"><div class="grow small"><b>${esc(f.name)}</b><div class="tiny muted">${Math.round(f.kcal)} kcal pour ${f.grams} g</div></div><div class="unit" style="width:110px;position:relative"><input type="number" inputmode="decimal" value="${f.grams}" data-bind="food-g" data-i="${i}" aria-label="grammes ${esc(f.name)}"><span style="position:absolute;right:10px;top:50%;transform:translateY(-50%)" class="tiny faint">g</span></div><button class="tiny" style="color:var(--red)" data-act="food-del" data-i="${i}">✕</button></div>`).join("");
    UI.editFoods = foods; UI.editMeal = mealId;
    sheet(`<h3>${esc(m.name)} · ${fmtDate(date)}</h3><p class="small muted">Change les grammes (les macros suivent), retire un aliment ou ajoutes-en un. Ça ne modifie que cette journée.</p>${rows}
      <div class="card flat" style="margin-top:12px;padding:10px"><div class="eyebrow" style="margin-bottom:6px">Ajouter un aliment</div><input type="text" id="nf-name" placeholder="Nom"><div class="grid2" style="margin-top:6px"><input type="number" id="nf-g" placeholder="g" inputmode="decimal"><input type="number" id="nf-kcal" placeholder="kcal" inputmode="decimal"></div><div class="grid3" style="margin-top:6px"><input type="number" id="nf-p" placeholder="prot g" inputmode="decimal"><input type="number" id="nf-c" placeholder="gluc g" inputmode="decimal"><input type="number" id="nf-f" placeholder="lip g" inputmode="decimal"></div><button class="btn sm ghost" style="margin-top:8px" data-act="food-add">Ajouter</button></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" data-act="meal-save">Enregistrer pour ce jour</button><button class="btn ghost" data-act="meal-save-plan">Enregistrer dans le plan</button></div>
      <button class="btn line wide sm" style="margin-top:8px" data-act="meal-reset">Revenir au plan</button>`);
  }

  /* ───────────────────────── Bilan & ajustements ───────────────────────── */
  function renderReviews() {
    const rs = Data.reviews();
    if (!rs.length) return `<div class="card"><h3>Aucun bilan pour l'instant</h3><p class="small muted" style="margin-top:6px">Chaque semaine, l'IA (Claude / Codex) lit tes séances et mensurations dans la base de l'app, puis écrit ici son bilan : ce qui change, pourquoi, et à partir de quand. Une pastille rouge apparaît sur « Plus » quand un nouveau bilan arrive.</p></div>`;
    return rs.map((r) => `<div class="card ${r.seen ? "" : "amberc"}"><div class="row between"><div><span class="eyebrow">${esc(fmtDate(r.date || isoDate(), true))}</span><h3 style="margin-top:2px">${esc(r.title || "Bilan hebdomadaire")}</h3></div>${r.seen ? "" : '<span class="badge red">nouveau</span>'}</div>
      <p class="small" style="margin-top:8px;white-space:pre-line">${esc(r.summary || "")}</p>
      ${(r.changes || []).length ? `<div style="margin-top:10px">${r.changes.map((c) => `<div class="reviewchg"><b>${esc(c.what)}</b>${c.from != null || c.to != null ? ` : <span class="muted">${esc(c.from ?? "–")}</span> → <b>${esc(c.to ?? "–")}</b>` : ""}${c.why ? `<div class="tiny muted">${esc(c.why)}</div>` : ""}</div>`).join("")}</div>` : '<p class="tiny faint" style="margin-top:8px">Aucun changement : le programme est conservé.</p>'}
      <div class="row between" style="margin-top:10px"><span class="tiny faint">${r.programVersionTo ? `Programme v${r.programVersionFrom || "?"} → v${r.programVersionTo}` : ""}${r.appliesFrom ? ` · dès le ${fmtDate(r.appliesFrom)}` : ""}</span>${r.seen ? "" : `<button class="btn sm primary" data-act="review-seen" data-id="${r.id}">Vu</button>`}</div>
      ${r.programVersionFrom && r.programVersionTo ? `<button class="btn line sm wide" style="margin-top:8px" data-act="restore-version" data-id="v${r.programVersionFrom}">Revenir à la v${r.programVersionFrom}</button>` : ""}</div>`).join("");
  }

  /* ───────────────────────── Export / Import ───────────────────────── */
  function csvEscape(v) { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCSV(rows) { if (!rows.length) return ""; const keys = Object.keys(rows[0]); return [keys.join(";"), ...rows.map((r) => keys.map((k) => csvEscape(r[k])).join(";"))].join("\n"); }
  function sessionRows(weekOff) {
    const wb = weekOff != null ? weekBounds(weekOff) : null;
    const out = []; Data.sessions().filter((s) => !wb || (s.date >= wb.start && s.date <= wb.end)).forEach((s) => { const day = Data.dayById(s.dayId); s.exercises.forEach((e) => { const pe = day && day.exercises.find((x) => x.id === e.id); const info = pe ? Data.exInfo(pe[e.variant]) : null; const done = e.sets.filter((x) => x.done); const kgs = done.map((x) => x.kg).filter((x) => x != null);
      out.push({ date: s.date, seance: s.dayName, statut: s.status, exercice: info ? info.name : e.id, variante: e.variant, bloc: e.block, series_prevues: e.targetSets, series_faites: e.doneSets, reps_prevues: e.reps, reps_faites: done.map((x) => x.reps).join("/"), charge_kg: kgs.length ? Math.max(...kgs) : "", charge_lbs: kgs.length ? toLbs(Math.max(...kgs)) : "", difficulte: e.difficulty, douleur: e.pain ? "oui" : "", passe: e.skipped ? "oui" : "", note: e.note, note_seance: s.note || "" }); }); }); return out;
  }
  function measureRows() { const s = Data.settings(); return Data.measurements().map((m) => { const o = { date: m.date }; D.MEASURE_FIELDS.forEach((f) => (o[f.id] = m[f.id] ?? "")); o.masse_grasse_estimee = navyBF(m.waistRelaxed, m.neck, s.heightCm) ?? ""; o.note = m.note || ""; return o; }); }
  function suppRows() { const plan = Data.supplements(); return Store.list("supplementLogs").map((x) => x.data).map((l) => ({ date: l.date, pris: plan.items.filter((i) => l.taken[i.id]).length, total: plan.items.length, manques: plan.items.filter((i) => !l.taken[i.id]).map((i) => i.name).join(", ") })); }
  function nutritionRows() { const plan = Data.nutrition(); return Store.list("nutritionLogs").map((x) => x.data).map((l) => { const rows = dayFoods(plan, l); const tot = mealTotals(rows.filter((r) => r.eaten).flatMap((r) => r.foods)); return { date: l.date, repas_valides: rows.filter((r) => r.eaten).length, repas_prevus: rows.length, kcal: Math.round(tot.kcal), proteines: Math.round(tot.protein), glucides: Math.round(tot.carbs), lipides: Math.round(tot.fat), cible_kcal: plan.targets.kcal, cible_prot: plan.targets.protein }; }); }
  function aiSummary(weekOff) {
    if (weekOff != null) { const w = weekStats(weekOff); const s = Data.settings(); const lines = [`# Shredlog — bilan semaine ${w.start} → ${w.end}`, `Programme réalisé : ${w.setPct} % (${w.doneSets}/${w.plannedSets} séries) · Séances : ${w.sessions.length}/${w.planned.length}${w.missed.length ? " (manquées : " + w.missed.map((d) => d.name).join(", ") + ")" : ""} · volume ${Math.round(w.volume)} kg×reps · compléments ${w.supPct == null ? "–" : w.supPct + " %"}`, ""]; w.sessions.forEach((x) => { lines.push(`## ${x.date} — ${x.dayName} (${sessionProgress(x)} %)`); x.exercises.filter((e) => !e.warmup).forEach((e) => { const done = e.sets.filter((q) => q.done); lines.push(`- ${w.nameOf({ ...e, session: x })} [${e.variant}] : ${e.doneSets}/${e.targetSets} séries, ${done.map((q) => `${q.kg != null ? q.kg + "kg" : "PDC"}×${q.reps}`).join(" ") || "–"}${e.difficulty ? " · " + e.difficulty : ""}${e.pain ? " · DOULEUR" : ""}${e.skipped ? " · passé" : ""}${e.note ? " · " + e.note : ""}`); }); }); if (w.m.length) { lines.push("", "## Mesures"); w.m.forEach((m) => lines.push(`- ${m.date} : ${fmtK(m.weight)} kg, taille ${fmtK(m.waistRelaxed)} cm, cou ${fmtK(m.neck)}, MG est. ${fmtK(navyBF(m.waistRelaxed, m.neck, s.heightCm))} %`)); } return lines.join("\n"); }
    const s = Data.settings(); const ms = Data.measurements(); const last = ms[ms.length - 1]; const sessions = Data.sessions().filter((x) => x.status === "done").slice(0, 10);
    const lines = [`# Shredlog — résumé pour l'IA (${fmtDate(isoDate(), true)})`, `Profil : ${s.name}, ${s.heightCm} cm, objectif shred (~12 % MG) + volume haut du corps + posture. Programme v${Data.program() ? Data.program().version : "?"}.`, "", "## Dernières mensurations", ...ms.slice(-4).map((m) => `- ${m.date} : poids ${fmtK(m.weight)} kg, taille ${fmtK(m.waistRelaxed)} cm, cou ${fmtK(m.neck)}, bras D ${fmtK(m.armR)}, MG est. ${fmtK(navyBF(m.waistRelaxed, m.neck, s.heightCm))} %${m.note ? " — " + m.note : ""}`), "", "## 10 dernières séances"];
    sessions.forEach((x) => { const day = Data.dayById(x.dayId); lines.push(`### ${x.date} — ${x.dayName} (${sessionProgress(x)} %)`); x.exercises.filter((e) => !e.warmup).forEach((e) => { const pe = day && day.exercises.find((q) => q.id === e.id); const info = pe ? Data.exInfo(pe[e.variant]) : null; const done = e.sets.filter((q) => q.done); lines.push(`- ${info ? info.name : e.id} [${e.variant}] : ${e.doneSets}/${e.targetSets} séries, ${done.map((q) => `${q.kg != null ? q.kg + "kg" : "PDC"}×${q.reps}`).join(" ") || "–"}${e.difficulty ? " · " + e.difficulty : ""}${e.pain ? " · DOULEUR" : ""}${e.skipped ? " · passé" : ""}${e.note ? " · " + e.note : ""}`); }); });
    const sr = suppRows().slice(-7); if (sr.length) { lines.push("", "## Compléments (7 derniers jours)"); sr.forEach((r) => lines.push(`- ${r.date} : ${r.pris}/${r.total}${r.manques ? " (manqués : " + r.manques + ")" : ""}`)); }
    const nr = nutritionRows().slice(-7); if (nr.length) { lines.push("", "## Nutrition (7 derniers jours)"); nr.forEach((r) => lines.push(`- ${r.date} : ${r.kcal} kcal, P ${r.proteines} g (cible ${r.cible_kcal} / ${r.cible_prot})`)); }
    return lines.join("\n");
  }
  async function download(filename, data, mime) {
    if (Store.downloads) { try { await Store.downloads.save({ filename, data }); toast("Fichier prêt"); return; } catch (e) { if (e && e.code === "declined") return; } }
    try { const blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); toast("Téléchargement lancé"); } catch (e) { toast("Téléchargement impossible ici"); }
  }
  function exportXLSX() {
    if (!window.XLSX) return toast("Librairie Excel non chargée");
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ info: "aucune donnée" }]), name);
    add("Séances", sessionRows()); add("Mensurations", measureRows()); add("Compléments", suppRows()); add("Nutrition", nutritionRows());
    const p = Data.program(); if (p) add("Programme", p.days.flatMap((d) => d.exercises.map((e) => { const m = Data.exInfo(e.machine), dd = Data.exInfo(e.dumbbell); return { jour: d.name, bloc: e.block, series: e.sets, reps: e.reps, repos_s: e.rest, machine: m ? m.name : "", machine_kg: e.machine ? e.machine.kg ?? "" : "", machine_lbs: e.machine ? e.machine.lbs ?? "" : "", halteres: dd ? dd.name : "", halteres_kg: e.dumbbell ? e.dumbbell.kg ?? "" : "", halteres_lbs: e.dumbbell ? e.dumbbell.lbs ?? "" : "", defaut: e.primary }; })));
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    download(`shredlog_${isoDate()}.xlsx`, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  }
  function renderExport() {
    return `
    <div class="card"><h3>Exporter</h3><p class="small muted" style="margin:6px 0 10px">Pour ton coach ou une IA. CSV séparé par « ; » (Excel FR), ou classeur Excel multi-onglets.</p>
      <div class="field" style="margin-bottom:10px"><label>Période des séances</label><select id="exp-period"><option value="all">Tout l'historique</option><option value="0">Cette semaine</option><option value="1">Semaine dernière</option></select></div>
      <div class="stack">
        <button class="btn primary" data-act="exp-xlsx">Excel complet (.xlsx)</button>
        <div class="btnrow"><button class="btn ghost" data-act="exp-csv" data-w="sessions">CSV séances</button><button class="btn ghost" data-act="exp-csv" data-w="measures">CSV mensurations</button></div>
        <div class="btnrow"><button class="btn ghost" data-act="exp-csv" data-w="supps">CSV compléments</button><button class="btn ghost" data-act="exp-csv" data-w="nutrition">CSV nutrition</button></div>
        <button class="btn ghost" data-act="exp-json">Sauvegarde complète (.json)</button>
        <button class="btn ghost" data-act="exp-summary">Copier le résumé texte pour l'IA</button>
      </div></div>
    <div class="card"><h3>Importer un programme</h3><p class="small muted" style="margin:6px 0 10px">Colle le JSON préparé par ton coach ou une IA (même structure que l'export « programme »). Il devient la nouvelle version ; l'ancienne reste restaurable.</p>
      <textarea id="imp-json" placeholder='{"name": "...", "days": [...]}'></textarea>
      <input type="text" id="imp-reason" placeholder="Motif (ex. : bilan semaine 4, +2,5 kg développé)" style="margin-top:8px">
      <div class="btnrow" style="margin-top:8px"><button class="btn primary" data-act="imp-program">Importer comme nouvelle version</button><button class="btn ghost" data-act="exp-program">Copier le programme actuel</button></div>
      <p class="tiny faint" style="margin-top:8px">Un JSON contenant <code>meals</code> et <code>targets</code> est importé comme plan nutrition ; un JSON avec <code>items</code> et <code>moments</code> comme plan de compléments ; un JSON de sauvegarde complète restaure tout.</p></div>`;
  }
  function importJSON(text, reason) {
    let o; try { o = JSON.parse(text); } catch (e) { return toast("JSON invalide"); }
    if (o.docs && o.shredlogBackup) { Object.entries(o.docs).forEach(([k, v]) => Store.set(k, v)); toast("Sauvegarde restaurée"); return; }
    if (o.meals && o.targets) { o.version = (Data.nutrition().version || 0) + 1; Store.set("nutrition/plan", o); toast("Plan nutrition importé"); return; }
    if (o.items && o.moments) { Store.set("supplements/plan", o); toast("Plan compléments importé"); return; }
    if (!Array.isArray(o.days)) return toast("Structure inconnue : il faut « days »");
    const cur = Data.program(); const v = (cur ? cur.version : 0) + 1;
    o.days.forEach((d) => { d.exercises = d.exercises || []; d.exercises.forEach((e, i) => { e.id = e.id || `${d.id}_${i}`; e.primary = e.primary || (e.machine ? "machine" : "dumbbell"); ["machine", "dumbbell"].forEach((k) => { if (e[k]) { if (e[k].kg != null && e[k].lbs == null) e[k].lbs = toLbs(e[k].kg); if (e[k].lbs != null && e[k].kg == null) e[k].kg = toKg(e[k].lbs); if (!D.EX[e[k].ex] && !e[k].custom) e[k].custom = { name: e[k].name || e[k].ex || "Exercice", cues: e[k].cues || [], primary: e[k].muscles || [] }; } }); e.sets = e.sets || 3; e.reps = e.reps || "10"; }); });
    const p = { ...o, version: v, createdAt: o.createdAt || isoDate() };
    Store.set("program/current", p); Store.set(`programVersions/v${v}`, { ...clone(p), savedAt: new Date().toISOString(), reason: reason || "Import" });
    Store.set(`reviews/${isoDate()}_import_v${v}`, { date: isoDate(), title: `Nouveau programme v${v}`, summary: reason || "Programme importé.", changes: [], programVersionFrom: cur ? cur.version : null, programVersionTo: v, seen: true });
    toast(`Programme v${v} actif`);
  }

  /* ───────────────────────── Réglages / Plus / Posture ───────────────────────── */
  function renderSettings() {
    const s = Data.settings();
    return `<div class="card"><div class="stack">
      <div class="field"><label>Prénom</label><input type="text" value="${esc(s.name)}" data-bind="set-name"></div>
      <div class="field"><label>Taille (cm) — pour l'estimation de masse grasse</label><input type="number" value="${s.heightCm}" data-bind="set-height"></div>
      <div class="field"><label>Thème</label><div class="tabs">${["auto", "light", "dark"].map((t) => `<button class="${s.theme === t ? "on" : ""}" data-act="set-theme" data-v="${t}">${{ auto: "Auto", light: "Clair", dark: "Sombre" }[t]}</button>`).join("")}</div></div>
    </div></div>
    ${window.ShredBackend && window.ShredBackend.configured ? `<div class="card"><h3>Compte</h3>${window.ShredBackend.connected ? `<p class="small muted" style="margin-top:6px">Connecté : ${esc(window.ShredBackend.user ? window.ShredBackend.user.email : "")}</p><button class="btn ghost sm" style="margin-top:8px" data-act="logout">Se déconnecter</button>` : `<p class="small muted" style="margin:6px 0 10px">Identifiants du compte Supabase (créé une seule fois).</p><div class="stack"><input type="email" id="login-email" placeholder="Email" autocomplete="username"><input type="password" id="login-pw" placeholder="Mot de passe" autocomplete="current-password"><button class="btn primary" data-act="login">${UI.loginBusy ? "Connexion…" : "Se connecter"}</button>${UI.loginError ? `<div class="notice red small">${esc(UI.loginError)}</div>` : ""}</div>`}</div>` : ""}
    <div class="card"><h3>Sur iPhone</h3><p class="small muted" style="margin-top:6px">Safari → Partager → « Sur l'écran d'accueil ». L'app s'ouvre en plein écran, fonctionne hors ligne et synchronise dès que le réseau revient.</p></div>
    <div class="card"><h3>Connexion IA</h3><p class="small muted" style="margin-top:6px">Claude / Codex lisent et écrivent directement dans la base de cet artifact (collections : sessions, measurements, photos, supplementLogs, nutritionLogs, program, programVersions, reviews, nutrition, supplements). Le guide du schéma est dans la collection <code>meta/guide</code>.</p></div>
    <div class="card"><h3>Diagnostic</h3><p class="tiny muted" style="margin-top:6px">Build 6 · ${Store.db ? "base connectée" : "base non connectée"} · ${Store.pending.size} en attente · écran ${window.innerWidth}×${window.innerHeight}${UI.lastError ? " · dernière erreur : " + esc(UI.lastError) : ""}</p></div>
    <div class="card"><h3>Données</h3><div class="stack" style="margin-top:8px"><button class="btn ghost" data-act="resync">Forcer la synchronisation</button><button class="btn danger" data-act="reset-local">Vider le cache local (les données restent dans la base)</button></div></div>`;
  }
  function renderMore() {
    const unseen = Data.unseenReviews();
    const items = [["#program", "Programme", "séances, charges, versions", ICON.prog], ["#supps", "Compléments", "prises du jour et fiches", ICON.pill], ["#reviews", "Bilan & ajustements", unseen ? `${unseen} nouveau${unseen > 1 ? "x" : ""}` : "historique des changements", ICON.review], ["#posture", "Routine posture", "5 min / jour", ICON.posture], ["#export", "Export / Import", "CSV, Excel, JSON", ICON.export], ["#settings", "Réglages", "thème, taille, données", ICON.gear]];
    return `<div class="card"><div class="list">${items.map(([h, t, s, ic]) => `<a class="item" href="${h}" style="text-decoration:none;color:inherit"><span class="ic" style="color:var(--accent);width:26px">${ic}</span><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div><span class="chev">›</span></a>`).join("")}</div></div>`;
  }
  function renderPosture() {
    const items = D.PROGRAM.posture; const today = isoDate(); const log = Store.get("supplementLogs/" + today) || { date: today, taken: {} };
    return `<div class="card"><p class="small muted">Ta bascule antérieure du bassin vient de 4 facteurs : fléchisseurs de hanche raccourcis, lombaires tendues, fessiers faibles, abdos profonds faibles. 5 minutes, tous les jours, matin ou soir.</p></div>
    ${items.map((it, i) => { const info = it.ex ? Data.exInfo({ ex: it.ex }) : null; return `<div class="card" style="padding:12px"><div class="row between"><div><b>${esc(it.name)}</b><div class="small muted">${esc(it.dur)}</div></div>${checkbox(!!log.taken["posture" + i], "sup-toggle", `data-id="posture${i}"`)}</div>${info && info.img ? `<div style="margin-top:10px">${demoBlock(info, "Posture")}</div>` : ""}</div>`; }).join("")}
    <div class="notice small">Au quotidien : lève-toi toutes les 45 min, menton rentré, poitrine ouverte, fessiers légèrement serrés pour neutraliser le bassin. Téléphone à hauteur des yeux.</div>`;
  }

  /* ───────────────────────── Actions ───────────────────────── */
  function applyTheme() { const t = Data.settings().theme; if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t); }
  function withSession(fn) { const s = activeSession(); if (!s) return; fn(s); saveSession(s); }
  function finishSession(s, abandoned) { s.status = abandoned ? "abandoned" : "done"; s.finishedAt = new Date().toISOString(); s.progress = sessionProgress(s); saveSession(s); Timer.stop(); }
  function summarySheet(s) {
    const day = Data.dayById(s.dayId); const hard = s.exercises.filter((e) => e.difficulty === "difficile").length, easy = s.exercises.filter((e) => e.difficulty === "facile").length, pain = s.exercises.filter((e) => e.pain).length;
    const mins = s.startedAt && s.finishedAt ? Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000) : null;
    sheet(`<h2>Séance enregistrée ✓</h2><p class="muted small" style="margin:6px 0 12px">${esc(s.dayName)} · ${sessionProgress(s)} %${mins != null ? ` · ${mins} min` : ""}</p>
      <div class="grid3"><div class="card flat" style="margin:0;padding:10px;text-align:center"><div class="big" style="font-size:28px;color:var(--blue)">${easy}</div><div class="tiny muted">faciles</div></div><div class="card flat" style="margin:0;padding:10px;text-align:center"><div class="big" style="font-size:28px">${hard}</div><div class="tiny muted">difficiles</div></div><div class="card flat" style="margin:0;padding:10px;text-align:center"><div class="big" style="font-size:28px;color:var(--red)">${pain}</div><div class="tiny muted">douleur</div></div></div>
      <div class="list" style="margin-top:12px">${s.exercises.filter((e) => !e.warmup).map((e) => { const pe = day && day.exercises.find((x) => x.id === e.id); const info = pe ? Data.exInfo(pe[e.variant]) : null; const done = e.sets.filter((x) => x.done); return `<div class="item"><div class="grow"><div class="t small">${esc(info ? info.name : e.id)}</div><div class="s">${e.skipped ? "passé" : `${e.doneSets}/${e.targetSets} séries · ${done.map((x) => `${x.kg != null ? x.kg + "kg" : "PDC"}×${x.reps}`).join(" ") || "–"}`}${e.difficulty ? " · " + e.difficulty : ""}</div></div></div>`; }).join("")}</div>
      <div class="field" style="margin-top:12px"><label>Note de séance</label><input type="text" value="${esc(s.note || "")}" data-bind="session-note" data-id="${s.id}"></div>
      <button class="btn primary wide" style="margin-top:12px" data-act="close-sheet">OK</button>`);
  }

  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act; const id = b.dataset.id;
    switch (act) {
      case "close-sheet": closeSheet(); break;
      case "confirm-ok": { const fn = UI._confirm; UI._confirm = null; closeSheet(); if (fn) fn(); break; }
      case "load-default": Data.ensureProgram(); render(); break;
      case "pick-day": UI.sessionDay = id; render(); break;
      case "start-session": { const day = Data.dayById(id); const s = newSession(day); Data.sessions().filter((x) => x.status === "in_progress").forEach((x) => { x.status = "abandoned"; x.finishedAt = new Date().toISOString(); saveSession(x); }); UI.cuesOpen = false; UI.summary = null; saveSession(s); render(); break; }
      case "variant": withSession((s) => { const se = s.exercises[s.cursor]; const day = Data.dayById(s.dayId); const pe = day.exercises.find((e) => e.id === se.id); const v = pe[b.dataset.v]; if (!v) return; se.variant = b.dataset.v; se.sets.forEach((st) => { if (!st.done) { st.kg = v.kg; st.lbs = toLbs(v.kg); } }); }); render(); break;
      case "toggle-cues": UI.cuesOpen = !UI.cuesOpen; render(); break;
      case "toggle-set": withSession((s) => { const se = s.exercises[s.cursor]; const i = +b.dataset.i; se.sets[i].done = !se.sets[i].done; se.doneSets = se.sets.filter((x) => x.done).length; }); render(); break;
      case "add-set": withSession((s) => { const se = s.exercises[s.cursor]; const last = se.sets[se.sets.length - 1]; se.sets.push({ kg: last.kg, lbs: last.lbs, reps: last.reps, done: false }); }); render(); break;
      case "sets-plus": case "sets-minus": withSession((s) => { const se = s.exercises[s.cursor]; let n = se.doneSets + (act === "sets-plus" ? 1 : -1); n = Math.max(0, Math.min(se.sets.length, n)); se.doneSets = n; se.sets.forEach((st, i) => (st.done = i < n)); }); render(); break;
      case "warmup-done": withSession((s) => { const se = s.exercises[s.cursor]; se.doneSets = se.doneSets ? 0 : 1; se.sets.forEach((st) => (st.done = !!se.doneSets)); }); render(); break;
      case "difficulty": withSession((s) => { const se = s.exercises[s.cursor]; se.difficulty = se.difficulty === b.dataset.v ? "" : b.dataset.v; }); render(); break;
      case "pain": withSession((s) => { const se = s.exercises[s.cursor]; se.pain = !se.pain; }); render(); break;
      case "rest": if (Timer.running()) Timer.stop(); else Timer.start(+b.dataset.s || 60); break;
      case "ex-prev": withSession((s) => { s.cursor = Math.max(0, s.cursor - 1); }); UI.cuesOpen = false; render(); break;
      case "ex-next": { const s = activeSession(); if (!s) break; if (s.cursor >= s.exercises.length - 1) { finishSession(s); render(); summarySheet(s); } else { s.cursor++; saveSession(s); UI.cuesOpen = false; render(); } break; }
      case "skip-ex": withSession((s) => { const se = s.exercises[s.cursor]; se.skipped = true; if (s.cursor < s.exercises.length - 1) s.cursor++; }); render(); break;
      case "finish-session": { const s = activeSession(); if (!s) break; ask("Terminer la séance ?", "Les exercices non faits resteront à 0. La séance sera enregistrée telle quelle.", "Terminer", () => { finishSession(s); render(); summarySheet(s); }); break; }
      case "abandon-session": { const s = activeSession(); if (!s) break; ask("Abandonner la séance ?", "La séance en cours sera fermée sans être comptée.", "Abandonner", () => { s.status = "abandoned"; s.finishedAt = new Date().toISOString(); saveSession(s); Timer.stop(); render(); }, true); break; }
      case "prog-day": UI.progDay = id; render(); break;
      case "prog-back": UI.progDay = null; render(); break;
      case "prog-primary": { const p = Data.program(); p.days.forEach((d) => d.exercises.forEach((e) => { if (e.id === b.dataset.ex && e[b.dataset.v]) e.primary = b.dataset.v; })); Store.set("program/current", p); render(); break; }
      case "restore-version": { const v = Store.get("programVersions/" + id); if (!v) break; const cur = Data.program(); const nv = cur.version + 1; const p = { ...clone(v), version: nv }; delete p.savedAt; delete p.reason; Store.set("program/current", p); Store.set(`programVersions/v${nv}`, { ...clone(p), savedAt: new Date().toISOString(), reason: `Restauration de la ${id}` }); toast(`v${nv} active (copie de ${id})`); render(); break; }
      case "week-off": UI.weekOffset = +b.dataset.v; render(); break;
      case "track-tab": UI.trackTab = b.dataset.v; if (location.hash.includes("?")) history.replaceState(null, "", "#track"); render(); break;
      case "save-measure": { const date = $("#m-date").value || isoDate(); const m = { date }; let any = false; D.MEASURE_FIELDS.forEach((f) => { const v = num($("#m-" + f.id).value); if (v != null) { m[f.id] = v; any = true; } }); m.note = $("#m-note").value; if (!any) return toast("Aucune valeur saisie"); Store.set("measurements/" + date, m); toast("Mesures enregistrées"); render(); break; }
      case "del-measure": ask("Supprimer cette mesure ?", fmtDate(id, true), "Supprimer", () => { Store.del("measurements/" + id); render(); }, true); break;
      case "photo-date": UI.pDate = id; render(); break;
      case "zoom": ev.stopPropagation(); if (!UI.cmpA && !UI.cmpB) { const ds = Data.photos().map((p) => p.date); UI.cmpB = ds[0] || null; UI.cmpA = ds[1] || ds[0] || null; } UI.zoom = b.dataset.k; render(); break;
      case "zoom-close": if (ev.target.closest("[data-act=zoom]")) break; UI.zoom = null; render(); break;
      case "sup-toggle": { const date = UI.view === "posture" ? isoDate() : UI.supDate; const log = Store.get("supplementLogs/" + date) || { date, taken: {} }; log.taken[id] = !log.taken[id]; Store.set("supplementLogs/" + date, log); render(); break; }
      case "sup-all": { const plan = Data.supplements(); const date = UI.supDate; const log = Store.get("supplementLogs/" + date) || { date, taken: {} }; const items = plan.items.filter((i) => i.moment === b.dataset.m); const allOn = items.every((i) => log.taken[i.id]); items.forEach((i) => (log.taken[i.id] = !allOn)); Store.set("supplementLogs/" + date, log); render(); break; }
      case "sup-info": UI.supOpen = UI.supOpen === id ? null : id; render(); break;
      case "meal-eaten": { const date = UI.nutDate; const log = Store.get("nutritionLogs/" + date) || { date, meals: {} }; log.meals = log.meals || {}; log.meals[id] = log.meals[id] || {}; log.meals[id].eaten = !log.meals[id].eaten; Store.set("nutritionLogs/" + date, log); render(); break; }
      case "meal-edit": mealEditSheet(id); break;
      case "food-del": UI.editFoods.splice(+b.dataset.i, 1); mealEditSheetRefresh(); break;
      case "food-add": { const f = { name: $("#nf-name").value.trim(), grams: num($("#nf-g").value) || 0, kcal: num($("#nf-kcal").value) || 0, protein: num($("#nf-p").value) || 0, carbs: num($("#nf-c").value) || 0, fat: num($("#nf-f").value) || 0 }; if (!f.name) return toast("Nom manquant"); UI.editFoods.push(f); mealEditSheetRefresh(); break; }
      case "meal-save": { const date = UI.nutDate; const log = Store.get("nutritionLogs/" + date) || { date, meals: {} }; log.meals = log.meals || {}; log.meals[UI.editMeal] = { ...(log.meals[UI.editMeal] || {}), foods: clone(UI.editFoods), eaten: true }; Store.set("nutritionLogs/" + date, log); closeSheet(); render(); toast("Repas enregistré"); break; }
      case "meal-save-plan": { const plan = clone(Data.nutrition()); const m = plan.meals.find((x) => x.id === UI.editMeal); m.foods = clone(UI.editFoods); Store.set("nutrition/plan", plan); closeSheet(); render(); toast("Plan mis à jour"); break; }
      case "meal-reset": { const date = UI.nutDate; const log = Store.get("nutritionLogs/" + date); if (log && log.meals && log.meals[UI.editMeal]) { delete log.meals[UI.editMeal].foods; Store.set("nutritionLogs/" + date, log); } closeSheet(); render(); break; }
      case "nut-targets": { const t = Data.nutrition().targets; sheet(`<h3>Objectifs journaliers</h3><div class="grid2" style="margin-top:10px">${[["kcal", "kcal"], ["protein", "Protéines (g)"], ["carbs", "Glucides (g)"], ["fat", "Lipides (g)"]].map(([k, l]) => `<div class="field"><label>${l}</label><input type="number" id="t-${k}" value="${t[k]}"></div>`).join("")}</div><button class="btn primary wide" style="margin-top:12px" data-act="nut-targets-save">Enregistrer</button>`); break; }
      case "nut-targets-save": { const plan = clone(Data.nutrition()); ["kcal", "protein", "carbs", "fat"].forEach((k) => (plan.targets[k] = num($("#t-" + k).value) || 0)); Store.set("nutrition/plan", plan); closeSheet(); render(); break; }
      case "nut-add-meal": sheet(`<h3>Nouveau repas</h3><div class="grid2" style="margin-top:10px"><input type="text" id="nm-name" placeholder="Nom (ex. Dîner)"><input type="time" id="nm-time"></div><button class="btn primary wide" style="margin-top:12px" data-act="nut-add-meal-save">Ajouter</button>`); break;
      case "nut-add-meal-save": { const name = $("#nm-name").value.trim(); if (!name) return toast("Nom manquant"); const plan = clone(Data.nutrition()); plan.meals.push({ id: "m" + uid(), name, time: $("#nm-time").value || "", foods: [] }); Store.set("nutrition/plan", plan); closeSheet(); render(); break; }
      case "review-seen": { const r = Store.get("reviews/" + id); if (r) { r.seen = true; Store.set("reviews/" + id, r); } render(); break; }
      case "exp-xlsx": exportXLSX(); break;
      case "exp-csv": { const w = b.dataset.w; const rows = { sessions: sessionRows(), measures: measureRows(), supps: suppRows(), nutrition: nutritionRows() }[w]; if (!rows.length) return toast("Aucune donnée"); download(`shredlog_${w}_${isoDate()}.csv`, "﻿" + toCSV(rows), "text/csv"); break; }
      case "exp-json": download(`shredlog_backup_${isoDate()}.json`, JSON.stringify({ shredlogBackup: true, exportedAt: new Date().toISOString(), docs: Store.docs }, null, 1), "application/json"); break;
      case "exp-program": { const p = Data.program(); copyText(JSON.stringify(p, null, 1)); break; }
      case "exp-summary": copyText(aiSummary(b.dataset.week != null ? +b.dataset.week : null)); break;
      case "imp-program": importJSON($("#imp-json").value, $("#imp-reason").value); render(); break;
      case "set-theme": { const s = Data.settings(); s.theme = b.dataset.v; Data.saveSettings(s); applyTheme(); render(); break; }
      case "login": { const em = $("#login-email").value.trim(), pw = $("#login-pw").value; if (!em || !pw) { UI.loginError = "Email et mot de passe requis."; render(); break; } UI.loginBusy = true; UI.loginError = ""; b.textContent = "Connexion…"; try { await window.ShredBackend.login(em, pw); UI.loginBusy = false; toast("Connecté"); await Store.connectSupabase(); Store.updateBanner(); render(); } catch (e) { UI.loginBusy = false; UI.loginError = "Connexion refusée : " + (e.message === "Invalid login credentials" ? "email ou mot de passe incorrect." : e.message); render(); const el = $("#login-email"); if (el) el.value = em; } break; }
      case "logout": window.ShredBackend.logout(); Store.db = null; Store.needLogin = true; Store.updateBanner(); render(); break;
      case "resync": Store.pending = new Set(Object.keys(Store.docs)); Store.saveLocal(); await Store.flush(); toast("Synchronisation lancée"); break;
      case "reset-local": ask("Vider le cache local ?", "Les données non encore synchronisées seraient perdues.", "Vider", () => { localStorage.removeItem("shredlog.docs"); localStorage.removeItem("shredlog.pending"); location.reload(); }, true); break;
    }
  });
  function mealEditSheetRefresh() { mealEditSheet(UI.editMeal, UI.editFoods); }
  async function copyText(t) { try { await navigator.clipboard.writeText(t); toast("Copié dans le presse-papiers"); } catch (e) { sheet(`<h3>Copie manuelle</h3><textarea style="min-height:50vh;margin-top:8px">${esc(t)}</textarea>`); } }

  // Saisies (inputs)
  document.addEventListener("input", (ev) => {
    const el = ev.target; const bind = el.dataset.bind; if (!bind) return;
    const s = activeSession();
    if (["kg", "lbs", "reps"].includes(bind) && s) { const se = s.exercises[s.cursor]; const st = se.sets[+el.dataset.i]; if (bind === "kg") { st.kg = num(el.value); st.lbs = toLbs(st.kg); const o = $(`input[data-bind="lbs"][data-i="${el.dataset.i}"]`); if (o) o.value = st.lbs ?? ""; } else if (bind === "lbs") { st.lbs = num(el.value); st.kg = toKg(st.lbs); const o = $(`input[data-bind="kg"][data-i="${el.dataset.i}"]`); if (o) o.value = st.kg ?? ""; } else st.reps = el.value; saveSessionDebounced(s); }
    else if (bind === "doneSets" && s) { const se = s.exercises[s.cursor]; let n = Math.max(0, Math.min(se.sets.length, num(el.value) || 0)); se.doneSets = n; se.sets.forEach((st, i) => (st.done = i < n)); saveSessionDebounced(s); $$(".settbl tbody tr").forEach((tr, i) => { tr.classList.toggle("done", i < n); const c = $(".check", tr); if (c) c.classList.toggle("on", i < n); }); }
    else if (bind === "note" && s) { s.exercises[s.cursor].note = el.value; saveSessionDebounced(s); }
    else if (bind === "session-note") { const x = Store.get("sessions/" + el.dataset.id); if (x) { x.note = el.value; saveSessionDebounced(x); } }
    else if (bind.startsWith("prog-")) { const p = Data.program(); p.days.forEach((d) => d.exercises.forEach((e) => { if (e.id !== el.dataset.ex) return; if (bind === "prog-sets") e.sets = Math.max(1, num(el.value) || 1); else if (bind === "prog-reps") e.reps = el.value; else { const v = e[el.dataset.vk]; if (!v) return; if (bind === "prog-kg") { v.kg = num(el.value); v.lbs = toLbs(v.kg); const o = $(`input[data-bind="prog-lbs"][data-ex="${e.id}"][data-vk="${el.dataset.vk}"]`); if (o) o.value = v.lbs ?? ""; } else { v.lbs = num(el.value); v.kg = toKg(v.lbs); const o = $(`input[data-bind="prog-kg"][data-ex="${e.id}"][data-vk="${el.dataset.vk}"]`); if (o) o.value = v.kg ?? ""; } } })); debounce("prog", () => Store.set("program/current", p)); }
    else if (bind === "food-g") { const f = UI.editFoods[+el.dataset.i]; const g = num(el.value) || 0; const r = f.grams ? g / f.grams : 0; ["kcal", "protein", "carbs", "fat"].forEach((k) => (f[k] = Math.round(f[k] * r * 10) / 10)); f.grams = g; }
    else if (bind === "p-note") { const date = UI.pDate || isoDate(); const doc = Store.get("photos/" + date) || { date }; doc.note = el.value; debounce("pnote", () => Store.set("photos/" + date, doc)); }
    else if (bind === "set-name" || bind === "set-height") { const st = Data.settings(); if (bind === "set-name") st.name = el.value; else st.heightCm = num(el.value) || 172; debounce("settings", () => Data.saveSettings(st)); }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target; const bind = el.dataset.bind; if (!bind) return;
    if (bind === "m-date") { UI.mDate = el.value; render(); }
    else if (bind === "p-date") { UI.pDate = el.value; render(); }
    else if (bind === "sup-date") { UI.supDate = el.value; render(); }
    else if (bind === "nut-date") { UI.nutDate = el.value; render(); }
    else if (bind === "cmpA") { UI.cmpA = el.value; render(); }
    else if (bind === "cmpB") { UI.cmpB = el.value; render(); }
    else if (bind === "photo" && el.files && el.files[0]) uploadPhoto(el.files[0], el.dataset.k);
  });
  const timers = {}; function debounce(k, fn, ms = 500) { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); }
  function saveSessionDebounced(s) { debounce("session", () => saveSession(s), 400); }

  $("#timer-add").addEventListener("click", () => Timer.add(15));
  $("#timer-stop").addEventListener("click", () => Timer.stop());
  $("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });
  window.addEventListener("hashchange", route);

  window.addEventListener("error", (e) => { UI.lastError = String(e.message || e.error); toast("Erreur : " + UI.lastError); });
  window.addEventListener("unhandledrejection", (e) => { UI.lastError = String((e.reason && (e.reason.message || e.reason.code)) || e.reason); toast("Erreur : " + UI.lastError); });
  /* ───────────────────────── Démarrage ───────────────────────── */
  const splashStart = Date.now();
  window.addEventListener("load", () => { const sp = $("#splash"); if (!sp) return; setTimeout(() => { sp.classList.add("off"); setTimeout(() => sp.remove(), 700); }, Math.max(0, 1100 - (Date.now() - splashStart))); });
  Store.loadLocal();
  Data.ensureProgram();
  if (!Store.get("settings/app")) Data.saveSettings(Data.settings());
  applyTheme();
  Store.onChange(() => { if (UI.view !== "session" || !activeSession()) render(); else { $("#more-dot").classList.toggle("hidden", Data.unseenReviews() === 0); } Store.updateBanner(); });
  route();
  Store.updateBanner();
  Store.connect().then(() => { if (Store.db && !Store.get("meta/guide")) Store.set("meta/guide", { purpose: "Schéma de la base Shredlog pour une IA", collections: { "program/current": "programme actif : days[].exercises[] {id, block, sets, reps, rest, primary, machine{ex,kg,lbs,note}, dumbbell{...}}. ex = clé de la bibliothèque (voir data.js) ou custom{name,cues}", "programVersions/vN": "copie de chaque version + savedAt + reason", "sessions/<date>_<dayId>": "séance : status in_progress|done|abandoned, exercises[] {id, variant, targetSets, doneSets, sets[]{kg,lbs,reps,done}, difficulty facile|moyen|difficile, pain, note, skipped}", "measurements/<date>": "poids kg, tours en cm (waistRelaxed, neck, chest, armR...), bodyFat %", "photos/<date>": "face/profil/dos {id,url}", "supplementLogs/<date>": "taken{itemId:true}", "nutritionLogs/<date>": "meals{mealId:{eaten, foods[]}}", "nutrition/plan": "targets{kcal,protein,carbs,fat}, meals[]{id,name,time,foods[]{name,grams,kcal,protein,carbs,fat}}", "supplements/plan": "moments[], items[]{id,name,brand,dose,moment,why,cycle,fat}", "reviews/<id>": "bilan IA : {date, title, summary, changes[]{what,from,to,why}, programVersionFrom, programVersionTo, appliesFrom, seen:false} → l'app affiche une pastille tant que seen=false" }, howToAdjust: "1) lire sessions + measurements ; 2) écrire programVersions/v(N+1) = copie modifiée ; 3) écrire program/current avec version N+1 ; 4) écrire reviews/<date> avec seen:false et la liste des changements. Ne jamais augmenter une charge si pain=true sur l'exercice." }); });
  window.Shredlog = { Store, Data, UI, render };
})();
