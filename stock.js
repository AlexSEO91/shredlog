/* Shredlog — moteur de stock des compléments (calcul pur, sans DOM).
   Partagé entre l'app (window.ShredStock) et les scripts / Edge Function (module.exports).

   Une ligne de stock ≠ une case à cocher : chaque ligne liste les cases qui la consomment
   (takes[{item, qty}]) ou, pour la whey, les aliments des repas validés (food: /regex/).
   Le stock restant est DÉRIVÉ des cases cochées depuis le dernier comptage : décocher rend l'unité,
   jamais de double décompte. Unité libre (capsule, softgel, gramme, ml) : tout est dans l'unité de la ligne. */
(function (root) {
  "use strict";
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5); // b − a
  const EPS = 1e-9;

  /* Cycle ON/OFF. cycle = {cycleStart, weeksOn, weeksOff, cycleEnabled}. Avant cycleStart : ON (prise en cours). */
  function isOn(cycle, date) {
    if (!cycle || !cycle.cycleEnabled || !cycle.cycleStart || !cycle.weeksOn) return true;
    const d = diffDays(cycle.cycleStart, date); if (d < 0) return true;
    const on = cycle.weeksOn * 7, period = on + (cycle.weeksOff || 0) * 7;
    return d % period < on;
  }

  /* Phase d'un complément cyclé à une date : { cycled, on, resume (1er jour ON si OFF), stop (1er jour OFF si ON) }. */
  function cycleInfo(cycle, date) {
    const cycled = !!(cycle && cycle.cycleEnabled && cycle.cycleStart && cycle.weeksOn && cycle.weeksOff);
    const on = isOn(cycle, date); if (!cycled) return { cycled, on };
    let d = addDays(date, 1); for (let i = 0; i < 800 && isOn(cycle, d) === on; i++) d = addDays(d, 1);
    return on ? { cycled, on, stop: d } : { cycled, on, resume: d };
  }

  /* Consommation d'une ligne sur une journée, à partir des journaux.
     ctx = { supLog(date) → {taken{}}, nutLog(date) → {meals{}}, nutPlan, cycleOf(itemId) }
     exclude = clés déjà comptées au moment du recomptage (["omega1", "meal:m2"]). */
  function dayUse(line, date, ctx, exclude) {
    const ex = exclude || [];
    let q = 0;
    const sl = ctx.supLog(date); const taken = (sl && sl.taken) || {};
    (line.takes || []).forEach((t) => { if (taken[t.item] && !ex.includes(t.item) && isOn(ctx.cycleOf(t.item), date)) q += t.qty; });
    if (line.food) {
      const re = new RegExp(line.food, "i"); const nl = ctx.nutLog(date); const meals = (nl && nl.meals) || {};
      ((ctx.nutPlan && ctx.nutPlan.meals) || []).forEach((m) => {
        const l = meals[m.id]; if (!l || !l.eaten || ex.includes("meal:" + m.id)) return;
        (l.foods || m.foods || []).forEach((f) => { if (re.test(f.name || "")) q += Number(f.grams) || 0; });
      });
    }
    return q;
  }
  /* Clés cochées un jour donné (pour figer un recomptage). */
  function keysTaken(line, date, ctx) {
    const out = []; const sl = ctx.supLog(date); const taken = (sl && sl.taken) || {};
    (line.takes || []).forEach((t) => { if (taken[t.item]) out.push(t.item); });
    if (line.food) { const nl = ctx.nutLog(date); const meals = (nl && nl.meals) || {}; Object.keys(meals).forEach((id) => { if (meals[id].eaten) out.push("meal:" + id); }); }
    return out;
  }
  const lineCycle = (line, ctx) => (line.takes && line.takes.length ? ctx.cycleOf(line.takes[0].item) : null);

  /* État complet d'une ligne à la date `today`. */
  function status(line, today, ctx) {
    const counted = line.lastCountedAt || today;
    let used = 0;
    for (let d = counted; d <= today; d = addDays(d, 1)) used += dayUse(line, d, ctx, d === counted ? line.countExclude : null);
    const raw = Number(line.unitsLeft) - used; const unitsLeft = Math.max(0, raw);
    // Projection depuis le début de la journée : on remet les prises cochées aujourd'hui
    // (si le recomptage date d'aujourd'hui, X + prises exclues = stock du matin).
    const startOfDay = Math.max(0, raw + dayUse(line, today, ctx, null));
    const dose = Number(line.dosePerDay) || 0;
    const cyc = lineCycle(line, ctx);
    let rupture;
    if (dose <= 0) rupture = null;
    else {
      let n = Math.floor(startOfDay / dose + EPS); // nombre de jours ON couverts
      let d = today; let guard = 0;
      while (guard++ < 3660) { if (isOn(cyc, d)) { if (n <= 0) break; n--; } d = addDays(d, 1); }
      rupture = d;
    }
    const daysLeft = rupture ? diffDays(today, rupture) : null;
    const alertDate = rupture ? addDays(rupture, -((line.leadTimeDays || 0) + (line.bufferDays == null ? 7 : line.bufferDays))) : null;
    const inAlert = !!alertDate && today >= alertDate; // jamais d'égalité stricte : les items en retard restent en alerte
    const level = inAlert ? "red" : alertDate && today >= addDays(alertDate, -7) ? "amber" : "green";
    return { id: line.id, unitsLeft: Math.round(unitsLeft * 1000) / 1000, daysLeft, rupture, alertDate, inAlert, level, ordered: !!line.orderedAt, off: !isOn(cyc, today) };
  }

  /* Recomptage : X est le stock réel maintenant, prises déjà cochées aujourd'hui incluses.
     received = true pour « Reçu — j'ai X unités » (la commande est arrivée → statut « commandé » levé) ;
     false pour le recomptage mensuel (une commande en cours reste en cours). */
  function recount(line, units, today, ctx, received) {
    return { ...line, unitsLeft: Number(units), lastCountedAt: today, countExclude: keysTaken(line, today, ctx), orderedAt: received ? null : line.orderedAt || null };
  }
  /* Lignes qu'on peut compter à la main : capsules et softgels (pas les poudres ni le flacon de D3). */
  const COUNTABLE = ["capsule", "softgel"];
  const countable = (line) => COUNTABLE.includes(line.unit);

  /* Commande groupée : dès qu'au moins un complément atteint son seuil (« ancre »), on y ajoute ceux du même
     fournisseur dont le seuil tombe dans les 7 jours suivants (« à ajouter à la commande »), s'ils ne sont pas
     déjà commandés. Une seule commande iHerb au lieu de plusieurs étalées ; la whey (Central) reste à part.
     rows = [{line, st}] ; withOrdered = les ancres déjà commandées comptent (rattrapage). */
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

  /* Prochain recomptage = date de la notification « Recompte tes boîtes » : 1er dimanche du mois (21h Bangkok),
     à condition que le plus ancien comptage ait au moins 7 jours ce jour-là. */
  function nextRecount(counted, today) {
    for (let d = today, i = 0; i < 70; d = addDays(d, 1), i++) {
      if (parse(d).getUTCDay() === 0 && Number(d.slice(8)) <= 7 && (!counted || diffDays(counted, d) >= 7)) return d;
    }
    return null;
  }

  const api = { isOn, cycleInfo, dayUse, status, recount, countable, orderGroup, nextRecount, addDays, diffDays };
  root.ShredStock = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
