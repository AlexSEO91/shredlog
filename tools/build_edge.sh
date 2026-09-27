#!/bin/bash
# Assemble supabase/deploy/shredlog-notify.ts : un seul fichier à coller dans le dashboard Supabase
# (Edge Functions → shredlog-notify → Code). Embarque data.js + stock.js + notify.js tels quels,
# pour que les notifications calculent exactement comme l'app.
cd "$(dirname "$0")/.."
python3 - <<'PY'
src = open('supabase/functions/shredlog-notify/index.ts').read()
parts = []
for f in ['data.js', 'stock.js', 'supabase/functions/shredlog-notify/notify.js']:
    parts.append(f'// ─── {f} (copie générée, ne pas modifier ici) ───\n' + open(f).read())
marker = '// @@EMBED@@'
assert src.count(marker) == 1
open('supabase/deploy/shredlog-notify.ts', 'w').write(src.replace(marker, '\n'.join(parts)))
print('supabase/deploy/shredlog-notify.ts ok')
PY
