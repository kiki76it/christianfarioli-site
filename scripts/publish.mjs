#!/usr/bin/env node
// scripts/publish.mjs
// Transition an article's status. Used by the future AI agent when it has
// generated content and is ready to move it through the workflow:
//   draft → review → scheduled → published
//
// In the static build, this script just edits the file's frontmatter and
// (optionally) commits + triggers a deploy.
//
// Usage:
//   node scripts/publish.mjs --slug ai-strategy/why-ai-strategy-beats-tools \
//                            --to scheduled \
//                            --scheduled-for 2025-12-15
//   node scripts/publish.mjs --slug ai-strategy/... --to published

import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { canTransition, assertTransition, INSIGHT_STATUSES } from '../src/lib/status.js';

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const eq = a.indexOf('=');
    if (eq !== -1) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  }
}

if (!flags.slug || !flags.to) {
  console.error('  Usage: publish.mjs --slug <path> --to <draft|review|scheduled|published> [--scheduled-for YYYY-MM-DD] [--published-at YYYY-MM-DD]');
  process.exit(1);
}

if (!INSIGHT_STATUSES.includes(flags.to)) {
  console.error(`  Invalid --to: ${flags.to}. Must be one of: ${INSIGHT_STATUSES.join(', ')}`);
  process.exit(1);
}

const to = flags.to;
const filePath = join('src/content/insights', flags.slug.endsWith('.mdx') ? flags.slug : `${flags.slug}.mdx`);

let raw, parsed;
try {
  raw = readFileSync(filePath, 'utf8');
  parsed = matter(raw);
} catch (e) {
  console.error(`  Could not read ${filePath}`);
  process.exit(1);
}

const from = parsed.data.status ?? 'draft';
try {
  assertTransition(from, to);
} catch (e) {
  console.error(`  ${e.message}`);
  process.exit(1);
}

// Patch the fields
parsed.data.status = to;
if (to === 'scheduled') {
  if (!flags['scheduled-for']) {
    console.error('  --to scheduled requires --scheduled-for YYYY-MM-DD');
    process.exit(1);
  }
  parsed.data.scheduledFor = new Date(flags['scheduled-for']);
}
if (to === 'published') {
  parsed.data.publishedAt = flags['published-at']
    ? new Date(flags['published-at'])
    : new Date();
}
parsed.data.updatedAt = new Date();

const out = matter.stringify(parsed.content, parsed.data);
writeFileSync(filePath, out);

console.log(`  ✓ ${relative(process.cwd(), filePath)}: ${from} → ${to}`);
console.log(`    (this only updated the file; commit and deploy separately)`);
