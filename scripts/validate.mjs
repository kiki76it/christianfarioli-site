#!/usr/bin/env node
// scripts/validate.mjs
// Validate every MDX article in src/content/insights against the schema.
// This is the entry point for the future publish pipeline — run it before
// committing new articles. Exit code 0 = clean, 1 = violations.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = fileURLToPath(new URL('../src/content/insights/', import.meta.url));
const errors = [];
const warnings = [];
let total = 0;
let drafts = 0;
let review = 0;
let scheduled = 0;
let published = 0;

const REQUIRED = ['title', 'description', 'category', 'author', 'featuredImage', 'featuredImageAlt', 'status'];
const VALID_CATEGORIES = ['ai-strategy', 'human-centered-ai', 'ai-leadership', 'aiso', 'ai-marketing', 'executive-education', 'future-of-work'];
const VALID_STATUSES = ['draft', 'review', 'scheduled', 'published'];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (['.md', '.mdx'].includes(extname(name))) {
      validateFile(full);
    }
  }
}

function validateFile(path) {
  total++;
  const rel = relative(process.cwd(), path);
  const raw = readFileSync(path, 'utf8');
  const { data } = matter(raw);

  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      errors.push(`${rel}: missing required field "${key}"`);
    }
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    errors.push(`${rel}: invalid category "${data.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`${rel}: invalid status "${data.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (data.status === 'published' && !data.publishedAt) {
    errors.push(`${rel}: status="published" requires publishedAt`);
  }
  if (data.status === 'scheduled' && !data.scheduledFor) {
    errors.push(`${rel}: status="scheduled" requires scheduledFor`);
  }

  if (typeof data.title === 'string' && (data.title.length < 10 || data.title.length > 140)) {
    errors.push(`${rel}: title length ${data.title.length} not in [10, 140]`);
  }
  if (typeof data.description === 'string' && (data.description.length < 40 || data.description.length > 280)) {
    errors.push(`${rel}: description length ${data.description.length} not in [40, 280]`);
  }

  // Warn-only checks
  if (data.status === 'published' && (!data.executiveSummary || data.executiveSummary.length < 20)) {
    warnings.push(`${rel}: published articles should have an executiveSummary of 20+ chars`);
  }
  if (data.status === 'published' && Array.isArray(data.faq) && data.faq.length === 0) {
    warnings.push(`${rel}: published articles should have a FAQ section (helps SEO/AEO)`);
  }
  if (data.status === 'published' && Array.isArray(data.tags) && data.tags.length === 0) {
    warnings.push(`${rel}: published articles should have at least one tag`);
  }

  if (data.status === 'draft') drafts++;
  else if (data.status === 'review') review++;
  else if (data.status === 'scheduled') scheduled++;
  else if (data.status === 'published') published++;
}

console.log('\n  Validating insights content...\n');
walk(ROOT);

console.log(`  Total files: ${total}`);
console.log(`    · draft:     ${drafts}`);
console.log(`    · review:    ${review}`);
console.log(`    · scheduled: ${scheduled}`);
console.log(`    · published: ${published}`);

if (warnings.length) {
  console.log(`\n  Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`    ⚠ ${w}`);
}

if (errors.length) {
  console.log(`\n  Errors (${errors.length}):`);
  for (const e of errors) console.log(`    ✗ ${e}`);
  console.log(`\n  Validation FAILED.\n`);
  process.exit(1);
}

console.log(`\n  Validation passed.\n`);
