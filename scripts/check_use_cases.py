#!/usr/bin/env python3
"""Validate src/data/use_cases.csv. Exit 1 on any failure. Run: python3 scripts/check_use_cases.py"""
import csv, re, sys, collections, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / 'src/data/use_cases.csv', newline='', encoding='utf-8')))
tool_ids = {r['tool_id'] for r in csv.DictReader(open(root / 'src/data/tools.csv', newline='', encoding='utf-8'))}
CATS = ['Sales & Lead Follow-up', 'Marketing & Video', 'Operations & Admin', 'Customer Support', 'CRM & GHL Snapshots']
BANNED = [r'streamline\w*', r'unleash\w*', r'game-changer', r'revolutioni[sz]\w*', r'leverag(?:e|es|ed|ing)', r'cutting-edge', r'seamless\w*', r'synergy', r'supercharg\w*', r'elevat(?:e|es|ed|ing)', r'unlock\w*', r'dive in', r'delve\w*', r"in today's fast-paced world", r'take it to the next level']
RESULT = [r'%', r'\$', r'revenue', r'\broi\b', r'\bsaved\b', r'\bincreas\w*']
errors, flags = [], []
if len(rows) < 30: errors.append(f'only {len(rows)} rows (need 30+)')
counts = collections.Counter(r['category'] for r in rows)
for c in CATS:
    if counts[c] < 5: errors.append(f'category "{c}" has {counts[c]} rows (need 5+)')
for c in counts:
    if c not in CATS: errors.append(f'unknown category "{c}"')
seen = set(); ids = set()
for r in rows:
    i = r['id']
    if i in ids: errors.append(f'{i}: duplicate id')
    ids.add(i)
    u = r['source_url'].strip()
    if not u.startswith('https://'): errors.append(f'{i}: source_url missing or not https')
    if u in seen: errors.append(f'{i}: duplicate url {u}')
    seen.add(u)
    if 'agentusecases.ai' in u.lower(): errors.append(f'{i}: source on agentusecases.ai')
    if re.search(r'[?&](utm_|ref=|aff|tag=)', u): errors.append(f'{i}: tracking/affiliate parameter in url')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', r['fetched_date'].strip()): errors.append(f'{i}: fetched_date missing/bad')
    if not (re.fullmatch(r'\d{4}-\d{2}-\d{2}', r['source_date'].strip()) or r['source_date'].strip() == 'no date shown'): errors.append(f'{i}: source_date must be YYYY-MM-DD or "no date shown"')
    if r['own_words_check'].strip() != 'yes': errors.append(f'{i}: own_words_check not yes')
    if not r['source_name'].strip(): errors.append(f'{i}: source_name missing')
    for t in filter(None, (x.strip() for x in r['tools_with_pages'].split(';'))):
        if t not in tool_ids: errors.append(f'{i}: tools_with_pages id "{t}" has no tool page')
    text = f"{r['title']} {r['summary']}"
    for b in BANNED:
        if re.search(r'\b' + b + r'\b', text, re.I): errors.append(f'{i}: banned word /{b}/')
    for b in RESULT:
        if re.search(b, text, re.I): flags.append(f'{i}: result-claim pattern /{b}/ in title/summary (review)')
    if re.search(r'[.!?]\s+\S', r['summary'].strip()): errors.append(f'{i}: summary is not one sentence')
    if not r['summary'].strip().endswith('.'): errors.append(f'{i}: summary should end with a full stop')
    if '\n' in r['title'] or len(r['title']) > 110: errors.append(f'{i}: title must be one line, 110 characters or fewer')
print(f'rows: {len(rows)}')
for c in CATS: print(f'  {c}: {counts[c]}')
for f in flags: print('FLAG', f)
for e in errors: print('ERROR', e)
if errors: print(f'FAILED: {len(errors)} error(s), {len(flags)} flag(s)'); sys.exit(1)
print(f'PASSED: 0 errors, {len(flags)} flag(s) for review')
