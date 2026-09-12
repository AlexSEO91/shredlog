# Shredlog

App perso de suivi du Programme Shred (remplace Fitlog). Deux modes avec le même code :
- **PWA autonome** (GitHub Pages + Supabase) : `index.html` complet, `sw.js` hors ligne, `manifest.webmanifest`, `backend.js` (REST Supabase), `config.js` (URL + clé anon).
- **Artifact claude.ai** : `./build_artifact.sh` génère `artifact.html` (fragment) à publier avec les capabilities db/assets/downloads.

## Mise en place PWA
1. Supabase → nouveau projet → SQL Editor → coller `supabase/schema.sql` → Run.
2. Authentication → Users → Add user (email + mot de passe, auto-confirm). Providers → Email → désactiver les inscriptions.
3. Project Settings → API : copier URL + clé `anon public` dans `config.js`.
4. Pousser sur GitHub, activer Pages (branche main, racine). Ouvrir l'URL dans Safari → Partager → Sur l'écran d'accueil.
5. Accès IA : connecteur Supabase dans claude.ai (lecture/écriture de la table `docs`) ou clé service_role dans une tâche planifiée.

## Fichiers
- `index.html` — page (CSS + squelette). Le runtime artifact ajoute doctype/head.
- `data.js` — bibliothèque d'exercices (`EX`), programme par défaut (`PROGRAM`), compléments (`SUPPLEMENTS`), structure nutrition (`NUTRITION`), champs de mensurations.
- `app.js` — logique : store local-first + sync `db`, séance exercice par exercice, timer, suivi, photos (`assets`), compléments, nutrition, bilans, export CSV/XLSX (`downloads`).
- `img/` — 2 positions par exercice, source free-exercise-db (Unlicense, domaine public).

## Base de données (capability `db`)
| Collection | Contenu |
|---|---|
| `program/current` | programme actif (`days[].exercises[]`, `machine`/`dumbbell`, `kg`/`lbs`, `sets`, `reps`, `rest`, `primary`) |
| `programVersions/vN` | copie de chaque version (+ `savedAt`, `reason`) |
| `sessions/<date>_<dayId>` | séance : `status`, `exercises[]` avec `variant`, `sets[]{kg,lbs,reps,done}`, `doneSets`, `difficulty`, `pain`, `note`, `skipped` |
| `measurements/<date>` | poids + tours (cm) + note |
| `photos/<date>` | `face`/`profil`/`dos` → `{id,url}` (assets) |
| `supplementLogs/<date>` | `taken{itemId:true}` (+ `posture0..4` pour la routine) |
| `nutritionLogs/<date>` | `meals{mealId:{eaten, foods[]}}` |
| `nutrition/plan`, `supplements/plan` | plans (importables en JSON) |
| `reviews/<id>` | bilan IA : `summary`, `changes[]{what,from,to,why}`, `programVersionFrom/To`, `seen` |
| `meta/guide` | ce schéma, écrit par l'app au premier lancement connecté |

## Boucle d'ajustement par l'IA
1. Lire `sessions`, `measurements` (read_db).
2. Écrire `programVersions/v(N+1)` puis `program/current` (version N+1).
3. Écrire `reviews/<date>` avec `seen:false` → pastille rouge dans l'app, page « Bilan & ajustements », retour arrière possible.
Règle : jamais d'augmentation de charge sur un exercice marqué `pain:true`.
