// Checks every internal link in dist/*.html resolves to a built file, and that every
// external link carries rel="nofollow noopener" (except mailto:).
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(dist).filter((f) => f.endsWith('.html'));
let internal = 0, external = 0, bad = [];
for (const p of pages) {
  const html = readFileSync(p, 'utf-8');
  for (const m of html.matchAll(/<a\b([^>]*)>/g)) {
    const attrs = m[1];
    const href = (attrs.match(/href="([^"]*)"/) || [])[1];
    if (href === undefined) continue;
    if (href.startsWith('mailto:')) continue;
    if (/^https?:\/\//.test(href)) {
      external++;
      const rel = (attrs.match(/rel="([^"]*)"/) || [])[1] || '';
      if (!(rel.includes('nofollow') && rel.includes('noopener'))) bad.push(`${p}: external link without nofollow noopener: ${href}`);
      continue;
    }
    internal++;
    const path = href.split('#')[0].split('?')[0];
    if (!path) continue;
    const target = join(dist, path.endsWith('/') ? path + 'index.html' : path);
    if (!existsSync(target)) bad.push(`${p}: broken internal link ${href}`);
  }
}
for (const f of ['robots.txt', 'llms.txt', 'rss.xml', 'search.json', 'search.js', 'theme.js', 'sitemap-index.xml', 'sitemap-0.xml', '404.html', 'favicon.svg']) {
  if (!existsSync(join(dist, f))) bad.push(`missing dist/${f}`);
}
console.log(`pages: ${pages.length}, internal links: ${internal}, external links: ${external}`);
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
console.log('link check passed');
