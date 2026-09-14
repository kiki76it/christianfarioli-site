#!/usr/bin/env node
// Validate the post-build output, including the main-site overlay and Insights.
// Usage: node scripts/check-speaking-page.mjs [--root path/to/built/site]
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) {
  console.error('Usage: node scripts/check-speaking-page.mjs [--root path/to/built/site]');
  process.exit(2);
}
const root = resolve(args[1] || resolve(repo, 'dist'));
const origin = 'https://christianfarioli.com';
const route = '/ai-keynote-speaker-dubai/';
const canonical = `${origin}${route}`;
const expectedTitle = 'AI Keynote Speaker Dubai | Prof. Christian Farioli';
const expectedH1 = 'AI Keynote Speaker in Dubai for CEOs and Leadership Teams';
const documents = new Map();
const results = [];

const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const has = (node, name) => attr(node, name) !== undefined;
const classes = node => (attr(node, 'class') || '').split(/\s+/);
const normalise = value => value.replace(/\s+/g, ' ').trim();
const content = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(content).join(' ');
const text = node => normalise(content(node));
function nodes(node, predicate) {
  return [ ...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap(child => nodes(child, predicate)) ];
}
const elements = (node, tag) => nodes(node, n => n.tagName === tag);
const one = (items, label) => {
  assert.equal(items.length, 1, `Expected exactly one ${label}; found ${items.length}`);
  return items[0];
};
const localURL = (value, base = canonical) => {
  const url = new URL(value, base);
  return url.origin === origin ? url : null;
};

