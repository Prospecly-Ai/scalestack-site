import { loadTools, loadUseCases, latestChecked, useCasesUpdated, shownDate } from '../lib/data';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfc822 = (iso: string) => new Date(iso + 'T12:00:00Z').toUTCString();

export function GET() {
  const site = 'https://scalestacktech.co';
  const tools = loadTools();
  const cases = loadUseCases();
  // Item date = the day we read the source (fetched_date), not the source's own date.
  const caseItems = cases.slice().sort((a, b) => b.fetched.localeCompare(a.fetched) || a.title.localeCompare(b.title)).map((u) => ({
    date: u.fetched,
    xml: `    <item>
      <title>${esc(u.title)}</title>
      <link>${site}/use-cases/${u.catSlug}/#uc-${u.id}</link>
      <guid isPermaLink="true">${site}/use-cases/${u.catSlug}/#uc-${u.id}</guid>
      <pubDate>${rfc822(u.fetched)}</pubDate>
      <category>${esc(u.category)}</category>
      <description>${esc(`${u.summary} Tools: ${u.tools.map((t) => t.name).join(', ')}. Reported by ${u.sourceName}, ${shownDate(u.sourceDate)}. Source: ${u.sourceUrl}`)}</description>
    </item>`,
  }));
  const toolItems = tools.slice().sort((a, b) => (b.date_added.localeCompare(a.date_added)) || a.tool_name.localeCompare(b.tool_name)).map((t) => ({
    date: t.date_added,
    xml: `    <item>
      <title>${esc(t.tool_name)}: Desk-researched record</title>
      <link>${site}/tools/${t.tool_id}/</link>
      <guid isPermaLink="true">${site}/tools/${t.tool_id}/</guid>
      <pubDate>${rfc822(t.date_added)}</pubDate>
      <category>AI video makers</category>
      <description>${esc(`${t.description}. Desk-researched, last checked ${t.last_checked}. Source: ${t.description_source_url}`)}</description>
    </item>`,
  }));
  const items = [...caseItems, ...toolItems].sort((a, b) => b.date.localeCompare(a.date)).map((i) => i.xml).join('\n');
  const last = [latestChecked(tools), useCasesUpdated(cases)].sort().slice(-1)[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ScaleStack Tech: real AI use cases and AI video maker records</title>
    <link>${site}/</link>
    <description>Real AI use cases for businesses, each summarised from a public source, plus Desk-researched AI video maker records.</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(last)}</lastBuildDate>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
