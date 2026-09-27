/* Contrôle du programme v2 contre SHREDLOG_SPEC_v2.md (partie 2) : node tools/check_program.js
   RÈGLE ABSOLUE : les 45 exercices du programme d'origine (J1, J2, J3, J4, J6) sont tous présents.
   La spec est relue telle quelle (tableaux markdown) : chaque ligne doit exister dans data.js,
   même jour, même position, mêmes séries / reps / repos / charge de départ. */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {}; eval(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"));
const D = window.SHRED_DATA; const P = D.PROGRAM;
const spec = fs.readFileSync(path.join(ROOT, "SHREDLOG_SPEC_v2.md"), "utf8");

let fails = 0; const ok = (c, m, x) => { if (!c) { fails++; console.log("  ✗ " + m + (x !== undefined ? "  → " + JSON.stringify(x) : "")); } };
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").replace(/\s*\/\s*/g, " / ").trim();
const nums = (s) => [...String(s).matchAll(/(\d+(?:,\d+)?)\s*(kg|lbs)/g)].map((m) => ({ v: Number(m[1].replace(",", ".")), u: m[2] }));

// ── Lecture des tableaux de la spec
function table(title, until) {
  const i = spec.indexOf(title); if (i < 0) throw new Error("section introuvable : " + title);
  const end = until ? spec.indexOf(until, i + title.length) : spec.length;
  return spec.slice(i, end).split("\n").filter((l) => /^\|\s*[0-9A-F]+\s*\|/.test(l)).map((l) => {
    const c = l.split("|").slice(1, -1).map((x) => x.trim());
    const [sets, reps, rest, charge] = c.slice(-4);
    return { pos: c[0], name: (c[1].match(/\*\*(.+?)\*\*/) || [, c[1]])[1].trim(), dbPrimary: c[2].includes("(exercice haltères)"), sets, reps, rest, charge, raw: l };
  });
}
const SPEC_DAYS = [
  { id: "j1", title: "## JOUR 1 — PUSH 1", until: "## JOUR 2", original: true },
  { id: "j2", title: "## JOUR 2 — LEGS", until: "## JOUR 3", original: true },
  { id: "j3", title: "## JOUR 3 — PULL 1", until: "## JOUR 4", original: true },
  { id: "j4", title: "## JOUR 4 — PUSH 2", until: "## JOUR 5", original: true },
  { id: "j5", title: "## JOUR 5 — LEGS 2", until: "## JOUR 6", original: false },
  { id: "j6", title: "## JOUR 6 — PULL 2", until: "## BLOC COU", original: true },
  { id: "cou_sam", title: "### Version longue", until: "### Version courte", neck: "Cou long" },
  { id: "cou_mer", title: "### Version courte", until: "### Exécution", neck: "Cou court" },
];

console.log("1. Les 45 exercices du programme d'origine");
let originalCount = 0; const found = [];
for (const sd of SPEC_DAYS) {
  const rows = table(sd.title, sd.until);
  const day = P.days.find((d) => d.id === sd.id);
  if (!day) { ok(false, `jour ${sd.id} absent du programme`); continue; }
  const exs = day.exercises.filter((e) => !e.warmup);
  ok(exs.length === rows.length, `${day.name} : ${rows.length} exercices dans la spec, ${exs.length} dans l'app`);
  if (sd.original) originalCount += rows.length;
  rows.forEach((r, i) => {
    const e = exs[i]; const tag = `${day.name} #${r.pos} ${r.name}`;
    if (!e) return ok(false, `${tag} : ABSENT`);
    const expectOrig = sd.neck ? `${sd.neck} ${r.pos} — ` : r.name;
    ok(sd.neck ? e.orig.startsWith(expectOrig) : e.orig === r.name, `${tag} : mauvais exercice à cette position (${e.orig})`);
    if (sd.original && e.orig === r.name) found.push(`${sd.id}:${r.name}`);
    // séries (« 2 /côté » → 2 séries, reps « … / côté »)
    const sets = parseInt(r.sets, 10);
    ok(e.sets === sets, `${tag} : séries ${e.sets} ≠ ${r.sets}`);
    const reps = norm(r.reps) + (/côté/.test(r.sets) ? " / côté" : "");
    ok(norm(e.reps) === reps, `${tag} : reps « ${e.reps} » ≠ « ${reps} »`);
    ok(e.rest === parseInt(r.rest, 10), `${tag} : repos ${e.rest} ≠ ${r.rest}`);
    // charge de départ : 1re valeur = colonne principale de la spec (haltères si « exercice haltères »), 2e = l'autre
    if (!/^PDC/.test(r.charge)) {
      const n = nums(r.charge);
      const first = sd.neck ? e[e.primary] : r.dbPrimary ? e.dumbbell : e.machine;
      const second = sd.neck ? null : r.dbPrimary ? e.machine : e.dumbbell;
      const same = (v, x) => v && (x.u === "kg" ? v.kg === x.v : v.lbs === x.v);
      if (n[0]) ok(same(first, n[0]), `${tag} : charge ${first && (n[0].u === "kg" ? first.kg : first.lbs)} ≠ ${n[0].v} ${n[0].u} (${r.charge})`);
      if (n[1] && second && !/→/.test(r.charge)) ok(same(second, n[1]), `${tag} : 2e charge ${second.kg} ≠ ${n[1].v} ${n[1].u} (${r.charge})`);
    }
    ok(e.primary === (sd.neck ? e.primary : r.dbPrimary ? "dumbbell" : "machine"), `${tag} : version par défaut ${e.primary}`);
    ok(e.tempo === (sd.neck ? (r.name.includes("Farmer") ? "marche contrôlée" : "3-1-3") : "2-1-1"), `${tag} : tempo ${e.tempo}`);
  });
}
ok(originalCount === 45, `la spec liste ${originalCount} exercices d'origine (45 attendus)`);
ok(found.length === 45, `${found.length} / 45 exercices d'origine retrouvés à leur place`);
const origInProgram = P.days.filter((d) => ["j1", "j2", "j3", "j4", "j6"].includes(d.id)).flatMap((d) => d.exercises.filter((e) => !e.warmup));
ok(origInProgram.length === 45 && origInProgram.every((e) => e.orig), `programme : ${origInProgram.length} exercices sur J1-J4 + J6, tous tracés`);

console.log("2. Chaque exercice : 2 versions, séries, reps, repos, tempo, charge, image");
for (const d of P.days) for (const e of d.exercises) {
  const tag = `${d.id}/${e.id}`;
  if (e.warmup) { ok(D.EX[(e.machine || e.dumbbell).ex], `${tag} : échauffement inconnu`); continue; }
  ok(e.machine && e.dumbbell, `${tag} : il manque la version ${e.machine ? "haltères" : "machine"}`);
  ok(e.sets > 0 && e.reps && e.rest > 0 && e.tempo, `${tag} : séries / reps / repos / tempo incomplets`, { sets: e.sets, reps: e.reps, rest: e.rest, tempo: e.tempo });
  for (const vk of ["machine", "dumbbell"]) {
    const v = e[vk]; if (!v) continue; const info = D.EX[v.ex];
    ok(info, `${tag} : exercice ${v.ex} absent de la bibliothèque`);
    ok(v.kg != null || v.note, `${tag} ${vk} : ni charge ni consigne de départ`);
    if (info) ok(fs.existsSync(path.join(ROOT, "img", info.img + "_0.jpg")) && fs.existsSync(path.join(ROOT, "img", info.img + "_1.jpg")), `${tag} : images ${info.img} manquantes`);
  }
}

console.log("3. Planning hebdomadaire et bloc cou");
const main = (wd) => P.days.filter((d) => d.weekday === wd && d.kind !== "neck");
ok([1, 2, 3, 4, 5, 6].map((wd) => main(wd).map((d) => d.id).join()).join(" ") === "j1 j2 j3 j4 j5 j6", "lundi → samedi = J1 → J6");
ok(main(0).length === 1 && main(0)[0].rest, "dimanche = repos");
const neck = P.days.filter((d) => d.kind === "neck");
ok(neck.map((d) => `${d.id}@${d.weekday}`).join() === "cou_mer@3,cou_sam@6", "bloc cou = jour distinct : court le mercredi, long le samedi", neck.map((d) => d.id + "@" + d.weekday));
ok(P.days.every((d) => d.rest || d.kind === "neck" || d.exercises[0].warmup), "échauffement en tête de chaque séance");
ok(P.specId === "shredlog-spec-v2" && P.version === 5, "programme marqué spec v2, version 5");
const exNames = ["neck_curl_plate", "neck_ext_plate", "neck_side_plate", "d_shrug", "cable_shrug", "barbell_shrug", "farmers_walk"];
ok(exNames.every((k) => D.EX[k]), "bibliothèque : 3 mouvements de cou, shrugs, farmer's walk");

console.log("4. Contrat avec les notifications");
const S = require(path.join(ROOT, "stock.js")); const Nf = require(path.join(ROOT, "supabase/functions/shredlog-notify/notify.js"));
const plan = (mode, today) => Nf.plan({ mode, today, docs: { "program/current": P }, logs: {}, D, S });
ok(plan("neck", "2026-09-30").messages.length === 1, "mercredi 07h30 : rappel du bloc cou (il existe désormais)");
ok(plan("evening", "2026-10-03").messages.length === 1 && /J6/.test(plan("evening", "2026-10-03").messages[0].body) && !/Cou/.test(plan("evening", "2026-10-03").messages[0].body), "samedi 20h30 : rappel J6 seul (le bloc cou n'y entre pas)");
ok(plan("evening", "2026-10-04").messages.length === 0, "dimanche 20h30 : repos, aucun rappel");

console.log(fails ? `\n${fails} échec(s)` : `\nTout est bon ✓ — 45 / 45 exercices d'origine présents, ${P.days.reduce((a, d) => a + d.exercises.filter((e) => !e.warmup).length, 0)} exercices au total`);
process.exit(fails ? 1 : 0);
