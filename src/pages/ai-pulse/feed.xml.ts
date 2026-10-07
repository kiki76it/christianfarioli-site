import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { AI_PULSE_INTRO, aiPulseEntries } from '~/lib/ai-pulse-archive';
import { absolute, paths } from '~/lib/links';

export const GET: APIRoute = async () => {
  const entries = aiPulseEntries(await getCollection('insights'));
  return rss({
    title: 'AI Pulse | Prof. Christian Farioli',
    description: AI_PULSE_INTRO,
    site: absolute(paths.category('ai-pulse')),
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
    },
    items: entries.map((entry) => {
      const pubDate = entry.data.publishedAt ?? entry.data.scheduledFor;
      if (!pubDate) throw new Error(`AI Pulse article ${entry.id} is missing its publication date.`);
      return {
        title: entry.data.title,
        description: entry.data.excerpt ?? entry.data.description,
        pubDate,
        link: absolute(paths.insights(entry.id)),
        categories: ['AI Pulse', ...entry.data.tags],
        customData: '<dc:creator>Prof. Christian Farioli</dc:creator>',
      };
    }),
    customData: `<language>en-GB</language><atom:link href="${absolute(paths.aiPulseFeed())}" rel="self" type="application/rss+xml" />`,
  });
};
