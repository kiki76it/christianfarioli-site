#!/usr/bin/env node
// Read-only checks of the FINAL post-build directory, not Astro's intermediate output.
// node --test scripts/check-ai-pulse-output.mjs
// Optional env: AI_PULSE_BUILD_ROOT; AI_PULSE_FIXTURE_MANIFEST (isolated fixture build only).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(process.env.AI_PULSE_BUILD_ROOT || join(repo, 'dist'));
const origin = 'https://christianfarioli.com';
const archivePath = '/insights/ai-pulse/';
const feedPath = '/insights/ai-pulse/feed.xml';
const draftId = 'ai-pulse/internal-editorial-preview';
const draftPath = `/insights/admin/preview/${draftId}/`;
const title = 'AI Pulse - Latest AI News & Business Insights | Prof. Christian Farioli';
const description = 'Daily AI news decoded for CEOs and business leaders by Prof. Christian Farioli - what changed, why it matters and what comes next.';
const intro = 'What happened in AI today - and why it matters for business leaders.';
const filterLabels = ['All', 'AI Pulse', 'AI Strategy', 'AI Leadership', 'Future of Work', 'AISO', 'Human-Centered AI', 'AI Marketing', 'Executive Education', 'Advanced Strategies'];
const fixture = process.env.AI_PULSE_FIXTURE_MANIFEST
  ? JSON.parse(await readFile(process.env.AI_PULSE_FIXTURE_MANIFEST, 'utf8')) : undefined;
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const classes = (node) => (attr(node, 'class') || '').split(/\s+/);
const text = (node) => (node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join(' ')).replace(/\s+/g, ' ').trim();
const rawText = (node) => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(rawText).join('');
function find(node, predicate) { return [...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap((child) => find(child, predicate))]; }
const tags = (node, tag) => find(node, (item) => item.tagName === tag);
const one = (items, label) => { assert.equal(items.length, 1, `Expected one ${label}, found ${items.length}`); return items[0]; };
const byClass = (node, name) => find(node, (item) => classes(item).includes(name));
const meta = (document, name) => attr(one(tags(document, 'meta').filter((node) => attr(node, 'name') === name || attr(node, 'property') === name), `${name} meta tag`), 'content');
const links = (document, rel) => tags(document, 'link').filter((node) => attr(node, 'rel') === rel);
const canonical = (document) => attr(one(links(document, 'canonical'), 'canonical'), 'href');
const robots = (document) => tags(document, 'meta').filter((node) => attr(node, 'name') === 'robots').map((node) => attr(node, 'content')).join(', ');
const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : [value];
const schemas = (document) => tags(document, 'script').filter((node) => attr(node, 'type') === 'application/ld+json').flatMap((node) => list(JSON.parse(rawText(node)))).flatMap((object) => object['@graph'] || object);
const typed = (document, type) => schemas(document).filter((object) => list(object['@type']).includes(type));
const articleSchemas = (document) => schemas(document).filter((object) => list(object['@type']).some((type) => ['Article', 'BlogPosting', 'NewsArticle'].includes(type)));
const documents = new Map();
async function exists(path) { return Boolean(await stat(path).catch(() => null)); }
async function fileFor(pathname) {
  const url = new URL(pathname, origin);
  assert.equal(url.origin, origin, `Expected same-site target: ${url}`);
  const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  const rel = relative(root, path);
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`), `Path escapes build: ${pathname}`);
  const details = await stat(path).catch(() => null);
  const file = details?.isDirectory() ? join(path, 'index.html') : path;
  assert.ok((await stat(file).catch(() => null))?.isFile(), `Missing built URL: ${url.pathname}`);
  return file;
}
async function documentAt(pathname) {
  if (!documents.has(pathname)) documents.set(pathname, parse(await readFile(await fileFor(pathname), 'utf8')));
  return documents.get(pathname);
}
async function xmlAt(pathname) {
  const xml = await readFile(await fileFor(pathname), 'utf8');
  assert.equal(XMLValidator.validate(xml), true, `Invalid XML: ${pathname}`);
  return { xml, data: new XMLParser({ ignoreAttributes: false }).parse(xml) };
}
async function feedItems() { return list((await xmlAt(feedPath)).data.rss.channel.item); }
function assertIndexable(document) { assert.doesNotMatch(robots(document), /noindex|nofollow/i); }
function assertArticle(document, pathname, expected = {}) {
  const article = one(articleSchemas(document), 'article schema');
  assert.equal(article['@type'], 'NewsArticle');
  assert.equal(article.author['@type'], 'Person');
  assert.equal(article.author.name, 'Prof. Christian Farioli');
  assert.equal(article.author.url, `${origin}/`);
  assert.equal(article.publisher.name, 'Prof. Christian Farioli');
  assert.equal(article.url, `${origin}${pathname}`);
  assert.equal(article.mainEntityOfPage['@id'], article.url);
  assert.equal(canonical(document), article.url);
  assert.equal(article.headline, text(one(tags(document, 'h1'), 'article H1')));
  assert.equal(article.description, meta(document, 'description'));
  assert.equal(article.image, meta(document, 'og:image'));
  const headings = tags(document, 'h2').map(text);
  for (const heading of ['What happened', 'Why it matters', 'The bigger shift', 'My take', 'Sources']) {
    assert.equal(headings.filter((item) => item === heading).length, 1, `Expected one ${heading} H2`);
  }
  const sources = one(byClass(document, 'article-sources'), 'Sources section');
  assert.ok(tags(sources, 'a').some((node) => /^https?:/.test(attr(node, 'href') || '')));
  assert.ok(tags(sources, 'a').some((node) => attr(node, 'href') === '/editorial-policy/'));
  assert.ok(tags(document, 'a').some((node) => attr(node, 'href') === `${origin}/#positioning` && text(node) === 'Prof. Christian Farioli'));
  assert.match(robots(document), /max-image-preview:large/);
  if (expected.publishedAt) assert.equal(article.datePublished, new Date(expected.publishedAt).toISOString());
  if (expected.publishedAt) assert.equal(article.dateModified, new Date(expected.updatedAt || expected.publishedAt).toISOString());
  return article;
}

