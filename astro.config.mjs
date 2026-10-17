import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Ranking pages (/rankings/) stay out of the sitemap until every score is checked (see scripts/score.py).
const ranking = JSON.parse(readFileSync(new URL('./src/data/ranking.json', import.meta.url), 'utf-8'));

export default defineConfig({
  site: 'https://scalestacktech.co',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Old ranking addresses keep working. Pages are redirect stubs and stay out of the sitemap.
  redirects: {
    '/best/': '/rankings/',
    '/best/ai-video-makers/': '/rankings/ai-video-makers/',
  },
  integrations: [
    sitemap({
      customPages: ['https://scalestacktech.co/rss.xml'],
      filter: (page) => {
        if (page.includes('/best/')) return false;
        if (page.includes('/rankings/')) return ranking.complete === true;
        return true;
      },
    }),
  ],
});
