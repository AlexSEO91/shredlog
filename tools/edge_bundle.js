/* Charge le calcul embarqué dans un fichier d'Edge Function (supabase/deploy/*.ts) : tout ce qui se trouve entre
   « const window = globalThis; » et « const D = globalThis.SHRED_DATA » est évalué dans un contexte isolé. */
const fs = require("fs"); const vm = require("vm");
exports.load = (file) => {
  const src = fs.readFileSync(file, "utf8"); const a = src.indexOf("const window = globalThis;"); const b = src.indexOf("const D = globalThis.SHRED_DATA");
  if (a < 0 || b < a) throw new Error("bloc embarqué introuvable dans " + file);
  const g = {}; g.globalThis = g; g.window = g;
  vm.runInNewContext(src.slice(a + "const window = globalThis;".length, b), g, { filename: file });
  if (!g.SHRED_DATA || !g.ShredStock || !g.ShredNotify) throw new Error("bloc embarqué incomplet dans " + file);
  // Repasse les données dans le contexte courant (les contrôles comparent des objets entre contextes).
  return { D: JSON.parse(JSON.stringify(g.SHRED_DATA)), S: g.ShredStock, N: g.ShredNotify, src };
};