test('AI Pulse archive has the requested SEO, canonical, H1 and native filter order', async () => {
  const document = await documentAt(archivePath);
  assert.equal(text(one(tags(document, 'title'), 'title')), title);
  assert.equal(meta(document, 'description'), description);
  assert.equal(canonical(document), `${origin}${archivePath}`);
  assert.equal(text(one(tags(document, 'h1'), 'H1')), 'AI Pulse');
  assert.ok(text(document).includes(intro));
  assertIndexable(document);
  for (const pathname of [archivePath, '/insights/']) {
    const page = await documentAt(pathname);
    const filters = byClass(page, 'category-btn');
    assert.deepEqual(filters.map(text), filterLabels);
    assert.equal(attr(filters[1], 'href'), archivePath);
  }
  const active = byClass(document, 'category-btn').filter((node) => attr(node, 'aria-current') === 'page');
  assert.equal(text(one(active, 'active category')), 'AI Pulse');
  const siteNav = one(tags(document, 'nav').filter((node) => !classes(node).includes('category-nav') && !classes(node).includes('archive-pagination')), 'main navigation');
  assert.ok(!tags(siteNav, 'a').some((node) => text(node) === 'AI Pulse'), 'AI Pulse must not become a top-level menu item');
});

test('CollectionPage/ItemList, cards, feed and static pagination agree in newest-first order', async () => {
  const items = await feedItems();
  const times = items.map((item) => Date.parse(item.pubDate));
  assert.ok(times.every(Number.isFinite));
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
  const pageCount = Math.max(1, Math.ceil(items.length / 12));
  for (let page = 1; page <= pageCount; page++) {
    const pathname = page === 1 ? archivePath : `${archivePath}page/${page}/`;
    const document = await documentAt(pathname);
    const collection = one(typed(document, 'CollectionPage'), 'CollectionPage');
    const expected = items.slice((page - 1) * 12, page * 12);
    assert.equal(collection.url, `${origin}${pathname}`);
    assert.equal(canonical(document), collection.url);
    assertIndexable(document);
    assert.equal(collection.mainEntity['@type'], 'ItemList');
    assert.equal(collection.mainEntity.numberOfItems, expected.length);
    assert.deepEqual(collection.mainEntity.itemListElement.map((item) => item.url), expected.map((item) => item.link));
    assert.deepEqual(collection.mainEntity.itemListElement.map((item) => item.position), expected.map((_, i) => (page - 1) * 12 + i + 1));
    const cards = byClass(document, 'article-card');
    assert.equal(cards.length, expected.length);
    assert.deepEqual(cards.map((card) => origin + attr(one(byClass(card, 'article-card-image'), 'card image link'), 'href')), expected.map((item) => item.link));
    assert.ok(cards.every((card) => text(one(byClass(card, 'article-card-category'), 'badge')) === 'AI Pulse'));
    if (pageCount > 1) {
      const pagination = one(byClass(document, 'archive-pagination'), 'pagination');
      const current = tags(pagination, 'a').filter((node) => attr(node, 'aria-current') === 'page');
      assert.equal(attr(one(current, 'current pagination link'), 'href'), pathname);
      if (page < pageCount) assert.equal(attr(one(links(document, 'next'), 'next'), 'href'), `${origin}${archivePath}page/${page + 1}/`);
      if (page > 1) assert.equal(attr(one(links(document, 'prev'), 'prev'), 'href'), page === 2 ? `${origin}${archivePath}` : `${origin}${archivePath}page/${page - 1}/`);
    }
  }
});

