/* Contrôle du module Stock : node tools/check_stock.js
   1) l'inventaire de data.js reproduit COMPLEMENTS_INVENTAIRE.csv (20 lignes) — valeurs ET dates calculées
      (poudres / whey / D3 : depuis le comptage du 27/09/2026 ; capsules et softgels : décompte à partir du 19/10) ;
   2) règles : Oméga-3 unique, whey 60 g / délai 1 j, alerte en >= ;
   3) comportements : décrémentation, décocher, jours OFF, recomptage, whey via Nutrition ;
   4) pilulier : semaine déjà sortie des boîtes (countEffectiveFrom / date de comptage postérieure à aujourd'hui). */
const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {}; eval(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"));
const D = window.SHRED_DATA; const S = require(path.join(ROOT, "stock.js"));

let fails = 0; const ok = (cond, msg) => { if (!cond) { fails++; console.log("  ✗ " + msg); } };
const fr = (s) => { const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`; };
const TODAY = "2026-09-27";
const CSV_DATE = "2026-10-11"; // date à laquelle la colonne « Date alerte » dit DEPASSEE
const EFF = D.STOCK_EFFECTIVE; // 19/10 : 1er jour décompté pour les capsules et softgels

// Contexte de calcul avec journaux en mémoire
function ctxWith(sup = {}, nut = {}) {
  const items = Object.fromEntries(D.SUPPLEMENTS.items.map((i) => [i.id, i]));
  return { supLog: (d) => sup[d] || null, nutLog: (d) => nut[d] || null, nutPlan: D.NUTRITION, cycleOf: (id) => items[id] || null };
}
// Sections 2 et 3 : moteur sans pilulier (décompte depuis le comptage). Le pilulier est contrôlé en section 4.
const BASE = D.STOCK.map((l) => ({ ...l, countEffectiveFrom: null }));
const line = (id) => BASE.find((l) => l.id === id);
const real = (id) => D.STOCK.find((l) => l.id === id);

console.log("1. CSV ↔ data.js");
const rows = fs.readFileSync(path.join(ROOT, "COMPLEMENTS_INVENTAIRE.csv"), "utf8").trim().split("\n").slice(1).map((r) => r.split(";"));
ok(rows.length === 20, `CSV : 20 lignes attendues, ${rows.length} trouvées`);
ok(D.STOCK.length === 20, `data.js : 20 lignes de stock attendues, ${D.STOCK.length} trouvées`);
const n = (s) => Number(String(s).replace(",", "."));
const ctx0 = ctxWith();
rows.forEach((r) => {
  const [name, brand, unit, left, box, dose, , lead, buffer, days, rupt, alert, , , eff] = r;
  const l = D.STOCK.find((x) => x.name === name || name.startsWith(x.name));
  if (!l) return ok(false, `ligne CSV sans équivalent : ${name}`);
  ok(l.brand === brand, `${name} : marque ${l.brand} ≠ ${brand}`);
  ok(l.unit === unit, `${name} : unité ${l.unit} ≠ ${unit}`);
  ok(l.unitsLeft === n(left) && l.unitsPerBox === n(box) && l.dosePerDay === n(dose), `${name} : restant/boîte/dose ≠ CSV`);
  ok(l.leadTimeDays === n(lead) && l.bufferDays === n(buffer), `${name} : délai/marge ≠ CSV`);
  const s = S.status(l, TODAY, ctx0);
  ok((l.countEffectiveFrom ? fr(eff) === l.countEffectiveFrom : !eff), `${name} : décompte à partir du « ${eff} » ≠ ${l.countEffectiveFrom}`);
  ok(S.countable(l) === !!l.countEffectiveFrom, `${name} : pilulier réservé aux capsules et softgels`);
  const cover = S.diffDays(s.effectiveFrom || TODAY, s.rupture); // jours de stock à partir du 1er jour décompté
  ok(cover === n(days), `${name} : jours restants ${cover} ≠ ${days}`);
  ok(s.rupture === fr(rupt), `${name} : rupture ${s.rupture} ≠ ${rupt}`);
  if (alert === "DEPASSEE") ok(s.alertDate < CSV_DATE && S.status(l, CSV_DATE, ctx0).inAlert, `${name} : alerte ${s.alertDate} devrait être dépassée`);
  else ok(s.alertDate === fr(alert), `${name} : alerte ${s.alertDate} ≠ ${alert}`);
});

console.log("2. Règles");
ok(D.STOCK.filter((l) => /om[ée]ga/i.test(l.name)).length === 1, "Oméga-3 : une seule ligne de stock");
ok(line("omega3").takes.map((t) => t.item).join() === "omega1,omega2", "Oméga-3 consommé par omega1 + omega2");
ok(line("whey").leadTimeDays === 1 && line("whey").unit === "gramme" && line("whey").dosePerDay === 60, "Whey : grammes, 60 g/j, délai 1 j");
const wheyPlan = D.NUTRITION.meals.flatMap((m) => m.foods).filter((f) => /whey/i.test(f.name)).reduce((a, f) => a + f.grams, 0);
ok(wheyPlan === 60, `Whey : le plan nutrition totalise ${wheyPlan} g/j (60 attendus)`);
D.STOCK.filter((l) => !l.food).forEach((l) => { const q = l.takes.reduce((a, t) => a + t.qty, 0); ok(Math.abs(q - l.dosePerDay) < 1e-9, `${l.name} : cases = ${q}/j ≠ dose ${l.dosePerDay}`); });
const itemIds = new Set(D.SUPPLEMENTS.items.map((i) => i.id));
D.STOCK.forEach((l) => l.takes.forEach((t) => ok(itemIds.has(t.item), `${l.name} : case inconnue ${t.item}`)));
itemIds.forEach((id) => ok(D.STOCK.some((l) => l.takes.some((t) => t.item === id)), `case ${id} sans ligne de stock`));
// Journal où toutes les cases sont cochées chaque jour du 27/09 jusqu'à d inclus (prise normale)
const allTaken = (until) => { const o = {}; for (let d = TODAY; d <= until; d = S.addDays(d, 1)) o[d] = { taken: Object.fromEntries([...itemIds].map((i) => [i, true])) }; return o; };
const alertOn = (d) => { const c = ctxWith(allTaken(d)); return BASE.filter((l) => l.id !== "whey" && S.status(l, d, c).inAlert).map((l) => l.id).sort().join(); };
ok(alertOn("2026-09-27") === "collagen,omega3,probio", `alerte 27/09 : ${alertOn("2026-09-27")}`);
ok(alertOn("2026-09-28") === "collagen,creatine,omega3,probio", `alerte 28/09 (>=) : ${alertOn("2026-09-28")}`);
ok(alertOn("2026-10-01") === "collagen,creatine,omega3,probio,rhodiola", `alerte 01/10 : ${alertOn("2026-10-01")}`);
ok(alertOn("2026-10-05").includes("creatine") && alertOn("2026-10-05").includes("probio"), "créatine toujours en alerte après la date (pas d'égalité stricte)");

console.log("3. Comportements");
const sup = { "2026-09-27": { taken: { omega1: true, omega2: true } } };
let s = S.status(line("omega3"), TODAY, ctxWith(sup));
ok(s.unitsLeft === 27 && s.rupture === "2026-10-11", `Oméga cochés le 27/09 : 27 restants, rupture inchangée (${s.unitsLeft}, ${s.rupture})`);
sup["2026-09-28"] = { taken: { omega1: true } };
s = S.status(line("omega3"), "2026-09-28", ctxWith(sup));
ok(s.unitsLeft === 26, `+1 oméga le 28/09 : 26 restants (${s.unitsLeft})`);
sup["2026-09-28"].taken.omega1 = false;
ok(S.status(line("omega3"), "2026-09-28", ctxWith(sup)).unitsLeft === 27, "décocher rend l'unité");
// Cycle Rhodiola 6 ON / 2 OFF depuis le 28/09
const rh = D.SUPPLEMENTS.items.find((i) => i.id === "rhodiola");
ok(S.isOn(rh, "2026-11-08") && !S.isOn(rh, "2026-11-09") && !S.isOn(rh, "2026-11-22") && S.isOn(rh, "2026-11-23"), "Rhodiola : ON → 08/11, OFF 09/11 → 22/11, reprise 23/11");
const tk = D.SUPPLEMENTS.items.find((i) => i.id === "tongkat");
ok(S.isOn(tk, "2026-11-22") && !S.isOn(tk, "2026-11-23") && !S.isOn(tk, "2026-12-20") && S.isOn(tk, "2026-12-21"), "Tongkat : ON → 22/11, OFF 23/11 → 20/12, reprise 21/12");
const big = { ...line("rhodiola"), unitsLeft: 100, lastCountedAt: "2026-11-09" };
const offSup = { "2026-11-09": { taken: { rhodiola: true } } };
ok(S.status(big, "2026-11-09", ctxWith(offSup)).unitsLeft === 100, "prise cochée un jour OFF : aucun stock consommé");
// 100 caps / 2 = 50 jours ON : 23/11 → 03/01 (42 j), OFF 04/01 → 17/01, puis 8 j → rupture 26/01/2027
ok(S.status(big, "2026-11-09", ctxWith()).rupture === "2027-01-26", `rupture Rhodiola sautant les jours OFF : ${S.status(big, "2026-11-09", ctxWith()).rupture}`);
// Recomptage « Reçu — j'ai 90 unités » après avoir coché aujourd'hui
const supR = { "2026-10-02": { taken: { omega1: true } } };
const rc = S.recount({ ...line("omega3"), orderedAt: "2026-09-27" }, 90, "2026-10-02", ctxWith(supR), true);
s = S.status(rc, "2026-10-02", ctxWith(supR));
ok(s.unitsLeft === 90 && !s.ordered, `recomptage : 90 restants, commande levée (${s.unitsLeft})`);
supR["2026-10-02"].taken.omega2 = true;
ok(S.status(rc, "2026-10-02", ctxWith(supR)).unitsLeft === 89, "prise cochée après le recomptage : décomptée");
// Recomptage mensuel
ok(D.STOCK.filter(S.countable).map((l) => l.unit).every((u) => u === "capsule" || u === "softgel"), "recomptage : seulement capsules et softgels");
ok(!S.countable(line("whey")) && !S.countable(line("creatine")) && !S.countable(line("d3k2")) && S.countable(line("omega3")), "recomptage : ni poudres ni flacon D3");
ok(D.STOCK.filter(S.countable).length === 15, `recomptage : 15 lignes comptables (${D.STOCK.filter(S.countable).length})`);
const supM = { "2026-09-27": { taken: { omega1: true, omega2: true } }, "2026-09-28": { taken: { omega1: true } } };
const before = S.status({ ...line("omega3"), orderedAt: "2026-09-27" }, "2026-09-28", ctxWith(supM));
const same = S.recount({ ...line("omega3"), orderedAt: "2026-09-27" }, before.unitsLeft, "2026-09-28", ctxWith(supM));
const after = S.status(same, "2026-09-28", ctxWith(supM));
ok(same.lastCountedAt === "2026-09-28" && after.unitsLeft === before.unitsLeft && after.rupture === before.rupture, `« Tout est juste » : quantité et rupture inchangées (${before.unitsLeft} → ${after.unitsLeft}, ${before.rupture} → ${after.rupture})`);
ok(after.ordered, "recomptage mensuel : une commande en cours reste en cours");
supM["2026-09-28"].taken.omega2 = true;
ok(S.status(same, "2026-09-28", ctxWith(supM)).unitsLeft === before.unitsLeft - 1, "prise cochée après « Tout est juste » : décomptée");
// Boron 1 cap/j, cycle 8/4 : 57 caps jusqu'au 22/11, OFF 23/11 → 20/12, 28 jours de reprise → rupture 18/01/2027
ok(S.status(line("boron"), TODAY, ctx0).rupture === "2027-01-18", "Boron 1 cap/j : rupture 18/01/2027 (pause sautée)");
// Prochain recomptage = jour de la notification
ok(S.nextRecount("2026-09-27", "2026-09-27") === "2026-10-04", "compté le 27/09 → prochain le 04/10 (1er dimanche d'octobre)");
ok(S.nextRecount("2026-10-01", "2026-10-02") === "2026-11-01", "compté le 01/10 → le 04/10 est trop proche → 01/11");
ok(S.nextRecount("2026-10-04", "2026-10-04") === "2026-11-01", "recompté le jour même → mois suivant");
ok(S.nextRecount(null, "2026-09-27") === "2026-10-04", "jamais compté → 1er dimanche suivant");
{ // Équivalence avec la règle de l'Edge Function déployée (notify.js, mode weekly) sur 400 jours × plusieurs dates de comptage
  global.window = window; const N = require(require("path").join(ROOT, "supabase/functions/shredlog-notify/notify.js"));
  let diffs = 0;
  for (const counted of ["2026-09-27", "2026-10-01", "2026-10-30", "2026-11-29"]) {
    const docs = Object.fromEntries(D.STOCK.map((l) => ["stock/" + l.id, { ...l, lastCountedAt: counted }]));
    for (let d = counted, i = 0; i < 400; d = S.addDays(d, 1), i++) {
      const notif = N.plan({ mode: "weekly", today: d, docs, logs: {}, D, S }).messages.some((m) => m.tag === "recount");
      if (notif !== (S.nextRecount(counted, d) === d)) diffs++;
    }
  }
  ok(diffs === 0, `date affichée = jour de la notification (${diffs} écart(s) sur 1600 cas)`);
}
// Phases de cycle (masquage de la liste du jour, section « En pause »)
const cyc = (id) => D.SUPPLEMENTS.items.find((i) => i.id === id);
let ci = S.cycleInfo(cyc("rhodiola"), "2026-09-27");
ok(ci.cycled && ci.on && ci.stop === "2026-11-09", "Rhodiola le 27/09 : ON, pause le 09/11", ci);
ci = S.cycleInfo(cyc("rhodiola"), "2026-11-10");
ok(!ci.on && ci.resume === "2026-11-23" && S.diffDays("2026-11-10", ci.resume) === 13, "Rhodiola le 10/11 : OFF, reprise dans 13 jours (23/11)", ci);
ci = S.cycleInfo(cyc("tongkat"), "2026-12-20");
ok(!ci.on && ci.resume === "2026-12-21", "Tongkat le 20/12 : reprise demain", ci);
ci = S.cycleInfo(cyc("boron"), "2026-12-21");
ok(ci.on && ci.stop === "2027-02-15", "Boron le 21/12 : reprise, prochaine pause le 15/02/2027", ci);
ok(!S.cycleInfo(cyc("zinc"), "2026-11-10").cycled && S.cycleInfo(cyc("zinc"), "2026-11-10").on, "non cyclé : toujours ON");
ok(S.cycleInfo({ ...cyc("rhodiola"), cycleEnabled: false }, "2026-11-10").on, "cycle désactivé : toujours ON");
// Whey via repas validés
const nut = { "2026-09-27": { meals: { m1: { eaten: true }, m2: { eaten: true, foods: [{ name: "Whey ISO100", grams: 45 }] } } } };
ok(S.status(line("whey"), TODAY, ctxWith({}, nut)).unitsLeft === 2100 - 30 - 45, "whey : grammes réels des repas validés");
ok(S.status(line("probio"), TODAY, ctx0).ordered, "probiotiques importés comme déjà recommandés");

console.log("4. Pilulier (semaine du 12/10 au 18/10 déjà sortie des boîtes, décompte à partir du 19/10)");
{
  const NOW = "2026-10-11"; const all = Object.fromEntries([...itemIds].map((i) => [i, true]));
  const week = (from, to) => { const o = {}; for (let d = from; d <= to; d = S.addDays(d, 1)) o[d] = { taken: { ...all } }; return o; };
  const q = real("coq10"), mg = real("magnesium");
  ok(EFF === "2026-10-19" && q.countEffectiveFrom === EFF && q.lastCountedAt < NOW, "CoQ10 : décompte à partir du 19/10, date postérieure à aujourd'hui (11/10)");
  ok(q.dosePerDay === 2 && mg.dosePerDay === 3, "doses : CoQ10 2 softgels/j, magnésium 3 comprimés/j");
  // Date de décompte dans le futur : rien ne casse, rien n'est consommé, la projection part du 19/10
  let p = S.status(q, NOW, ctx0);
  ok(p.unitsLeft === 71 && p.effectiveFrom === EFF, `avant le 19/10 : stock = boîte (${p.unitsLeft}), décompte annoncé au ${p.effectiveFrom}`);
  ok(p.rupture === "2026-11-23" && p.alertDate === "2026-11-06" && p.daysLeft === 43, `CoQ10 71 softgels à 2/j dès le 19/10 : rupture 23/11, seuil 06/11 (${p.rupture}, ${p.alertDate}, ${p.daysLeft} j)`);
  ok(S.status(mg, NOW, ctx0).rupture === "2026-11-27" && S.status(mg, NOW, ctx0).alertDate === "2026-11-10", `magnésium 118 comprimés à 3/j dès le 19/10 : rupture 27/11, seuil 10/11 (${S.status(mg, NOW, ctx0).rupture})`);
  // Sans la semaine offerte, la rupture tomberait 8 jours plus tôt (décompte dès le 11/10)
  ok(S.status({ ...q, countEffectiveFrom: null, lastCountedAt: NOW }, NOW, ctx0).rupture === "2026-11-15", "sans pilulier la rupture serait le 15/11 : la semaine offerte est bien prise en compte");
  // Prises cochées du 11/10 au 18/10 : aucune ne consomme, rupture et seuil ne bougent pas
  const sup = week("2026-10-11", "2026-10-18");
  for (const d of ["2026-10-11", "2026-10-12", "2026-10-15", "2026-10-18"]) {
    D.STOCK.filter(S.countable).forEach((l) => { const a = S.status(l, d, ctxWith(sup)), b = S.status(l, d, ctx0);
      ok(a.unitsLeft === l.unitsLeft && a.rupture === b.rupture && a.alertDate === b.alertDate && a.effectiveFrom === EFF, `${l.name} le ${d} : prises cochées sans effet (${a.unitsLeft}/${l.unitsLeft}, ${a.rupture})`); });
  }
  const ref = S.status(q, NOW, ctx0);
  ok(["2026-10-12", "2026-10-18", "2026-10-19"].every((d) => S.status(q, d, ctxWith(sup)).rupture === ref.rupture), "la rupture reste la même vue du 11/10, du 18/10 ou du 19/10");
  // Le décompte reprend le 19/10
  sup["2026-10-19"] = { taken: { coq10: true, magnesium: true } };
  p = S.status(q, "2026-10-19", ctxWith(sup));
  ok(p.unitsLeft === 69 && p.effectiveFrom === null && p.rupture === "2026-11-23", `19/10 coché : 69 softgels, rupture inchangée (${p.unitsLeft}, ${p.rupture})`);
  ok(S.status(mg, "2026-10-19", ctxWith(sup)).unitsLeft === 115, "19/10 coché : magnésium 115 comprimés");
  sup["2026-10-20"] = { taken: { coq10: true } };
  ok(S.status(q, "2026-10-20", ctxWith(sup)).unitsLeft === 67, "20/10 coché : 67 softgels");
  sup["2026-10-20"].taken.coq10 = false;
  ok(S.status(q, "2026-10-20", ctxWith(sup)).unitsLeft === 69, "décocher rend toujours l'unité");
  // Même résultat si l'on modélise par une date de comptage dans le futur (lastCountedAt = 19/10)
  const fut = { ...q, countEffectiveFrom: null, lastCountedAt: EFF, countExclude: [] };
  for (const d of [NOW, "2026-10-15", "2026-10-19", "2026-10-20"]) { const a = S.status(fut, d, ctxWith(sup)), b = S.status(q, d, ctxWith(sup)); ok(a.unitsLeft === b.unitsLeft && a.rupture === b.rupture && a.alertDate === b.alertDate && a.daysLeft === b.daysLeft, `date de comptage postérieure à aujourd'hui (${d}) : même calcul`); }
  // Cycle : Rhodiola 42 caps à 2/j = 21 jours ON du 19/10 au 08/11, pause 09/11 → 22/11, rupture à la reprise
  ok(S.status(real("rhodiola"), NOW, ctx0).rupture === "2026-11-23", `Rhodiola : rupture 23/11 (${S.status(real("rhodiola"), NOW, ctx0).rupture})`);
  // Poudres, whey, flacon : pas de pilulier, une prise cochée le 12/10 consomme
  const cr = real("creatine");
  ok(!cr.countEffectiveFrom && S.status({ ...cr, lastCountedAt: NOW }, "2026-10-12", ctxWith(sup)).unitsLeft === 80, "créatine : décomptée normalement pendant la semaine du pilulier");
  // Recompter pendant la semaine du pilulier : on compte les boîtes, le décompte reste suspendu jusqu'au 19/10
  const rc = S.recount(q, 60, "2026-10-14", ctxWith(sup));
  ok(rc.countEffectiveFrom === EFF && S.status(rc, "2026-10-18", ctxWith(sup)).unitsLeft === 60 && S.status(rc, "2026-10-19", ctxWith(sup)).unitsLeft === 58, "recomptage le 14/10 : 60 jusqu'au 18/10, 58 après la prise du 19/10");
  // Recompter après le 19/10 : retour au fonctionnement normal
  const rc2 = S.recount(q, 50, "2026-10-20", ctxWith(sup));
  ok(rc2.countEffectiveFrom === null && S.status(rc2, "2026-10-20", ctxWith(sup)).unitsLeft === 50, "recomptage le 20/10 : le pilulier n'a plus d'effet");
  // Regroupement de commande et prochain recomptage : pas d'erreur avec des dates à venir
  const rows4 = D.STOCK.map((l) => ({ line: l, st: S.status(l, NOW, ctxWith(sup)) }));
  ok(rows4.every((x) => x.st.rupture && x.st.daysLeft >= 0 && !Number.isNaN(x.st.unitsLeft)), "aucune ligne cassée le 11/10");
  ok(Array.isArray(S.orderGroup(rows4, NOW, false).anchors) && S.nextRecount(EFF, NOW) === "2026-11-01", "commande groupée et prochain recomptage calculables");
}

console.log(fails ? `\n${fails} échec(s)` : "\nTout est bon ✓ (20 lignes CSV reproduites)");
process.exit(fails ? 1 : 0);
