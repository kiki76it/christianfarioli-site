// src/lib/insights.ts
// Pure helpers for filtering, sorting, and querying insights.
// No I/O — safe to use in build, automation scripts, and the admin UI.

import { CATEGORY_LABELS, INSIGHT_CATEGORIES, type InsightCategory } from '../content.config';
import { paths, p } from './links';
import type { CollectionEntry } from 'astro:content';

export type InsightEntry = CollectionEntry<'insights'>;

/** A published entry with resolved frontmatter (data is already typed via Zod). */
export interface ResolvedInsight {
  id: string;
  slug: string;
  data: InsightEntry['data'];
  body: string;
}

/** Normalize a slug: lowercase, hyphenated, no leading/trailing hyphens. */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Get the public URL path for an insight. */
export function insightHref(entry: InsightEntry): string {
  return paths.insights(entry.id);
}

export function categoryHref(cat: InsightCategory): string {
  return paths.category(cat);
}

/**
 * Resolve a frontmatter image field. The schema accepts either a string path
 * (root-relative like "/images/foo.jpg" or absolute) or a future image() object.
 * We always return a platform-prefixed path string for use in <img src>.
 */
export function imageSrc(field: unknown): string {
  if (!field) return '';
  if (typeof field === 'string') {
    // Already absolute (http/https/data:) — leave as-is
    if (/^(https?:|data:)/.test(field)) return field;
    // Root-relative public asset — prefix with BASE
    return p(field);
  }
  // Astro image() object: { src, width, height, ... }
  const obj = field as { src?: string };
  if (obj?.src) {
    if (/^(https?:|data:)/.test(obj.src)) return obj.src;
    return p(obj.src);
  }
  return '';
}

/** Same for author avatars. */
export function avatarSrc(field: unknown): string {
  return imageSrc(field);
}

export function categoryLabel(cat: InsightCategory): string {
  return CATEGORY_LABELS[cat];
}

export function isCategory(value: string): value is InsightCategory {
  return (INSIGHT_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Returns true if the entry should be visible to the public.
 * A status of "published" is required; scheduled posts that are
 * still in the future are kept hidden until their scheduledFor date passes.
 */
export function isPubliclyVisible(
  entry: InsightEntry,
  now: Date = new Date(),
): boolean {
  const { status, scheduledFor, draft } = entry.data;
  if (draft) return false;
  if (status === 'published') return true;
  if (status === 'scheduled' && scheduledFor) {
    return scheduledFor.getTime() <= now.getTime();
  }
  return false;
}

/** Filter a list of entries to only those visible to the public. */
export function publicOnly(entries: InsightEntry[], now: Date = new Date()): InsightEntry[] {
  return entries.filter((e) => isPubliclyVisible(e, now));
}

/** Sort entries by publishedAt (or scheduledFor for scheduled) descending. */
export function sortByDateDesc(entries: InsightEntry[]): InsightEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = a.data.publishedAt?.getTime() ?? a.data.scheduledFor?.getTime() ?? 0;
    const bTime = b.data.publishedAt?.getTime() ?? b.data.scheduledFor?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/** Group entries by category (for category index pages). */
export function groupByCategory(entries: InsightEntry[]): Record<InsightCategory, InsightEntry[]> {
  const groups = Object.fromEntries(
    INSIGHT_CATEGORIES.map((c) => [c, [] as InsightEntry[]]),
  ) as Record<InsightCategory, InsightEntry[]>;

  for (const e of entries) {
    groups[e.data.category].push(e);
  }
  return groups;
}

/** Find related entries by slug. Drops any that don't exist. */
export function resolveRelated(
  entries: InsightEntry[],
  refs: { slug: string; title?: string }[] | undefined,
): InsightEntry[] {
  if (!refs?.length) return [];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out: InsightEntry[] = [];
  for (const r of refs) {
    const found = byId.get(r.slug);
    if (found) out.push(found);
  }
  return out;
}

/** Estimate reading time in minutes from a body string (fallback when frontmatter is missing). */
export function estimateReadingTime(body: string, wordsPerMinute = 220): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
