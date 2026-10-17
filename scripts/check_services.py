#!/usr/bin/env python3
"""Run after `npm run build`. Fails if 'prospecly.ai' appears in src/, public/ or dist/,
or if the services page contains a price, 'free', 'guarantee' or a result word."""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
bad = []
for d in ('src', 'public', 'dist'):
    for f in (root / d).rglob('*'):
        if f.is_file():
            try: t = f.read_text(encoding='utf-8')
            except Exception: continue
            if 'prospecly.ai' in t.lower(): bad.append(f'prospecly.ai found in {f.relative_to(root)}')
BANNED = [r'\$', r'\bfree\b', r'guarantee\w*', r'\bresults?\b', r'revenue', r'\broi\b', r'\bsaved?\b', r'\bincreas\w*', r'%', r'\bprice\w*', r'\bpricing\b', r'\bleads? ', r'\bgrow\w*', r'<form']
for name in ('src/pages/services.astro', 'dist/services/index.html'):
    p = root / name
    if not p.exists(): bad.append(f'missing {name}'); continue
    t = p.read_text(encoding='utf-8')
    if name.startswith('dist'):
        m = re.search(r'<main.*?</main>', t, re.S); t = re.sub(r'<[^>]+>', ' ', m.group(0)) if m else t
    else:
        t = t.split('---', 2)[-1]
    for b in BANNED:
        if re.search(b, t, re.I): bad.append(f'{name}: banned pattern /{b}/ in services text')
print('services check:', 'FAILED' if bad else 'PASSED')
for b in bad: print(' ', b)
sys.exit(1 if bad else 0)
