// Deterministic intake controls, kept independent of the model and scheduler.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareAiPulseDraft} from './intake-ai-pulse.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const dubaiDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function selectPack(files, date) {
  assert.ok(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date, 'Invalid pack date');
  const candidates = files.filter(f => f.name.startsWith(`Daily Content Pack - ${date}`) && /\.(docx|md)$/i.test(f.name));
  if (!candidates.length) return null;
  const pattern = new RegExp(`^Daily Content Pack - ${date}(?: (FRESH|V([1-9]\\d*)))?\\.(docx|md)$`, 'i');
  const ranked = candidates.map(f => {
    const match = f.name.match(pattern), revision = Number(match?.[2] || 0);
    const valid = match && (!match[1] || match[3].toLowerCase() === 'docx') && Number.isSafeInteger(revision);
    return {...f, rank: !valid ? 0 : match[1]?.toUpperCase() === 'FRESH' ? 4 : match[2] ? 3 : match[3].toLowerCase() === 'docx' ? 2 : 1, revision};
  }).sort((a,b) => b.rank-a.rank || b.revision-a.revision);
  assert.ok(ranked[0].rank > 0, 'Unrecognised pack variant requires editorial selection');
  assert.ok(ranked.length === 1 || ranked[0].rank > ranked[1].rank || ranked[0].revision > ranked[1].revision, 'Ambiguous pack variants require editorial selection');
  return ranked[0];
}