test('AI Pulse RSS is valid, has its canonical self link and contains only public article URLs', async () => {
  const { xml, data } = await xmlAt(feedPath);
  assert.equal(data.rss.channel.link, `${origin}${archivePath}`);
  assert.equal(data.rss.channel['atom:link']['@_href'], `${origin}${feedPath}`);
  assert.equal(data.rss.channel.language, 'en-GB');
  assert.doesNotMatch(xml, /internal-editorial-preview|\/admin\//);
  const archive = await documentAt(archivePath);
  assert.equal(attr(one(links(archive, 'alternate').filter((node) => attr(node, 'type') === 'application/rss+xml'), 'RSS discovery link'), 'href'), `${origin}${feedPath}`);
  for (const item of list(data.rss.channel.item)) {
    assert.equal(item['dc:creator'], 'Prof. Christian Farioli');
    const pathname = new URL(item.link).pathname;
    const document = await documentAt(pathname);
    assertIndexable(document);
    const article = assertArticle(document, pathname);
    assert.equal(Date.parse(item.pubDate), Date.parse(article.datePublished));
  }
});

test('Sitemap is valid, unique, resolves to built pages and excludes draft/duplicate surfaces', async () => {
  const { xml, data } = await xmlAt('/sitemap.xml');
  const urls = list(data.urlset.url).map((item) => item.loc);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes(`${origin}${archivePath}`));
  assert.ok(urls.includes(`${origin}/editorial-policy/`));
  assert.doesNotMatch(xml, /internal-editorial-preview|\/admin\/|\/category\/ai-pulse\/|\/insights\/editorial-policy\//);
  for (const url of urls) await fileFor(url);
  for (const item of await feedItems()) assert.ok(urls.includes(item.link));
  if ((await feedItems()).length > 12) assert.ok(urls.includes(`${origin}${archivePath}page/2/`));
});

test('Internal draft preview is noindex, has one NewsArticle and no invented date', async () => {
  const document = await documentAt(draftPath);
  assert.match(robots(document), /noindex/);
  assert.match(robots(document), /nofollow/);
  const article = assertArticle(document, `/insights/${draftId}/`);
  assert.equal(article.datePublished, undefined);
  assert.equal(article.dateModified, undefined);
  assert.ok(text(document).includes('Not published yet'));
  assert.ok(text(document).includes('Internal draft'));
  assert.equal(tags(document, 'meta').filter((node) => ['article:published_time', 'article:modified_time'].includes(attr(node, 'property'))).length, 0);
  assert.equal(tags(one(byClass(document, 'article-dates'), 'byline dates'), 'time').length, 0);
});

test('Post-build removes public draft paths, root admin and duplicate archive/policy copies', async () => {
  for (const path of ['admin', 'ai-pulse', `insights/${draftId}`, 'insights/category/ai-pulse', 'category/ai-pulse', 'insights/ai-pulse/page/1', 'insights/editorial-policy']) {
    assert.equal(await exists(resolve(root, path)), false, `Unexpected public/duplicate output: ${path}`);
  }
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (relative(root, path).split(sep).join('/') !== 'insights/admin') await inspect(path);
      } else if (/\.(html|xml)$/i.test(entry.name)) {
        const html = await readFile(path, 'utf8');
        assert.ok(!html.includes(draftId), `Draft leaked into ${relative(root, path)}`);
      }
    }
  }
  await inspect(root);
});

