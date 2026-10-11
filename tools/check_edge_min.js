/* Contrôle du bundle réduit de l'Edge Function : node tools/check_edge_min.js
   1) taille sous 35 Ko, syntaxe valide, même code d'entrée que le bundle complet ;
   2) comportement identique : plan() rend exactement le même résultat avec les données réduites qu'avec data.js complet,
      sur tous les modes × 120 jours × plusieurs états de la base ;
   3) les contrôles existants des notifications (check_notify.js) repassent sur le calcul embarqué dans le fichier. */
const fs = require("fs"); const path = require("path"); const os = require("os"); const { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, ".."); const MIN = path.join(ROOT, "supabase/deploy/shredlog-notify.min.ts"); const FULLTS = path.join(ROOT, "supabase/deploy/shredlog-notify.ts");
const LIMIT = 35000;
let fails = 0; const ok = (c, m, x) => { if (!c) { fails++; console.log("  ✗ " + m + (x !== undefined ? "\n      → " + JSON.stringify(x).slice(0, 600) : "")); } };
const { load } = require("./edge_bundle.js");

console.log("1. Fichier");
const size = fs.statSync(MIN).size; ok(size < LIMIT, `taille ${size} octets (limite ${LIMIT})`);
const min = load(MIN); const full = load(FULLTS);
const tmp = path.join(os.tmpdir(), `shredlog-min-${process.pid}.mjs`); fs.writeFileSync(tmp, min.src);
const syn = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" }); fs.unlinkSync(tmp);
ok(syn.status === 0, "syntaxe du fichier complet (imports compris)", syn.stderr);
// Même code d'entrée (index.ts) que le bundle complet, aux commentaires et à l'indentation près
const entry = (src) => { const a = src.indexOf("const window = globalThis;"), b = src.indexOf("const D = globalThis.SHRED_DATA"); return (src.slice(0, a) + src.slice(b)).split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//")).join("\n"); };
ok(entry(min.src) === entry(full.src), "code d'entrée identique au bundle complet");
ok(!min.D.EX && !min.D.PROGRAM && min.D.STOCK.length === full.D.STOCK.length && min.D.SUPPLEMENTS.items.length === full.D.SUPPLEMENTS.items.length, "données : ni bibliothèque d'exercices ni programme ; toutes les lignes de stock et tous les compléments");

console.log("2. Même résultat que le bundle complet");
const P = full.D.PROGRAM; const ids = full.D.SUPPLEMENTS.items.map((i) => i.id); const add = full.S.addDays;
const shopIds = full.D.NUTRITION.shopping.items.map((i) => i.id);
function docs(variant, today) {
  const d = { "program/current": P };
  if (variant === "vide") return d;
  for (let x = "2026-09-27", i = 0; x < today && i < 200; x = add(x, 1), i++) {
    d["supplementLogs/" + x] = { date: x, taken: Object.fromEntries(ids.filter((_, k) => (k + i) % 5 !== 0).map((k) => [k, true])) };
    d["nutritionLogs/" + x] = { date: x, meals: i % 3 === 0 ? { m1: { eaten: true }, m2: { eaten: true } } : { shake: { eaten: i % 2 === 0 }, midi: { eaten: true, dishId: "teriyaki" } } };
  }
  if (variant === "base") {
    d["stock/omega3"] = { ...full.D.STOCK.find((l) => l.id === "omega3"), unitsLeft: 90, lastCountedAt: "2026-10-11", orderedAt: null };
    d["stock/whey"] = { ...full.D.STOCK.find((l) => l.id === "whey"), unitsLeft: 400 };
    d["stock/probio"] = { ...full.D.STOCK.find((l) => l.id === "probio"), unitsLeft: 30, lastCountedAt: "2026-10-08", countEffectiveFrom: null, orderedAt: null };
    d["supplements/plan"] = { ...full.D.SUPPLEMENTS, items: full.D.SUPPLEMENTS.items.map((i) => (i.id === "rhodiola" ? { ...i, cycleStart: "2026-10-05" } : i)) };
    d["nutrition/plan"] = { ...full.D.NUTRITION, version: 3, fixed: full.D.NUTRITION.fixed.map((f) => (f.id === "shake" ? { ...f, foods: [{ name: "Whey ISO100", grams: 40 }] } : f)) };
    d["nutritionWeeks/" + full.S.prepWeek(today)] = { shopping: { checked: Object.fromEntries(shopIds.slice(0, 20).map((k) => [k, true])) } };
    d["measurements/" + today] = { weight: 64 };
    d[`sessions/${today}_j1`] = { date: today, dayId: "j1", status: "done" };
  }
  return d;
}
let cases = 0, diffs = 0, first = null, withMsg = 0;
for (const variant of ["vide", "journaux", "base"]) for (let today = "2026-09-27", i = 0; i < 120; today = add(today, 1), i++) {
  const d = docs(variant, today);
  for (const mode of ["morning", "evening", "neck", "measures", "weekly", "catchup", "test", "inconnu"]) {
    const run = (b) => JSON.stringify(b.N.plan({ mode, today, docs: JSON.parse(JSON.stringify(d)), logs: i % 4 === 0 ? { "stock:creatine": add(today, -1) } : {}, D: b.D, S: b.S }));
    const a = run(full), m = run(min); cases++; if (JSON.parse(a).messages.length) withMsg++;
    if (a !== m) { diffs++; first = first || { variant, today, mode, complet: a, reduit: m }; }
  }
  if (JSON.stringify(full.N.since(d, full.D)) !== JSON.stringify(min.N.since(d, min.D))) { diffs++; first = first || { since: today }; }
}
ok(diffs === 0, `${diffs} écart(s) sur ${cases} cas`, first);
ok(withMsg > 300, `la comparaison porte bien sur des notifications réelles (${withMsg} cas avec message)`);

console.log("3. Contrôles des notifications sur le calcul embarqué");
for (const [label, file] of [["bundle réduit", MIN], ["bundle complet", FULLTS]]) {
  const r = spawnSync(process.execPath, [path.join(__dirname, "check_notify.js")], { encoding: "utf8", env: { ...process.env, SHRED_BUNDLE: file } });
  ok(r.status === 0, `check_notify.js sur le ${label}`, (r.stdout || "").split("\n").filter((l) => l.includes("✗")).slice(0, 5));
}
console.log(fails ? `\n${fails} échec(s)` : `\nTout est bon ✓ — ${size} octets, ${cases} cas identiques au bundle complet`);
process.exit(fails ? 1 : 0);