// Daily articles use ordinary inline Markdown links. Reference definitions are
// deliberately held rather than partly interpreted by an ad-hoc Markdown parser.
export function validatePublishedBodyLinks(content, related) {
  assert.ok(!/\]:/.test(content), 'Reference-style links require editorial review');
  const destinations = [];
  const punctuation = /[!-/:-@\[-`{-~]/;
  for (let start = content.indexOf(']('); start >= 0; start = content.indexOf('](', start + 2)) {
    let cursor = start + 2, depth = 0, raw = '';
    while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
    for (; cursor < content.length; cursor++) {
      const char = content[cursor];
      if (char === '\\' && punctuation.test(content[cursor + 1] || '')) { raw += char + content[++cursor]; continue; }
      if (char === '(') depth++;
      if (char === ')') { if (!depth) break; depth--; }
      if (/\s/.test(char)) break;
      raw += char;
    }
    assert.ok(raw && depth === 0, 'Ambiguous Markdown link destination requires review');
    while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
    if (['"', "'", '('].includes(content[cursor])) {
      const end = content[cursor] === '(' ? ')' : content[cursor]; cursor++;
      while (cursor < content.length && content[cursor] !== end) { if (content[cursor] === '\\') cursor++; cursor++; }
      assert.equal(content[cursor++], end, 'Unclosed Markdown link title');
      while (/\s/.test(content[cursor] || '') && cursor < content.length) cursor++;
    }
    assert.equal(content[cursor], ')', 'Ambiguous Markdown link requires editorial review');
    destinations.push(raw);
  }
  // GFM can turn bare absolute URLs into links, so those must be checked too.
  destinations.push(...(content.match(/https?:\/\/[^\s<>"']+/gi) || []).map(url => url.replace(/[),.;!?]+$/, '')));
  destinations.push(...(content.match(/\bwww\.christianfarioli\.com\/[^\s<>"']+/gi) || []).map(url => 'https://' + url.replace(/[),.;!?]+$/, '')));
  for (const raw of destinations) {
    const destination = raw.replace(/\\([!-/:-@\[-`{-~])/g, '$1').replace(/&amp;/gi, '&');
    assert.ok(!/&(?:#(?:x[\da-f]+|\d+);?|[a-z][a-z\d]+;)/i.test(destination), 'Entity-encoded link destinations require editorial review');
    let url;
    try { url = new URL(destination, 'https://christianfarioli.com'); } catch { assert.fail('Invalid Markdown link destination'); }
    if (!['christianfarioli.com', 'www.christianfarioli.com'].includes(url.hostname.toLowerCase())) continue;
    assert.ok(/^(?:https?:\/\/|\/|#|\?)/i.test(destination), 'Relative link destinations require editorial review');
    let path = url.pathname;
    try { for (let count = 0; count < 3; count++) { const decoded = decodeURIComponent(path); if (decoded === path) break; path = decoded; } }
    catch { assert.fail('Invalid encoded internal link'); }
    assert.ok(!/%[\da-f]{2}/i.test(path), 'Ambiguous encoded internal link');
    path = new URL(path.replaceAll('\\', '/'), 'https://christianfarioli.com').pathname;
    if (!/^\/insights(?:\/|$)/i.test(path)) continue;
    assert.ok(!url.username && !url.password && !url.port && /^https?:$/.test(url.protocol), 'Invalid production article origin');
    const id = path.replace(/^\/insights\//, '').replace(/\/$/, '');
    assert.ok(related.some(article => article.id === id), `Body links an unpublished or unknown article: ${id}`);
  }
}
export function validateResult(result, {images, related, existingTitles=[], date}) {
  assert.equal(result.status, 'ready', `Editorial hold: ${(result.issues || []).join('; ')}`);
  assert.deepEqual(result.issues, [], 'Unresolved verification issues require review');
  assert.match(result.newsDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(result.newsDate)) && new Date(result.newsDate).toISOString().slice(0,10)===result.newsDate && result.newsDate <= date, 'News date must be verified and not in the future');
  assert.ok(result.article && !('date_published' in result.article) && !('internal_test' in result.article), 'Daily intake creates undated real drafts only');
  const draft = prepareAiPulseDraft(result.article);
  const words = result.article.content.trim().split(/\s+/).length;
  assert.ok(words >= 450 && words <= 900, `Expected 450-900 words; received ${words}`);
  assert.equal((result.article.content.match(/^## /gm) || []).length, 4, 'Exactly four editorial H2 sections required');
  assert.ok(!existingTitles.some(title => title.toLowerCase() === draft.data.title.toLowerCase()), 'Duplicate article title');
  assert.ok(images.some(i => i.path === result.article.featured_image && i.alt === result.article.featured_image_alt), 'Use an inspected image and its accurate alt text');
  assert.ok(result.article.internal_links.length >= 1 && result.article.internal_links.length <= 3, 'One to three relevant evergreen links required');
  for(const link of result.article.internal_links) assert.ok(related.some(a => a.id === link.slug), `Not an approved published evergreen: ${link.slug}`);
  validatePublishedBodyLinks(result.article.content, related);
  assert.ok(Array.isArray(result.claims) && result.claims.length >= 1, 'Source-backed claim ledger required');
  for(const claim of result.claims) {
    assert.ok(claim.fact.trim().length > 10 && claim.support.trim().length > 10, 'Claims need substantive source support');
    assert.ok(result.article.sources.some(s => s.url === claim.sourceUrl), 'Claim source must appear in article sources');
  }
  for(const source of result.article.sources) {
    const url=new URL(source.url);
    assert.ok(!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/i.test(url.hostname) && url.hostname.includes('.') && !/\.(local|internal)$/i.test(url.hostname), 'Sources must use public websites');
    assert.ok(result.claims.some(c => c.sourceUrl === source.url), 'Each listed source needs a checked claim');
  }
  return {draft, words};
}
// A completed open with a non-error result is runtime evidence of source
// access. It does not turn a model-generated fact check into human approval.
export function accessedSourceUrls(jsonl) {
  const urls = new Set();
  for(const line of jsonl.split(/\r?\n/).filter(Boolean)) {
    let event; try { event=JSON.parse(line); } catch { continue; }
    if(event.type !== 'item.completed' || event.item?.type !== 'web_search' || event.item.action?.type !== 'open_page') continue;
    for(const result of event.item.results || []) {
      const failed=/^(?:internal error|error\b)|failed to fetch|(?:HTTP|status(?: code)?)\s*[:=]?\s*[45]\d\d|unsupported (?:URL|content)|access denied|blocked by robots/i.test(`${result.title || ''} ${result.snippet || ''}`);
      if(result.type === 'text_result' && result.url && !failed) urls.add(result.url);
    }
  }
  return urls;
}
export const readJson = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