test('Editorial policy exists at the root canonical and states the required responsibilities', async () => {
  const document = await documentAt('/editorial-policy/');
  assert.equal(canonical(document), `${origin}/editorial-policy/`);
  assert.equal(text(one(tags(document, 'h1'), 'policy H1')), 'Editorial Policy');
  assertIndexable(document);
  const body = text(document);
  for (const phrase of ['Accuracy and attribution', 'Facts, analysis and opinion', 'Dates, updates and corrections', 'AI assistance and editorial responsibility', 'Every published perspective remains under the editorial responsibility of Prof. Christian Farioli.']) assert.ok(body.includes(phrase));
});

test('Existing evergreen article retains BlogPosting and its full established author signature', async () => {
  const pathname = '/insights/ai-strategy/why-ai-strategy-beats-ai-tools/';
  const document = await documentAt(pathname);
  assert.equal(one(articleSchemas(document), 'evergreen article schema')['@type'], 'BlogPosting');
  assert.equal(typed(document, 'NewsArticle').length, 0);
  assert.equal(canonical(document), `${origin}${pathname}`);
  assert.equal(byClass(document, 'author-qualifications').length, 1);
  assert.ok(text(one(byClass(document, 'article-dates'), 'evergreen dates')).includes('Published August 20, 2025'));
  assert.equal(byClass(document, 'article-sources').length, 0);
});

test('Isolated 13-article fixtures exercise All, dates, updates, images, linking and scheduled publication', { skip: !fixture }, async () => {
  assert.equal(fixture.version, 1);
  assert.equal(fixture.public.length, 13);
  const items = await feedItems();
  assert.equal(items.length, 13);
  assert.deepEqual(items.map((item) => new URL(item.link).pathname), fixture.public.map((item) => `/insights/${item.id}/`));
  const all = await documentAt('/insights/');
  for (const expected of fixture.public) {
    const pathname = `/insights/${expected.id}/`;
    assert.ok(tags(all, 'a').some((node) => attr(node, 'href') === pathname), `Fixture missing from All: ${expected.id}`);
    const document = await documentAt(pathname);
    const article = assertArticle(document, pathname, expected);
    assertIndexable(document);
    const dates = one(byClass(document, 'article-dates'), 'byline dates');
    const published = one(tags(dates, 'time').filter((node) => text(node).startsWith('Published:')), 'published time');
    assert.equal(attr(published, 'datetime'), article.datePublished);
    // ICU versions use either a comma or "at" between the same date and time.
    assert.ok(text(published).replace(/\s+at\s+/, ', ').includes(expected.dubaiPublished));
    assert.ok(text(published).includes('UTC+4'));
    const updates = tags(dates, 'time').filter((node) => text(node).startsWith('Updated:'));
    assert.equal(updates.length, expected.updatedAt ? 1 : 0);
    if (expected.updatedAt) assert.equal(attr(updates[0], 'datetime'), new Date(expected.updatedAt).toISOString());
    const hero = one(tags(one(byClass(document, 'article-hero-image'), 'hero'), 'img'), 'hero image');
    assert.equal(new URL(article.image).pathname, attr(hero, 'src'));
    assert.ok(Number(attr(hero, 'width')) >= 1200);
    assert.ok(Number(attr(hero, 'height')) > 0);
    await fileFor(attr(hero, 'src'));
    assert.ok(tags(document, 'a').some((node) => attr(node, 'href') === '/insights/ai-strategy/why-ai-strategy-beats-ai-tools/'));
    assert.ok(!tags(document, 'a').some((node) => (attr(node, 'href') || '').includes(draftId)));
    assert.equal(one(typed(document, 'BreadcrumbList'), 'breadcrumb').itemListElement[2].item, `${origin}${archivePath}`);
  }
  assert.equal(fixture.public.filter((item) => item.status === 'scheduled').length, 1);
  assert.equal(fixture.public.at(-1).pinned, true);
  assert.equal(fixture.public.at(-1).featured, true);
});
