#!/usr/bin/env node
// Offline behavioural checks. Synthetic fixtures run in any clone:
//   node --test scripts/check-preferred-sources.mjs
// The complete release-baseline corpus is opt-in: explicitly set both
// PREFSRC_BASELINE_DIR (preserved HTML output) and PREFSRC_EVIDENCE_DIR (report output).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import matter from 'gray-matter';
import { INSIGHT_REDIRECTS } from '../src/lib/insight-redirects.mjs';
import { preferredSources, publiclyEnabled } from '../src/lib/preferred-sources-config.mjs';
import { preferredSourceComponent, preferredSourceNoscript, preferredSourceTextLink } from '../src/lib/preferred-source-component.mjs';
import { transformPreferredSources } from '../src/lib/preferred-sources-transform.mjs';

const checkout = resolve(fileURLToPath(new URL('../', import.meta.url)));
const baselineRoot = process.env.PREFSRC_BASELINE_DIR ? resolve(process.env.PREFSRC_BASELINE_DIR) : null;
const evidenceRoot = process.env.PREFSRC_EVIDENCE_DIR ? resolve(process.env.PREFSRC_EVIDENCE_DIR) : null;
const corpusSkip = baselineRoot && evidenceRoot ? false
  : 'Release baseline corpus not configured: set both PREFSRC_BASELINE_DIR and PREFSRC_EVIDENCE_DIR explicitly';
