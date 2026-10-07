// src/content.config.ts
// Astro Content Collections schema for the Insights publishing platform.
// https://docs.astro.build/en/guides/content-collections/

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Shared taxonomy, including the native AI Pulse Insights category.
import { INSIGHT_CATEGORIES, CATEGORY_LABELS } from './lib/categories.mjs';
import { aiPulseErrors, isWebUrl } from './lib/ai-pulse.mjs';
export { INSIGHT_CATEGORIES, CATEGORY_LABELS };
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Status enum — the 4-state publishing workflow
// ---------------------------------------------------------------------------
export const INSIGHT_STATUSES = ['draft', 'review', 'scheduled', 'published'] as const;
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

// Allowed status transitions (forward-only, with one rollback to draft)
export const STATUS_TRANSITIONS: Record<InsightStatus, InsightStatus[]> = {
  draft: ['review'],
  review: ['draft', 'scheduled'], // editor can send back
  scheduled: ['draft', 'published'], // scheduler can pull back
  published: ['draft'], // pull back to revise
};

// ---------------------------------------------------------------------------
// FAQ schema (reused for executive-summary-style Q&A blocks)
// ---------------------------------------------------------------------------
const faqItem = z.object({
  question: z.string().min(5).max(200),
  answer: z.string().min(5),
});

// ---------------------------------------------------------------------------
// Related insights: references to other articles by slug
// ---------------------------------------------------------------------------
const relatedInsight = z.object({
  slug: z.string(),
  // Optional override for the headline — falls back to the article's title
  title: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Author profile (embedded for portability — could be its own collection later)
// ---------------------------------------------------------------------------
const author = z.object({
  name: z.string(),
  role: z.string().optional(),
  avatar: z.string().optional(), // path relative to /public
  bio: z.string().optional(),
  links: z
    .object({
      linkedin: z.string().url().optional(),
      twitter: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Insights collection — the main content type
// ---------------------------------------------------------------------------
const insights = defineCollection({
  // Use glob loader for file-system based MDX articles in src/content/insights/
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/insights' }),

  schema: () =>
    z.preprocess((input, ctx) => {
      for (const message of aiPulseErrors(input)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
      return input;
    }, z.object({
      // ----- Identity -----
      title: z.string().min(10).max(140),
      description: z.string().min(40).max(280), // meta description length
      seoTitle: z.string().min(10).max(140).optional(),
      excerpt: z.string().min(40).max(280).optional(),
      language: z.enum(['en', 'en-GB']).default('en'),
      slug: z.string().optional(), // optional override; defaults to filename

      // ----- Classification -----
      category: z.enum(INSIGHT_CATEGORIES),
      tags: z.array(z.string()).default([]),

      // ----- Authorship -----
      author: author,
      contributors: z.array(author).default([]), // for co-authored pieces
      sources: z.array(z.object({
        name: z.string().trim().min(1),
        title: z.string().trim().min(1).optional(),
        url: z.string().refine(isWebUrl, 'Source URL must use HTTP(S)'),
      })).default([]),
      schemaType: z.enum(['Article', 'BlogPosting', 'NewsArticle']).optional(),

      // ----- Media -----
      // String path: a URL or root-relative path (e.g. "/images/foo.jpg").
      // Kept as a string (not Astro's image()) so it works with SVGs, remote URLs,
      // and any future image source the automation agent produces.
      featuredImage: z.string().min(1),
      featuredImageAlt: z.string().min(5),

      // ----- Timing -----
      publishedAt: z.coerce.date().optional(), // required only when status=published
      sourceEditionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // original pack edition, never a publication timestamp
      updatedAt: z.coerce.date().optional(),
      readingTime: z.number().int().positive().optional(), // auto-computed if missing

      // ----- Workflow -----
      status: z.enum(INSIGHT_STATUSES).default('draft'),
      internalTest: z.boolean().default(false), // never eligible for public output
      scheduledFor: z.coerce.date().optional(), // required only when status=scheduled
      reviewedBy: z.string().optional(), // editor who approved for review
      reviewedAt: z.coerce.date().optional(),

      // ----- Content blocks (all optional, all string for max flexibility) -----
      executiveSummary: z.string().min(20).optional(),
      keyTakeaways: z.array(z.string()).default([]),
      faq: z.array(faqItem).default([]),
      related: z.array(relatedInsight).default([]),

      // ----- Discoverability -----
      draft: z.boolean().default(false), // hide from lists
      pinned: z.boolean().default(false), // show at top
      featured: z.boolean().default(false), // show in featured strip
    })),
});

// ---------------------------------------------------------------------------
// Categories collection — optional standalone category pages
// ---------------------------------------------------------------------------
const categories = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/categories' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero: z.string().optional(),
    order: z.number().int().default(100),
  }),
});

// ---------------------------------------------------------------------------
// Authors collection — for cross-referencing the same author across articles
// ---------------------------------------------------------------------------
const authors = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/authors' }),
  schema: z.object({
      name: z.string(),
      role: z.string().optional(),
      avatar: z.string().optional(),
      bio: z.string().optional(),
      links: z
        .object({
          linkedin: z.string().url().optional(),
          twitter: z.string().url().optional(),
          website: z.string().url().optional(),
        })
        .optional(),
    }),
});

export const collections = { insights, categories, authors };
