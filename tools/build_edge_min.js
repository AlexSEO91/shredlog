/* Assemble supabase/deploy/shredlog-notify.min.ts : même fonction que shredlog-notify.ts, mais n'embarque de data.js
   que ce que le calcul lit réellement (cycles des compléments, lignes de stock, whey et liste de courses du plan
   alimentaire) — ni la bibliothèque d'exercices ni le programme, qui viennent de la base (program/current).
   Objectif : rester sous 35 Ko pour un déploiement par le connecteur. Contrôle : node tools/check_edge_min.js */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, ".."); const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
global.window = {}; eval(read("data.js")); const D = window.SHRED_DATA;

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const data = {
  SUPPLEMENTS: { items: D.SUPPLEMENTS.items.map((i) => pick(i, ["id", "name", "cycleStart", "weeksOn", "weeksOff", "cycleEnabled"])) },
  STOCK: D.STOCK.map((l) => { const { brand, note, ...rest } = l; return rest; }),
  STOCK_EFFECTIVE: D.STOCK_EFFECTIVE,
  NUTRITION: { version: D.NUTRITION.version, phase: D.NUTRITION.phase, week: D.NUTRITION.week, fixed: D.NUTRITION.fixed.map((f) => pick(f, ["id", "foods"])), shopping: { items: D.NUTRITION.shopping.items.map((i) => pick(i, ["id"])) }, batch: pick(D.NUTRITION.batch, ["minutes"]) },
};
// Commentaires retirés seulement quand ils occupent des lignes entières (aucun risque pour les chaînes et les regex).
const strip = (src) => src.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n/gm, "").split("\n").filter((l) => !/^\s*\/\//.test(l) || /@ts-nocheck/.test(l)).map((l) => l.replace(/^\s+/, "")).filter(Boolean).join("\n");

const marker = "// @@EMBED@@"; const src = read("supabase/functions/shredlog-notify/index.ts");
if (src.split(marker).length !== 2) throw new Error("marqueur @@EMBED@@ introuvable ou en double");
const embed = ["globalThis.SHRED_DATA = " + JSON.stringify(data) + ";", strip(read("stock.js")), strip(read("supabase/functions/shredlog-notify/notify.js"))].join("\n");
const [head, tail] = src.split(marker);
const out = strip(head) + "\n// --- données réduites + stock.js + notify.js (généré par tools/build_edge_min.js, ne pas modifier ici) ---\n" + embed + "\n// --- fin du bloc généré ---\n" + strip(tail) + "\n";
fs.writeFileSync(path.join(ROOT, "supabase/deploy/shredlog-notify.min.ts"), out);
console.log(`supabase/deploy/shredlog-notify.min.ts ok — ${Buffer.byteLength(out)} octets`);
