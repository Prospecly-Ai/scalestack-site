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
  if (v === 'per_user_year') return 'per user per year';
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


// ---- Visible notes (computed from data where possible) ----
export const PRICE_NOTES: Record<string, string> = {
  synthesia: 'Open item: one earlier check reported a "Start Starter - $29/mo" button. The 2026-10-16 live check found no such button in either billing view (Starter shows $19 monthly, $14 per month billed yearly). Not confirmed either way.',
  kapwing: 'The pricing page prints no billing period next to the $16 shown in its default Annual view, only "1,000 credits / month" and the Annual toggle. The Monthly view shows $24 for the same plan and limit.',
};
const NUM_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
// Sentence for a tool with many unverified criteria, built from ranking.json (null when 3 or fewer).
export function unverifiedNote(rt: any): string | null {
  if (!rt) return null;
  const unv = rt.criteria.filter((c: any) => !c.checked);
  if (unv.length < 4) return null;
  const list = unv.map((c: any) => c.criterion.replace(/_/g, ' ')).join(', ');
  return `${NUM_WORDS[unv.length]} of ${rt.tool_name}'s ${NUM_WORDS[rt.criteria.length].toLowerCase()} criteria are unverified (${list}); its total is a floor, not a measured score.`;
}
export function priceViewNote(tool: Record<string, string>): string {
  const view = tool.starting_price_billing === 'annual' ? 'annual (yearly)' : 'monthly';
  const other = tool.starting_price_alt_billing === 'monthly' ? 'monthly' : tool.starting_price_alt_billing === 'annual' ? 'annual (yearly)' : '';
  return other
    ? `Recorded from the page's default view (${view}). The ${other} view's price is shown in the second price row.`
    : `Recorded from the page's default view (${view}); the plan has no other billing view.`;
}

// "New this week": added to our feed (fetched date) within 7 days of the latest fetch date.
export function isNewThisWeek(u: UseCase, updated: string): boolean {
  const cutoff = new Date(updated + 'T00:00:00Z').getTime() - 7 * 86400000;
  return new Date(u.fetched + 'T00:00:00Z').getTime() > cutoff;
}


// ---- Directory (home page): groups come from primary_job in tools.csv, nothing else ----
export const TOOL_GROUPS = [
  { id: 'text-to-video', name: 'Text-to-video', jobs: ['text-to-video'] },
  { id: 'general-editors', name: 'General video editors', jobs: ['general editor'] },
  { id: 'ai-presenters', name: 'AI presenters (avatar)', jobs: ['AI presenter (avatar)'] },
  { id: 'clipping', name: 'Video clipping', jobs: ['AI video clipping (long video to short clips)'] },
];
export const groupOf = (t: Record<string, string>) => TOOL_GROUPS.find((g) => g.jobs.includes(t.primary_job)) ?? TOOL_GROUPS[0];

export interface Release { toolId: string; title: string; date: string; sourceName: string; sourceUrl: string }
// Releases come only from src/data/releases.csv (tool_id,title,date,source_name,source_url). A row needs an https source and an ISO date.
export function loadReleases(): Release[] {
  let text = '';
  try { text = readFileSync(join(dir, 'releases.csv'), 'utf-8'); } catch { return []; }
  return parseCsv(text)
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '') && (r.source_url ?? '').startsWith('https://') && r.title && r.tool_id)
    .map((r) => ({ toolId: r.tool_id, title: r.title, date: r.date, sourceName: r.source_name, sourceUrl: r.source_url }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function releasesThisWeek(list: Release[], ref: string): Release[] {
  const cutoff = new Date(ref + 'T00:00:00Z').getTime() - 7 * 86400000;
  return list.filter((r) => { const d = new Date(r.date + 'T00:00:00Z').getTime(); return d > cutoff && d <= new Date(ref + 'T00:00:00Z').getTime(); });
}
