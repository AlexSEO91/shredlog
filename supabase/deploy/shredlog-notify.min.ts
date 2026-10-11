// @ts-nocheck — le calcul (data.js, stock.js, notify.js) est du JS partagé avec l'app, embarqué tel quel.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
const window = globalThis;
// --- données réduites + stock.js + notify.js (généré par tools/build_edge_min.js, ne pas modifier ici) ---
globalThis.SHRED_DATA = {"SUPPLEMENTS":{"items":[{"id":"tongkat","name":"Tongkat Ali","cycleStart":"2026-09-28","weeksOn":8,"weeksOff":4,"cycleEnabled":true},{"id":"citrulline","name":"L-Citrulline"},{"id":"rhodiola","name":"Rhodiola","cycleStart":"2026-09-28","weeksOn":6,"weeksOff":2,"cycleEnabled":true},{"id":"probio","name":"Probiotiques"},{"id":"theanine","name":"L-Théanine"},{"id":"bcomplex","name":"B-Complex"},{"id":"d3k2","name":"Vitamine D3 + K2"},{"id":"coq10","name":"CoQ10 Ubiquinol"},{"id":"creatine","name":"Créatine"},{"id":"omega1","name":"Oméga-3 #1"},{"id":"collagen","name":"Collagène + Vitamine C"},{"id":"omega2","name":"Oméga-3 #2"},{"id":"asta","name":"Astaxanthine"},{"id":"boron","name":"Boron","cycleStart":"2026-09-28","weeksOn":8,"weeksOff":4,"cycleEnabled":true},{"id":"selenium","name":"Sélénium"},{"id":"lecithin","name":"Lécithine tournesol"},{"id":"zinc","name":"Zinc Picolinate"},{"id":"ashwa","name":"Ashwagandha Sensoril"},{"id":"magnesium","name":"Magnésium bisglycinate"}]},"STOCK":[{"id":"probio","name":"Probiotiques","unit":"capsule","unitsLeft":0,"unitsPerBox":30,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":"2026-09-27","supplier":"iHerb","takes":[{"item":"probio","qty":1}]},{"id":"creatine","name":"Créatine","unit":"gramme","unitsLeft":90,"unitsPerBox":150,"dosePerDay":5,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":null,"countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"creatine","qty":5}]},{"id":"omega3","name":"Oméga-3","unit":"softgel","unitsLeft":29,"unitsPerBox":60,"dosePerDay":2,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"omega1","qty":1},{"item":"omega2","qty":1}]},{"id":"collagen","name":"Collagène","unit":"gramme","unitsLeft":200,"unitsPerBox":300,"dosePerDay":15,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":null,"countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"collagen","qty":15}]},{"id":"rhodiola","name":"Rhodiola","unit":"capsule","unitsLeft":42,"unitsPerBox":60,"dosePerDay":2,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"rhodiola","qty":2}]},{"id":"whey","name":"Whey ISO100","unit":"gramme","unitsLeft":2100,"unitsPerBox":2300,"dosePerDay":32,"leadTimeDays":1,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":null,"countExclude":[],"orderedAt":null,"supplier":"Central","takes":[],"food":"whey"},{"id":"tongkat","name":"Tongkat Ali","unit":"capsule","unitsLeft":39,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"tongkat","qty":1}]},{"id":"theanine","name":"L-Théanine","unit":"capsule","unitsLeft":39,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"theanine","qty":1}]},{"id":"magnesium","name":"Magnésium bisglycinate","unit":"capsule","unitsLeft":118,"unitsPerBox":120,"dosePerDay":3,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"magnesium","qty":3}]},{"id":"bcomplex","name":"B-Complex","unit":"capsule","unitsLeft":41,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"bcomplex","qty":1}]},{"id":"asta","name":"Astaxanthine","unit":"softgel","unitsLeft":41,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"asta","qty":1}]},{"id":"boron","name":"Boron","unit":"capsule","unitsLeft":85,"unitsPerBox":100,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"boron","qty":1}]},{"id":"lecithin","name":"Lécithine tournesol","unit":"softgel","unitsLeft":86,"unitsPerBox":100,"dosePerDay":2,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"lecithin","qty":2}]},{"id":"vitc","name":"Vitamine C","unit":"capsule","unitsLeft":47,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"collagen","qty":1}]},{"id":"zinc","name":"Zinc Picolinate","unit":"capsule","unitsLeft":52,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"zinc","qty":1}]},{"id":"ashwa","name":"Ashwagandha Sensoril","unit":"capsule","unitsLeft":52,"unitsPerBox":60,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"ashwa","qty":1}]},{"id":"citrulline","name":"L-Citrulline","unit":"gramme","unitsLeft":180,"unitsPerBox":200,"dosePerDay":3,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":null,"countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"citrulline","qty":3}]},{"id":"selenium","name":"Sélénium","unit":"capsule","unitsLeft":87,"unitsPerBox":100,"dosePerDay":1,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"selenium","qty":1}]},{"id":"d3k2","name":"Vitamine D3 + K2","unit":"ml","unitsLeft":25,"unitsPerBox":30,"dosePerDay":0.15,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":null,"countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"d3k2","qty":0.15}]},{"id":"coq10","name":"CoQ10 Ubiquinol","unit":"softgel","unitsLeft":71,"unitsPerBox":90,"dosePerDay":2,"leadTimeDays":10,"bufferDays":7,"lastCountedAt":"2026-09-27","countEffectiveFrom":"2026-10-19","countExclude":[],"orderedAt":null,"supplier":"iHerb","takes":[{"item":"coq10","qty":2}]}],"STOCK_EFFECTIVE":"2026-10-19","NUTRITION":{"version":1,"phase":"deficit","week":[{"weekday":1,"midi":"teriyaki","soir":"poulet_roti"},{"weekday":2,"midi":"salade","soir":"bolognaise"},{"weekday":3,"midi":"cantonais","soir":"moutarde"},{"weekday":4,"midi":"omelette","soir":"basquaise"},{"weekday":5,"midi":"gingembre","soir":"parmentier"},{"weekday":6,"midi":"pates_brocoli","soir":"wok"},{"weekday":7,"midi":"pane","soir":"veloute"}],"fixed":[{"id":"matin","foods":[{"name":"Yaourt nature","grams":135},{"name":"Banane nam wa","grams":100}]},{"id":"shake","foods":[{"name":"Whey ISO100","grams":32},{"name":"Amandes","grams":25}]}],"shopping":{"items":[{"id":"poulet"},{"id":"boeuf"},{"id":"yaourts"},{"id":"oeufs"},{"id":"lait"},{"id":"carottes"},{"id":"brocoli"},{"id":"tomates"},{"id":"haricots"},{"id":"courgettes"},{"id":"concombre"},{"id":"oignons"},{"id":"pleurotes"},{"id":"chou"},{"id":"poivrons"},{"id":"pois_mais"},{"id":"laitue"},{"id":"pdt"},{"id":"aromates"},{"id":"fruits"},{"id":"riz"},{"id":"pates"},{"id":"concassees"},{"id":"condiments"}]},"batch":{"minutes":60}}};
(function (root) {
"use strict";
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5); // b − a
const EPS = 1e-9;
function isOn(cycle, date) {
if (!cycle || !cycle.cycleEnabled || !cycle.cycleStart || !cycle.weeksOn) return true;
const d = diffDays(cycle.cycleStart, date); if (d < 0) return true;
const on = cycle.weeksOn * 7, period = on + (cycle.weeksOff || 0) * 7;
return d % period < on;
}
function cycleInfo(cycle, date) {
const cycled = !!(cycle && cycle.cycleEnabled && cycle.cycleStart && cycle.weeksOn && cycle.weeksOff);
const on = isOn(cycle, date); if (!cycled) return { cycled, on };
let d = addDays(date, 1); for (let i = 0; i < 800 && isOn(cycle, d) === on; i++) d = addDays(d, 1);
return on ? { cycled, on, stop: d } : { cycled, on, resume: d };
}
function dayUse(line, date, ctx, exclude) {
const ex = exclude || [];
let q = 0;
const sl = ctx.supLog(date); const taken = (sl && sl.taken) || {};
(line.takes || []).forEach((t) => { if (taken[t.item] && !ex.includes(t.item) && isOn(ctx.cycleOf(t.item), date)) q += t.qty; });
if (line.food) {
const re = new RegExp(line.food, "i"); const nl = ctx.nutLog(date); const meals = (nl && nl.meals) || {};
const plan = ctx.nutPlan || {}; const planned = (plan.fixed || []).concat(plan.meals || []);
Object.keys(meals).forEach((id) => {
const l = meals[id]; if (!l || !l.eaten || ex.includes("meal:" + id)) return;
const m = planned.find((x) => x.id === id);
(l.foods || (m && m.foods) || []).forEach((f) => { if (re.test(f.name || "")) q += Number(f.grams) || 0; });
});
}
return q;
}
function keysTaken(line, date, ctx) {
const out = []; const sl = ctx.supLog(date); const taken = (sl && sl.taken) || {};
(line.takes || []).forEach((t) => { if (taken[t.item]) out.push(t.item); });
if (line.food) { const nl = ctx.nutLog(date); const meals = (nl && nl.meals) || {}; Object.keys(meals).forEach((id) => { if (meals[id].eaten) out.push("meal:" + id); }); }
return out;
}
const lineCycle = (line, ctx) => (line.takes && line.takes.length ? ctx.cycleOf(line.takes[0].item) : null);
function countFrom(line, today) {
const counted = line.lastCountedAt || today; const eff = line.countEffectiveFrom;
return eff && eff > counted ? eff : counted;
}
function status(line, today, ctx) {
const counted = line.lastCountedAt || today; const from = countFrom(line, today);
const pending = from > today; // décompte pas encore commencé : les prises cochées ne consomment rien
let used = 0;
for (let d = from; d <= today; d = addDays(d, 1)) used += dayUse(line, d, ctx, d === counted ? line.countExclude : null);
const raw = Number(line.unitsLeft) - used; const unitsLeft = Math.max(0, raw);
const startOfDay = pending ? Math.max(0, raw) : Math.max(0, raw + dayUse(line, today, ctx, null));
const dose = Number(line.dosePerDay) || 0;
const cyc = lineCycle(line, ctx);
let rupture;
if (dose <= 0) rupture = null;
else {
let n = Math.floor(startOfDay / dose + EPS); // nombre de jours ON couverts
let d = pending ? from : today; let guard = 0;
while (guard++ < 3660) { if (isOn(cyc, d)) { if (n <= 0) break; n--; } d = addDays(d, 1); }
rupture = d;
}
const daysLeft = rupture ? diffDays(today, rupture) : null;
const alertDate = rupture ? addDays(rupture, -((line.leadTimeDays || 0) + (line.bufferDays == null ? 7 : line.bufferDays))) : null;
const inAlert = !!alertDate && today >= alertDate; // jamais d'égalité stricte : les items en retard restent en alerte
const level = inAlert ? "red" : alertDate && today >= addDays(alertDate, -7) ? "amber" : "green";
return { id: line.id, unitsLeft: Math.round(unitsLeft * 1000) / 1000, daysLeft, rupture, alertDate, inAlert, level, ordered: !!line.orderedAt, off: !isOn(cyc, today), effectiveFrom: pending ? from : null };
}
function recount(line, units, today, ctx, received) {
const eff = line.countEffectiveFrom && line.countEffectiveFrom > today ? line.countEffectiveFrom : null;
return { ...line, unitsLeft: Number(units), lastCountedAt: today, countEffectiveFrom: eff, countExclude: keysTaken(line, today, ctx), orderedAt: received ? null : line.orderedAt || null };
}
const COUNTABLE = ["capsule", "softgel"];
const countable = (line) => COUNTABLE.includes(line.unit);
const GROUP_AHEAD = 7;
function orderGroup(rows, today, withOrdered) {
const byRupture = (a, b) => ((a.st.rupture || "9999") < (b.st.rupture || "9999") ? -1 : 1);
const anchors = rows.filter((x) => x.st.inAlert && (withOrdered || !x.st.ordered)).sort(byRupture);
if (!anchors.length) return { anchors, extras: [] };
const suppliers = new Set(anchors.map((x) => x.line.supplier || ""));
const limit = addDays(today, GROUP_AHEAD);
const extras = rows.filter((x) => !x.st.inAlert && !x.st.ordered && x.st.alertDate && x.st.alertDate <= limit && suppliers.has(x.line.supplier || ""))
.sort((a, b) => (a.st.alertDate < b.st.alertDate ? -1 : 1));
return { anchors, extras };
}
function nextRecount(counted, today) {
for (let d = today, i = 0; i < 70; d = addDays(d, 1), i++) {
if (parse(d).getUTCDay() === 0 && Number(d.slice(8)) <= 7 && (!counted || diffDays(counted, d) >= 7)) return d;
}
return null;
}
const mealWeek = (date) => addDays(date, -((parse(date).getUTCDay() + 6) % 7));
const prepWeek = (date) => (parse(date).getUTCDay() === 0 ? addDays(date, 1) : mealWeek(date));
function shoppingState(plan, week) {
const items = (plan && plan.shopping && plan.shopping.items) || []; const checked = (week && week.shopping && week.shopping.checked) || {};
const left = items.filter((i) => !checked[i.id]);
return { total: items.length, done: items.length - left.length, left };
}
const api = { mealWeek, prepWeek, shoppingState, isOn, cycleInfo, dayUse, countFrom, status, recount, countable, orderGroup, nextRecount, addDays, diffDays };
root.ShredStock = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
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
const food = ctx.nutPlan && ctx.nutPlan.week ? ctx.nutPlan : D.NUTRITION;
const ids = new Set(D.STOCK.map((l) => l.id));
const lines = D.STOCK.map((l) => ({ ...l, ...(get("stock/" + l.id) || {}) })).concat(list("stock").filter((x) => !ids.has(x.id)).map((x) => x.data));
return { get, list, plan, def, ctx, lines, cycleOf, food };
}
function since(docs, D) {
const ds = D.STOCK.map((l) => (docs["stock/" + l.id] || l).lastCountedAt).concat(Object.keys(docs).filter((k) => k.startsWith("stock/")).map((k) => docs[k].lastCountedAt)).filter(Boolean).sort();
return ds[0] || null;
}
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
const g = S.orderGroup(stockRows(), today, true);
if (g.anchors.length) { messages.push(stockMessage(g, today, true)); g.anchors.concat(g.extras).filter((x) => !x.st.ordered).forEach((x) => logKeys.push("stock:" + x.line.id)); }
else skipped.push("stock : rien en alerte");
}
else if (mode === "morning") {
const g = S.orderGroup(stockRows(), today, false);
const due = g.anchors.some((x) => !logs["stock:" + x.line.id] || S.diffDays(logs["stock:" + x.line.id], today) >= REMIND_EVERY);
if (due) { messages.push(stockMessage(g, today, false)); g.anchors.concat(g.extras).forEach((x) => logKeys.push("stock:" + x.line.id)); }
else skipped.push(g.anchors.length ? "stock : déjà notifié il y a moins de 3 jours (seul ou dans un regroupement)" : "stock : rien à commander");
const evs = cycleEvents(c, today, S).filter((e) => { const k = `cycle:${e.id}:${e.type}:${today}`; if (logs[k]) { skipped.push(k + " : déjà envoyé"); return false; } return true; });
if (evs.length) {
const groups = {}; evs.forEach((e) => { (groups[e.text] = groups[e.text] || []).push(e.name); });
messages.push({ title: "Cycles de compléments", body: Object.entries(groups).map(([t, names]) => `${names.join(", ")} : ${t}`).join("\n"), url: "#supps", tag: "cycles" });
evs.forEach((e) => logKeys.push(`cycle:${e.id}:${e.type}:${today}`));
}
}
else if (mode === "evening") {
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
const neck = days.filter((d) => NECK(d) && d.weekday === 3 && (d.exercises || []).length);
if (!neck.length) skipped.push("cou : bloc absent du programme");
else if (neck.every((d) => doneToday(d.id))) skipped.push("cou : déjà fait");
else once("neck:" + today, () => ({ title: "Bloc cou du mercredi", body: `${neck[0].name} : ~10 min, avec charge, tempo 3-1-3.`, url: "#session", tag: "neck" }));
}
}
else if (mode === "measures") {
if (wd !== 0) skipped.push("mensurations / photos : on n'est pas dimanche à Bangkok");
else {
if (c.get("measurements/" + today)) skipped.push("mensurations : déjà saisies");
else once("measures:" + today, () => ({ title: "Mensurations de la semaine", body: "Poids à jeun, tour de taille, bras, cuisses.", url: "#track", tag: "measures" }));
const ph = c.get("photos/" + today) || {};
if (["face", "profilG", "profilD", "dos", "profil"].some((k) => ph[k])) skipped.push("photos : déjà prises");
else once("photos:" + today, () => ({ title: "Photos de la semaine", body: "Face, profil gauche, profil droit, dos : même lumière, même heure, torse nu.", url: "#track?photos", tag: "photos" }));
const shop = S.shoppingState(c.food, c.get("nutritionWeeks/" + S.prepWeek(today)));
if (!shop.total) skipped.push("courses : pas de liste dans le plan");
else if (!shop.left.length) skipped.push("courses : liste entièrement cochée");
else once("courses:" + today, () => ({ title: "Courses + batch", body: `${shop.left.length} article${shop.left.length > 1 ? "s" : ""} à cocher, puis le batch du dimanche (~${(c.food.batch && c.food.batch.minutes) || 60} min).`, url: "#nutrition?courses", tag: "courses" }));
}
}
else if (mode === "weekly") {
if (wd !== 0) skipped.push("hebdo : on n'est pas dimanche à Bangkok");
else {
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
// --- fin du bloc généré ---
const D = globalThis.SHRED_DATA, S = globalThis.ShredStock, N = globalThis.ShredNotify;
const VAPID_PUBLIC_KEY = "BO67--Fy4TjmV936flvXOAOwJv2eO4tqsHZDygQmeTtGUtSRfHtC2mHmLAcKRWpzIU1E84H8mCwIUqULEOQf5eg";
const VAPID_SUBJECT = "https://alexseo91.github.io/shredlog/";
const CRON_MODES = ["morning", "evening", "neck", "measures", "weekly"];
const USER_MODES = ["catchup", "test"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const errorMessage = (e) => (e && e.message) || String(e);
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
q((x) => x.in("path", ["measurements/" + today, "photos/" + today, "nutritionWeeks/" + S.prepWeek(today)])),
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
if (status === 404 || status === 410) await db.from("shredlog_push_subscriptions").delete().eq("id", s.id);
else errors.push(`${status || ""} ${errorMessage(e)}`.trim());
}
}
}
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
