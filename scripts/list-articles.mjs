#!/usr/bin/env node
// scripts/list-articles.mjs
// Dump a JSON manifest of every article + its current status. Used by:
//   - The automation agent to figure out what's pending
//   - The publish-queue builder
//   - External schedulers / CI

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = fileURLToPath(new URL('../src/content/insights/', import.meta.url));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (['.md', '.mdx'].includes(extname(name))) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const records = files.map((p) => {
  const rel = relative(process.cwd(), p);
  const { data } = matter(readFileSync(p, 'utf8'));
  return {
    file: rel,
    slug: p.replace(ROOT, '').replace(/\.mdx?$/, ''),
    title: data.title,
    category: data.category,
    tags: data.tags || [],
    status: data.status || 'draft',
    publishedAt: data.publishedAt || null,
    scheduledFor: data.scheduledFor || null,
    updatedAt: data.updatedAt || null,
    author: data.author?.name || null,
  };
});

// Output as JSON to stdout; if --group, group by status
const group = process.argv.includes('--group');
if (group) {
  const byStatus = {};
  for (const r of records) {
    (byStatus[r.status] = byStatus[r.status] || []).push(r);
  }
  console.log(JSON.stringify(byStatus, null, 2));
} else {
  console.log(JSON.stringify(records, null, 2));
}
