#!/usr/bin/env node
// Integration checks for the buying guide in the complete post-build site.
// Usage: node scripts/check-speaker-guide.mjs [--root path/to/built/site]
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { parse } from 'parse5';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) {
  console.error('Usage: node scripts/check-speaker-guide.mjs [--root path/to/built/site]');
  process.exit(2);
}
const root = resolve(args[1] || resolve(repo, 'dist'));
const origin = 'https://christianfarioli.com';
const route = '/insights/ai-strategy/how-to-choose-an-ai-keynote-speaker-in-dubai/';
const canonical = `${origin}${route}`;
const title = 'How to Choose an AI Keynote Speaker in Dubai: A Guide for CEOs and Event Organisers';
const cta = 'Planning an AI keynote for a leadership team or corporate event in Dubai? Explore my speaking topics and discuss the outcome you want your audience to leave with.';
const caseURL = 'https://www.linkedin.com/posts/christianfarioli_ceos-are-the-worst-students-i-have-ever-taught-activity-7501972477984616448-1zoO';
const cover = '/insights/images/insights/covers/choosing-an-ai-speaker-dubai.jpg';
const source = matter(await readFile(resolve(repo, 'src/content/insights/ai-strategy/how-to-choose-an-ai-keynote-speaker-in-dubai.mdx'), 'utf8'));
const results = [];

