import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { preferredSources, publiclyEnabled } from './preferred-sources-config.mjs';
import { preferredSourceComponent, preferredSourceNoscript } from './preferred-source-component.mjs';

// Existing JS/CSS cache headers are immutable: each changed asset gets a new URL.
export const assetURL = (name) => `/preferred-sources/${name}?v=${createHash('sha256').update(readFileSync(new URL(`../../public/preferred-sources/${name}`, import.meta.url))).digest('hex')}`;

export const attribute = (node, name) => node?.attrs?.find((a) => a.name === name)?.value;
export const hasClass = (node, name) => (attribute(node, 'class') || '').split(/\s+/).includes(name);
export function walk(node, callback) { callback(node); for (const child of node.childNodes || []) walk(child, callback); }
export function find(node, predicate) { let result; walk(node, (n) => { if (!result && predicate(n)) result = n; }); return result; }
export function findAll(node, predicate) { const result = []; walk(node, (n) => { if (predicate(n)) result.push(n); }); return result; }
const byClass = (tree, name) => find(tree, (n) => hasClass(n, name));
const byId = (tree, id) => find(tree, (n) => attribute(n, 'id') === id);
const normalise = (route) => route.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
const text = (n) => n.nodeName === '#text' ? n.value : ['script','style','pre','code','svg'].includes(n.tagName) || hasClass(n, 'article-contact-reminder') ? '' : (n.childNodes || []).map(text).join(' ');
const words = (n) => (text(n).match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || []).length;
const existingInvite = (tree) => !!find(tree, (n) => attribute(n, 'google-add-preferred-source-btn') !== undefined || attribute(n, 'href')?.startsWith('https://www.google.com/preferences/source'));

// These existing root files are the serving origin of canonical category URLs.
// Require the exact checked-in 200 rewrite; never accept arbitrary canonical mismatches.
export function categoryRewriteCanonicalPath(route, canonical, redirects) {
  const path = normalise(route);
  if (!/^\/category\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) || !canonical) return null;
  const url = new URL(canonical, 'https://christianfarioli.com');
  const target = normalise(url.pathname);
  if (url.origin !== 'https://christianfarioli.com' || url.search || url.hash || target !== `/insights${path}`) return null;
  const rules = redirects.split(/\r?\n/).map((line) => line.trim().split(/\s+/));
  const verified = rules.some((fields) => fields.length === 3
    && fields[0] === '/insights/category/*' && fields[1] === '/category/:splat' && fields[2] === '200');
  return verified ? target : null;
}

