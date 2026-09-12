#!/bin/bash
# Génère artifact.html (fragment sans doctype/html/head/body) pour publication sur claude.ai
cd "$(dirname "$0")"
python3 - <<'PY'
import re
s=open('index.html').read()
s=re.sub(r'^<!doctype html>\s*<html[^>]*>\s*<head>\s*','',s,flags=re.I)
s=s.replace('</head>\n<body>\n','').replace('</body>\n</html>','')
s=s.replace('<link rel="manifest" href="manifest.webmanifest">\n','').replace('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n','').replace('<link rel="icon" href="icons/icon-192.png">\n','')
s=re.sub(r'<script>if \("serviceWorker".*?</script>\n','',s,flags=re.S)
open('artifact.html','w').write(s)
print("artifact.html ok")
PY
