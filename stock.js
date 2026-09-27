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

  const api = { isOn, dayUse, status, recount, countable, addDays, diffDays };
  root.ShredStock = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