async function localFile(url) {
  const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  const rel = relative(root, file);
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`), `URL escapes build root: ${url}`);
  const info = await stat(file).catch(() => null);
  const resolved = info?.isDirectory() ? resolve(file, 'index.html') : file;
  assert.ok((await stat(resolved).catch(() => null))?.isFile(), `Missing built target: ${url.pathname}`);
  return resolved;
}

async function documentAt(pathname) {
  const url = new URL(pathname, origin);
  const key = url.pathname;
  if (!documents.has(key)) {
    const html = await readFile(await localFile(url), 'utf8');
    documents.set(key, parse(html));
  }
  return documents.get(key);
}

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
await check('Dedicated route exists in built site', async () => {
  page = await documentAt(route);
  assert.ok(elements(page, 'main').length, 'Route must contain its own main content');
});
if (!page) process.exit(1);

await check('SEO metadata and British English document language', () => {
  assert.equal(attr(one(elements(page, 'html'), 'html element'), 'lang'), 'en-GB');
  assert.equal(text(one(elements(page, 'title'), 'title')), expectedTitle);
  assert.equal(text(one(elements(page, 'h1'), 'H1')), expectedH1);
  const description = one(elements(page, 'meta').filter(n => attr(n, 'name') === 'description'), 'meta description');
  assert.ok(attr(description, 'content')?.trim(), 'Description must not be empty');
  assert.equal(attr(one(elements(page, 'link').filter(n => attr(n, 'rel') === 'canonical'), 'canonical'), 'href'), canonical);
  for (const [property, expected] of [['og:url', canonical], ['og:title', expectedTitle], ['og:locale', 'en_GB']]) {
    assert.equal(attr(one(elements(page, 'meta').filter(n => attr(n, 'property') === property), property), 'content'), expected);
  }
});

await check('Nested-route assets and stylesheet dependencies resolve', async () => {
  const urls = new Set();
  const add = (value, base = canonical) => {
    if (!value || value.startsWith('data:')) return;
    const url = localURL(value, base);
    if (url) urls.add(url.href);
  };
  for (const node of nodes(page, n => !!n.tagName)) {
    if (['img', 'source', 'video', 'audio', 'script', 'iframe'].includes(node.tagName)) add(attr(node, 'src'));
    if (node.tagName === 'video') add(attr(node, 'poster'));
    if (['img', 'source'].includes(node.tagName) && has(node, 'srcset')) {
      for (const source of attr(node, 'srcset').split(',')) add(source.trim().split(/\s+/)[0]);
    }
    if (node.tagName === 'link' && ['stylesheet', 'icon'].includes(attr(node, 'rel'))) add(attr(node, 'href'));
    if (node.tagName === 'meta' && ['og:image', 'twitter:image'].includes(attr(node, 'property') || attr(node, 'name'))) add(attr(node, 'content'));
  }
  for (const value of urls) {
    const url = new URL(value);
    const file = await localFile(url);
    assert.ok((await stat(file)).size > 0, `Empty asset: ${url.pathname}`);
    if (url.pathname.endsWith('.css')) {
      const css = await readFile(file, 'utf8');
      for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) add(match[1], url.href);
    }
  }
  assert.ok(urls.size > 0, 'Expected local site assets');
  return `${urls.size} local assets`;
});

await check('Internal links, fragments and accessible references resolve', async () => {
  const ids = nodes(page, n => has(n, 'id')).map(n => attr(n, 'id'));
  assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs on speaking page');
  for (const node of elements(page, 'a')) {
    const href = attr(node, 'href');
    assert.ok(href && href !== '#', `Empty link destination: ${text(node)}`);
    const url = localURL(href);
    if (!url) continue;
    await localFile(url);
    if (url.hash) {
      const destination = await documentAt(url.pathname);
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(nodes(destination, n => attr(n, 'id') === id || (n.tagName === 'a' && attr(n, 'name') === id)).length, `Missing fragment target: ${href}`);
    }
  }
  for (const node of nodes(page, n => has(n, 'aria-labelledby') || has(n, 'aria-describedby') || has(n, 'aria-controls'))) {
    for (const name of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
      for (const id of (attr(node, name) || '').split(/\s+/).filter(Boolean)) assert.ok(ids.includes(id), `Missing ${name} target: ${id}`);
    }
  }
});

await check('Static and built Insights navigation reaches canonical speaking route', async () => {
  const paths = (await readdir(resolve(repo, 'main-site'))).filter(name => name.endsWith('.html')).map(name => `/${name}`);
  paths.push(route, '/insights/');
  const categoryRoot = resolve(root, 'insights/category');
  for (const entry of await readdir(categoryRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) paths.push(`/insights/category/${entry.name}/`);
  }
  let count = 0;
  for (const path of paths) {
    const doc = await documentAt(path);
    const speaking = elements(doc, 'a').filter(n => ['Speaking', 'Keynote Speaking', 'View Speaking Topics', 'Explore Speaking'].includes(text(n)));
    assert.ok(speaking.length >= 2, `Header/footer Speaking navigation missing from ${path}`);
    for (const link of speaking) {
      assert.equal(new URL(attr(link, 'href'), new URL(path, origin)).href, canonical, `Wrong Speaking destination in ${path}`);
      count++;
    }
    assert.ok(!elements(doc, 'a').some(n => (attr(n, 'href') || '').includes('#speaking')), `Old Speaking fragment link in ${path}`);
  }
  assert.ok(nodes(await documentAt('/'), n => attr(n, 'id') === 'speaking').length, 'Existing homepage Speaking section removed');
  return `${count} links across ${paths.length} pages`;
});

await check('Canonical route occurs once in the built sitemap', async () => {
  const xml = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  const locations = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match => match[1].trim());
  assert.equal(locations.filter(loc => loc === canonical).length, 1);
  assert.ok(!locations.some(loc => loc.includes('/insights/ai-keynote-speaker-dubai')), 'Speaking sitemap entry incorrectly includes Insights base');
});

await check('Video is an existing local asset with user-controlled playback', async () => {
  const videos = elements(page, 'video');
  assert.ok(videos.length > 0, 'Expected event video');
  const original = parse(await readFile(resolve(repo, 'main-site/index.html'), 'utf8'));
  const originals = new Set(elements(original, 'video').flatMap(video => [attr(video, 'src'), ...elements(video, 'source').map(n => attr(n, 'src'))]).filter(Boolean).map(src => new URL(src, origin).pathname));
  for (const video of videos) {
    assert.ok(has(video, 'controls'), 'Video must have controls');
    assert.ok(!has(video, 'autoplay'), 'Speaking video must not autoplay');
    const sources = [attr(video, 'src'), ...elements(video, 'source').map(n => attr(n, 'src'))].filter(Boolean);
    assert.ok(sources.length > 0, 'Video has no source');
    for (const src of sources) {
      const url = localURL(src);
      assert.ok(url && originals.has(url.pathname), `Video is not from the existing homepage: ${src}`);
      await localFile(url);
    }
  }
});

await check('Event enquiries retain the existing booking and WhatsApp destinations', async () => {
  const contactLinks = doc => elements(doc, 'a').map(n => attr(n, 'href')).filter(Boolean).map(href => new URL(href, origin)).filter(url => ['calendly.com', 'wa.me'].includes(url.hostname));
  const original = new Set(contactLinks(await documentAt('/')).map(url => url.href));
  const current = contactLinks(page);
  assert.ok(current.some(url => url.hostname === 'calendly.com'), 'Existing booking system missing');
  assert.ok(current.some(url => url.hostname === 'wa.me'), 'Existing WhatsApp contact missing');
  for (const url of current) assert.ok(original.has(url.href), `Unrecognised contact destination: ${url.href}`);
});

await check('Structured data is valid and matches the canonical page', () => {
  const scripts = elements(page, 'script').filter(n => attr(n, 'type') === 'application/ld+json');
  assert.ok(scripts.length > 0, 'Structured data missing');
  const graph = scripts.flatMap(script => {
    const data = JSON.parse(content(script));
    assert.equal(data['@context'], 'https://schema.org');
    return data['@graph'] || [data];
  });
  const webpage = one(graph.filter(node => node['@type'] === 'WebPage'), 'WebPage schema');
  assert.equal(webpage.url, canonical);
  assert.equal(webpage.inLanguage, 'en-GB');
  assert.equal(webpage.name, expectedTitle);
  const service = one(graph.filter(node => node['@type'] === 'Service'), 'Service schema');
  assert.equal(service.url, canonical);
  assert.equal(service.provider?.['@id'], `${origin}/#christian-farioli`);
});

await check('Testimonial excerpts and author attribution match existing site evidence', async () => {
  const original = parse(await readFile(resolve(repo, 'main-site/testimonials.html'), 'utf8'));
  const cards = nodes(original, n => classes(n).some(name => ['testimonial-card-page', 'gr-card', 'mt-card'].includes(name)));
  const quotes = nodes(page, n => n.tagName === 'figure' && elements(n, 'blockquote').length > 0);
  assert.ok(quotes.length > 0, 'Expected existing testimonials');
  const unquote = value => normalise(value).replace(/^["“”]+|["“”]+$/g, '').trim();
  for (const quote of quotes) {
    const body = unquote(text(one(elements(quote, 'blockquote'), 'testimonial quote')));
    const caption = one(elements(quote, 'figcaption'), 'testimonial attribution');
    const author = text(one(elements(caption, 'strong'), 'testimonial author'));
    assert.ok(cards.some(card => text(card).includes(author) && text(card).includes(body)), `Quote or attribution not found in existing testimonials: ${author}`);
  }
  return `${quotes.length} attributed excerpts`;
});

const failed = results.filter(result => !result.passed).length;
console.log(`\n${results.length - failed}/${results.length} speaking-page checks passed. Build root: ${root}`);
process.exitCode = failed ? 1 : 0;
