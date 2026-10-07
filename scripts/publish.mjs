#!/usr/bin/env node
// File-only status transitions. Does not commit, publish remotely or deploy.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { assertTransition, INSIGHT_STATUSES } from '../src/lib/status.js';
import { assertAiPulse } from '../src/lib/ai-pulse.mjs';

/** Returns a validated copy, preserving publication and editorial-update dates. */
export function prepareTransition(data, content, to, flags = {}, now = new Date()) {
  assertTransition(data.status ?? 'draft', to);
  const next = { ...data, status: to };
  if (to === 'scheduled') {
    if (!flags['scheduled-for']) throw new Error('--to scheduled requires --scheduled-for');
    next.scheduledFor = flags['scheduled-for'];
  }
  if (to === 'published') {
    // Scheduled entries can already be public after a build at their due time.
    // Converting their status later must not manufacture a fresher publication.
    const alreadyDue = data.status === 'scheduled' && data.scheduledFor
      && new Date(data.scheduledFor).getTime() <= now.getTime();
    const existing = data.publishedAt ?? (alreadyDue ? data.scheduledFor : undefined);
    const requested = flags['published-at'];
    if (existing && requested && new Date(existing).getTime() !== new Date(requested).getTime()) {
      throw new Error('Publication time already exists; correct a factual date error explicitly in frontmatter, not through a status transition');
    }
    next.publishedAt = existing ?? requested ?? now.toISOString();
  }
  for (const field of ['publishedAt', 'scheduledFor']) {
    if (next[field] !== undefined && !Number.isFinite(new Date(next[field]).getTime())) throw new Error(`Invalid ${field}`);
  }
  // A status transition is not an editorial update. Never synthesize updatedAt.
  assertAiPulse(next, content, { now });
  return next;
}

function main() {
  const flags = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const match = /^--(slug|to|scheduled-for|published-at)(?:=(.*))?$/.exec(args[index]);
    if (!match) throw new Error(`Unknown argument: ${args[index]}`);
    const value = match[2] ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing --${match[1]} value`);
    flags[match[1]] = value;
  }
  if (!flags.slug || !INSIGHT_STATUSES.includes(flags.to)) throw new Error('Usage: publish.mjs --slug category/article[.md|.mdx] --to draft|review|scheduled|published');
  if (!/^[a-z0-9-]+\/[a-z0-9-]+(?:\.mdx?)?$/.test(flags.slug)) throw new Error('Slug must be category/article, with an optional .md or .mdx extension');
  const root = realpathSync(fileURLToPath(new URL('../src/content/insights/', import.meta.url)));
  const paths = /\.mdx?$/.test(flags.slug)
    ? [resolve(root, flags.slug)]
    : [resolve(root, `${flags.slug}.md`), resolve(root, `${flags.slug}.mdx`)];
  const matches = paths.filter(existsSync);
  if (matches.length !== 1) throw new Error('Article must resolve to exactly one existing .md or .mdx file');
  const filePath = realpathSync(matches[0]);
  if (!filePath.startsWith(root + sep)) throw new Error('Article path is outside the content directory');
  const parsed = matter(readFileSync(filePath, 'utf8'));
  const next = prepareTransition(parsed.data, parsed.content, flags.to, flags);
  writeFileSync(filePath, matter.stringify(parsed.content, next), 'utf8');
  console.log(`  ${relative(process.cwd(), filePath)}: ${parsed.data.status ?? 'draft'} -> ${flags.to}`);
  console.log('  File updated only. Run validation and review before a separate deployment.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
