/* Contrôle de la logique des notifications : node tools/check_notify.js */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {}; eval(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"));
const D = window.SHRED_DATA; const S = require(path.join(ROOT, "stock.js"));
const N = require(path.join(ROOT, "supabase/functions/shredlog-notify/notify.js"));

let fails = 0; const ok = (cond, msg, extra) => { if (!cond) { fails++; console.log("  ✗ " + msg + (extra ? "\n      → " + JSON.stringify(extra) : "")); } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const PROGRAM = clone(D.PROGRAM);
const itemIds = D.SUPPLEMENTS.items.map((i) => i.id);
// Journal : toutes les cases cochées chaque jour du 27/09 à la veille de `until` (le jour même : rien de coché le matin).
function docsUntil(until, extra = {}) {
  const docs = { "program/current": PROGRAM, ...extra };
  for (let d = "2026-09-27"; d < until; d = S.addDays(d, 1)) docs["supplementLogs/" + d] = { date: d, taken: Object.fromEntries(itemIds.map((i) => [i, true])) };
  return docs;
}
const run = (mode, today, docs, logs = {}) => N.plan({ mode, today, docs: docs || docsUntil(today), logs, D, S });
const body = (r) => r.messages.map((m) => m.title + " | " + m.body).join(" || ");

console.log("1. Jours de la semaine (Bangkok)");
ok(N.weekdayOf("2026-09-27") === 0 && N.weekdayOf("2026-09-30") === 3 && N.weekdayOf("2026-10-04") === 0, "27/09 dimanche, 30/09 mercredi, 04/10 dimanche");

console.log("2. Rattrapage à l'abonnement");
let r = run("catchup", "2026-09-27");
ok(r.messages.length === 1 && /3 compléments en alerte/.test(r.messages[0].title), "27/09 : 3 items en alerte", body(r));
ok(/Probiotiques — en rupture \(commandé\)/.test(r.messages[0].body), "probiotiques inclus et signalés « commandé »", body(r));
ok(!r.logKeys.includes("stock:probio") && r.logKeys.includes("stock:omega3"), "journal : seulement les items non commandés", r.logKeys);
r = run("catchup", "2026-10-01");
ok(/5 compléments/.test(r.messages[0].title) && ["Probiotiques", "Collagène", "Oméga-3", "Créatine", "Rhodiola"].every((n) => r.messages[0].body.includes(n)), "01/10 : les 5 items (probio, collagène, oméga, créatine, rhodiola)", body(r));

console.log("3. Stock du matin (>= seuil, puis tous les 3 jours)");
r = run("morning", "2026-09-27");
ok(/À commander : 2/.test(body(r)) && !/Probiotiques/.test(body(r)), "27/09 : collagène + oméga (probio commandé exclu)", body(r));
const after = Object.fromEntries(r.logKeys.map((k) => [k, "2026-09-27"]));
r = run("morning", "2026-09-28", null, after);
ok(/Créatine/.test(body(r)), "28/09 : la créatine entre en alerte → rappel groupé immédiat", body(r));
const log28 = { ...after, ...Object.fromEntries(r.logKeys.map((k) => [k, "2026-09-28"])) };
r = run("morning", "2026-09-29", null, log28);
ok(!r.messages.some((m) => m.tag === "stock"), "29/09 : rien de neuf → pas de rappel (< 3 jours)", body(r));
r = run("morning", "2026-10-01", null, log28);
ok(r.messages.some((m) => m.tag === "stock" && /Rhodiola/.test(m.body)), "01/10 : rhodiola entre en alerte → rappel", body(r));
const log01 = { ...log28, ...Object.fromEntries(r.logKeys.map((k) => [k, "2026-10-01"])) };
ok(!run("morning", "2026-10-03", null, log01).messages.some((m) => m.tag === "stock"), "03/10 : 2 jours après → silence");
ok(run("morning", "2026-10-04", null, log01).messages.some((m) => m.tag === "stock"), "04/10 : 3 jours après → rappel");
const ordered = docsUntil("2026-10-04"); ["collagen", "omega3", "creatine", "rhodiola"].forEach((id) => (ordered["stock/" + id] = { ...D.STOCK.find((l) => l.id === id), orderedAt: "2026-10-02" }));
ok(!run("morning", "2026-10-04", ordered, log01).messages.some((m) => m.tag === "stock"), "tout marqué « recommandé » → plus de rappel");

console.log("4. Cycles");
const cyc = (d) => (run("morning", d, { "program/current": PROGRAM }).messages.find((m) => m.tag === "cycles") || {}).body || "";
ok(cyc("2026-11-19") === "Tongkat Ali, Boron : arrêt dans 3 jours (22 nov.)", "19/11 : Tongkat + Boron J-3", cyc("2026-11-19"));
ok(cyc("2026-11-05") === "Rhodiola : arrêt dans 3 jours (8 nov.)", "05/11 : Rhodiola J-3", cyc("2026-11-05"));
ok(cyc("2026-11-09") === "Rhodiola : phase OFF à partir d'aujourd'hui", "09/11 : Rhodiola OFF", cyc("2026-11-09"));
ok(cyc("2026-11-22") === "Rhodiola : reprise demain", "22/11 : Rhodiola reprise demain", cyc("2026-11-22"));
ok(cyc("2026-11-23") === "Tongkat Ali, Boron : phase OFF à partir d'aujourd'hui\nRhodiola : reprise aujourd'hui", "23/11 : T+B OFF, Rhodiola reprend", cyc("2026-11-23"));
ok(cyc("2026-12-20") === "Tongkat Ali, Boron : reprise demain" && cyc("2026-12-21") === "Tongkat Ali, Boron : reprise aujourd'hui", "20-21/12 : reprise T+B");
ok(cyc("2026-09-28") === "" && cyc("2026-10-15") === "", "pas d'alerte de cycle hors échéance (dont le jour de départ)");
ok(run("morning", "2026-11-19", { "program/current": PROGRAM }, { "cycle:tongkat:stop-3:2026-11-19": "2026-11-19", "cycle:boron:stop-3:2026-11-19": "2026-11-19" }).messages.every((m) => m.tag !== "cycles"), "cycle déjà envoyé ce jour → pas de doublon");

console.log("5. Séance 20h30 (ajout 1 : jamais les jours de repos / sans séance)");
const wdName = (wd) => (PROGRAM.days.find((d) => d.weekday === wd) || {});
ok(wdName(0).rest || !wdName(0).exercises || !wdName(0).exercises.length, "programme actuel : dimanche = repos");
r = run("evening", "2026-09-27");
ok(!r.messages.length && /repos/.test(r.skipped.join()), "dimanche 27/09 : aucun envoi", r.skipped);
r = run("evening", "2026-09-28");
ok(r.messages.length === 1 && r.messages[0].body.startsWith(wdName(1).name), "lundi 28/09 : rappel avec le nom de la séance", body(r));
const done = docsUntil("2026-09-28", { ["sessions/2026-09-28_" + wdName(1).id]: { date: "2026-09-28", dayId: wdName(1).id, status: "done" } });
ok(!run("evening", "2026-09-28", done).messages.length, "séance enregistrée → pas de rappel");
const inprog = docsUntil("2026-09-28", { ["sessions/2026-09-28_" + wdName(1).id]: { date: "2026-09-28", dayId: wdName(1).id, status: "in_progress" } });
ok(run("evening", "2026-09-28", inprog).messages.length === 1, "séance commencée mais pas terminée → rappel");
const noDay = clone(PROGRAM); noDay.days = noDay.days.filter((d) => d.weekday !== 1);
ok(!run("evening", "2026-09-28", { "program/current": noDay }).messages.length, "aucun jour prévu ce jour-là → aucun envoi");
ok(!run("evening", "2026-09-28", null, { "evening:2026-09-28": "2026-09-28" }).messages.length, "déjà envoyé ce soir → pas de doublon");

console.log("6. Bloc cou mercredi 07h30 (ajout 2 : seulement si le bloc existe)");
r = run("neck", "2026-09-30");
ok(!r.messages.length && /bloc absent/.test(r.skipped.join()), "programme actuel sans bloc cou → aucun envoi", r.skipped);
const withNeck = clone(PROGRAM); withNeck.days.push({ id: "neck_short", kind: "neck", weekday: 3, name: "Cou + trapèzes (court)", exercises: [{ id: "x" }] });
r = run("neck", "2026-09-30", { "program/current": withNeck });
ok(r.messages.length === 1 && /Cou \+ trapèzes/.test(r.messages[0].body), "bloc cou présent le mercredi → rappel", body(r));
ok(!run("neck", "2026-09-29", { "program/current": withNeck }).messages.length, "garde-fou : pas mercredi à Bangkok → aucun envoi");
const emptyNeck = clone(withNeck); emptyNeck.days[emptyNeck.days.length - 1].exercises = [];
ok(!run("neck", "2026-09-30", { "program/current": emptyNeck }).messages.length, "bloc cou vide → aucun envoi");
ok(!run("evening", "2026-09-30", { "program/current": { days: [withNeck.days[withNeck.days.length - 1]] } }).messages.length, "le bloc cou seul ne déclenche pas le rappel de 20h30");

console.log("7. Dimanche 21h : mensurations + recomptage mensuel");
r = run("weekly", "2026-10-04");
ok(r.messages.map((m) => m.tag).join() === "measures,recount", "04/10 (1er dimanche) : mensurations + « Recompte tes boîtes »", body(r));
ok(r.messages[1].title === "Recompte tes boîtes" && r.messages[1].url === "#recount", "texte et lien du recomptage");
ok(run("weekly", "2026-10-11").messages.map((m) => m.tag).join() === "measures", "11/10 (2e dimanche) : mensurations seules");
ok(!run("weekly", "2026-10-04", docsUntil("2026-10-04", { "measurements/2026-10-04": { weight: 70 } })).messages.some((m) => m.tag === "measures"), "mensurations déjà saisies → pas de rappel");
const recounted = docsUntil("2026-10-04"); D.STOCK.filter(S.countable).forEach((l) => (recounted["stock/" + l.id] = { ...l, lastCountedAt: "2026-10-01" }));
ok(!run("weekly", "2026-10-04", recounted).messages.some((m) => m.tag === "recount"), "recompté il y a 3 jours → pas de rappel de recomptage");
ok(run("weekly", "2026-11-01").messages.some((m) => m.tag === "recount"), "01/11 (1er dimanche de novembre) : recomptage");
ok(!run("weekly", "2026-10-05").messages.length, "garde-fou : lundi → aucun envoi hebdo");

console.log("8. Test et chargement");
ok(run("test", "2026-09-27").messages[0].title === "Test Shredlog", "mode test");
ok(N.since({}, D) === "2026-09-27" && N.since({ "stock/omega3": { lastCountedAt: "2026-10-02" } }, D) === "2026-09-27", "début des journaux à charger = plus ancien comptage");

console.log(fails ? `\n${fails} échec(s)` : "\nTout est bon ✓");
process.exit(fails ? 1 : 0);
