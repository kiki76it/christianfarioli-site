// src/pages/sitemap.xml.ts
// Single site-wide sitemap. Regenerated on every build, so new insights /
// content are picked up automatically (getCollection reads the content dir).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { publicOnly, sortByDateDesc } from '~/lib/insights';
import { INSIGHT_CATEGORIES } from '~/content.config';

const ORIGIN = 'https://christianfarioli.com';

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const all = await getCollection('insights');
  const published = sortByDateDesc(publicOnly(all));

  type U = { loc: string; lastmod?: string; priority?: string; changefreq?: string };
  const urls: U[] = [];

  // --- Main site (static pages) ---
  urls.push({ loc: `${ORIGIN}/`, priority: '1.0', changefreq: 'weekly', lastmod: today });
  urls.push({ loc: `${ORIGIN}/testimonials.html`, priority: '0.8', changefreq: 'monthly' });
  urls.push({ loc: `${ORIGIN}/past-events.html`, priority: '0.7', changefreq: 'monthly' });
  urls.push({ loc: `${ORIGIN}/clients.html`, priority: '0.7', changefreq: 'monthly' });

  // --- Insights hub + categories ---
  urls.push({ loc: `${ORIGIN}/insights/`, priority: '0.9', changefreq: 'daily', lastmod: today });
  for (const c of INSIGHT_CATEGORIES) {
    urls.push({ loc: `${ORIGIN}/insights/category/${c}/`, priority: '0.6', changefreq: 'weekly' });
  }

  // --- Every published article (auto-updates as content is added) ---
  for (const e of published) {
    const d = e.data.updatedAt ?? e.data.publishedAt;
    urls.push({
      loc: `${ORIGIN}/insights/${e.id}/`,
      lastmod: d ? d.toISOString().slice(0, 10) : undefined,
      priority: '0.7',
      changefreq: 'monthly',
    });
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u.loc}</loc>` +
          (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
          (u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : '') +
          (u.priority ? `<priority>${u.priority}</priority>` : '') +
          `</url>`,
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
