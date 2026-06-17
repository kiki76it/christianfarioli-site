// src/pages/rss.xml.js
// RSS feed for published insights. Excludes drafts/review/scheduled.

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { CATEGORY_LABELS } from '~/content.config';
import { publicOnly, sortByDateDesc } from '~/lib/insights';
import { absolute, paths } from '~/lib/links';

export async function GET(context) {
  const all = await getCollection('insights');
  const entries = sortByDateDesc(publicOnly(all));

  // context.site is the full site origin (PUBLIC_SITE_URL minus the sub-path,
  // since we set site = 'https://christianfarioli.com'). Item links must be
  // fully-qualified, so we compose origin + path.
  const origin = context.site?.toString() || 'https://christianfarioli.com';

  return rss({
    title: 'Prof. Christian Farioli — Insights',
    description: 'Authority insights on AI strategy, leadership, and the future of work.',
    site: context.site,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.publishedAt ?? e.data.scheduledFor ?? new Date(),
      link: absolute(paths.insights(e.id), origin),
      categories: [CATEGORY_LABELS[e.data.category], ...e.data.tags],
      author: e.data.author.name,
    })),
    customData: `<language>en-us</language>`,
  });
}
