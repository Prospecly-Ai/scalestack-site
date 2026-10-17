import { loadTools, loadUseCases } from '../lib/data';
export function GET() {
  const tools = loadTools().map((t) => ({ type: 'tool', id: t.tool_id, name: t.tool_name, summary: t.description, url: `/tools/${t.tool_id}/`, job: t.primary_job }));
  const cases = loadUseCases().map((u) => ({ type: 'use-case', id: u.id, name: u.title, summary: u.summary, url: `/use-cases/${u.catSlug}/#uc-${u.id}`, job: u.tools.map((t) => t.name).join(' ') + ' ' + u.category }));
  return new Response(JSON.stringify([...cases, ...tools]), { headers: { 'Content-Type': 'application/json' } });
}
