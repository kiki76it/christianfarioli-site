#!/usr/bin/env node
// Untrusted payloads produce inert Markdown drafts; this script never deploys.
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { AI_PULSE_AUTHOR, assertAiPulse, isWebUrl } from '../src/lib/ai-pulse.mjs';

const KEYS = new Set(['title', 'slug', 'category', 'excerpt', 'content', 'featured_image', 'featured_image_alt', 'sources', 'meta_title', 'meta_description', 'date_published', 'author', 'schema_type', 'internal_links', 'internal_test']);

function bounded(value, key, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new Error(`${key} must be a string of ${min}-${max} characters`);
  return value.trim();
}

export function prepareAiPulseDraft(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Payload must be a JSON object');
  for (const key of Object.keys(payload)) if (!KEYS.has(key)) throw new Error(`Unsupported payload field: ${key}`);
  if (payload.category !== 'ai-pulse' || payload.author !== AI_PULSE_AUTHOR || payload.schema_type !== 'NewsArticle') throw new Error('Expected category ai-pulse, author Prof. Christian Farioli and schema_type NewsArticle');
  if (typeof payload.slug !== 'string' || payload.slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) throw new Error('slug must be one lowercase hyphenated path segment (maximum 100 characters)');
  const content = bounded(payload.content, 'content', 80, 100000);
  // Markdown only: reject raw HTML and executable URL schemes instead of
  // silently modifying the author's submitted body.
  const decoded = content.replace(/&#(?:x([\da-f]+)|(\d+));?/gi, (_, hex, dec) => String.fromCodePoint(Math.min(0x10ffff, parseInt(hex ?? dec, hex ? 16 : 10))))
    .replace(/&colon;/gi, ':').replace(/&(tab|newline);/gi, '').replace(/\\([\W_])/g, '$1');
  const protocolText = decoded.replace(/[\s\u0000-\u001f\u007f-\u009f]/g, '');
  if (/<|^\s*(?:import|export)\s/m.test(content) || /(?:javascript|vbscript|data|file):/i.test(protocolText)) throw new Error('content must use plain Markdown without raw HTML, imports, exports or executable URL schemes');
  const image = bounded(payload.featured_image, 'featured_image', 1, 2048);
  if (!(image.startsWith('/') && !image.startsWith('//') && !image.includes('\\') && !image.split('/').includes('..')) && !(isWebUrl(image) && image.startsWith('https://'))) throw new Error('featured_image must be a root-relative asset path or HTTPS URL');
  if (payload.internal_test !== undefined && typeof payload.internal_test !== 'boolean') throw new Error('internal_test must be boolean');
  const related = payload.internal_links ?? [];
  if (!Array.isArray(related) || related.some((link) => !link || typeof link.slug !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(link.slug) || (link.title !== undefined && typeof link.title !== 'string'))) throw new Error('internal_links must contain {slug: "category/article", title?: "..."} objects');
  const data = {
    title: bounded(payload.title, 'title', 10, 140),
    description: bounded(payload.meta_description, 'meta_description', 40, 280),
    seoTitle: bounded(payload.meta_title, 'meta_title', 10, 140),
    excerpt: bounded(payload.excerpt, 'excerpt', 40, 280),
    language: 'en-GB', category: 'ai-pulse',
    author: { name: AI_PULSE_AUTHOR, avatar: '/images/authors/christian-farioli.jpg' },
    featuredImage: image,
    featuredImageAlt: bounded(payload.featured_image_alt, 'featured_image_alt', 5, 500),
    status: 'draft', schemaType: 'NewsArticle',
    sources: payload.sources,
    related,
    ...(payload.internal_test ? { internalTest: true } : {}),
    ...(payload.date_published !== undefined ? { publishedAt: payload.date_published } : {}),
  };
  assertAiPulse(data, content);
  return { slug: payload.slug, data, content, markdown: matter.stringify(`\n${content}\n`, data) };
}

/** root is injectable for isolated tests; CLI fixes it to the Insights directory. */
export function writeAiPulseDraft(payload, root) {
  const draft = prepareAiPulseDraft(payload);
  const contentRoot = realpathSync(root);
  const directory = resolve(contentRoot, 'ai-pulse');
  if (existsSync(directory) && lstatSync(directory).isSymbolicLink()) throw new Error('AI Pulse directory must not be a symlink');
  mkdirSync(directory, { recursive: true });
  if (realpathSync(directory) !== directory || !directory.startsWith(contentRoot + sep)) throw new Error('AI Pulse directory escaped the content root');
  const path = resolve(directory, `${draft.slug}.md`);
  if (existsSync(path) || existsSync(resolve(directory, `${draft.slug}.mdx`))) throw new Error('Article already exists; intake never overwrites content');
  writeFileSync(path, draft.markdown, { encoding: 'utf8', flag: 'wx' });
  return path;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--file') throw new Error('Usage: node scripts/intake-ai-pulse.mjs --file article.json');
  const raw = readFileSync(resolve(args[1]), 'utf8');
  if (Buffer.byteLength(raw, 'utf8') > 250000) throw new Error('Payload exceeds 250 KB');
  const payload = JSON.parse(raw);
  const root = fileURLToPath(new URL('../src/content/insights/', import.meta.url));
  const path = writeAiPulseDraft(payload, root);
  console.log(`Created draft: ${path}\nNo commit, external API call or deployment was performed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
