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
    knees_to_chest: { name: "Étirement lombaires (genoux à la poitrine)", img: "Hug_Knees_To_Chest", primary: ["lower back"], secondary: ["glutes"], cues: ["Allongé sur le dos, ramène les deux genoux contre la poitrine", "Bas du dos qui s'écrase au sol, respire lentement 45 s"] },
    wall_posture: { name: "Posture debout au mur", img: "Wall_Posture", primary: ["abdominals"], secondary: ["lower back", "glutes"], cues: ["Talons à 5 cm du mur, fesses, omoplates et tête en contact", "Colle le bas du dos au mur en rétroversant le bassin (serre les fessiers)", "Menton rentré, tiens 30 s : c'est la position à retrouver debout dans la journée"] },
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
    cardio: { name: "Cardio tapis", img: "Running_Treadmill", primary: ["quadriceps"], secondary: ["calves", "hamstrings"], cues: [] },    // ── Programme v2 (spec 27/09/2026) : exercices ajoutés
    warmup_cardio: { name: "Vélo ou rameur 5 min + mobilité", img: "Rowing_Stationary", primary: ["quadriceps"], secondary: ["lats", "hamstrings"], cues: ["5 min à allure modérée, tu dois pouvoir parler", "Puis mobilité des articulations de la séance (épaules, hanches ou genoux)"] },
    m_pendulum: { name: "Pendulum squat (ou hack squat)", img: "Hack_Squat", primary: ["quadriceps"], secondary: ["glutes", "hamstrings"], cues: ["Pieds au milieu de la plateforme, largeur de hanches", "Descends profond en gardant le bas du dos collé au dossier", "Remonte en poussant dans tout le pied, genoux jamais verrouillés"] },
    dips_weighted: { name: "Dips lestés (barres parallèles)", img: "Parallel_Bar_Dip", primary: ["chest", "triceps"], secondary: ["shoulders"], cues: ["Poids du corps jusqu'à 3 × 9 propres, puis ceinture de lest +5 kg", "Buste légèrement penché en avant, coudes à 45°", "Descends jusqu'à l'épaule au niveau du coude, sans rebond"] },
    dips_bw: { name: "Dips (barres parallèles)", img: "Dips_-_Triceps_Version", primary: ["triceps", "chest"], secondary: ["shoulders"], cues: ["Au maximum de reps propres (viser 8-12)", "Épaules basses, loin des oreilles", "Amplitude complète, montée contrôlée"] },
    bench_dips: { name: "Dips entre deux bancs", img: "Bench_Dips", primary: ["triceps"], secondary: ["chest", "shoulders"], cues: ["Mains sur un banc, talons sur l'autre", "Coudes vers l'arrière, pas vers l'extérieur", "Disque sur les cuisses pour progresser"] },
    b_close_press: { name: "Développé couché prise serrée (barre)", img: "Close-Grip_Barbell_Bench_Press", primary: ["triceps"], secondary: ["chest", "shoulders"], cues: ["Mains à largeur d'épaules, pas plus serrées (poignets)", "Coudes le long du corps à la descente", "Barre au bas des pectoraux"] },
    d_close_press: { name: "Développé serré haltères (prise neutre)", img: "Close-Grip_Dumbbell_Press", primary: ["triceps"], secondary: ["chest"], cues: ["Haltères collés l'un à l'autre, paumes face à face", "Coudes près du buste", "Serre les haltères pendant tout le mouvement"] },
    m_lateral_machine: { name: "Élévations latérales machine", img: "Cable_Seated_Lateral_Raise", primary: ["shoulders"], secondary: ["traps"], cues: ["Monte jusqu'à l'horizontale, pas plus haut", "Coudes qui mènent le mouvement, épaules basses", "Redescends lentement, sans laisser tomber la charge"] },
    m_rope_overhead: { name: "Extension triceps corde au-dessus de la tête (poulie)", img: "Cable_Rope_Overhead_Triceps_Extension", primary: ["triceps"], secondary: [], cues: ["Dos à la poulie, buste incliné sur un banc ou en fente", "Coudes fixes près de la tête", "Étirement complet derrière la tête, écarte la corde en fin d'extension"] },
    d_skullcrusher: { name: "Barre au front haltères", img: "Lying_Dumbbell_Tricep_Extension", primary: ["triceps"], secondary: [], cues: ["Allongé, haltères au-dessus des épaules, paumes face à face", "Seuls les avant-bras bougent : haltères vers les tempes", "Coudes serrés, pas d'ouverture"] },
    weighted_crunch: { name: "Crunch au sol lesté", img: "Crunches", primary: ["abdominals"], secondary: [], cues: ["Disque contre la poitrine, bas du dos au sol", "Enroule le haut du dos, n'arrache pas la nuque", "Expire en montant, 1 s de contraction en haut"] },
    sissy_squat: { name: "Sissy squat assisté", img: "Weighted_Sissy_Squat", primary: ["quadriceps"], secondary: [], cues: ["Tiens-toi à un support, monte sur la pointe des pieds", "Genoux vers l'avant, hanches alignées avec les genoux", "Descends seulement tant que les genoux sont confortables"] },
    m_leg_press_single: { name: "Presse à cuisses unilatérale", img: "Leg_Press", primary: ["quadriceps"], secondary: ["glutes", "hamstrings"], cues: ["Un pied au centre de la plateforme, l'autre posé au sol", "Descends jusqu'à 90° au genou, bassin collé au siège", "Jambe la plus faible en premier"] },
    d_stiff_dl: { name: "Soulevé de terre jambes tendues haltères", img: "Stiff-Legged_Dumbbell_Deadlift", primary: ["hamstrings"], secondary: ["glutes", "lower back"], cues: ["Genoux légèrement fléchis et fixes", "Hanches vers l'arrière, dos plat, haltères frôlent les jambes", "Descends jusqu'à l'étirement des ischios, pas plus"] },
    smith_stiff_dl: { name: "Soulevé de terre jambes tendues au Smith", img: "Smith_Machine_Stiff-Legged_Deadlift", primary: ["hamstrings"], secondary: ["glutes", "lower back"], cues: ["Barre contre les cuisses, genoux déverrouillés", "Bascule le bassin vers l'arrière, dos plat", "Remonte en serrant les fessiers"] },
    b_stiff_dl: { name: "Soulevé de terre jambes tendues (barre)", img: "Stiff-Legged_Barbell_Deadlift", primary: ["hamstrings"], secondary: ["glutes", "lower back"], cues: ["Barre près du corps pendant tout le mouvement", "Dos plat, regard devant, genoux légèrement fléchis", "Arrête la descente quand le dos commence à s'arrondir"] },
    m_adductor: { name: "Adducteurs machine (assis)", img: "Thigh_Adductor", primary: ["adductors"], secondary: [], cues: ["Dos collé au dossier, amplitude confortable", "Serre les cuisses, 1 s de contraction", "Pas en force : 12-15 reps contrôlées"] },
    d_lateral_lunge: { name: "Fentes latérales haltère", img: "Barbell_Side_Split_Squat", primary: ["adductors", "quadriceps"], secondary: ["glutes"], cues: ["Grand pas de côté, l'autre jambe reste tendue", "Fesses vers l'arrière, poitrine haute", "Haltère tenu à deux mains devant la poitrine"] },
    d_calf_single: { name: "Mollets debout unilatéral (haltère 1 main)", img: "Standing_Dumbbell_Calf_Raise", primary: ["calves"], secondary: [], cues: ["Avant du pied sur une marche, l'autre main tient un appui", "Étirement complet en bas, 1 s de pause", "Monte le plus haut possible"] },
    d_seated_calf: { name: "Mollets assis (haltère sur les genoux)", img: "Dumbbell_Seated_One-Leg_Calf_Raise", primary: ["calves"], secondary: [], cues: ["Avant du pied sur une cale, haltère posé sur le genou", "Descends talon bas, remonte lentement", "Pause d'une seconde en haut"] },
    pullup_weighted: { name: "Tractions lestées", img: "Pullups", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Au poids du corps jusqu'à la maîtrise, puis lest", "Omoplates serrées et basses avant de tirer", "Menton au-dessus de la barre, descente complète contrôlée"] },
    pullup_wide: { name: "Tractions prise large", img: "Pullups", primary: ["lats"], secondary: ["biceps", "middle back"], cues: ["Mains plus larges que les épaules", "Tire les coudes vers les hanches, poitrine vers la barre", "Au maximum de reps propres (viser 5-10)"] },
    d_alt_row: { name: "Rowing haltères alterné buste penché", img: "Bent_Over_Two-Dumbbell_Row", primary: ["middle back", "lats"], secondary: ["biceps"], cues: ["Buste penché à 45°, dos plat", "Tire un haltère vers la hanche, puis l'autre", "Omoplate qui recule avant le coude"] },
    m_tbar_row: { name: "Rowing T-bar poitrine appuyée", img: "Lying_T-Bar_Row", primary: ["middle back"], secondary: ["lats", "biceps"], cues: ["Poitrine collée au support, pas d'élan", "Tire les coudes vers l'arrière, serre les omoplates", "Étirement complet en bas"] },
    d_incline_row: { name: "Rowing haltères appui banc incliné", img: "Dumbbell_Incline_Row", primary: ["middle back"], secondary: ["lats", "biceps"], cues: ["Ventre sur un banc à 30-45°", "Tire les haltères vers les hanches", "Pause d'une seconde omoplates serrées"] },
    m_one_arm_pulldown: { name: "Tirage poulie haute 1 bras", img: "One_Arm_Lat_Pulldown", primary: ["lats"], secondary: ["biceps"], cues: ["Buste légèrement tourné vers le bras qui tire", "Coude vers la hanche, étirement complet en haut", "Côté faible en premier"] },
    m_one_arm_seated_row: { name: "Rowing assis machine 1 bras", img: "Seated_One-arm_Cable_Pulley_Rows", primary: ["middle back", "lats"], secondary: ["biceps"], cues: ["Buste droit, pas de rotation", "Tire le coude loin derrière toi", "Laisse l'omoplate s'étirer vers l'avant au retour"] },
    m_straight_arm: { name: "Tirage bras tendus (poulie haute)", img: "Straight-Arm_Pulldown", primary: ["lats"], secondary: [], cues: ["Bras quasi tendus, léger buste penché", "Descends la barre jusqu'aux cuisses en pensant « coudes vers les poches »", "Remonte lentement jusqu'à l'étirement"] },
    m_straight_arm_rope: { name: "Pushdown bras tendus (corde)", img: "Rope_Straight-Arm_Pulldown", primary: ["lats"], secondary: [], cues: ["Corde tenue bras tendus, hanches en arrière", "Ramène les mains le long des cuisses, écarte la corde en bas", "Aucune flexion des coudes"] },
    d_pullover: { name: "Pull-over haltère", img: "Straight-Arm_Dumbbell_Pullover", primary: ["lats"], secondary: ["chest"], cues: ["Haut du dos en travers d'un banc, bassin bas", "Bras quasi tendus, haltère derrière la tête", "Ramène au-dessus de la poitrine sans plier les coudes"] },
    d_preacher_one: { name: "Curl pupitre haltère 1 bras", img: "One_Arm_Dumbbell_Preacher_Curl", primary: ["biceps"], secondary: [], cues: ["Aisselle calée sur le haut du pupitre", "Descente complète et lente, sans verrouiller", "Côté faible en premier"] },
    m_preacher_one: { name: "Curl pupitre machine unilatéral", img: "Machine_Preacher_Curls", primary: ["biceps"], secondary: [], cues: ["Réglage : coude aligné avec l'axe de la machine", "Un bras à la fois, contraction 1 s en haut", "Descente contrôlée"] },
    m_preacher: { name: "Curl pupitre machine", img: "Machine_Preacher_Curls", primary: ["biceps"], secondary: [], cues: ["Coudes alignés avec l'axe, dos contre le pupitre", "Pas d'élan, montée et descente contrôlées", "Étirement complet en bas"] },
    d_preacher: { name: "Curl pupitre haltères", img: "Two-Arm_Dumbbell_Preacher_Curl", primary: ["biceps"], secondary: [], cues: ["Bras à plat sur le pupitre", "Monte sans décoller les coudes", "Descends lentement jusqu'à l'extension presque complète"] },
    m_cable_curl: { name: "Curl poulie basse", img: "Standing_Biceps_Cable_Curl", primary: ["biceps"], secondary: ["forearms"], cues: ["Coudes fixes le long du corps", "Tension continue, pas de balancier", "Contraction 1 s en haut"] },
    m_katana: { name: "Extension triceps « katana » (poulie, 1 bras)", img: "Cable_One_Arm_Tricep_Extension", primary: ["triceps"], secondary: [], cues: ["Poulie basse, la main tire en diagonale de la hanche opposée vers le haut", "Le coude reste fixe, seul l'avant-bras bouge", "Étirement complet, côté faible en premier"] },
    m_lying_leg_curl: { name: "Leg curl allongé", img: "Lying_Leg_Curls", primary: ["hamstrings"], secondary: ["calves"], cues: ["Hanches plaquées sur le banc", "Monte les talons vers les fesses, pause 1 s", "Descente lente, jambes pas verrouillées"] },
    band_leg_curl: { name: "Leg curl 1 jambe à l'élastique", img: "Standing_Leg_Curl", primary: ["hamstrings"], secondary: [], cues: ["Élastique à la cheville, ancré devant toi", "Ramène le talon vers la fesse, cuisse immobile", "Contrôle le retour"] },
    m_leg_press_high: { name: "Presse à cuisses pieds hauts", img: "Leg_Press", primary: ["glutes", "hamstrings"], secondary: ["quadriceps"], cues: ["Pieds en haut de la plateforme, largeur d'épaules", "Descends profond sans décoller le bassin", "Pousse dans les talons"] },
    d_walking_lunge: { name: "Fentes marchées haltères", img: "Dumbbell_Lunges", primary: ["quadriceps", "glutes"], secondary: ["hamstrings"], cues: ["Grands pas, genou arrière frôle le sol", "Buste droit, genou avant dans l'axe du pied", "Pousse dans le talon avant pour avancer"] },
    m_wide_cable_row: { name: "Rowing poulie basse prise large", img: "Seated_Cable_Rows", primary: ["middle back"], secondary: ["lats", "shoulders"], cues: ["Barre prise large, buste droit", "Tire vers le bas des pectoraux, coudes ouverts", "Serre les omoplates 1 s"] },
    m_cable_rear_fly: { name: "Oiseau à la poulie (arrière d'épaule)", img: "Cable_Rear_Delt_Fly", primary: ["shoulders"], secondary: ["middle back"], cues: ["Poulies croisées à hauteur d'épaules", "Bras quasi tendus, ouvre vers l'arrière", "Pas de haussement d'épaules"] },
    d_seated_rear_raise: { name: "Oiseau haltères assis", img: "Seated_Bent-Over_Rear_Delt_Raise", primary: ["shoulders"], secondary: ["middle back"], cues: ["Assis au bout du banc, poitrine sur les cuisses", "Ouvre les bras sur les côtés, petits doigts vers le haut", "Charge légère, mouvement lent"] },
    d_incline_hammer: { name: "Curl marteau incliné", img: "Incline_Hammer_Curls", primary: ["biceps"], secondary: ["forearms"], cues: ["Dos sur un banc à 45°, bras pendants", "Prise neutre, coudes immobiles", "Étirement complet en bas"] },
    ez_curl: { name: "Curl barre EZ", img: "EZ-Bar_Curl", primary: ["biceps"], secondary: ["forearms"], cues: ["Coudes collés au corps", "Pas de balancier du buste", "Descente contrôlée jusqu'en bas"] },
    m_seated_calf_press: { name: "Presse à mollets assis (levier)", img: "Calf_Press", primary: ["calves"], secondary: [], cues: ["Avant du pied sur la plateforme, talons dans le vide", "Étirement complet, pause 1 s en bas", "Pousse jusqu'à la pointe des pieds"] },
    m_calf_leg_press: { name: "Mollets à la presse à cuisses", img: "Calf_Press_On_The_Leg_Press_Machine", primary: ["calves"], secondary: [], cues: ["Avant du pied au bas de la plateforme, jambes tendues", "Sécurités de la presse mises", "Amplitude complète, sans rebond"] },
    neck_side_plate: { name: "Inclinaison latérale du cou lestée", img: "Isometric_Neck_Exercise_-_Sides", primary: ["neck"], secondary: ["traps"], cues: ["Allongé sur le côté, tête dans le vide, disque ou haltère sur la tempe (serviette)", "Oreille vers l'épaule, l'épaule ne monte pas", "Tempo 3-1-3, arrêt immédiat en cas de fourmillement"] },
    cable_shrug: { name: "Shrugs prise large (poulie basse)", img: "Cable_Shrugs", primary: ["traps"], secondary: [], cues: ["Barre longue à la poulie basse, prise large", "Monte les épaules vers les oreilles, sans rouler", "Pause 1 s en haut, tempo 3-1-3"] },
    barbell_shrug: { name: "Shrugs prise large (barre)", img: "Barbell_Shrug", primary: ["traps"], secondary: [], cues: ["Prise plus large que les épaules", "Bras tendus, seules les épaules montent", "Pause 1 s en haut, tempo 3-1-3"] },
    farmers_walk: { name: "Farmer's walk", img: "Farmers_Walk", primary: ["traps", "forearms"], secondary: ["abdominals", "shoulders"], cues: ["Haltères lourds le long du corps, épaules basses et en arrière", "Petits pas rapides, buste droit, 40 s", "Pose les haltères avant de lâcher la prise"] },
    shrug_hold: { name: "Tenue lourde machine à shrugs (40 s)", img: "Leverage_Shrug", primary: ["traps", "forearms"], secondary: [], cues: ["Charge lourde en position haute des épaules", "Tiens 40 s, respiration continue", "Remplace le farmer's walk si la salle est pleine"] },
  };

  // Aide : construction d'un exercice de programme
  // ex(id, {block, sets, reps, rest, tempo, orig, machine:{ex, kg, note, tab}, dumbbell:{…}, primary:'machine'|'dumbbell', warmup?, info?})
  // orig = nom de l'exercice dans le programme d'origine (captures) : sert au décompte des 45 exercices.
  // tab = libellé de l'onglet quand la « version machine » n'est pas une machine (barres, élastique…).
  function ex(id, o) {
    const mk = (v) => v ? { ex: v.ex, kg: v.kg ?? null, lbs: v.kg != null ? kg(v.kg).lbs : null, note: v.note || "", tab: v.tab || "" } : null;
    return {
      id, block: o.block, superset: o.superset || "", sets: o.sets, reps: o.reps, rest: o.rest || 0,
      tempo: o.warmup ? "" : o.tempo || "2-1-1", orig: o.orig || "",
      primary: o.primary || (o.machine ? "machine" : "dumbbell"),
      machine: mk(o.machine), dumbbell: mk(o.dumbbell),
      warmup: !!o.warmup, timed: o.timed || "", info: o.info || "",
    };
  }
  const warm = (id) => ex(id, { block: "A", warmup: true, sets: 1, reps: "5 min + mobilité", machine: { ex: "warmup_cardio" }, primary: "machine" });
  const N = (id, o) => ex(id, { tempo: "3-1-3", primary: "dumbbell", ...o }); // bloc cou : tempo 3-1-3, disque / haltère par défaut
  const HARNESS = { ex: "neck_harness", kg: null, note: "harnais de cou (recommandé, ~600-900 THB)", tab: "Harnais" };

  // Programme Shredlog v2 — SHREDLOG_SPEC_v2.md, partie 2 (27/09/2026).
  // Les 45 exercices du programme d'origine (J1, J2, J3, J4, J6) sont tous présents : voir tools/check_program.js.
  const PROGRAM = {
    name: "Shredlog v2 — PPL × 2 + cou / trapèzes",
    specId: "shredlog-spec-v2",
    version: 5,
    createdAt: "2026-09-27",
    notes: [
      "Tempo 2-1-1 partout (2 s descente, 1 s pause, 1 s montée). Bloc cou + trapèzes : 3-1-3, jamais de mouvement balistique.",
      "Séance 1 = calibration : les charges sont des points de départ. Haut de la fourchette dépassé sur toutes les séries → on monte ; bas de la fourchette raté dès la 1re série → on descend.",
      "Progression : +2,5 kg ou +1 cran (machine), +2,5 lbs par main (haltères) quand le haut de la fourchette est réussi sur toutes les séries. Jamais de hausse si « douleur » a été signalée sur l'exercice à la séance précédente.",
      "Chaque exercice a une version machine / poulie et une version haltères : si la machine est prise, bascule sans perdre la séance. Côté faible en premier sur tout exercice unilatéral.",
      "Échauffement : 5 min vélo ou rameur + mobilité spécifique à la séance. Dips et tractions lestés : poids du corps jusqu'à maîtrise, puis lest.",
      "6 séances en déficit : premier signal à surveiller = charges qui stagnent 2 semaines d'affilée → passer à 5 jours avant de toucher à autre chose.",
      "Cou : 2 fois par semaine (fréquence > volume), toujours avec charge. Semaine 1 sans charge pour apprendre le mouvement, puis 2,5 kg, puis 5 kg. Arrêt immédiat si fourmillement, engourdissement ou douleur dans un bras.",
    ],
    days: [
      {
        id: "j1", weekday: 1, name: "J1 — Push 1", focus: "Squat lourd en ouverture · pectoraux · épaules · triceps · abdos", duration: 70,
        exercises: [
          warm("j1_w"),
          ex("j1_1", { block: "1", orig: "Pendulum Squat", sets: 3, reps: "6-8", rest: 120, machine: { ex: "m_pendulum", kg: 40, note: "charge ajoutée" }, dumbbell: { ex: "d_goblet", kg: 16, note: "1 haltère" } }),
          ex("j1_2", { block: "2", orig: "Weighted Dips", sets: 3, reps: "6-9", rest: 120, machine: { ex: "dips_weighted", kg: null, note: "PDC → lest 5 kg quand 3 × 9 propres", tab: "Barres" }, dumbbell: { ex: "bench_dips", kg: null, note: "poids du corps", tab: "Entre deux bancs" } }),
          ex("j1_3", { block: "3", orig: "Dumbbell incline bench press", sets: 3, reps: "8-12", rest: 90, primary: "dumbbell", dumbbell: { ex: "d_incline_press", kg: 12, note: "par main" }, machine: { ex: "m_incline_press", kg: 30, note: "charge totale" } }),
          ex("j1_4", { block: "4", orig: "Barbell Lying Close Grip Press", sets: 3, reps: "6-8", rest: 90, machine: { ex: "b_close_press", kg: 25, note: "barre incluse", tab: "Barre" }, dumbbell: { ex: "d_close_press", kg: 10, note: "par main" } }),
          ex("j1_5", { block: "5", orig: "Peck Deck machine", sets: 3, reps: "12-15", rest: 60, machine: { ex: "m_pec_deck", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_flyes", kg: 8, note: "par main" } }),
          ex("j1_6", { block: "6", orig: "Dumbbell side laterals", sets: 3, reps: "20-25", rest: 45, primary: "dumbbell", dumbbell: { ex: "d_lateral_raise", kg: 4, note: "par main" }, machine: { ex: "m_lateral_machine", kg: 15, note: "charge totale" } }),
          ex("j1_7", { block: "7", orig: "Rope Triceps Pushdown", sets: 3, reps: "12-20", rest: 60, machine: { ex: "m_triceps_rope", kg: 20, note: "charge totale" }, dumbbell: { ex: "d_triceps_oh", kg: 10, note: "1 haltère à 2 mains" } }),
          ex("j1_8", { block: "8", orig: "Cable Rope Incline Tricep Extension", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_rope_overhead", kg: 15, note: "charge totale" }, dumbbell: { ex: "d_skullcrusher", kg: 7, note: "par main" } }),
          ex("j1_9", { block: "9", orig: "Ab Crunch Machine", sets: 3, reps: "8-15", rest: 45, machine: { ex: "m_ab_crunch", kg: 20, note: "charge totale" }, dumbbell: { ex: "weighted_crunch", kg: 5, note: "disque sur la poitrine" } }),
        ],
      },
      {
        id: "j2", weekday: 2, name: "J2 — Legs", focus: "Dominante quadriceps · ischios · adducteurs · mollets", duration: 65,
        exercises: [
          warm("j2_w"),
          ex("j2_1", { block: "1", orig: "Pendulum Squat", sets: 3, reps: "6-8", rest: 120, machine: { ex: "m_pendulum", kg: 40, note: "charge ajoutée" }, dumbbell: { ex: "d_goblet", kg: 16, note: "1 haltère" } }),
          ex("j2_2", { block: "2", orig: "Leg extensions", sets: 3, reps: "10-20", rest: 60, machine: { ex: "m_leg_ext", kg: 25, note: "charge totale" }, dumbbell: { ex: "sissy_squat", kg: null, note: "poids du corps", tab: "Sissy squat" } }),
          ex("j2_3", { block: "3", orig: "Bulgarian Split Squat", sets: 3, reps: "10-12 / jambe", rest: 75, primary: "dumbbell", dumbbell: { ex: "d_split_squat", kg: 8, note: "par main" }, machine: { ex: "m_leg_press_single", kg: 30, note: "charge totale" } }),
          ex("j2_4", { block: "4", orig: "Seated Leg Curl", sets: 3, reps: "10-15", rest: 60, machine: { ex: "m_leg_curl", kg: 25, note: "charge totale" }, dumbbell: { ex: "d_stiff_dl", kg: 12, note: "par main" } }),
          ex("j2_5", { block: "5", orig: "Db stiff-leg deadlift", sets: 3, reps: "8-12", rest: 90, primary: "dumbbell", dumbbell: { ex: "d_stiff_dl", kg: 14, note: "par main" }, machine: { ex: "smith_stiff_dl", kg: 30, note: "charge ajoutée" } }),
          ex("j2_6", { block: "6", orig: "Lever Seated Hip Adduction", sets: 2, reps: "12-15", rest: 45, machine: { ex: "m_adductor", kg: 30, note: "charge totale" }, dumbbell: { ex: "d_lateral_lunge", kg: 8, note: "1 haltère" }, info: "Reps d'origine 6-9, normalisées à 12-15 : une machine d'adduction ne se travaille pas en force." }),
          ex("j2_7", { block: "7", orig: "Standing Calf Raises", sets: 4, reps: "12-15", rest: 45, machine: { ex: "m_calf", kg: 40, note: "charge totale" }, dumbbell: { ex: "d_calf_single", kg: 15, note: "1 haltère" } }),
          ex("j2_8", { block: "8", orig: "Lever Seated Calf Raise Plate", sets: 3, reps: "10-15", rest: 45, machine: { ex: "m_seated_calf", kg: 20, note: "disques" }, dumbbell: { ex: "d_seated_calf", kg: 15, note: "haltère sur les genoux" } }),
        ],
      },
      {
        id: "cou_mer", kind: "neck", weekday: 3, slot: "matin", name: "Cou + trapèzes — court (mercredi matin)", focus: "~10 min, à la maison ou en salle · tempo 3-1-3 · avec charge", duration: 10,
        exercises: [
          N("cou_mer_a", { block: "A", orig: "Cou court A — Flexion de cou", sets: 2, reps: "15-20", rest: 45, dumbbell: { ex: "neck_curl_plate", kg: 4.5, note: "haltère 10 lbs sur le front, serviette pliée · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_mer_b", { block: "B", orig: "Cou court B — Extension de cou", sets: 2, reps: "15-20", rest: 45, dumbbell: { ex: "neck_ext_plate", kg: 4.5, note: "haltère 10 lbs sur la nuque, allongé sur le ventre · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_mer_c", { block: "C", orig: "Cou court C — Inclinaison latérale", sets: 2, reps: "12-15 / côté", rest: 45, dumbbell: { ex: "neck_side_plate", kg: 2.3, note: "haltère 5 lbs sur la tempe, allongé sur le côté · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_mer_d", { block: "D", orig: "Cou court D — Shrugs haltères", sets: 3, reps: "15-20", rest: 45, dumbbell: { ex: "d_shrug", kg: 11.3, note: "25 lbs par main (les plus lourds disponibles)" }, machine: { ex: "m_shrug", kg: null, note: "machine à shrugs / Smith, à calibrer" } }),
        ],
      },
      {
        id: "j3", weekday: 3, name: "J3 — Pull 1", focus: "Dos (largeur + épaisseur) · biceps", duration: 65,
        exercises: [
          warm("j3_w"),
          ex("j3_1", { block: "1", orig: "Weighted Pull Ups", sets: 3, reps: "4-8", rest: 120, machine: { ex: "pullup_weighted", kg: null, note: "PDC → lest quand 3 × 8 propres", tab: "Barre" }, dumbbell: { ex: "m_assisted_pullup", kg: 20, note: "assistance −20 kg si besoin", tab: "Assistées" } }),
          ex("j3_2", { block: "2", orig: "Dumbbell Bent Over Alternate Row", sets: 3, reps: "10-20", rest: 90, primary: "dumbbell", dumbbell: { ex: "d_alt_row", kg: 14, note: "par main" }, machine: { ex: "m_seated_row", kg: 30, note: "charge totale" } }),
          ex("j3_3", { block: "3", orig: "Chest Supported T bar Row", sets: 3, reps: "10-12", rest: 90, machine: { ex: "m_tbar_row", kg: 25, note: "charge ajoutée" }, dumbbell: { ex: "d_incline_row", kg: 12, note: "par main" } }),
          ex("j3_4", { block: "4", orig: "One arm lat pulldown", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_one_arm_pulldown", kg: 20, note: "par bras" }, dumbbell: { ex: "d_one_arm_row", kg: 14, note: "1 haltère" } }),
          ex("j3_5", { block: "5", orig: "One Arm Seated Row Machine", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_one_arm_seated_row", kg: 20, note: "par bras" }, dumbbell: { ex: "d_one_arm_row", kg: 12, note: "1 haltère, appui banc" } }),
          ex("j3_6", { block: "6", orig: "Straight-Arm Pulldown", sets: 2, reps: "12-15", rest: 60, machine: { ex: "m_straight_arm", kg: 20, note: "charge totale" }, dumbbell: { ex: "d_pullover", kg: 10, note: "1 haltère" } }),
          ex("j3_7", { block: "7", orig: "One Arm Dumbbell Preacher Curl", sets: 2, reps: "10-12", rest: 60, primary: "dumbbell", dumbbell: { ex: "d_preacher_one", kg: 6, note: "1 haltère" }, machine: { ex: "m_preacher_one", kg: 12, note: "par bras" } }),
          ex("j3_8", { block: "8", orig: "Dumbbell Alternate Bicep Curl", sets: 2, reps: "6-8", rest: 60, primary: "dumbbell", dumbbell: { ex: "d_curl_alt", kg: 10, note: "par main" }, machine: { ex: "m_cable_curl", kg: 20, note: "charge totale" } }),
          ex("j3_9", { block: "9", orig: "Machine Preacher Curls", sets: 2, reps: "8-10", rest: 60, machine: { ex: "m_preacher", kg: 15, note: "charge totale" }, dumbbell: { ex: "d_preacher", kg: 8, note: "par main" } }),
        ],
      },
      {
        id: "j4", weekday: 4, name: "J4 — Push 2", focus: "Épaules · pectoraux · triceps · abdos", duration: 65,
        exercises: [
          warm("j4_w"),
          ex("j4_1", { block: "1", orig: "Dumbbell shoulder press", sets: 3, reps: "6-10", rest: 90, primary: "dumbbell", dumbbell: { ex: "d_shoulder_press", kg: 10, note: "par main" }, machine: { ex: "m_shoulder_press", kg: 25, note: "charge totale" } }),
          ex("j4_2", { block: "2", orig: "Dumbbell incline bench press", sets: 3, reps: "8-12", rest: 90, primary: "dumbbell", dumbbell: { ex: "d_incline_press", kg: 12, note: "par main" }, machine: { ex: "m_incline_press", kg: 30, note: "charge totale" } }),
          ex("j4_3", { block: "3", orig: "Dips", sets: 3, reps: "max (viser 8-12)", rest: 90, machine: { ex: "dips_bw", kg: null, note: "poids du corps", tab: "Barres" }, dumbbell: { ex: "bench_dips", kg: null, note: "poids du corps", tab: "Entre deux bancs" } }),
          ex("j4_4", { block: "4", orig: "Reverse Peck Deck", sets: 3, reps: "12-15", rest: 60, machine: { ex: "m_reverse_pec_deck", kg: 20, note: "charge totale" }, dumbbell: { ex: "d_reverse_flyes", kg: 6, note: "par main, buste penché" } }),
          ex("j4_5", { block: "5", orig: "Cable Side Laterals", sets: 3, reps: "10-15", rest: 45, machine: { ex: "m_lateral_raise", kg: 5, note: "par côté" }, dumbbell: { ex: "d_lateral_raise", kg: 5, note: "par main" } }),
          ex("j4_6", { block: "6", orig: "Dumbbell lateral Raise", sets: 2, reps: "15-20", rest: 45, primary: "dumbbell", dumbbell: { ex: "d_lateral_raise", kg: 4, note: "par main" }, machine: { ex: "m_lateral_machine", kg: 15, note: "charge totale" } }),
          ex("j4_7", { block: "7", orig: "Katana Cable Extension", sets: 3, reps: "10-12", rest: 60, machine: { ex: "m_katana", kg: 15, note: "par bras" }, dumbbell: { ex: "d_triceps_oh", kg: 12, note: "1 haltère à 2 mains" } }),
          ex("j4_8", { block: "8", orig: "Hanging Straight Leg Raise", sets: 3, reps: "max (viser 10-15)", rest: 60, machine: { ex: "leg_raise", kg: null, note: "poids du corps", tab: "Suspendu" }, dumbbell: { ex: "leg_raise_floor", kg: null, note: "poids du corps", tab: "Sur banc" } }),
          ex("j4_9", { block: "9", orig: "Abs", sets: 3, reps: "max (viser 15-20)", rest: 45, machine: { ex: "m_ab_crunch", kg: 20, note: "crunch machine ou câble" }, dumbbell: { ex: "weighted_crunch", kg: 5, note: "disque sur la poitrine" } }),
        ],
      },
      {
        id: "j5", weekday: 5, name: "J5 — Legs 2 (à valider)", focus: "Dominante ischios et fessiers · reconstruit (capture manquante), à valider", duration: 55,
        exercises: [
          warm("j5_w"),
          ex("j5_1", { block: "1", orig: "Hip thrust machine", sets: 3, reps: "10-12", rest: 90, machine: { ex: "m_hip_thrust", kg: 40, note: "charge totale" }, dumbbell: { ex: "d_hip_thrust", kg: 20, note: "haltère sur le bassin" } }),
          ex("j5_2", { block: "2", orig: "SDT jambes tendues barre", sets: 3, reps: "8-12", rest: 90, machine: { ex: "b_stiff_dl", kg: 30, note: "barre incluse", tab: "Barre" }, dumbbell: { ex: "d_stiff_dl", kg: 14, note: "par main" } }),
          ex("j5_3", { block: "3", orig: "Presse à cuisses pieds hauts", sets: 3, reps: "12-15", rest: 75, machine: { ex: "m_leg_press_high", kg: 60, note: "charge ajoutée" }, dumbbell: { ex: "d_walking_lunge", kg: 8, note: "par main" } }),
          ex("j5_4", { block: "4", orig: "Leg curl allongé", sets: 3, reps: "10-15", rest: 60, machine: { ex: "m_lying_leg_curl", kg: 20, note: "charge totale" }, dumbbell: { ex: "band_leg_curl", kg: null, note: "élastique", tab: "Élastique" } }),
          ex("j5_5", { block: "5", orig: "Presse à mollets assis", sets: 3, reps: "10-15", rest: 45, machine: { ex: "m_seated_calf", kg: 30, note: "disques" }, dumbbell: { ex: "d_seated_calf", kg: 15, note: "haltère sur les genoux" } }),
          ex("j5_6", { block: "6", orig: "Crunch câble à genoux", sets: 3, reps: "12-15", rest: 45, machine: { ex: "m_cable_crunch", kg: 20, note: "charge totale" }, dumbbell: { ex: "weighted_crunch", kg: 5, note: "disque sur la poitrine" } }),
        ],
      },
      {
        id: "j6", weekday: 6, name: "J6 — Pull 2", focus: "Dos · arrière d'épaule · biceps · mollets", duration: 70,
        exercises: [
          warm("j6_w"),
          ex("j6_1", { block: "1", orig: "Wide grip pull ups", sets: 3, reps: "max (viser 5-10)", rest: 120, machine: { ex: "pullup_wide", kg: null, note: "poids du corps", tab: "Barre" }, dumbbell: { ex: "m_assisted_pullup", kg: 20, note: "assistance −20 kg, prise large", tab: "Assistées" } }),
          ex("j6_2", { block: "2", orig: "Cable Row - Wide Grip", sets: 3, reps: "10-15", rest: 90, machine: { ex: "m_wide_cable_row", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_one_arm_row", kg: 14, note: "1 haltère" } }),
          ex("j6_3", { block: "3", orig: "Wide grip lat pulldown", sets: 2, reps: "10-12", rest: 75, machine: { ex: "m_lat_pulldown", kg: 35, note: "charge totale" }, dumbbell: { ex: "d_bent_row", kg: 12, note: "par main" } }),
          ex("j6_4", { block: "4", orig: "Straight arm push down", sets: 2, reps: "10-12", rest: 60, machine: { ex: "m_straight_arm_rope", kg: 20, note: "charge totale" }, dumbbell: { ex: "d_pullover", kg: 10, note: "1 haltère" } }),
          ex("j6_5", { block: "5", orig: "Cable Rear Delt Fly", sets: 3, reps: "10-15", rest: 45, machine: { ex: "m_cable_rear_fly", kg: 7.5, note: "par côté" }, dumbbell: { ex: "d_seated_rear_raise", kg: 5, note: "par main" } }),
          ex("j6_6", { block: "6", orig: "Dumbbell Hammer Grip Incline curl", sets: 3, reps: "10-12", rest: 60, primary: "dumbbell", dumbbell: { ex: "d_incline_hammer", kg: 8, note: "par main" }, machine: { ex: "m_hammer_rope", kg: 15, note: "charge totale" } }),
          ex("j6_7", { block: "7", orig: "Lever Preacher Curl", sets: 2, reps: "6-15", rest: 60, machine: { ex: "m_preacher", kg: 15, note: "charge totale" }, dumbbell: { ex: "d_preacher", kg: 8, note: "par main" } }),
          ex("j6_8", { block: "8", orig: "Barbell curl Z bar", sets: 2, reps: "5-12", rest: 60, machine: { ex: "ez_curl", kg: 15, note: "barre incluse", tab: "Barre EZ" }, dumbbell: { ex: "d_curl_alt", kg: 10, note: "par main" } }),
          ex("j6_9", { block: "9", orig: "Lever Seated Calf Raise Plate", sets: 2, reps: "10-15", rest: 45, machine: { ex: "m_seated_calf", kg: 20, note: "disques" }, dumbbell: { ex: "d_seated_calf", kg: 15, note: "haltère sur les genoux" } }),
          ex("j6_10", { block: "10", orig: "Lever Seated Calf Press", sets: 2, reps: "12-15", rest: 45, machine: { ex: "m_seated_calf_press", kg: 40, note: "charge totale" }, dumbbell: { ex: "m_calf_leg_press", kg: null, note: "charge à calibrer", tab: "Presse à cuisses" } }),
        ],
      },
      {
        id: "cou_sam", kind: "neck", weekday: 6, slot: "après J6", name: "Cou + trapèzes — long (après J6)", focus: "~18 min en fin de séance · tempo 3-1-3 · avec charge", duration: 18,
        exercises: [
          N("cou_sam_a", { block: "A", orig: "Cou long A — Flexion de cou", sets: 3, reps: "15-20", rest: 45, dumbbell: { ex: "neck_curl_plate", kg: 2.5, note: "2,5 → 5 kg · disque sur le front, serviette pliée · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_sam_b", { block: "B", orig: "Cou long B — Extension de cou", sets: 3, reps: "15-20", rest: 45, dumbbell: { ex: "neck_ext_plate", kg: 2.5, note: "2,5 → 5 kg · disque sur la nuque · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_sam_c", { block: "C", orig: "Cou long C — Inclinaison latérale", sets: 2, reps: "12-15 / côté", rest: 45, dumbbell: { ex: "neck_side_plate", kg: 2.5, note: "disque ou haltère sur la tempe · semaine 1 sans charge" }, machine: HARNESS }),
          N("cou_sam_d", { block: "D", orig: "Cou long D — Shrugs haltères", sets: 4, reps: "12-15", rest: 60, dumbbell: { ex: "d_shrug", kg: 16, note: "par main" }, machine: { ex: "m_shrug", kg: null, note: "machine à shrugs / Smith, à calibrer" } }),
          N("cou_sam_e", { block: "E", orig: "Cou long E — Shrugs prise large barre ou poulie", sets: 2, reps: "15-20", rest: 45, primary: "machine", machine: { ex: "cable_shrug", kg: 20, note: "poulie basse", tab: "Poulie" }, dumbbell: { ex: "barbell_shrug", kg: 20, note: "barre incluse", tab: "Barre" } }),
          N("cou_sam_f", { block: "F", orig: "Cou long F — Farmer's walk", sets: 3, reps: "40 s", rest: 60, tempo: "marche contrôlée", dumbbell: { ex: "farmers_walk", kg: 20, note: "par main, 40 s de marche" }, machine: { ex: "shrug_hold", kg: null, note: "tenue 40 s, à calibrer", tab: "Machine" } }),
        ],
      },
      { id: "dim", weekday: 0, name: "Repos", focus: "Mensurations et photos à 21h", duration: 0, rest: true, exercises: [] },
    ],
    posture: [
      { name: "Étirement fléchisseurs de hanche", ex: "hip_flexor_stretch", dur: "45 s / côté" },
      { name: "Étirement lombaires (genoux à la poitrine)", ex: "knees_to_chest", dur: "45 s" },
      { name: "Pont fessier", ex: "glute_bridge", dur: "15 reps" },
      { name: "Dead bug", ex: "dead_bug", dur: "10 / côté" },
      { name: "Posture debout au mur (bas du dos collé)", ex: "wall_posture", dur: "30 s" },
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
      { id: "tongkat", cycleStart: "2026-09-28", weeksOn: 8, weeksOff: 4, cycleEnabled: true, name: "Tongkat Ali", brand: "Advance Physician Formulas 200 mg", dose: "1 cap", moment: "reveil", cycle: "8 sem ON / 4 OFF", why: "Soutien de la testostérone libre et de la libido. À cycler. Stop si insomnie, irritabilité, acné, mamelons sensibles." },
      { id: "citrulline", name: "L-Citrulline", brand: "Doctor's Best Powder", dose: "3 g (1 scoop) dans l'eau", moment: "reveil", why: "Précurseur de l'arginine → oxyde nitrique : circulation, pump, volume séminal. Se mélange avec collagène + vit C." },
      { id: "rhodiola", cycleStart: "2026-09-28", weeksOn: 6, weeksOff: 2, cycleEnabled: true, name: "Rhodiola", brand: "Thorne 100 mg", dose: "2 caps (200 mg)", moment: "reveil", cycle: "6 sem ON / 2 OFF", why: "Adaptogène anti-fatigue, énergie mentale et résistance au stress. Jamais le soir." },
      { id: "probio", name: "Probiotiques", brand: "Garden of Life Men's 50B", dose: "1 cap", moment: "reveil", why: "Flore intestinale : digestion, absorption des nutriments, immunité." },
      { id: "theanine", name: "L-Théanine", brand: "NOW 200 mg", dose: "1 cap avec le café", moment: "petitdej", why: "Lisse l'effet de la caféine : concentration calme, sans nervosité. Ratio 2:1 avec ~100 mg de caféine." },
      { id: "bcomplex", name: "B-Complex", brand: "Thorne Basic B", dose: "1 cap", moment: "petitdej", why: "Énergie cellulaire, système nerveux, méthylation. Contient déjà 400 µg de méthyl-B12." },
      { id: "d3k2", name: "Vitamine D3 + K2", brand: "Thorne Liquid", dose: "3 gouttes (0,15 ml)", moment: "petitdej", fat: true, why: "Testostérone, immunité, os. Liposoluble → avec du gras (œufs, avocat, noix). Cible sanguine 40-60 ng/mL." },
      { id: "coq10", name: "CoQ10 Ubiquinol", brand: "Doctor's Best Kaneka", dose: "100 mg", moment: "petitdej", fat: true, why: "Énergie mitochondriale, cœur, antioxydant. Avec un repas gras." },
      { id: "creatine", name: "Créatine", brand: "Thorne (NSF)", dose: "5 g", moment: "petitdej", why: "Force, volume musculaire, cognition. Tous les jours, même au repos. Boire 3-4 L d'eau." },
      { id: "omega1", name: "Oméga-3 #1", brand: "Nordic Naturals Ultimate Omega 2X", dose: "1 softgel", moment: "petitdej", fat: true, why: "EPA/DHA : anti-inflammatoire, récupération, cœur, cerveau. 2e prise au déjeuner." },
      { id: "collagen", name: "Collagène + Vitamine C", brand: "Sports Research + California Gold C", dose: "15 g + 1 cap", moment: "petitdej", why: "Tendons, articulations, peau. La vitamine C est nécessaire à la synthèse du collagène." },
      { id: "omega2", name: "Oméga-3 #2", brand: "Nordic Naturals", dose: "1 softgel", moment: "dejeuner", fat: true, why: "2e prise d'EPA/DHA, avec un repas gras." },
      { id: "asta", name: "Astaxanthine", brand: "NOW AstaReal 10 mg", dose: "1 softgel", moment: "dejeuner", fat: true, why: "Antioxydant puissant : peau, yeux, endurance, fertilité. Liposoluble." },
      { id: "boron", cycleStart: "2026-09-28", weeksOn: 8, weeksOff: 4, cycleEnabled: true, name: "Boron", brand: "NOW 3 mg", dose: "1 cap (3 mg)", moment: "dejeuner", cycle: "8 sem ON / 4 OFF", why: "Augmente la testostérone libre (baisse la SHBG), os. À cycler avec le Tongkat." },
      { id: "selenium", name: "Sélénium", brand: "NOW 100 µg", dose: "1 cap", moment: "dejeuner", why: "Thyroïde, antioxydant, qualité du sperme." },
      { id: "lecithin", name: "Lécithine tournesol", brand: "NOW 1200 mg", dose: "2 softgels", moment: "dejeuner", why: "Choline et phospholipides : foie, cerveau, volume séminal." },
      { id: "zinc", name: "Zinc Picolinate", brand: "Thorne 15 mg", dose: "1 cap", moment: "diner", why: "Testostérone, immunité, peau. Séparer du magnésium de 2 h (compétition d'absorption)." },
      { id: "ashwa", name: "Ashwagandha Sensoril", brand: "Life Extension 125 mg", dose: "1 cap", moment: "diner", why: "Baisse le cortisol, améliore sommeil et récupération. Surveiller le foie (bilan ALAT/ASAT)." },
      { id: "magnesium", name: "Magnésium bisglycinate", brand: "Doctor's Best 300 mg", dose: "3 caps", moment: "coucher", why: "Relaxation, sommeil profond, récupération musculaire, 300+ réactions enzymatiques. 60 min avant le coucher." },
    ],
  };

  // Stock — état initial = COMPLEMENTS_INVENTAIRE.csv (comptage du 27/09/2026, avant les prises du jour).
  // Une ligne par boîte réelle ; takes = cases de la liste du jour qui la consomment (qty dans l'unité de la ligne).
  // Oméga-3 : UNE seule ligne consommée par omega1 + omega2. Whey : consommée par les repas validés (Nutrition).
  const STOCK_COUNTED = "2026-09-27";
  const st = (id, name, brand, unit, unitsLeft, unitsPerBox, dosePerDay, takes, extra) => ({ id, name, brand, unit, unitsLeft, unitsPerBox, dosePerDay, leadTimeDays: 10, bufferDays: 7, lastCountedAt: STOCK_COUNTED, countExclude: [], orderedAt: null, supplier: "iHerb", takes, ...(extra || {}) });
  const STOCK = [
    st("probio", "Probiotiques", "Garden of Life Men's 50B", "capsule", 0, 30, 1, [{ item: "probio", qty: 1 }], { orderedAt: STOCK_COUNTED }),
    st("creatine", "Créatine", "Thorne (NSF)", "gramme", 90, 150, 5, [{ item: "creatine", qty: 5 }]),
    st("omega3", "Oméga-3", "Nordic Naturals Ultimate Omega 2X", "softgel", 29, 60, 2, [{ item: "omega1", qty: 1 }, { item: "omega2", qty: 1 }]),
    st("collagen", "Collagène", "Sports Research", "gramme", 200, 300, 15, [{ item: "collagen", qty: 15 }]),
    st("rhodiola", "Rhodiola", "Thorne 100 mg", "capsule", 42, 60, 2, [{ item: "rhodiola", qty: 2 }]),
    st("whey", "Whey ISO100", "Dymatize Hydrolyzed", "gramme", 2100, 2300, 60, [], { food: "whey", leadTimeDays: 1, supplier: "Central", note: "Achat Central Thailand, pas iHerb. Décomptée depuis les repas validés dans Nutrition." }),
    st("tongkat", "Tongkat Ali", "Advance Physician Formulas 200 mg", "capsule", 39, 60, 1, [{ item: "tongkat", qty: 1 }]),
    st("theanine", "L-Théanine", "NOW 200 mg", "capsule", 39, 60, 1, [{ item: "theanine", qty: 1 }]),
    st("magnesium", "Magnésium bisglycinate", "Doctor's Best 300 mg", "capsule", 118, 120, 3, [{ item: "magnesium", qty: 3 }]),
    st("bcomplex", "B-Complex", "Thorne Basic B", "capsule", 41, 60, 1, [{ item: "bcomplex", qty: 1 }]),
    st("asta", "Astaxanthine", "NOW AstaReal 10 mg", "softgel", 41, 60, 1, [{ item: "asta", qty: 1 }]),
    st("boron", "Boron", "NOW 3 mg", "capsule", 85, 100, 1, [{ item: "boron", qty: 1 }]),
    st("lecithin", "Lécithine tournesol", "NOW 1200 mg", "softgel", 86, 100, 2, [{ item: "lecithin", qty: 2 }]),
    st("vitc", "Vitamine C", "California Gold", "capsule", 47, 60, 1, [{ item: "collagen", qty: 1 }]),
    st("zinc", "Zinc Picolinate", "Thorne 15 mg", "capsule", 52, 60, 1, [{ item: "zinc", qty: 1 }]),
    st("ashwa", "Ashwagandha Sensoril", "Life Extension 125 mg", "capsule", 52, 60, 1, [{ item: "ashwa", qty: 1 }]),
    st("citrulline", "L-Citrulline", "Doctor's Best Powder", "gramme", 180, 200, 3, [{ item: "citrulline", qty: 3 }]),
    st("selenium", "Sélénium", "NOW 100 µg", "capsule", 87, 100, 1, [{ item: "selenium", qty: 1 }]),
    st("d3k2", "Vitamine D3 + K2", "Thorne Liquid", "ml", 25, 30, 0.15, [{ item: "d3k2", qty: 0.15 }], { note: "3 gouttes/jour, conversion 20 gouttes/ml à confirmer sur le flacon." }),
    st("coq10", "CoQ10 Ubiquinol", "Doctor's Best Kaneka 100 mg", "softgel", 71, 90, 1, [{ item: "coq10", qty: 1 }]),
  ];

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

  const MUSCLE_LABELS = { chest: "Pectoraux", shoulders: "Épaules", triceps: "Triceps", biceps: "Biceps", forearms: "Avant-bras", abdominals: "Abdominaux", quadriceps: "Quadriceps", calves: "Mollets", traps: "Trapèzes", lats: "Grand dorsal", "middle back": "Milieu du dos", "lower back": "Lombaires", glutes: "Fessiers", hamstrings: "Ischio-jambiers", neck: "Cou", adductors: "Adducteurs" };

  return { EX, PROGRAM, SUPPLEMENTS, STOCK, NUTRITION, MEASURE_FIELDS, BASELINE, MUSCLE_LABELS, kg };
})();