/** Add only source-location inserts to parsed final HTML: never serialise/rewrite original markup. */
export function transformPreferredSources(html, route, options = {}) {
  const config = options.config || preferredSources;
  const preview = options.localPreview === true && config.previewEnabled;
  const report = { route, pageType: 'other', placements: [], omissions: [] };
  const finish = () => ({ html, report });
  if (!preview && !publiclyEnabled(config, options.now)) { report.omissions.push('disabled-or-activation-gate'); return finish(); }
  let path = normalise(route);
  if (/\/(?:admin|login|checkout|booking|book-launch|privacy|terms|editorial-policy|404|profcf-plugin)(?:\/|$)/i.test(path)) {
    report.omissions.push('excluded-route'); return finish();
  }
  const tree = parse(html, { sourceCodeLocationInfo: true });
  if (find(tree, (n) => n.tagName === 'meta' && attribute(n, 'name') === 'robots' && /noindex/i.test(attribute(n, 'content') || ''))) {
    report.omissions.push('private-or-noindex'); return finish();
  }
  const canonical = attribute(find(tree, (n) => n.tagName === 'link' && attribute(n, 'rel') === 'canonical'), 'href');
  // Category origin copies are served at their canonical URLs by the existing
  // Cloudflare rewrite. Other noncanonical output remains excluded.
  if (canonical && normalise(new URL(canonical, 'https://christianfarioli.com').pathname) !== path) {
    let canonicalOrigin = null;
    if (byClass(tree, 'insights-hero') && !byClass(tree, 'article-body')) {
      try {
        canonicalOrigin = categoryRewriteCanonicalPath(path, canonical,
          readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8'));
      } catch { /* A missing or invalid routing source must keep the exclusion. */ }
    }
    if (!canonicalOrigin) { report.omissions.push('noncanonical-build-mirror'); return finish(); }
    report.rewriteOrigin = path;
    report.effectiveCanonicalPath = canonicalOrigin;
    path = canonicalOrigin;
  }
  if (existingInvite(tree)) { report.omissions.push('existing-invite-deduplicated'); return finish(); }
  const inserts = [];
  const add = (placement, node, position = 'after', settings = {}) => {
    if (!config.placements[placement] || !node?.sourceCodeLocation) return false;
    const loc = node.sourceCodeLocation;
    const offset = position === 'before' ? loc.startOffset : position === 'inside-end' ? loc.endTag?.startOffset : loc.endOffset;
    if (!Number.isFinite(offset) || report.placements.includes(placement)) return false;
    inserts.push({offset, value: preferredSourceComponent(placement, report.pageType, config, settings)});
    report.placements.push(placement); return true;
  };
  const article = byClass(tree, 'article-body');
  let suppressFooter = false;
  if (article) {
    report.pageType = 'article';
    const articleShell = find(tree, (n) => n.tagName === 'article' && hasClass(n, 'article'));
    const category = text(byClass(tree, 'article-category') || {childNodes:[]}).trim();
    const ai = /\bAI\b|artificial intelligence|digital employees/i.test(category);
    if (config.articleInitialVariant === 'intro' && words(article) >= config.articleIntroMinWords) {
      const paragraphs = [];
      for (const node of article.childNodes || []) {
        // Only genuine root paragraphs, never list/quote/table/embed descendants.
        if (node.tagName === 'p' && words(node) >= 12 && !find(node, (n) => ['img','iframe','video','audio'].includes(n.tagName))) paragraphs.push(node);
        if (paragraphs.length === 3) break;
        if (['h2','h3'].includes(node.tagName) && paragraphs.length >= 2) break;
      }
      if (paragraphs.length >= 2) add('article_intro', paragraphs[Math.min(2, paragraphs.length - 1)], 'after', {generic: !ai});
      else report.omissions.push('intro-no-safe-two-paragraph-boundary');
    } else if (config.articleInitialVariant === 'byline') {
      add('article_byline', byClass(tree, 'article-byline'), 'after', {generic: true});
    } else if (config.articleInitialVariant === 'sidebar') {
      const sidebar = byClass(articleShell || tree, 'article-sidebar');
      if (sidebar) add('article_sidebar', sidebar, 'inside-end', {generic: true});
      else report.omissions.push('sidebar-does-not-exist');
    } else report.omissions.push('intro-short-or-disabled');
    const commercial = byClass(tree, 'article-contact-cta');
    if (commercial) add('article_end', commercial, 'before');
    else report.omissions.push('article-end-anchor-missing');
  } else if (path === '/') {
    report.pageType = 'homepage';
    add('homepage_insights', byId(tree, 'insights'));
    report.omissions.push('homepage-takes-precedence-over-about-books-services');
  } else if (byClass(tree, 'insights-hero')) {
    report.pageType = path.includes('/ai-pulse') ? 'ai-pulse-archive' : path === '/insights' ? 'insights' : 'category';
    if (report.pageType === 'ai-pulse-archive') add('ai_pulse_archive', byClass(tree, 'pulse-about'));
    else if (report.pageType === 'category') add('category_archive', byClass(tree, 'insights-hero'));
    else {
      const cards = (byId(tree, 'articlesGrid')?.childNodes || []).filter((n) => hasClass(n, 'article-card'));
      if (cards.length && add('insights_grid', cards[Math.min(2, cards.length - 1)], 'after', { includeNoscript: false })) {
        for (const columns of [1, 2, 3]) {
          const anchor = cards[columns - 1];
          const markup = preferredSourceNoscript('insights_grid', config, { gridColumns: columns });
          if (!anchor?.sourceCodeLocation || !markup) continue;
          const marker = `insights_grid_noscript_${columns}`;
          inserts.push({offset: anchor.sourceCodeLocation.endOffset, value: `<!-- preferred-source:${marker}:start -->${markup}<!-- preferred-source:${marker}:end -->`});
        }
      }
    }
  } else if (path === '/past-events') {
    report.pageType = 'event-recap'; add('event_recap_end', byClass(tree, 'events-section'));
  } else if (path === '/ai-keynote-speaker-dubai') {
    report.pageType = 'services'; add('services_secondary', byId(tree, 'enquire')); suppressFooter = true;
    report.omissions.push('footer-suppressed-next-to-services-invite');
  }
  const footer = find(tree, (n) => n.tagName === 'footer' && hasClass(n, 'footer'));
  if (footer && !suppressFooter) add('footer', byClass(footer, 'footer-brand'), 'inside-end');
  if (!inserts.length) return finish();
  const head = find(tree, (n) => n.tagName === 'head');
  const body = find(tree, (n) => n.tagName === 'body');
  inserts.push({offset: head.sourceCodeLocation.endTag.startOffset, value: `<link rel="stylesheet" href="${assetURL('styles.css')}" data-preferred-sources-asset>`});
  inserts.push({offset: body.sourceCodeLocation.endTag.startOffset, value: `<script id="preferred-sources-runtime" type="module" src="${assetURL('runtime.js')}" data-preview="${preview}" data-eligibility="${config.eligibilityStatus}" data-measurement="${config.measurementEnabled}" data-consent-policy="${config.consentPolicy}" data-source-domain="${config.sourceDomain}"></script>`});
  for (const insert of inserts.sort((a,b) => b.offset - a.offset)) html = html.slice(0,insert.offset) + insert.value + html.slice(insert.offset);
  return finish();
}