const now = Date.parse('2026-11-08T12:00:00Z');
const active = {
  ...preferredSources, enabled: true, eligibilityStatus: 'verified',
  eligibilityCheckedAt: '2026-11-08T08:54:03Z', activationApprovedAt: '2026-11-08T12:00:00Z', consentPolicy: 'on-request',
  placements: { ...preferredSources.placements },
};
const inactive = { ...preferredSources, enabled: false };
const sha = (value) => createHash('sha256').update(value).digest('hex');
const attr = (node, name) => node?.attrs?.find((item) => item.name === name)?.value;
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
function nodes(tree, predicate) {
  const found = [];
  const visit = (node) => {
    if (predicate(node)) found.push(node);
    for (const child of node.childNodes || []) visit(child);
  };
  visit(tree);
  return found;
}
const byClass = (tree, name) => nodes(tree, (node) => hasClass(node, name))[0];
const markers = (tree) => nodes(tree, (node) => attr(node, 'data-preferred-source-placement') !== undefined);
const placementIds = (html) => markers(parse(html)).map((node) => attr(node, 'data-preferred-source-placement'));
const canonicalPath = (tree) => {
  const href = attr(nodes(tree, (node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical')[0], 'href');
  return href ? new URL(href, 'https://christianfarioli.com').pathname : null;
};
const routeNormal = (route) => route.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
function editorialText(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value;
  if (['script', 'style', 'pre', 'code', 'svg'].includes(node.tagName) || hasClass(node, 'article-contact-reminder')) return '';
  return (node.childNodes || []).map(editorialText).join(' ');
}
const wordCount = (node) => (editorialText(node).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
const words = (count) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ');
const paragraph = (id, count = 30) => `<p id="${id}">${words(count)}</p>`;
const normalBody = (count = 600) => paragraph('intro-one') + paragraph('intro-two') + paragraph('intro-three') + '<h2>Evidence</h2>' + paragraph('body-tail', count - 91);
function article(body = normalBody(), { route = '/insights/advanced-strategies/fixture/', robots = '', category = 'Advanced Strategies', extra = '' } = {}) {
  return `<!doctype html><html lang="en-GB"><head><title>Original title</title><link rel="canonical" href="https://christianfarioli.com${route}">${robots}<script type="application/ld+json">{"@type":"BlogPosting","datePublished":"2026-01-01"}</script></head><body><nav><a href="/insights/">Insights</a></nav><article class="article" id="main"><header class="article-header"><p class="article-category">${category}</p><div class="article-byline"><time datetime="2026-01-01">1 January 2026</time></div></header><div class="article-body-wrap"><div class="reading-container"><div class="article-body">${body}</div><section class="article-sources"><h2>Sources</h2><a href="https://example.test/source">A real source</a></section><section class="article-contact-cta"><a href="https://calendly.com/example/30min">Book a call</a></section></div></div><section class="related-insights">Related</section></article>${extra}</body></html>`;
}
const run = (html, route = '/insights/advanced-strategies/fixture/', config = active, options = {}) => transformPreferredSources(html, route, { config, now, ...options });

// Remove only our uniquely delimited additions using parsed source offsets.
// This checks byte preservation, including inline scripts/forms/JSON-LD, without
// trusting the transform's own reported insert list or serialising original HTML.
function removeAdditions(html) {
  const tree = parse(html, { sourceCodeLocationInfo: true });
  const ranges = [];
  for (const parent of nodes(tree, (node) => Array.isArray(node.childNodes))) {
    for (let index = 0; index < parent.childNodes.length; index++) {
      const node = parent.childNodes[index];
      const match = node.nodeName === '#comment' && node.data.match(/^ preferred-source:([a-z_0-9]+):start $/);
      if (!match) continue;
      const end = parent.childNodes.slice(index + 1).find((candidate) => candidate.nodeName === '#comment' && candidate.data === ` preferred-source:${match[1]}:end `);
      assert.ok(end, `Unclosed insertion marker: ${match[1]}`);
      ranges.push([node.sourceCodeLocation.startOffset, end.sourceCodeLocation.endOffset]);
    }
  }
  for (const node of nodes(tree, (node) => attr(node, 'data-preferred-sources-asset') !== undefined || attr(node, 'id') === 'preferred-sources-runtime')) {
    ranges.push([node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset]);
  }
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) html = html.slice(0, start) + html.slice(end);
  return html;
}

function protectedMarkup(html) {
  const tree = parse(html, { sourceCodeLocationInfo: true });
  return nodes(tree, (node) => node.tagName === 'form' || node.tagName === 'time'
    || node.tagName === 'meta' || node.tagName === 'link' && attr(node, 'rel') === 'canonical'
    || node.tagName === 'script' && attr(node, 'type') === 'application/ld+json')
    .filter((node) => node.sourceCodeLocation)
    .map((node) => html.slice(node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset));
}

test('activation is fail-closed: kill switch, eligibility, recency at approval, consent and exact source domain', () => {
  assert.equal(typeof preferredSources.enabled, 'boolean');
  assert.equal(publiclyEnabled(active, now), true);
  const cases = [
    { enabled: false }, { eligibilityStatus: 'unknown' }, { eligibilityStatus: 'unavailable' },
    { eligibilityCheckedAt: '2026-10-01T00:00:00Z' }, { eligibilityCheckedAt: 'invalid' },
    { eligibilityCheckedAt: '2026-11-09T00:00:00Z' }, { consentPolicy: 'unresolved' },
    { activationApprovedAt: null }, { activationApprovedAt: '' }, { activationApprovedAt: 'invalid' },
    { activationApprovedAt: '2026-11-09T00:00:00Z' },
    { sourceDomain: 'christianfarioli.example' },
  ];
  const original = article();
  for (const patch of cases) {
    const config = { ...active, ...patch };
    assert.equal(publiclyEnabled(config, now), false, JSON.stringify(patch));
    assert.equal(run(original, undefined, config).html, original, JSON.stringify(patch));
  }
});

test('eligibility is checked at explicit activation approval, without silently disabling future daily builds', () => {
  assert.equal(publiclyEnabled(active, now), true);
  assert.equal(publiclyEnabled(active, Date.parse('2027-01-01T12:00:00Z')), true,
    'A valid approved release must not silently disappear when the daily build runs more than seven days later');
  const staleAtApproval = { ...active, eligibilityCheckedAt: '2026-10-31T11:59:59Z' };
  assert.equal(publiclyEnabled(staleAtApproval, now), false);
  assert.equal(publiclyEnabled(staleAtApproval, Date.parse('2027-01-01T12:00:00Z')), false);
  const exactBoundary = { ...active, eligibilityCheckedAt: '2026-11-01T12:00:00Z' };
  assert.equal(publiclyEnabled(exactBoundary, now), true);
});

test('preview is an explicit trusted caller option, never a URL query override', () => {
  const original = article();
  for (const suffix of ['', '?preferredSources=1', '?preview=1&enabled=true', '#preview']) {
    assert.equal(run(original, `/insights/advanced-strategies/fixture/${suffix}`, inactive).html, original);
  }
  assert.equal(run(original, undefined, { ...inactive, previewEnabled: false }, { localPreview: true }).html, original);
  assert.ok(placementIds(run(original, undefined, { ...inactive, previewEnabled: true }, { localPreview: true }).html).includes('article_end'));
});

test('article word threshold is configurable; end placement remains on short articles', () => {
  for (const total of [120, 599, 600, 650]) {
    const original = article(normalBody(total));
    const body = byClass(parse(original), 'article-body');
    assert.equal(wordCount(body), total);
    const output = run(original).html;
    assert.deepEqual(placementIds(output), total >= 600 ? ['article_intro', 'article_end'] : ['article_end']);
    assert.equal(removeAdditions(output), original);
  }
  assert.deepEqual(placementIds(run(article(normalBody(650)), undefined, { ...active, articleIntroMinWords: 700 }).html), ['article_end']);
});

test('intro uses complete top-level second or third useful paragraphs and preserves structured blocks', () => {
  const structured = `<blockquote>${paragraph('quoted', 80)}</blockquote><table><tbody><tr><td>${paragraph('table-copy', 80)}</td></tr></tbody></table><ul><li>${paragraph('list-copy', 80)}</li></ul><figure>${paragraph('caption-copy', 80)}</figure><pre>${words(800)}</pre>`;
  const body = paragraph('intro-one') + structured + paragraph('intro-two') + '<h2>Next section</h2>' + paragraph('tail', 400);
  const original = article(body);
  const output = run(original).html;
  const tree = parse(output);
  const intro = markers(tree).find((node) => attr(node, 'data-preferred-source-placement') === 'article_intro');
  assert.ok(intro);
  assert.equal(hasClass(intro.parentNode, 'article-body'), true);
  assert.match(output, /<p id="intro-two">[^<]+<\/p><!-- preferred-source:article_intro:start -->/);
  assert.equal(removeAdditions(output), original);
  const three = run(article()).html;
  assert.match(three, /<p id="intro-three">[^<]+<\/p><!-- preferred-source:article_intro:start -->/);
  const unsafeOnly = article(`<blockquote>${paragraph('nested-one', 400)}${paragraph('nested-two', 400)}</blockquote>`);
  assert.deepEqual(placementIds(run(unsafeOnly).html), ['article_end']);
});

test('paragraph containing an embed is skipped; pre/code payloads do not trigger long-article intro', () => {
  const body = paragraph('intro-one') + `<p id="embed">${words(40)}<iframe src="https://example.test/video"></iframe></p>` + paragraph('intro-two') + '<h2>Next</h2>' + paragraph('tail', 550);
  assert.match(run(article(body)).html, /<p id="intro-two">[^<]+<\/p><!-- preferred-source:article_intro:start -->/);
  const codeHeavy = paragraph('intro-one') + paragraph('intro-two') + `<pre><code>${words(1500)}</code></pre>`;
  assert.deepEqual(placementIds(run(article(codeHeavy)).html), ['article_end']);
});

test('generic marketing copy does not promise AI insights; AI category receives AI intro copy', () => {
  const generic = run(article()).html;
  assert.ok(generic.includes('Good ideas deserve a second visit.'));
  assert.ok(!generic.includes('A little less AI noise.'));
  const ai = run(article(undefined, { category: 'AI Pulse' })).html;
  assert.ok(ai.includes('A little less AI noise. A little more insight.'));
});

test('existing official widgets and explicit preferred-source links are deduplicated', () => {
  for (const existing of [
    '<div google-add-preferred-source-btn data-lang="en-GB"></div>',
    '<a href="https://www.google.com/preferences/source?q=christianfarioli.com">Existing invitation</a>',
  ]) {
    const original = article(undefined, { extra: existing });
    const result = run(original);
    assert.equal(result.html, original);
    assert.ok(result.report.omissions.includes('existing-invite-deduplicated'));
  }
});

test('private, noindex, legal, errors and registration routes never receive invitations', () => {
  for (const route of ['/insights/admin/preview/test/', '/insights/login/', '/checkout/', '/booking/', '/book-launch/', '/privacy.html', '/terms/', '/editorial-policy/', '/404.html', '/profcf-plugin.html']) {
    const original = article(undefined, { route });
    assert.equal(run(original, route).html, original, route);
  }
  const privateArticle = article(undefined, { robots: '<meta name="robots" content="noindex, nofollow">' });
  assert.equal(run(privateArticle).html, privateArticle);
  const original = article();
  assert.equal(run(original, '/advanced-strategies/fixture/').html, original, 'Noncanonical post-build mirrors remain untouched');
});

test('byline replaces intro; missing sidebar creates no invented layout; no article footer is created', () => {
  const byline = { ...active, articleInitialVariant: 'byline', placements: { ...active.placements, article_byline: true } };
  assert.deepEqual(placementIds(run(article(), undefined, byline).html), ['article_byline', 'article_end']);
  const sidebar = { ...active, articleInitialVariant: 'sidebar', placements: { ...active.placements, article_sidebar: true } };
  const result = run(article(), undefined, sidebar);
  assert.deepEqual(placementIds(result.html), ['article_end']);
  assert.ok(result.report.omissions.includes('sidebar-does-not-exist'));
  assert.equal(nodes(parse(result.html), (node) => node.tagName === 'footer').length, 0);
});

test('official controls remain unwrapped, natural; multiple markers share one runtime bootstrap', () => {
  const result = run(article());
  const tree = parse(result.html);
  const widgets = nodes(tree, (node) => attr(node, 'google-add-preferred-source-btn') !== undefined);
  assert.equal(widgets.length, 2);
  for (const widget of widgets) {
    assert.equal(attr(widget, 'data-lang'), 'en-GB');
    assert.equal(attr(widget, 'data-theme'), 'light');
    assert.equal(attr(widget, 'style'), undefined);
    for (let parent = widget.parentNode; parent; parent = parent.parentNode) assert.notEqual(parent.tagName, 'a');
  }
  assert.equal(nodes(tree, (node) => attr(node, 'id') === 'preferred-sources-runtime').length, 1);
  assert.equal(nodes(tree, (node) => attr(node, 'data-preferred-sources-asset') !== undefined).length, 1);
  assert.equal(nodes(tree, (node) => node.tagName === 'h1').length, nodes(parse(article()), (node) => node.tagName === 'h1').length);
  assert.deepEqual(protectedMarkup(result.html), protectedMarkup(article()));
});

test('runtime and stylesheet asset URLs contain the exact content digest for immutable-cache safety', async () => {
  const tree = parse(run(article()).html);
  const runtime = nodes(tree, (node) => attr(node, 'id') === 'preferred-sources-runtime')[0];
  const stylesheet = nodes(tree, (node) => attr(node, 'data-preferred-sources-asset') !== undefined)[0];
  for (const [node, attributeName, name] of [[runtime, 'src', 'runtime.js'], [stylesheet, 'href', 'styles.css']]) {
    const url = new URL(attr(node, attributeName), 'https://christianfarioli.com');
    const digest = sha(await readFile(join(checkout, 'public/preferred-sources', name)));
    assert.equal(url.pathname, `/preferred-sources/${name}`);
    assert.equal(url.searchParams.get('v'), digest, `${name} cache version must follow its actual bytes`);
    assert.deepEqual([...url.searchParams.keys()], ['v']);
  }
});

test('no-JS Insights slots follow each real first-row boundary in DOM order, without extra live widgets', () => {
  const route = '/insights/';
  for (const cardCount of [1, 2, 3, 6]) {
    const cards = Array.from({ length: cardCount }, (_, index) => `<article class="article-card" id="card-${index + 1}"><a href="/insights/example-${index + 1}/">Article ${index + 1}</a></article>`).join('');
    const original = `<!doctype html><html><head><link rel="canonical" href="https://christianfarioli.com/insights/"></head><body><main><section class="insights-hero"><h1>Insights</h1></section><div class="articles-grid" id="articlesGrid">${cards}</div></main></body></html>`;
    const output = run(original, route).html;
    const noJs = parse(output, { scriptingEnabled: false, sourceCodeLocationInfo: true });
    const grid = nodes(noJs, (node) => attr(node, 'id') === 'articlesGrid')[0];
    const slots = nodes(grid, (node) => node.tagName === 'noscript' && hasClass(node, 'preferred-source-noscript-grid'));
    assert.equal(slots.length, Math.min(3, cardCount));
    assert.equal(nodes(noJs, (node) => attr(node, 'google-add-preferred-source-btn') !== undefined).length, 1);
    assert.deepEqual(placementIds(output), ['insights_grid']);
    assert.equal(nodes(noJs, (node) => attr(node, 'id') === 'preferred-sources-runtime').length, 1);
    for (const slot of slots) {
      const columns = Number(attr(slot, 'data-preferred-source-grid-columns'));
      assert.equal(slot.parentNode, grid, 'The full-width slot is a native grid child');
      const precedingCards = grid.childNodes.filter((node) => hasClass(node, 'article-card') && node.sourceCodeLocation.endOffset <= slot.sourceCodeLocation.startOffset);
      const followingCards = grid.childNodes.filter((node) => hasClass(node, 'article-card') && node.sourceCodeLocation.startOffset >= slot.sourceCodeLocation.endOffset);
      assert.equal(precedingCards.length, columns, 'The chosen breakpoint has exactly its first complete row before the link');
      assert.equal(followingCards[0] ? attr(followingCards[0], 'id') : null, columns < cardCount ? `card-${columns + 1}` : null);
      const links = nodes(slot, (node) => node.tagName === 'a');
      assert.equal(links.length, 1);
      assert.equal(attr(links[0], 'href'), 'https://www.google.com/preferences/source?q=christianfarioli.com');
      assert.equal(nodes(slot, (node) => attr(node, 'data-preferred-source-placement') !== undefined).length, 0, 'No-JS fallback slots never enter the runtime instance collection');
    }
    assert.deepEqual(nodes(grid, (node) => hasClass(node, 'article-card')).map((node) => attr(node, 'id')), Array.from({ length: cardCount }, (_, index) => `card-${index + 1}`));
    assert.equal(removeAdditions(output), original);
  }
  assert.equal(preferredSourceNoscript('insights_grid', { ...active, eligibilityStatus: 'unknown' }, { gridColumns: 1 }), '');
});

test('on-request consent is an explicit native loading control, separate from the untouched Google marker', () => {
  const output = preferredSourceComponent('article_end', 'article', { ...active, consentPolicy: 'on-request' });
  const tree = parse(output);
  const consent = byClass(tree, 'preferred-source-consent');
  const widget = byClass(tree, 'preferred-source-widget');
  assert.ok(consent);
  assert.ok(widget);
  assert.equal(consent.parentNode, widget.parentNode);
  const button = byClass(consent, 'preferred-source-consent-button');
  assert.equal(button.tagName, 'button');
  assert.equal(attr(button, 'type'), 'button');
  assert.equal(editorialText(button), 'Show Google’s preferred-source button');
  assert.ok(editorialText(byClass(consent, 'preferred-source-consent-copy')).includes('No preference is changed'));
  assert.equal(nodes(consent, (node) => attr(node, 'google-add-preferred-source-btn') !== undefined).length, 0);
  assert.equal(nodes(widget, (node) => attr(node, 'google-add-preferred-source-btn') !== undefined).length, 1);
  assert.equal(byClass(parse(preferredSourceComponent('article_end', 'article', { ...active, consentPolicy: 'approved' })), 'preferred-source-consent'), undefined);
  assert.equal(attr(nodes(parse(preferredSourceTextLink(active)), (node) => node.tagName === 'a')[0], 'href'), 'https://www.google.com/preferences/source?q=christianfarioli.com');
});

test('fallback and noscript exist only for verified eligibility; deeplinks are clean and accessible', () => {
  for (const status of ['verified', 'unknown', 'unavailable']) {
    const output = preferredSourceComponent('article_end', 'article', { ...active, eligibilityStatus: status });
    assert.equal(output.includes('<noscript>'), status === 'verified');
    assert.equal(output.includes('preferred-source-fallback'), status === 'verified');
    const links = nodes(parse(output), (node) => node.tagName === 'a');
    for (const link of links) {
      assert.equal(attr(link, 'href'), 'https://www.google.com/preferences/source?q=christianfarioli.com');
      assert.equal(attr(link, 'rel'), 'noopener');
      assert.ok(editorialText(link).includes('opens in a new tab'));
    }
  }
});

async function listHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listHtml(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files.sort();
}

test('current release baseline corpus (504 pages): inactive identity, canonical placements, preserved metadata/forms and article counts', { skip: corpusSkip }, async () => {
  const files = await listHtml(baselineRoot);
  assert.equal(files.length, 504, 'The audited preserved production build must be complete');
  const rows = [];
  const failures = [];
  const placementCounts = {};
  let canonicalArticles = 0;
  for (const file of files) {
    const filePath = relative(baselineRoot, file).replaceAll('\\', '/');
    const route = `/${filePath.replace(/index\.html$/, '')}`;
    const original = await readFile(file, 'utf8');
    const beforeTree = parse(original, { sourceCodeLocationInfo: true });
    const disabledResult = run(original, route, inactive);
    const transformed = run(original, route);
    const afterTree = parse(transformed.html, { sourceCodeLocationInfo: true });
    const ids = placementIds(transformed.html);
    const problems = [];
    const preserved = removeAdditions(transformed.html) === original;
    if (disabledResult.html !== original) problems.push('disabled-byte-identity');
    if (!preserved) problems.push('original-byte-preservation');
    if (JSON.stringify(protectedMarkup(original)) !== JSON.stringify(protectedMarkup(transformed.html))) problems.push('metadata-form-date-preservation');
    const beforeCards = nodes(beforeTree, (node) => hasClass(node, 'article-card')).length;
    const afterCards = nodes(afterTree, (node) => hasClass(node, 'article-card')).length;
    if (beforeCards !== afterCards) problems.push('grid-card-count');
    if (new Set(ids).size !== ids.length) problems.push('duplicate-placement');
    if (ids.filter((id) => id !== 'footer').length > (transformed.report.pageType === 'article' ? 2 : 1)) problems.push('editorial-repetition-limit');
    const bootstrapCount = nodes(afterTree, (node) => attr(node, 'id') === 'preferred-sources-runtime').length;
    if (bootstrapCount !== (ids.length ? 1 : 0)) problems.push('bootstrap-count');
    const beforeBody = byClass(beforeTree, 'article-body');
    const afterBody = byClass(afterTree, 'article-body');
    const isNoindex = nodes(beforeTree, (node) => node.tagName === 'meta' && attr(node, 'name') === 'robots' && /noindex/i.test(attr(node, 'content') || '')).length > 0;
    const isCanonical = canonicalPath(beforeTree) && routeNormal(canonicalPath(beforeTree)) === routeNormal(route);
    const cleanRoute = routeNormal(route);
    // A category can contain only a featured article (or no cards at all):
    // its introduction still exists and remains a valid contextual placement.
    if (isCanonical && /^\/insights\/category\/[^/]+$/.test(cleanRoute) && !ids.includes('category_archive')) problems.push('category-archive-context-missing');
    if (isCanonical && /^\/insights\/ai-pulse(?:\/page\/\d+)?$/.test(cleanRoute) && !ids.includes('ai_pulse_archive')) problems.push('ai-pulse-archive-context-missing');
    if (isCanonical && cleanRoute === '/' && !ids.includes('homepage_insights')) problems.push('homepage-context-missing');
    if (isCanonical && cleanRoute === '/insights' && !ids.includes('insights_grid')) problems.push('insights-context-missing');
    if (isCanonical && cleanRoute === '/past-events' && !ids.includes('event_recap_end')) problems.push('event-recap-context-missing');
    if (isCanonical && cleanRoute === '/ai-keynote-speaker-dubai' && !ids.includes('services_secondary')) problems.push('services-context-missing');
    const publicArticle = beforeBody && isCanonical && !isNoindex && !route.includes('/admin/');
    if (publicArticle) {
      canonicalArticles++;
      if (ids.filter((id) => id === 'article_end').length !== 1) problems.push('canonical-article-end-missing');
      if (ids.includes('footer')) problems.push('invented-article-footer');
      const intro = markers(afterTree).find((node) => attr(node, 'data-preferred-source-placement') === 'article_intro');
      if (intro && wordCount(beforeBody) < active.articleIntroMinWords) problems.push('intro-under-threshold');
      if (intro && intro.parentNode !== afterBody) problems.push('intro-not-top-level');
      if (intro) {
        const comments = nodes(afterBody, (node) => node.nodeName === '#comment' && node.data === ' preferred-source:article_intro:start ');
        const start = comments[0]?.sourceCodeLocation.startOffset;
        const preceding = (afterBody.childNodes || []).filter((node) => node.tagName === 'p' && node.sourceCodeLocation?.endOffset <= start && wordCount(node) >= 12 && !nodes(node, (child) => ['img', 'iframe', 'video', 'audio'].includes(child.tagName)).length);
        if (![2, 3].includes(preceding.length)) problems.push('intro-not-after-two-or-three-useful-paragraphs');
      }
      const end = markers(afterTree).find((node) => attr(node, 'data-preferred-source-placement') === 'article_end');
      const commercial = byClass(afterTree, 'article-contact-cta');
      const sources = byClass(afterTree, 'article-sources');
      if (end && commercial && end.sourceCodeLocation.endOffset > commercial.sourceCodeLocation.startOffset) problems.push('end-after-commercial');
      if (end && sources && end.sourceCodeLocation.startOffset < sources.sourceCodeLocation.endOffset) problems.push('end-before-sources');
    }
    for (const id of ids) placementCounts[id] = (placementCounts[id] || 0) + 1;
    if (problems.length) failures.push({ file: filePath, problems });
    rows.push({ file: filePath, route, canonicalPath: canonicalPath(beforeTree), pageType: transformed.report.pageType,
      placements: ids, omissions: transformed.report.omissions, baselineSha256: sha(original), outputSha256: sha(transformed.html),
      bytesAdded: Buffer.byteLength(transformed.html) - Buffer.byteLength(original), inactiveExactIdentity: disabledResult.html === original,
      originalBytesPreserved: preserved, articleWords: beforeBody ? wordCount(beforeBody) : null, gridCardsBefore: beforeCards, gridCardsAfter: afterCards, bootstrapCount, problems });
  }
  const audit = { checkedAt: new Date().toISOString(), scope: 'offline transformation of preserved baseline HTML; no network or live preference actions',
    baselineDirectory: baselineRoot, activation: 'synthetic approved configuration for local test only', htmlPages: files.length,
    canonicalPublicArticles: canonicalArticles, placementCounts, failures, status: failures.length ? 'FAIL' : 'PASS', pages: rows };
  audit.preExistingPublishedRedirects = [];
  for (const [id, target] of Object.entries(INSIGHT_REDIRECTS)) {
    const source = matter(await readFile(join(checkout, 'src/content/insights', `${id}.md`), 'utf8'));
    assert.equal(source.data.status, 'published');
    assert.equal(rows.some((row) => row.file === `insights/${id}/index.html`), false, 'Redirected duplicate has no public output');
    assert.ok(rows.some((row) => row.file === `insights/${target}/index.html` && row.placements.includes('article_end')), 'Canonical redirect target is covered');
    audit.preExistingPublishedRedirects.push({ sourceId: id, targetId: target, sourceStatus: source.data.status,
      reason: 'Existing isPubliclyVisible() excludes INSIGHT_REDIRECTS; existing middleware redirects to the canonical article' });
  }
  await writeFile(join(evidenceRoot, 'placement-results.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  assert.ok(canonicalArticles > 200, 'The complete published article set was inspected');
  assert.deepEqual(failures, []);
});
