// Deterministic intake controls, kept independent of the model and scheduler.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareAiPulseDraft} from './intake-ai-pulse.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const dubaiDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function selectPack(files, date) {
  const candidates = files.filter(f => f.name.startsWith(`Daily Content Pack - ${date}`) && /\.(docx|md)$/i.test(f.name));
  if (!candidates.length) return null;
  const ranked = candidates.map(f => ({...f, rank: / FRESH\.docx$/i.test(f.name) ? 10000 : / V(\d+)\.docx$/i.test(f.name) ? 100 + Number(f.name.match(/ V(\d+)\.docx$/i)[1]) : f.name === `Daily Content Pack - ${date}.docx` ? 10 : f.name === `Daily Content Pack - ${date}.md` ? 1 : 0})).sort((a,b) => b.rank-a.rank);
  assert.ok(ranked[0].rank > 0, 'Unrecognised pack variant requires editorial selection');
  assert.ok(ranked.length === 1 || ranked[0].rank > ranked[1].rank, 'Ambiguous pack variants require editorial selection');
  return ranked[0];
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
  for(const match of result.article.content.matchAll(/\]\(\/insights\/([a-z0-9-]+\/[a-z0-9-]+)\/?\)/g)) assert.ok(related.some(a=>a.id===match[1]),`Body links an unpublished or unknown article: ${match[1]}`);
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
