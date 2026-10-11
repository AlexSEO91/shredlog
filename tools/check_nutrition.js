/* Contrôle du plan alimentaire initial (data.js) contre programme-alimentaire.md : node tools/check_nutrition.js */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {}; eval(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"));
const N = window.SHRED_DATA.NUTRITION; const md = fs.readFileSync(path.join(ROOT, "programme-alimentaire.md"), "utf8");
let fails = 0; const ok = (c, m, x) => { if (!c) { fails++; console.log("  ✗ " + m + (x !== undefined ? "  → " + JSON.stringify(x) : "")); } };
const K = ["kcal", "protein", "carbs", "fat"];

console.log("1. Phase et cibles");
ok(N.phase === "deficit" && JSON.stringify(N.targets) === JSON.stringify(N.phases.deficit.targets) && JSON.stringify(N.targets) === '{"kcal":1900,"protein":160,"carbs":170,"fat":65}', "phase déficit : 1 900 kcal / 160 P / 170 G / 65 L", N.targets);
ok(N.phases.surplus.targets.kcal === 2550, "phase surplus prévue : ~2 550 kcal");

console.log("2. Semaine type : 14 plats, chacun dans le fichier");
const used = N.week.flatMap((d) => [d.midi, d.soir]);
ok(N.week.map((d) => d.weekday).join() === "1,2,3,4,5,6,7" && new Set(used).size === 14 && Object.keys(N.dishes).length === 14, "7 jours × midi + soir = 14 plats distincts");
const P = new Set(N.plate.protein.map((b) => b.id)), F = new Set(N.plate.starch.map((b) => b.id));
used.forEach((id, i) => { const d = N.dishes[id]; if (!d) return ok(false, `plat ${id} absent`);
  ok(md.includes(`**${d.name.replace(" (wok, sauce douce)", "")}**`), `${id} : « ${d.name} » introuvable dans le fichier`);
  ok(d.slot === (i % 2 ? "soir" : "midi"), `${id} : créneau ${d.slot}`);
  ok(P.has(d.blocks.protein) && F.has(d.blocks.starch), `${id} : blocs d'assiette inconnus`, d.blocks);
  ok(d.macrosEstimated && d.macros.kcal > 500 && d.macros.kcal < 900 && d.macros.protein >= 55, `${id} : macros estimées plausibles`, d.macros);
  d.ingredients.filter((x) => x.unit === "g" && x.qty >= 100).forEach((x) => ok(md.includes(`${x.qty} g`), `${id} : ${x.qty} g (${x.name}) absent du fichier`)); });

console.log("3. Journée type");
const fx = N.fixed.reduce((a, f) => { K.forEach((k) => (a[k] += f.macros[k])); return a; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
ok(N.fixed.map((f) => f.id).join() === "matin,shake" && fx.protein === 36 && fx.carbs === 36 && fx.fat === 17, "matin + shake (amandes à 25 g) : ~36 P / 36 G / 17 L", fx);
const avg = Object.fromEntries(K.map((k) => [k, Math.round(N.week.reduce((a, d) => a + N.dishes[d.midi].macros[k] + N.dishes[d.soir].macros[k] + fx[k], 0) / 7)]));
ok(Math.abs(avg.kcal - 1880) <= 40 && avg.fat >= 58 && avg.fat <= 64 && Math.abs(avg.protein - 160) <= 10 && Math.abs(avg.carbs - 170) <= 10, "moyenne hebdomadaire : ~1 880 kcal, 60-62 g de lipides, protéines et glucides sur la cible", avg);
// Huile de cuisson : comptée dans les plats poêlés, absente des trois plats sans matière grasse
const oil = (id) => N.dishes[id].ingredients.some((i) => /huile/i.test(i.name));
ok(["moutarde", "omelette", "parmentier", "wok", "veloute"].every(oil) && !["teriyaki", "gingembre", "pane"].some(oil), "huile d'olive : 5 plats poêlés complétés, teriyaki / gingembre / pané sans matière grasse");
ok(N.week.every((d) => [d.midi, d.soir].every((id) => N.dishes[id].ingredients.filter((i) => /huile/i.test(i.name)).length <= 1)), "jamais plus d'une mesure d'huile par repas");
console.log(`   moyenne estimée : ${avg.kcal} kcal · P ${avg.protein} · G ${avg.carbs} · L ${avg.fat}  (plan type du fichier : ~1 880 · 157 · 168 · 62)`);

console.log("4. Courses et batch");
const items = N.shopping.items; const total = items.reduce((a, i) => a + (i.priceTHB || 0), 0) + Object.values(N.shopping.groups).reduce((a, g) => a + g.priceTHB, 0);
ok(total === 1845 && N.shopping.totalTHB === 1845, `total des courses ${total} THB (1 845 attendus)`);
ok(new Set(items.map((i) => i.id)).size === items.length && items.every((i) => i.aisle) && items.filter((i) => i.group === "legumes").length === 12, "articles uniques, tous rangés dans un rayon, 12 légumes");
items.forEach((i) => ok(md.includes(i.name.split(" (")[0]), `article « ${i.name} » introuvable dans le fichier`));
ok(N.batch.steps.length === 6 && N.batch.weekday === 0, "batch du dimanche : 6 étapes");

console.log(fails ? `\n${fails} échec(s)` : "\nTout est bon ✓");
process.exit(fails ? 1 : 0);
