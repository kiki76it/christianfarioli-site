#!/usr/bin/env node
// scripts/new-article.mjs
// Scaffold a new insight article. The future AI agent will call this from its
// publishing tool: it passes --title, --category, --author, --tags, etc.,
// the script generates a valid MDX file with sensible defaults, and the agent
// then fills in the body content.
//
// Usage:
//   node scripts/new-article.mjs --title "Why AI Strategy Beats AI Tools" \
//                                 --category ai-strategy \
//                                 --author-name "Prof. Christian Farioli" \
//                                 --tags "strategy,leadership,governance"
//
// Or with positional slug:
//   node scripts/new-article.mjs ai-strategy/why-ai-strategy-beats-tools

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const eq = a.indexOf('=');
    if (eq !== -1) {
      flags[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      const key = a.slice(2);
      // If the next arg exists and doesn't look like a flag, treat it as the value
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    }
  } else {
    positional.push(a);
  }
}

const CONTENT_DIR = fileURLToPath(new URL('../src/content/insights/', import.meta.url));

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

let slug = positional[0] || flags.slug;
if (!slug && flags.title) slug = slugify(flags.title);
if (!slug) {
  console.error('  Provide a slug (positional) or --title');
  process.exit(1);
}
slug = slugify(slug);

const VALID_CATEGORIES = ['ai-strategy', 'human-centered-ai', 'ai-leadership', 'aiso', 'ai-marketing', 'executive-education', 'future-of-work'];
let subdir = '';
let filename;
if (slug.includes('/')) {
  const parts = slug.split('/').filter(Boolean);
  filename = parts[parts.length - 1] + '.mdx';
  subdir = parts.slice(0, -1).join('/') + '/';
} else {
  const cat = flags.category || 'ai-strategy';
  if (!VALID_CATEGORIES.includes(cat)) {
    console.error(`  Invalid category: ${cat}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }
  subdir = cat + '/';
  filename = slug + '.mdx';
}
const fullPath = join(CONTENT_DIR, subdir, filename);

if (existsSync(fullPath)) {
  console.error(`  File already exists: ${fullPath}`);
  process.exit(1);
}

const title = flags.title || filename.replace(/\.mdx$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const category = subdir.replace(/\/$/, '') || (flags.category || 'ai-strategy');
const authorName = flags['author-name'] || 'Prof. Christian Farioli';
const authorRole = flags['author-role'] || 'AI Strategist, Educator & Advisor';
const tags = (flags.tags || '').split(',').map((s) => s.trim()).filter(Boolean);

const today = new Date().toISOString().slice(0, 10);

const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${(flags.description || `${title} — a practical breakdown by ${authorName}.`).replace(/"/g, '\\"')}"
category: "${category}"
tags:
${tags.map((t) => `  - ${t}`).join('\n') || '  []'}
author:
  name: "${authorName}"
  role: "${authorRole}"
  avatar: "/images/authors/christian-farioli.svg"
featuredImage: "${flags['featured-image'] || '/images/articles/placeholder-hero.jpg'}"
featuredImageAlt: "${flags['featured-image-alt'] || 'Hero image'}"
status: "${flags.status || 'draft'}"
${flags.status === 'scheduled' ? `scheduledFor: ${flags['scheduled-for'] || today}` : ''}
${flags.status === 'published' ? `publishedAt: ${flags['published-at'] || today}` : ''}
readingTime: 0
keyTakeaways: []
faq: []
related: []
---

# ${title}

> TODO: Write the executive summary here (2-3 sentences for the public listing).

## Introduction

Body content goes here.

## Key Points

- Point 1
- Point 2
- Point 3

## Conclusion

Wrap up.
`;

mkdirSync(dirname(fullPath), { recursive: true });
writeFileSync(fullPath, frontmatter);

console.log(`  ✓ Created: ${fullPath.replace(process.cwd() + '/', '')}`);
console.log(`    Status: ${flags.status || 'draft'}`);
console.log(`    Category: ${category}`);
console.log(`    Slug: ${filename.replace(/\.mdx$/, '')}`);
