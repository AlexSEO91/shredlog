/* Shredlog — données de référence : bibliothèque d'exercices, programme par défaut, compléments.
   Images : free-exercise-db (domaine public, Unlicense). Charges machines = point de départ à calibrer en séance 1. */
window.SHRED_DATA = (function () {
  const kg = (k) => ({ kg: k, lbs: Math.round(k * 2.20462 * 2) / 2 });

  // Bibliothèque d'exercices. id → { name, img (base free-exercise-db), muscles principaux/secondaires (clé carte musculaire), cues }
  const EX = {
    // ── Échauffements
    shoulder_circles: { name: "Rotations d'épaules + mobilité", img: "Shoulder_Circles", primary: ["shoulders"], secondary: ["traps"], cues: ["Grands cercles avant/arrière, 20 s chaque sens", "Puis bras tendus, ouverture poitrine"] },
    band_pull_apart: { name: "Band pull-apart", img: "Band_Pull_Apart", primary: ["shoulders", "middle back"], secondary: ["traps"], cues: ["Élastique tendu devant, écarte jusqu'à la poitrine", "Omoplates serrées, coudes presque tendus"] },
    pushups_warm: { name: "Pompes lentes (genoux si besoin)", img: "Pushups", primary: ["chest"], secondary: ["triceps", "shoulders"], cues: ["Tempo 2-1-1, corps gainé", "Activation pecs/épaules, pas d'échec"] },
    bw_squat: { name: "Squats à vide + fentes lentes", img: "Bodyweight_Squat", primary: ["quadriceps"], secondary: ["glutes", "hamstrings"], cues: ["Descends sous la parallèle si possible", "Genoux dans l'axe des pieds"] },
    treadmill_walk: { name: "Marche rapide tapis (3 min)", img: "Running_Treadmill", primary: ["quadriceps"], secondary: ["calves"], cues: ["Pente 3-5 %, 6 km/h", "Montée en température, pas plus"] },

    // ── Haut du corps : machines
    m_incline_press: { name: "Développé incliné machine", img: "Leverage_Incline_Chest_Press", primary: ["chest"], secondary: ["shoulders", "triceps"], cues: ["Poignées au niveau du haut des pecs", "Omoplates plaquées, descends 2 s, pousse 1 s", "Craquements d'épaule sans douleur : charge contrôlée, amplitude confortable"] },
    m_seated_row: { name: "Rowing assis poulie basse", img: "Seated_Cable_Rows", primary: ["middle back", "lats"], secondary: ["biceps"], cues: ["« Omoplates d'abord, bras ensuite »", "Tire vers le nombril, coudes le long du corps", "Buste fixe, pas de balancement"] },
    m_shoulder_press: { name: "Développé épaules machine", img: "Machine_Shoulder_Military_Press", primary: ["shoulders"], secondary: ["triceps"], cues: ["Poignées à hauteur des oreilles au départ", "Ne verrouille pas les coudes en haut", "Bas du dos collé au dossier"] },
    m_lat_pulldown: { name: "Tirage poulie haute (prise large)", img: "Wide-Grip_Lat_Pulldown", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Tire la barre vers le haut des pecs", "Coudes vers les hanches, poitrine ouverte", "Remonte lentement, épaules qui s'étirent"] },
    m_pec_deck: { name: "Pec deck (écarté machine)", img: "Butterfly", primary: ["chest"], secondary: ["shoulders"], cues: ["Coudes légèrement fléchis, fixes", "Serre les pecs 1 s au milieu", "Ouvre jusqu'à l'étirement sans forcer l'épaule"] },
    m_bicep_curl: { name: "Curl biceps machine", img: "Machine_Bicep_Curl", primary: ["biceps"], secondary: ["forearms"], cues: ["Aisselles calées sur le coussin", "Monte 1 s, descends 2 s sans relâcher en bas"] },
    m_lateral_raise: { name: "Élévations latérales poulie basse", img: "Cable_Seated_Lateral_Raise", primary: ["shoulders"], secondary: ["traps"], cues: ["Câble sous le bras opposé", "Monte le coude, pas la main, jusqu'à l'horizontale", "Pas d'élan du buste"] },
    m_triceps_rope: { name: "Extensions triceps poulie (corde)", img: "Triceps_Pushdown_-_Rope_Attachment", primary: ["triceps"], secondary: [], cues: ["Coudes collés au corps, ils ne bougent pas", "Écarte la corde en bas et contracte", "Seul l'avant-bras se déplace"] },
    m_chest_press: { name: "Développé couché machine", img: "Machine_Bench_Press", primary: ["chest"], secondary: ["triceps", "shoulders"], cues: ["Poignées au niveau des mamelons", "Omoplates serrées, pousse sans décoller le dos"] },
    m_assisted_pullup: { name: "Tractions assistées (machine)", img: "Band_Assisted_Pull-Up", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Règle l'assistance pour 8-10 reps propres", "Menton au-dessus de la barre, descente 2 s", "Baisse l'assistance quand tu réussis 10 reps"] },
    m_high_row: { name: "Rowing machine (buste appuyé)", img: "Leverage_High_Row", primary: ["middle back"], secondary: ["lats", "biceps"], cues: ["Poitrine contre le support, pas de triche", "Coudes vers l'arrière, omoplates serrées 1 s"] },
    m_hammer_rope: { name: "Curl marteau à la corde", img: "Cable_Hammer_Curls_-_Rope_Attachment", primary: ["biceps"], secondary: ["forearms"], cues: ["Prise neutre (pouces vers le haut)", "Coudes fixes, monte jusqu'aux épaules"] },
    m_dip: { name: "Dips machine (assistée ou lestée)", img: "Dip_Machine", primary: ["triceps"], secondary: ["chest", "shoulders"], cues: ["Coudes serrés pour cibler les triceps", "Descente 2 s, pousse sans verrouiller"] },
    m_shrug: { name: "Shrugs machine / Smith", img: "Leverage_Shrug", primary: ["traps"], secondary: ["neck"], cues: ["Épaules vers les oreilles, 1 s de pause en haut", "Pas de rotation des épaules, mouvement vertical"] },
    m_wrist_curl: { name: "Curl poignet poulie basse", img: "Cable_Wrist_Curl", primary: ["forearms"], secondary: [], cues: ["Avant-bras posés, seul le poignet bouge", "15 reps paumes vers le haut, puis 15 paumes vers le bas"] },
    m_reverse_pec_deck: { name: "Pec deck inversé (arrière d'épaule)", img: "Reverse_Machine_Flyes", primary: ["shoulders"], secondary: ["middle back", "traps"], cues: ["Poitrine contre le dossier, bras presque tendus", "Ouvre vers l'arrière en serrant les omoplates", "Pause 1 s : c'est l'exo qui ouvre les épaules (posture)"] },
    m_face_pull: { name: "Face pull (corde, poulie haute)", img: "Face_Pull", primary: ["shoulders"], secondary: ["middle back", "traps"], cues: ["Tire la corde vers le visage, coudes hauts", "Écarte les mains en fin de mouvement, omoplates serrées", "Charge légère, contrôle total"] },
    d_reverse_flyes: { name: "Oiseau haltères (arrière d'épaule)", img: "Reverse_Flyes", primary: ["shoulders"], secondary: ["middle back"], cues: ["Buste penché, dos plat", "Ouvre les bras vers l'extérieur, coudes légèrement fléchis", "Pause 1 s en haut, pas d'élan"] },
    m_close_pulldown: { name: "Tirage poulie haute prise serrée", img: "Close-Grip_Front_Lat_Pulldown", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Prise en V, tire vers le haut des pecs", "Coudes le long du corps, étirement complet en haut"] },
    neck_curl_plate: { name: "Flexion du cou lestée (disque sur le front)", img: "Lying_Face_Up_Plate_Neck_Resistance", primary: ["neck"], secondary: [], cues: ["Allongé sur le dos, tête dans le vide au bout du banc", "Disque (2,5-5 kg) sur le front, protégé par une serviette", "Menton vers la poitrine, descente lente 2 s, amplitude complète"] },
    neck_ext_plate: { name: "Extension du cou lestée (disque sur la nuque)", img: "Lying_Face_Down_Plate_Neck_Resistance", primary: ["neck"], secondary: ["traps"], cues: ["Allongé sur le ventre, tête dans le vide", "Disque tenu sur l'arrière du crâne", "Relève la tête en regardant devant, descente lente"] },
    neck_harness: { name: "Cou au harnais (ou machine 4 directions)", img: "Seated_Head_Harness_Neck_Resistance", primary: ["neck"], secondary: ["traps"], cues: ["Harnais + disque ou machine cou de la salle", "Mouvement lent, 12-20 reps, aucune douleur tolérée"] },
    m_seated_calf: { name: "Mollets assis machine (soléaire)", img: "Seated_Calf_Raise", primary: ["calves"], secondary: [], cues: ["Coussin sur les cuisses, étirement complet en bas", "Pause 1 s en haut, tempo lent"] },
    neck_iso: { name: "Cou isométrique 4 directions", img: "Isometric_Neck_Exercise_-_Front_And_Back", img2: "Isometric_Neck_Exercise_-_Sides", primary: ["neck"], secondary: ["traps"], cues: ["Main contre le front, pousse sans bouger : 15-20 s", "Puis arrière, gauche, droite", "Résistance modérée, aucune douleur tolérée"] },
    dead_hang: { name: "Dead hang (suspension)", img: "One_Handed_Hang", primary: ["forearms"], secondary: ["lats", "shoulders"], cues: ["Mains largeur d'épaules, pieds décollés", "Épaules actives (pas complètement relâchées)", "Objectif 30 → 60 → 90 s"] },

    // ── Haut du corps : haltères / poids du corps
    d_incline_press: { name: "Développé incliné haltères 30°", img: "Incline_Dumbbell_Press", primary: ["chest"], secondary: ["shoulders", "triceps"], cues: ["Banc à 30°, haltères au-dessus des épaules", "Descends 2 s jusqu'au niveau du torse, pousse 1 s", "Coudes à 45°, pas écartés à 90°"] },
    d_one_arm_row: { name: "Rowing haltère 1 bras", img: "One-Arm_Dumbbell_Row", primary: ["middle back", "lats"], secondary: ["biceps"], cues: ["Genou + main sur le banc, dos parallèle au sol", "Tire vers la hanche, coude le long du corps", "Commence par le bras gauche (le plus faible)"] },
    d_shoulder_press: { name: "Développé militaire haltères", img: "Dumbbell_Shoulder_Press", primary: ["shoulders"], secondary: ["triceps"], cues: ["Assis dossier droit, haltères à hauteur des oreilles", "Pousse au-dessus de la tête sans verrouiller", "Gainage : pas de cambrure"] },
    d_pullup: { name: "Tractions (élastique ou négatives)", img: "Wide-Grip_Rear_Pull-Up", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Élastique sous le genou si besoin", "Sinon : monte avec un saut, descends en 4-5 s", "Omoplates d'abord, bras ensuite"] },
    d_flyes: { name: "Écarté haltères (banc plat)", img: "Dumbbell_Flyes", primary: ["chest"], secondary: ["shoulders"], cues: ["Coudes légèrement fléchis, fixes", "Descends jusqu'à l'étirement, remonte en serrant les pecs", "Charge légère, 15 reps propres"] },
    d_curl_alt: { name: "Curl biceps alterné", img: "Dumbbell_Alternate_Bicep_Curl", primary: ["biceps"], secondary: ["forearms"], cues: ["Coudes collés aux côtes", "Supination en montant, descente 2 s", "Bras gauche en premier"] },
    d_lateral_raise: { name: "Élévations latérales haltères", img: "Side_Lateral_Raise", primary: ["shoulders"], secondary: ["traps"], cues: ["Monte les coudes jusqu'à l'horizontale", "Léger penché avant, petit doigt un peu plus haut", "Zéro élan"] },
    d_triceps_oh: { name: "Extension triceps haltère (nuque)", img: "Standing_Dumbbell_Triceps_Extension", primary: ["triceps"], secondary: [], cues: ["Un haltère à deux mains derrière la tête", "Coudes serrés et fixes, tends les bras", "Descente contrôlée 2 s"] },
    d_bench_press: { name: "Développé couché haltères (plat)", img: "Dumbbell_Bench_Press", primary: ["chest"], secondary: ["triceps", "shoulders"], cues: ["Omoplates serrées, pieds au sol", "Descends jusqu'au niveau du torse, pousse 1 s", "Haltères légèrement en diagonale"] },
    d_bent_row: { name: "Rowing haltères 2 bras (penché)", img: "Bent_Over_Two-Dumbbell_Row", primary: ["middle back"], secondary: ["lats", "biceps"], cues: ["Buste à 45°, dos plat, genoux fléchis", "Tire vers les hanches, serre les omoplates 1 s", "Ne relève pas le buste pour tricher"] },
    d_arnold: { name: "Développé Arnold", img: "Arnold_Dumbbell_Press", primary: ["shoulders"], secondary: ["triceps"], cues: ["Départ paumes vers toi devant le visage", "Tourne les poignets en montant, bras tendus en haut", "Redescends en inversant la rotation"] },
    d_hammer: { name: "Curl marteau (prise neutre)", img: "Hammer_Curls", primary: ["biceps"], secondary: ["forearms"], cues: ["Pouces vers le haut tout le mouvement", "Coudes fixes, descente 2 s"] },
    d_dips: { name: "Dips (power tower ou banc)", img: "Dips_-_Triceps_Version", primary: ["triceps"], secondary: ["chest", "shoulders"], cues: ["Buste droit pour les triceps", "Descends jusqu'à 90° au coude, pas plus bas", "Max reps propres"] },
    d_shrug: { name: "Shrugs haltères", img: "Dumbbell_Shrug", primary: ["traps"], secondary: ["neck"], cues: ["Haltères le long du corps", "Épaules vers les oreilles, pause 1 s", "Descends lentement"] },
    d_wrist_curl: { name: "Curl poignet + curl inversé", img: "Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench", img2: "Standing_Dumbbell_Reverse_Curl", primary: ["forearms"], secondary: [], cues: ["Avant-bras sur la cuisse, seul le poignet bouge", "15 reps paumes vers le haut", "Puis 15 curls inversés debout (paumes vers le bas)"] },

    // ── Bas du corps : machines
    m_leg_press: { name: "Presse à cuisses", img: "Leg_Press", primary: ["quadriceps"], secondary: ["glutes", "hamstrings"], cues: ["Pieds largeur d'épaules, milieu du plateau", "Descends jusqu'à 90° sans décoller le bas du dos", "Pousse avec les talons, genoux dans l'axe"] },
    m_leg_curl: { name: "Leg curl assis (ischios)", img: "Seated_Leg_Curl", primary: ["hamstrings"], secondary: ["calves"], cues: ["Coussin juste au-dessus des chevilles", "Ramène les talons sous toi en 1 s, retour 2 s", "Contracte les fessiers pour stabiliser le bassin"] },
    m_hip_thrust: { name: "Hip thrust (barre ou machine)", img: "Barbell_Hip_Thrust", primary: ["glutes"], secondary: ["hamstrings"], cues: ["Haut du dos sur le banc, barre sur le bassin", "Ligne droite genoux-épaules en haut, menton rentré", "Pause 1 s en haut, bassin rétroversé (anti-bascule)"] },
    m_smith_split: { name: "Fentes Smith machine", img: "Smith_Single-Leg_Split_Squat", primary: ["quadriceps"], secondary: ["glutes"], cues: ["Barre sur les trapèzes, un pied devant", "Genou avant à 90°, tibia vertical", "Jambe gauche en premier"] },
    m_leg_ext: { name: "Leg extension", img: "Leg_Extensions", primary: ["quadriceps"], secondary: [], cues: ["Chevilles sous le coussin, genoux alignés avec l'axe", "Tends les jambes, contracte 1 s en haut", "Descente 2 s sans laisser tomber la charge"] },
    m_back_ext: { name: "Extension lombaire banc 45°", img: "Hyperextensions_Back_Extensions", primary: ["lower back"], secondary: ["glutes", "hamstrings"], cues: ["Coussin sous les hanches, pas sous le ventre", "Descends dos plat, remonte en serrant les fessiers", "Ne dépasse pas l'alignement (pas d'hyperextension)"] },
    m_calf: { name: "Mollets debout machine", img: "Standing_Calf_Raises", primary: ["calves"], secondary: [], cues: ["Étirement complet en bas 1 s", "Monte sur la pointe, pause 1 s en haut", "20 reps, tempo lent"] },
    m_hack_squat: { name: "Hack squat", img: "Hack_Squat", primary: ["quadriceps"], secondary: ["glutes"], cues: ["Dos plaqué, pieds légèrement avancés", "Descends sous la parallèle si les genoux sont OK", "Remonte sans verrouiller"] },
    m_leg_curl_single: { name: "Leg curl 1 jambe", img: "Seated_Leg_Curl", primary: ["hamstrings"], secondary: [], cues: ["Une jambe à la fois, jambe gauche en premier", "Charge ≈ moitié de la version 2 jambes"] },
    m_ab_crunch: { name: "Crunch machine", img: "Ab_Crunch_Machine", primary: ["abdominals"], secondary: [], cues: ["Enroule le buste, ne tire pas avec les bras", "Expire en contractant"] },
    m_reverse_crunch: { name: "Crunch inversé décliné (abdos bas)", img: "Decline_Reverse_Crunch", primary: ["abdominals"], secondary: [], cues: ["Banc décliné, mains sur le coussin", "Ramène les genoux vers la poitrine en décollant le bassin", "Descente lente, bas du dos contrôlé"] },
    reverse_crunch: { name: "Crunch inversé au sol (abdos bas)", img: "Reverse_Crunch", primary: ["abdominals"], secondary: [], cues: ["Sur le dos, genoux fléchis", "Décolle le bassin en enroulant vers la poitrine", "Pas d'élan des jambes"] },
    m_decline_crunch: { name: "Crunch banc décliné (abdos haut)", img: "Decline_Crunch", primary: ["abdominals"], secondary: [], cues: ["Enroule le buste vertèbre par vertèbre", "Expire en contractant, ne tire pas sur la nuque"] },
    m_cable_crunch: { name: "Crunch à la poulie haute", img: "Cable_Crunch", primary: ["abdominals"], secondary: [], cues: ["À genoux, corde derrière la tête", "Enroule le buste vers les cuisses, hanches fixes"] },

    // ── Bas du corps : haltères / poids du corps
    d_goblet: { name: "Goblet squat", img: "Goblet_Squat", primary: ["quadriceps"], secondary: ["glutes", "abdominals"], cues: ["Haltère vertical contre la poitrine", "Cuisses parallèles au sol ou plus bas, dos droit", "Coudes entre les genoux en bas"] },
    d_rdl: { name: "Soulevé de terre roumain haltères", img: "Stiff-Legged_Dumbbell_Deadlift", primary: ["hamstrings"], secondary: ["glutes", "lower back"], cues: ["Pousse les fesses en arrière, dos plat", "Haltères frôlent les cuisses, descends jusqu'à l'étirement", "Remonte en serrant les fessiers"] },
    d_hip_thrust: { name: "Hip thrust 2 haltères", img: "Barbell_Hip_Thrust", primary: ["glutes"], secondary: ["hamstrings"], cues: ["2 haltères côte à côte sur le bassin", "Ligne droite genoux-épaules en haut", "Pause 1 s, bassin rétroversé"] },
    d_lunges: { name: "Fentes alternées haltères", img: "Dumbbell_Lunges", primary: ["quadriceps"], secondary: ["glutes"], cues: ["Grand pas, genou arrière vers le sol", "Buste droit, pousse sur le talon avant", "Jambe gauche en premier"] },
    d_split_squat: { name: "Squat bulgare (pied sur banc)", img: "Split_Squat_with_Dumbbells", primary: ["quadriceps"], secondary: ["glutes"], cues: ["Pied arrière sur le banc", "Genou avant à 90°, tibia vertical", "Jambe gauche en premier"] },
    d_single_rdl: { name: "Soulevé roumain 1 jambe", img: "Kettlebell_One-Legged_Deadlift", primary: ["hamstrings"], secondary: ["glutes"], cues: ["Debout sur une jambe, haltère main opposée", "Bascule comme une balance : buste descend, jambe arrière se tend", "Dos plat, jambe alignée avec le buste"] },
    d_calf: { name: "Mollets debout haltères", img: "Standing_Dumbbell_Calf_Raise", primary: ["calves"], secondary: [], cues: ["Pointes sur une marche, étirement en bas", "Pause 1 s en haut, 20 reps lentes"] },
    d_squat: { name: "Squat haltères", img: "Dumbbell_Squat", primary: ["quadriceps"], secondary: ["glutes", "hamstrings"], cues: ["Haltères le long du corps ou aux épaules", "Descends sous la parallèle, dos droit", "Genoux dans l'axe des pieds"] },
    d_pushups: { name: "Pompes", img: "Pushups", primary: ["chest"], secondary: ["triceps", "shoulders"], cues: ["Corps gainé, bassin neutre", "Max reps propres, tempo 2-1-1"] },
    hip_flexor_stretch: { name: "Étirement fléchisseurs de hanche", img: "Kneeling_Hip_Flexor", primary: ["quadriceps"], secondary: ["abdominals"], cues: ["Fente, genou arrière au sol", "Recule le bassin, contracte la fesse arrière", "Sens l'étirement à l'avant de la hanche — clé posture"] },
    glute_bridge_single: { name: "Pont fessier 1 jambe", img: "Single_Leg_Glute_Bridge", primary: ["glutes"], secondary: ["hamstrings"], cues: ["Une jambe tendue, pousse sur le talon", "Bassin haut, pause 1 s"] },
    plank: { name: "Planche (gainage)", img: "Plank", primary: ["abdominals"], secondary: ["shoulders"], cues: ["Coudes sous les épaules, bassin rétroversé", "Fessiers serrés, respire", "30-45 s"] },
    dead_bug: { name: "Dead bug", img: "Dead_Bug", primary: ["abdominals"], secondary: [], cues: ["Bas du dos collé au sol en permanence", "Étends bras + jambe opposés lentement", "Meilleur exo anti-bascule du bassin"] },
    leg_raise: { name: "Leg raises (power tower)", img: "Hanging_Leg_Raise", primary: ["abdominals"], secondary: ["forearms"], cues: ["Jambes tendues, monte à 90°", "Descente contrôlée, pas de balancement"] },
    leg_raise_floor: { name: "Leg raises au sol", img: "Flat_Bench_Lying_Leg_Raise", primary: ["abdominals"], secondary: [], cues: ["Mains sous les fesses, bas du dos au sol", "Monte à 90°, descends sans poser les pieds"] },
    side_plank: { name: "Gainage latéral", img: "Side_Bridge", primary: ["abdominals"], secondary: ["shoulders"], cues: ["Coude sous l'épaule, corps aligné", "Hanche haute, 30 s par côté"] },
    bird_dog: { name: "Bird dog", img: "Glute_Kickback", primary: ["lower back"], secondary: ["glutes", "abdominals"], cues: ["À 4 pattes, étends bras + jambe opposés", "Dos plat et stable, pas de rotation", "10 par côté, lent"] },
    ab_wheel: { name: "Ab wheel (roulette)", img: "Ab_Roller", primary: ["abdominals"], secondary: ["lats", "shoulders"], cues: ["À genoux, roule devant sans creuser le dos", "Reviens en contractant les abdos"] },
    glute_bridge: { name: "Pont fessier", img: "Butt_Lift_Bridge", primary: ["glutes"], secondary: ["hamstrings"], cues: ["Pieds à plat, pousse sur les talons", "Serre les fessiers 1 s en haut"] },
    cardio: { name: "Cardio tapis", img: "Running_Treadmill", primary: ["quadriceps"], secondary: ["calves", "hamstrings"], cues: [] },
  };

  // Aide : construction d'un exercice de programme
  // ex(idBase, {block, rounds(=séries), reps, rest, machine:{ex, kg, note}, dumbbell:{ex, kg, note}, primary:'machine'|'dumbbell', timed?:'..'})
  function ex(id, o) {
    const mk = (v) => v ? { ex: v.ex, kg: v.kg ?? null, lbs: v.kg != null ? kg(v.kg).lbs : null, note: v.note || "" } : null;
    return {
      id, block: o.block, superset: o.superset || "", sets: o.sets, reps: o.reps, rest: o.rest || 0,
      primary: o.primary || (o.machine ? "machine" : "dumbbell"),
      machine: mk(o.machine), dumbbell: mk(o.dumbbell),
      warmup: !!o.warmup, timed: o.timed || "", info: o.info || "",
    };
  }

  const PROGRAM = {
    name: "Programme Shred v4 — recomposition 3-5 mois",
    version: 4,
    createdAt: "2026-09-12",
    notes: [
      "Split 5 jours : Pecs-Épaules-Triceps · Jambes · Dos-Trapèzes-Cou · Abdos-Bras · Full body lourd. Chaque groupe est travaillé lourd un jour, puis re-stimulé le vendredi.",
      "Charges conséquentes : 2-3 séries par exercice, 6-10 reps sur les gros mouvements, 8-12 sur les isolations, 12-20 pour le cou. 1-2 reps en réserve, jamais de tricherie technique.",
      "Double progression : haut de la fourchette atteint sur toutes les séries → +2,5 kg (haut du corps, cou, abdos) / +5 kg (jambes, presse, hip thrust). Assistance tractions/dips : −5 kg.",
      "Abdos = un vrai jour (jeudi), lourds et progressifs comme les autres muscles : haut, bas, obliques, profonds. Cou lesté mercredi : disque 2,5 kg puis 5 kg, mouvement lent.",
      "Tempo 2-1-1. Côté faible (gauche) en premier. Étirement des fléchisseurs de hanche après chaque séance jambes, arrière d'épaule chaque mercredi (posture).",
      "Charges machines = point de départ à calibrer en séance 1. Cardio : 10 min en fin de jeudi + 8-10k pas/jour. Le shred se joue dans l'assiette et le sommeil.",
    ],
    days: [
      {
        id: "lun", weekday: 1, name: "Pecs · Épaules · Triceps", focus: "Poussée lourde : pectoraux, deltoïdes avant/latéral, triceps", duration: 60,
        exercises: [
          ex("lun_w1", { block: "A", warmup: true, sets: 1, reps: "2 min", dumbbell: { ex: "shoulder_circles" }, primary: "dumbbell" }),
          ex("lun_w2", { block: "A", warmup: true, sets: 1, reps: "10", dumbbell: { ex: "pushups_warm" }, primary: "dumbbell" }),
          ex("lun_1", { block: "1", sets: 3, reps: "6-10", rest: 120, machine: { ex: "m_incline_press", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_incline_press", kg: 11.5, note: "par haltère" } }),
          ex("lun_2", { block: "2", sets: 3, reps: "8-10", rest: 90, machine: { ex: "m_chest_press", kg: 40, note: "charge totale" }, dumbbell: { ex: "d_bench_press", kg: 11.5, note: "par haltère" } }),
          ex("lun_3", { block: "3", sets: 3, reps: "6-10", rest: 120, machine: { ex: "m_shoulder_press", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_shoulder_press", kg: 7, note: "par haltère" } }),
          ex("lun_4", { block: "4", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_pec_deck", kg: 30, note: "charge totale" }, dumbbell: { ex: "d_flyes", kg: 7, note: "par haltère" } }),
          ex("lun_5", { block: "5", sets: 3, reps: "10-12", rest: 60, machine: { ex: "m_lateral_raise", kg: 7.5, note: "par côté" }, dumbbell: { ex: "d_lateral_raise", kg: 4.5, note: "par haltère" } }),
          ex("lun_6", { block: "6", sets: 3, reps: "8-12", rest: 60, machine: { ex: "m_triceps_rope", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_triceps_oh", kg: 11.5, note: "1 haltère à 2 mains" } }),
          ex("lun_7", { block: "7", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_dip", kg: 15, note: "assistance (à réduire)" }, dumbbell: { ex: "d_dips", kg: null, note: "poids du corps, lest ensuite" }, primary: "dumbbell" }),
        ],
      },
      {
        id: "mar", weekday: 2, name: "Jambes complètes", focus: "Quadriceps · Ischios · Fessiers · Mollets (lourd)", duration: 60,
        exercises: [
          ex("mar_w1", { block: "A", warmup: true, sets: 1, reps: "3 min", machine: { ex: "treadmill_walk" }, dumbbell: null, primary: "machine" }),
          ex("mar_w2", { block: "A", warmup: true, sets: 1, reps: "10 + 10", dumbbell: { ex: "bw_squat" }, primary: "dumbbell" }),
          ex("mar_1", { block: "1", sets: 3, reps: "6-10", rest: 120, machine: { ex: "m_leg_press", kg: 80, note: "charge totale (plateau inclus)" }, dumbbell: { ex: "d_goblet", kg: 11.5, note: "1 haltère" } }),
          ex("mar_2", { block: "2", sets: 3, reps: "8-10", rest: 120, machine: { ex: "m_hack_squat", kg: 40, note: "charge totale" }, dumbbell: { ex: "d_squat", kg: 11.5, note: "par haltère" } }),
          ex("mar_3", { block: "3", sets: 3, reps: "8-12", rest: 90, machine: { ex: "m_leg_curl", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_rdl", kg: 11.5, note: "par haltère" } }),
          ex("mar_4", { block: "4", sets: 3, reps: "6-10", rest: 90, machine: { ex: "m_hip_thrust", kg: 50, note: "barre ou machine, charge totale" }, dumbbell: { ex: "d_hip_thrust", kg: 22.5, note: "2×25 LB sur le bassin" } }),
          ex("mar_5", { block: "5", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_leg_ext", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_split_squat", kg: 7, note: "par haltère" } }),
          ex("mar_6", { block: "6", sets: 3, reps: "8-12", rest: 60, machine: { ex: "m_calf", kg: 50, note: "charge totale" }, dumbbell: { ex: "d_calf", kg: 11.5, note: "par haltère" } }),
          ex("mar_7", { block: "7", sets: 2, reps: "12-15", rest: 45, machine: { ex: "m_seated_calf", kg: 30, note: "charge totale" }, dumbbell: { ex: "d_calf", kg: 11.5, note: "assis, haltères sur les genoux" } }),
          ex("mar_8", { block: "8", sets: 1, reps: "45 s / côté", rest: 0, dumbbell: { ex: "hip_flexor_stretch" }, primary: "dumbbell" }),
        ],
      },
      {
        id: "mer", weekday: 3, name: "Dos · Trapèzes · Cou", focus: "Tirage lourd : dorsaux, milieu du dos, arrière d'épaule, trapèzes, cou", duration: 60,
        exercises: [
          ex("mer_w1", { block: "A", warmup: true, sets: 1, reps: "2 min", dumbbell: { ex: "shoulder_circles" }, primary: "dumbbell" }),
          ex("mer_w2", { block: "A", warmup: true, sets: 1, reps: "15", dumbbell: { ex: "band_pull_apart" }, primary: "dumbbell" }),
          ex("mer_1", { block: "1", sets: 3, reps: "6-10", rest: 120, machine: { ex: "m_assisted_pullup", kg: 25, note: "assistance (à réduire)" }, dumbbell: { ex: "d_pullup", kg: null, note: "élastique / négatives" } }),
          ex("mer_2", { block: "2", sets: 3, reps: "6-10", rest: 120, machine: { ex: "m_high_row", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_bent_row", kg: 11.5, note: "par haltère" } }),
          ex("mer_3", { block: "3", sets: 3, reps: "8-12", rest: 90, machine: { ex: "m_close_pulldown", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_one_arm_row", kg: 11.5, note: "1 haltère, 10/bras" } }),
          ex("mer_4", { block: "4", sets: 3, reps: "10-12", rest: 60, machine: { ex: "m_reverse_pec_deck", kg: 25, note: "charge totale · ouvre les épaules" }, dumbbell: { ex: "d_reverse_flyes", kg: 4.5, note: "par haltère" } }),
          ex("mer_5", { block: "5", sets: 3, reps: "8-12", rest: 90, machine: { ex: "m_shrug", kg: 50, note: "charge totale" }, dumbbell: { ex: "d_shrug", kg: 11.5, note: "par haltère" } }),
          ex("mer_6", { block: "6", sets: 3, reps: "12-20", rest: 60, machine: { ex: "neck_harness", kg: 5, note: "harnais / machine cou" }, dumbbell: { ex: "neck_curl_plate", kg: 2.5, note: "disque sur le front" }, primary: "dumbbell" }),
          ex("mer_7", { block: "7", sets: 3, reps: "12-20", rest: 60, machine: { ex: "neck_harness", kg: 5, note: "harnais, extension" }, dumbbell: { ex: "neck_ext_plate", kg: 2.5, note: "disque sur la nuque" }, primary: "dumbbell" }),
        ],
      },
      {
        id: "jeu", weekday: 4, name: "Abdos · Bras · Avant-bras", focus: "Sangle abdominale lourde (haut, bas, obliques, profonds) · Biceps · Triceps · Avant-bras", duration: 60,
        exercises: [
          ex("jeu_w1", { block: "A", warmup: true, sets: 1, reps: "2 min", dumbbell: { ex: "dead_bug", kg: null, note: "10/côté, activation profonde" }, primary: "dumbbell" }),
          ex("jeu_1", { block: "1", sets: 3, reps: "8-12", rest: 90, machine: { ex: "m_ab_crunch", kg: 35, note: "abdos haut · lourd, charge totale" }, dumbbell: { ex: "m_decline_crunch", kg: 5, note: "banc décliné, disque sur la poitrine" } }),
          ex("jeu_2", { block: "2", sets: 3, reps: "10-15", rest: 90, machine: { ex: "leg_raise", kg: null, note: "abdos bas · chaise romaine, lest aux chevilles ensuite" }, dumbbell: { ex: "m_reverse_crunch", kg: null, note: "banc décliné" } }),
          ex("jeu_3", { block: "3", sets: 3, reps: "10-12", rest: 60, machine: { ex: "m_cable_crunch", kg: 30, note: "poulie haute, charge totale · alterner droite/gauche pour les obliques" }, dumbbell: { ex: "ab_wheel", kg: null, note: "roulette, 8-12" } }),
          ex("jeu_4", { block: "4", sets: 2, reps: "30-45 s / côté", rest: 45, dumbbell: { ex: "side_plank", kg: null, note: "obliques · lest sur la hanche ensuite" }, primary: "dumbbell" }),
          ex("jeu_5", { block: "5", sets: 3, reps: "8-12", rest: 60, machine: { ex: "m_bicep_curl", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_curl_alt", kg: 11.5, note: "par haltère" } }),
          ex("jeu_6", { block: "6", sets: 3, reps: "8-12", rest: 60, machine: { ex: "m_hammer_rope", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_hammer", kg: 11.5, note: "par haltère" } }),
          ex("jeu_7", { block: "7", sets: 3, reps: "8-12", rest: 60, machine: { ex: "m_triceps_rope", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_triceps_oh", kg: 11.5, note: "1 haltère à 2 mains" } }),
          ex("jeu_8", { block: "8", sets: 2, reps: "15 + 15", rest: 45, machine: { ex: "m_wrist_curl", kg: 15, note: "charge totale" }, dumbbell: { ex: "d_wrist_curl", kg: 7, note: "par haltère" }, primary: "dumbbell" }),
          ex("jeu_9", { block: "9", sets: 1, reps: "10 min", timed: "cardio", machine: { ex: "cardio" }, dumbbell: null, primary: "machine", info: "Sem. 1-3 : 10 min marche rapide inclinée (pente 5-7 %). Sem. 4+ : 6 × (30 s à 10-11 km/h / 60 s marche). Sem. 9+ : 8 cycles." }),
        ],
      },
      {
        id: "ven", weekday: 5, name: "Full body lourd", focus: "2e stimulus : jambes, pecs, dos, épaules · lombaires et posture", duration: 60,
        exercises: [
          ex("ven_w1", { block: "A", warmup: true, sets: 1, reps: "3 min", machine: { ex: "treadmill_walk" }, dumbbell: null, primary: "machine" }),
          ex("ven_w2", { block: "A", warmup: true, sets: 1, reps: "10", dumbbell: { ex: "bw_squat" }, primary: "dumbbell" }),
          ex("ven_1", { block: "1", sets: 3, reps: "8-10/jambe", rest: 90, machine: { ex: "m_smith_split", kg: 25, note: "barre Smith, pied arrière sur banc" }, dumbbell: { ex: "d_split_squat", kg: 9, note: "par haltère" }, primary: "dumbbell" }),
          ex("ven_2", { block: "2", sets: 3, reps: "8-10", rest: 120, machine: { ex: "m_leg_curl", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_rdl", kg: 11.5, note: "par haltère · soulevé de terre roumain" }, primary: "dumbbell" }),
          ex("ven_3", { block: "3", sets: 3, reps: "8-10", rest: 90, machine: { ex: "m_incline_press", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_incline_press", kg: 11.5, note: "par haltère" }, primary: "dumbbell" }),
          ex("ven_4", { block: "4", sets: 3, reps: "8-10", rest: 90, machine: { ex: "m_lat_pulldown", kg: 40, note: "charge totale, prise large" }, dumbbell: { ex: "d_pullup", kg: null, note: "élastique / négatives" } }),
          ex("ven_5", { block: "5", sets: 3, reps: "8-10", rest: 90, machine: { ex: "m_shoulder_press", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_arnold", kg: 7, note: "par haltère · Arnold" }, primary: "dumbbell" }),
          ex("ven_6", { block: "6", sets: 2, reps: "12-15", rest: 60, machine: { ex: "m_back_ext", kg: 5, note: "disque contre la poitrine" }, dumbbell: { ex: "bird_dog", kg: null, note: "10/côté" } }),
          ex("ven_7", { block: "7", sets: 2, reps: "12-15", rest: 45, machine: { ex: "m_calf", kg: 50, note: "charge totale" }, dumbbell: { ex: "d_calf", kg: 11.5, note: "par haltère" } }),
          ex("ven_8", { block: "8", sets: 1, reps: "45 s / côté", rest: 0, dumbbell: { ex: "hip_flexor_stretch" }, primary: "dumbbell" }),
        ],
      },
      { id: "sam", weekday: 6, name: "Repos actif", focus: "Marche 30-45 min · Mobilité · Routine posture", duration: 45, rest: true, exercises: [] },
      { id: "dim", weekday: 0, name: "Repos + mesures", focus: "Poids à jeun · Tour de taille · Photos face/profil/dos", duration: 0, rest: true, exercises: [] },
    ],
    posture: [
      { name: "Étirement fléchisseurs de hanche", ex: "hip_flexor_stretch", dur: "45 s / côté" },
      { name: "Étirement lombaires (genoux à la poitrine)", ex: null, dur: "45 s" },
      { name: "Pont fessier", ex: "glute_bridge", dur: "15 reps" },
      { name: "Dead bug", ex: "dead_bug", dur: "10 / côté" },
      { name: "Posture debout au mur (bas du dos collé)", ex: null, dur: "30 s" },
    ],
  };

  // Compléments — plan actuel (Phase 1). moments : reveil, petitdej, dejeuner, diner, coucher
  const SUPPLEMENTS = {
    version: 1,
    moments: [
      { id: "reveil", label: "Réveil · à jeun", time: "06:30" },
      { id: "petitdej", label: "Petit-déj · repas gras", time: "08:00" },
      { id: "dejeuner", label: "Déjeuner", time: "12:30" },
      { id: "diner", label: "Dîner", time: "19:00" },
      { id: "coucher", label: "Coucher", time: "22:30" },
    ],
    items: [
      { id: "tongkat", name: "Tongkat Ali", brand: "Advance Physician Formulas 200 mg", dose: "1 cap", moment: "reveil", cycle: "8 sem ON / 4 OFF", why: "Soutien de la testostérone libre et de la libido. À cycler. Stop si insomnie, irritabilité, acné, mamelons sensibles." },
      { id: "citrulline", name: "L-Citrulline", brand: "Doctor's Best Powder", dose: "3 g (1 scoop) dans l'eau", moment: "reveil", why: "Précurseur de l'arginine → oxyde nitrique : circulation, pump, volume séminal. Se mélange avec collagène + vit C." },
      { id: "rhodiola", name: "Rhodiola", brand: "Thorne 100 mg", dose: "2 caps (200 mg)", moment: "reveil", cycle: "6 sem ON / 2 OFF", why: "Adaptogène anti-fatigue, énergie mentale et résistance au stress. Jamais le soir." },
      { id: "probio", name: "Probiotiques", brand: "Garden of Life Men's 50B", dose: "1 cap", moment: "reveil", why: "Flore intestinale : digestion, absorption des nutriments, immunité." },
      { id: "theanine", name: "L-Théanine", brand: "NOW 200 mg", dose: "1 cap avec le café", moment: "petitdej", why: "Lisse l'effet de la caféine : concentration calme, sans nervosité. Ratio 2:1 avec ~100 mg de caféine." },
      { id: "bcomplex", name: "B-Complex", brand: "Thorne Basic B", dose: "1 cap", moment: "petitdej", why: "Énergie cellulaire, système nerveux, méthylation. Contient déjà 400 µg de méthyl-B12." },
      { id: "d3k2", name: "Vitamine D3 + K2", brand: "Thorne Liquid", dose: "2-4 gouttes", moment: "petitdej", fat: true, why: "Testostérone, immunité, os. Liposoluble → avec du gras (œufs, avocat, noix). Cible sanguine 40-60 ng/mL." },
      { id: "coq10", name: "CoQ10 Ubiquinol", brand: "Doctor's Best Kaneka", dose: "100 mg", moment: "petitdej", fat: true, why: "Énergie mitochondriale, cœur, antioxydant. Avec un repas gras." },
      { id: "creatine", name: "Créatine", brand: "Thorne (NSF)", dose: "5 g", moment: "petitdej", why: "Force, volume musculaire, cognition. Tous les jours, même au repos. Boire 3-4 L d'eau." },
      { id: "omega1", name: "Oméga-3 #1", brand: "Nordic Naturals Ultimate Omega 2X", dose: "1 softgel", moment: "petitdej", fat: true, why: "EPA/DHA : anti-inflammatoire, récupération, cœur, cerveau. 2e prise au déjeuner." },
      { id: "collagen", name: "Collagène + Vitamine C", brand: "Sports Research + California Gold C", dose: "10-20 g + 1 cap", moment: "petitdej", why: "Tendons, articulations, peau. La vitamine C est nécessaire à la synthèse du collagène." },
      { id: "omega2", name: "Oméga-3 #2", brand: "Nordic Naturals", dose: "1 softgel", moment: "dejeuner", fat: true, why: "2e prise d'EPA/DHA, avec un repas gras." },
      { id: "asta", name: "Astaxanthine", brand: "NOW AstaReal 10 mg", dose: "1 softgel", moment: "dejeuner", fat: true, why: "Antioxydant puissant : peau, yeux, endurance, fertilité. Liposoluble." },
      { id: "boron", name: "Boron", brand: "NOW 3 mg", dose: "1-2 caps (3-6 mg)", moment: "dejeuner", cycle: "8 sem ON / 4 OFF", why: "Augmente la testostérone libre (baisse la SHBG), os. À cycler avec le Tongkat." },
      { id: "selenium", name: "Sélénium", brand: "NOW 100 µg", dose: "1 cap", moment: "dejeuner", why: "Thyroïde, antioxydant, qualité du sperme." },
      { id: "lecithin", name: "Lécithine tournesol", brand: "NOW 1200 mg", dose: "1-2 softgels", moment: "dejeuner", why: "Choline et phospholipides : foie, cerveau, volume séminal." },
      { id: "zinc", name: "Zinc Picolinate", brand: "Thorne 15 mg", dose: "1 cap", moment: "diner", why: "Testostérone, immunité, peau. Séparer du magnésium de 2 h (compétition d'absorption)." },
      { id: "ashwa", name: "Ashwagandha Sensoril", brand: "Life Extension 125 mg", dose: "1 cap", moment: "diner", why: "Baisse le cortisol, améliore sommeil et récupération. Surveiller le foie (bilan ALAT/ASAT)." },
      { id: "magnesium", name: "Magnésium bisglycinate", brand: "Doctor's Best 300 mg", dose: "3 caps", moment: "coucher", why: "Relaxation, sommeil profond, récupération musculaire, 300+ réactions enzymatiques. 60 min avant le coucher." },
    ],
  };

  // Structure nutrition (le plan alimentaire sera construit ensuite — cible provisoire issue de la fiche projet)
  const NUTRITION = {
    version: 0,
    targets: { kcal: 2000, protein: 165, carbs: 180, fat: 65 },
    note: "Plan provisoire : cibles phase shred (déficit léger, protéines 1,8-2,2 g/kg). Les repas détaillés seront importés une fois le plan construit.",
    meals: [
      { id: "m1", name: "Snack protéiné midi", time: "12:00", foods: [{ name: "Whey ISO100", grams: 30, kcal: 110, protein: 25, carbs: 1, fat: 0.5 }, { name: "Amandes", grams: 20, kcal: 116, protein: 4, carbs: 4, fat: 10 }] },
      { id: "m2", name: "Post-séance", time: "18:00", foods: [{ name: "Whey ISO100", grams: 30, kcal: 110, protein: 25, carbs: 1, fat: 0.5 }] },
      { id: "m3", name: "Dîner", time: "19:30", foods: [] },
    ],
  };

  const MEASURE_FIELDS = [
    { id: "weight", label: "Poids", unit: "kg", step: 0.1 },
    { id: "waistRelaxed", label: "Taille relâchée (nombril)", unit: "cm", step: 0.5 },
    { id: "waistContracted", label: "Taille contractée", unit: "cm", step: 0.5 },
    { id: "neck", label: "Cou", unit: "cm", step: 0.5 },
    { id: "chest", label: "Poitrine", unit: "cm", step: 0.5 },
    { id: "armR", label: "Bras D contracté", unit: "cm", step: 0.5 },
    { id: "armL", label: "Bras G contracté", unit: "cm", step: 0.5 },
    { id: "thighR", label: "Cuisse D", unit: "cm", step: 0.5 },
    { id: "thighL", label: "Cuisse G", unit: "cm", step: 0.5 },
    { id: "calfR", label: "Mollet D", unit: "cm", step: 0.5 },
    { id: "calfL", label: "Mollet G", unit: "cm", step: 0.5 },
    { id: "bodyFat", label: "Masse grasse (si mesurée)", unit: "%", step: 0.1 },
  ];
  const BASELINE = { date: "2026-06-30", weight: 65, neck: 36, chest: 92, waistRelaxed: 86, waistContracted: 80, armR: 31, armL: 31, thighR: 50, thighL: 49, calfR: 33, calfL: 33, note: "Mensurations de départ (S0, fiche projet)" };

  const MUSCLE_LABELS = { chest: "Pectoraux", shoulders: "Épaules", triceps: "Triceps", biceps: "Biceps", forearms: "Avant-bras", abdominals: "Abdominaux", quadriceps: "Quadriceps", calves: "Mollets", traps: "Trapèzes", lats: "Grand dorsal", "middle back": "Milieu du dos", "lower back": "Lombaires", glutes: "Fessiers", hamstrings: "Ischio-jambiers", neck: "Cou" };

  return { EX, PROGRAM, SUPPLEMENTS, NUTRITION, MEASURE_FIELDS, BASELINE, MUSCLE_LABELS, kg };
})();
