import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'src', 'data');

// Small CSV parser (handles quoted cells, doubled quotes and newlines inside quotes).
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = rows[0];
  return rows.slice(1).filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

export type Row = Record<string, string>;

export function loadTools(): Row[] {
  return parseCsv(readFileSync(join(dir, 'tools.csv'), 'utf-8'));
}
export function loadEvidence(): Row[] {
  return parseCsv(readFileSync(join(dir, 'evidence.csv'), 'utf-8'));
}
export function loadRanking(): any {
  return JSON.parse(readFileSync(join(dir, 'ranking.json'), 'utf-8'));
}
export function loadRubric(): any {
  return JSON.parse(readFileSync(join(dir, 'rubric.json'), 'utf-8'));
}

export const isTrue = (v: string | undefined) => (v ?? '').trim().toLowerCase() === 'true';

export function show(v: string): string {
  if (v === 'UNVERIFIED') return 'UNVERIFIED';
  if (v === 'NOT_OFFERED') return 'Not offered';
  if (v === 'yes') return 'Yes';
  if (v === 'no') return 'No';
  if (v === 'trial_only') return 'Trial only (no free plan published)';
  if (v === 'per_user_month') return 'per user per month';
  if (v === 'flat_month') return 'flat price per month';
  if (v === 'monthly') return 'billed monthly';
  if (v === 'annual') return 'billed annually';
  return v;
}

export function money(v: string): string {
  return /^\d+(\.\d+)?$/.test(v) ? `$${v}` : show(v);
}

export function loadCategories(): any[] {
  return JSON.parse(readFileSync(join(dir, 'categories.json'), 'utf-8'));
}

// Latest last_checked date across all tool records (ISO strings sort correctly).
export function latestChecked(tools: Row[]): string {
  return tools.map((t) => t.last_checked).sort().slice(-1)[0];
}

export function addedWithinDays(tools: Row[], days: number): Row[] {
  const ref = new Date(latestChecked(tools) + 'T00:00:00Z').getTime();
  return tools.filter((t) => {
    const d = new Date(t.date_added + 'T00:00:00Z').getTime();
    return ref - d >= 0 && ref - d < days * 86400000;
  });
}

export function prettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Card view-model for one tool. Score comes from ranking.json (built from scores.csv); never invented.
export function cardFor(tool: Row, ranking: any) {
  const r = ranking.tools.find((x: any) => x.tool_id === tool.tool_id);
  const complete = r && r.checked_count === r.criteria_count;
  return {
    id: tool.tool_id,
    name: tool.tool_name,
    summary: tool.description,
    scoreText: complete ? `${r.total_display} / 100` : 'Score pending',
    checked: r ? `${r.checked_count} of ${r.criteria_count} criteria checked` : '',
    sourceUrl: tool.description_source_url,
    sourceDate: tool.description_retrieved_date,
    lastChecked: tool.last_checked,
    status: tool.test_status,
    added: tool.date_added,
  };
}


// ---- Use cases ----
export const USE_CASE_CATEGORIES = [
  { slug: 'sales-lead-follow-up', name: 'Sales & Lead Follow-up' },
  { slug: 'marketing-video', name: 'Marketing & Video' },
  { slug: 'operations-admin', name: 'Operations & Admin' },
  { slug: 'customer-support', name: 'Customer Support' },
  { slug: 'crm-ghl-snapshots', name: 'CRM & GHL Snapshots' },
];
export const catSlug = (name: string) => USE_CASE_CATEGORIES.find((c) => c.name === name)?.slug ?? 'other';

export interface UseCase {
  id: string; title: string; summary: string; category: string; catSlug: string;
  tools: { name: string; toolId: string | null }[];
  sourceName: string; sourceUrl: string; sourceDate: string; fetched: string; notes: string;
}

export function loadUseCases(): UseCase[] {
  const tools = loadTools();
  const nameById = new Map(tools.map((t) => [t.tool_id, t.tool_name]));
  const list = parseCsv(readFileSync(join(dir, 'use_cases.csv'), 'utf-8')).map((r) => {
    const pages = r.tools_with_pages.split(';').map((x) => x.trim()).filter(Boolean);
    const linkable = new Map(pages.map((id) => [(nameById.get(id) ?? '').toLowerCase(), id]));
    return {
      id: r.id, title: r.title, summary: r.summary, category: r.category, catSlug: catSlug(r.category),
      tools: r.tools.split(';').map((x) => x.trim()).filter(Boolean).map((name) => ({ name, toolId: linkable.get(name.toLowerCase()) ?? null })),
      sourceName: r.source_name, sourceUrl: r.source_url, sourceDate: r.source_date, fetched: r.fetched_date, notes: r.notes,
    };
  });
  // Newest source date first. "no date shown" sorts last. Ties: title.
  const key = (u: UseCase) => (/^\d{4}-/.test(u.sourceDate) ? u.sourceDate : '');
  return list.sort((a, b) => key(b).localeCompare(key(a)) || a.title.localeCompare(b.title));
}

export function useCasesUpdated(list: UseCase[]): string {
  return list.map((u) => u.fetched).sort().slice(-1)[0];
}
export const shownDate = (d: string) => (/^\d{4}-/.test(d) ? prettyDate(d) : 'no date shown');
