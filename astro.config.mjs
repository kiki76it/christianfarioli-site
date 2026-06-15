// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://christianfarioli.com',
  // The platform is served from a sub-path on the main site:
  //   https://christianfarioli.com/insights/
  // Set BASE_URL via env so a future move to a subdomain only requires an env change.
  base: process.env.PUBLIC_BASE_PATH || '/insights',
  output: 'static',
  integrations: [
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug],
      // Allow components used in MDX to be auto-imported from src/components
      optimize: true,
    }),
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('/api/'),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  vite: {
    build: {
      cssCodeSplit: true,
    },
  },
  build: {
    // Allow up to 500 articles to be pre-rendered statically
    inlineStylesheets: 'auto',
  },
  // Server-side: enable /api routes when in hybrid mode (future)
  // output: 'hybrid' can be enabled when automation needs server endpoints
});