const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const normalise = value => value.replace(/\s+/g, ' ').trim();
const rawText = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(rawText).join(' ');
const text = node => normalise(rawText(node));
function nodes(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap(child => nodes(child, predicate))];
}
const elements = (node, tag) => nodes(node, n => n.tagName === tag);
const byClass = (node, value) => nodes(node, n => (attr(n, 'class') || '').split(/\s+/).includes(value));
function one(items, label) {
  assert.equal(items.length, 1, `Expected exactly one ${label}; found ${items.length}`);
  return items[0];
}
async function localFile(value) {
  const url = new URL(value, canonical);
  assert.equal(url.origin, origin, `Expected a site-local URL: ${value}`);
  const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  const rel = relative(root, file);
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`), `URL escapes build root: ${value}`);
  const info = await stat(file).catch(() => null);
  const target = info?.isDirectory() ? resolve(file, 'index.html') : file;
  assert.ok((await stat(target).catch(() => null))?.isFile(), `Missing built target: ${url.pathname}`);
  return target;
}
const readAt = async value => readFile(await localFile(value), 'utf8');
const documentAt = async value => parse(await readAt(value));
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}${detail ? ` (${detail})` : ''}`);
  } catch (error) {
    results.push({ name, passed: false });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

let page;
await check('Public article route is present in the complete build', async () => {
  assert.equal(source.data.status, 'published');
  assert.notEqual(source.data.draft, true);
  page = await documentAt(route);
});
if (!page) process.exit(1);
const body = one(byClass(page, 'article-body'), 'article body');
const schemas = elements(page, 'script')
  .filter(n => attr(n, 'type') === 'application/ld+json')
  .flatMap(n => JSON.parse(rawText(n)));
const meta = (key, field = 'property') => attr(one(elements(page, 'meta').filter(n => attr(n, field) === key), key), 'content');

await check('Original guide fits the 1,200–1,600 word editorial range', () => {
  const wordCount = text(body).split(/\s+/).filter(Boolean).length;
  assert.ok(wordCount >= 1200 && wordCount <= 1600, `Body has ${wordCount} words`);
  return `${wordCount} words`;
});

await check('One H1, exact title, canonical and social metadata', () => {
  assert.equal(text(one(elements(page, 'h1'), 'H1')), title);
  assert.equal(text(one(elements(page, 'title'), 'title')), title);
  assert.equal(attr(one(elements(page, 'link').filter(n => attr(n, 'rel') === 'canonical'), 'canonical'), 'href'), canonical);
  assert.equal(meta('og:title'), title);
  assert.equal(meta('og:url'), canonical);
  assert.equal(meta('og:type'), 'article');
  assert.equal(meta('description', 'name'), source.data.description);
  assert.equal(meta('twitter:title', 'name'), title);
});

await check('British English language, date and article structured data', () => {
  assert.equal(source.data.language, 'en-GB');
  assert.equal(attr(one(elements(page, 'html'), 'HTML document'), 'lang'), 'en-GB');
  const published = new Date(source.data.publishedAt);
  const article = one(schemas.filter(n => n['@type'] === 'BlogPosting'), 'BlogPosting');
  assert.equal(article.inLanguage, 'en-GB');
  assert.equal(article.headline, title);
  assert.equal(article.mainEntityOfPage['@id'], canonical);
  assert.equal(article.datePublished, published.toISOString());
  const date = one(elements(page, 'time').filter(n => attr(n, 'datetime') === published.toISOString()), 'publication date');
  assert.equal(text(date), `Published ${published.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  assert.ok(nodes(page, n => attr(n, 'id') === 'main').length, 'Skip-link target must exist');
});

await check('Rendered cover and metadata cover resolve to the same real JPEG', async () => {
  const hero = one(byClass(page, 'article-hero-image'), 'hero image wrapper');
  const image = one(elements(hero, 'img'), 'hero image');
  const article = one(schemas.filter(n => n['@type'] === 'BlogPosting'), 'BlogPosting');
  const values = [attr(image, 'src'), meta('og:image'), meta('twitter:image', 'name'), article.image];
  assert.equal(attr(image, 'alt'), source.data.featuredImageAlt);
  for (const value of values) {
    assert.equal(new URL(value, canonical).pathname, cover, `Incorrect cover URL: ${value}`);
    const bytes = await readFile(await localFile(value));
    assert.ok(bytes.length > 1000 && bytes[0] === 0xff && bytes[1] === 0xd8, `Not a JPEG asset: ${value}`);
  }
});

await check('Guide is linked from the Insights index and AI Strategy category', async () => {
  for (const listing of ['/insights/', '/insights/category/ai-strategy/']) {
    const document = await documentAt(listing);
    const links = elements(document, 'a').filter(n => attr(n, 'href') && new URL(attr(n, 'href'), origin).pathname === route);
    assert.ok(links.some(n => text(n).includes(title)), `Guide missing from ${listing}`);
  }
});

await check('Guide is included in the generated RSS and site-wide sitemap', async () => {
  const rss = await readAt('/insights/rss.xml');
  const sitemap = await readAt('/sitemap.xml');
  assert.ok(rss.includes(`<link>${canonical}</link>`), 'RSS does not contain the canonical article link');
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), 'Sitemap does not contain the canonical article link');
});

await check('Exact closing CTA resolves to the dedicated speaking page', async () => {
  const link = one(elements(body, 'a').filter(n => text(n) === cta), 'closing CTA');
  assert.equal(attr(link, 'href'), '/ai-keynote-speaker-dubai/');
  await localFile(attr(link, 'href'));
});

await check('Five assessment criteria and the equal-treatment statement render', () => {
  const criteria = [
    '1. Business relevance', '2. First-hand experience', '3. Clarity of explanation',
    '4. Audience-specific preparation', '5. Usefulness after the event',
  ];
  const headings = elements(body, 'h3').map(text);
  for (const criterion of criteria) assert.ok(headings.includes(criterion), `Missing criterion: ${criterion}`);
  assert.ok(text(body).includes('Apply these criteria to every speaker you shortlist, including me.'));
  assert.ok(text(body).includes('not a scientifically validated system'));
});

await check('Real adaptation has its public source link', () => {
  one(elements(body, 'a').filter(n => attr(n, 'href') === caseURL), 'LinkedIn case source');
  assert.ok(elements(body, 'h2').some(n => text(n) === 'A real adaptation: making room for executive participation'));
});

console.log(`\n${results.filter(r => r.passed).length}/${results.length} checks passed.`);
if (results.some(r => !r.passed)) process.exitCode = 1;
