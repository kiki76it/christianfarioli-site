import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import { aiPulseErrors, assertAiPulse, isOffsetTimestamp } from '../src/lib/ai-pulse.mjs';
import { INSIGHT_CATEGORIES } from '../src/lib/categories.mjs';
import { prepareAiPulseDraft, writeAiPulseDraft } from './intake-ai-pulse.mjs';
import { prepareTransition } from './publish.mjs';

const content = `This is an internal contract fixture, not a report of an AI development.

## What happened
No news is asserted by this test.

## Why it matters
This checks a draft's publishing contract.

## The bigger shift
The fixture preserves editorial separation.

## My take
No opinion is attributed for publication.
`;

function payload(overrides = {}) {
  return {
    title: 'Internal AI Pulse contract test', slug: 'internal-contract-test', category: 'ai-pulse',
    excerpt: 'An internal content fixture for validating the AI Pulse editorial contract.',
    content, featured_image: '/images/authors/christian-farioli.jpg',
    featured_image_alt: 'Prof. Christian Farioli portrait used for internal testing',
    sources: [{ name: 'Christian Farioli', title: 'Website', url: 'https://christianfarioli.com/' }],
    meta_title: 'Internal AI Pulse contract test',
    meta_description: 'An internal content fixture for validating the AI Pulse editorial contract.',
    author: 'Prof. Christian Farioli', schema_type: 'NewsArticle', ...overrides,
  };
}

test('taxonomy retains every evergreen category in the requested filter order', () => {
  assert.deepEqual(INSIGHT_CATEGORIES, ['ai-pulse', 'ai-strategy', 'ai-leadership', 'future-of-work', 'aiso', 'human-centered-ai', 'ai-marketing', 'executive-education', 'advanced-strategies']);
});

test('timestamp validation rejects date-only, local-time and impossible dates', () => {
  for (const date of ['2026-10-07', '2026-10-07T07:00:00', '2026-02-29T07:00:00Z', '2026-04-31T07:00:00+04:00', '2026-10-07T24:00:00Z', '2026-10-07T07:00:00+14:30', 'garbage', new Date()]) assert.equal(isOffsetTimestamp(date), false, String(date));
  for (const date of ['2026-10-07T07:00:00+04:00', '2024-02-29T03:00:00.123Z', '2026-10-07T07:00:00-05:30']) assert.equal(isOffsetTimestamp(date), true, date);
});

test('source edition preserves a calendar date without becoming a publication clock', () => {
  const { data } = prepareAiPulseDraft(payload());
  for (const sourceEditionDate of ['2026-08-12', '2024-02-29']) {
    assert.deepEqual(aiPulseErrors({ ...data, sourceEditionDate }, content), []);
  }
  for (const sourceEditionDate of ['2026-02-29', '2026-04-31', '2026-10-07T00:00:00Z', 'today', new Date()]) {
    assert.throws(() => assertAiPulse({ ...data, sourceEditionDate }, content), /sourceEditionDate/);
  }
  assert.throws(() => assertAiPulse({ ...data, status: 'published', sourceEditionDate: '2026-08-12' }, content), /requires publishedAt/);
});

test('external intake remains draft and frontmatter survives quotes and multiline text', () => {
  const draft = prepareAiPulseDraft(payload({ title: 'An internal "quoted" test: safe output', internal_test: true }));
  const parsed = matter(draft.markdown);
  assert.equal(parsed.data.status, 'draft');
  assert.equal(parsed.data.internalTest, true);
  assert.equal(parsed.data.title, 'An internal "quoted" test: safe output');
  assert.equal(parsed.data.updatedAt, undefined);
  assert.equal(parsed.data.publishedAt, undefined);
  assert.deepEqual(aiPulseErrors(parsed.data, parsed.content), []);
  const timedDraft = matter(prepareAiPulseDraft(payload({ date_published: '2026-10-07T07:00:00+04:00' })).markdown);
  assert.equal(timedDraft.data.publishedAt, '2026-10-07T07:00:00+04:00');
  assert.deepEqual(aiPulseErrors(timedDraft.data, timedDraft.content), []);
});

test('intake validates attribution, metadata, source protocols and reserved fields', () => {
  for (const overrides of [{ sources: [] }, { author: 'Admin' }, { schema_type: 'BlogPosting' }, { sources: [{ name: 'Bad', url: 'javascript:alert(1)' }] }, { meta_description: 'Too short' }, { status: 'published' }, { updatedAt: '2026-10-07T07:00:00Z' }, { internal_test: 'yes' }, { featured_image: '//other.test/image.jpg' }]) assert.throws(() => prepareAiPulseDraft(payload(overrides)));
});

test('external body rejects HTML, imports and executable link schemes', () => {
  for (const unsafe of ['<script>alert(1)</script>', 'import Danger from "danger";', '[bad](javascript:alert(1))', '[bad](jav&#x61;script:alert(1))', '[bad](java&#9;script:alert(1))', '[bad](java&#x0a;script:alert(1))', '[bad](java&Tab;script:alert(1))', '[bad](java\tscript:alert(1))', '[bad](data:text/html,boom)']) assert.throws(() => prepareAiPulseDraft(payload({ content: `${unsafe}\n${content}` })));
});

test('source section is rendered once and ordered body sections contain text', () => {
  const { data } = prepareAiPulseDraft(payload());
  assert.throws(() => assertAiPulse(data, content + '\n## Sources\nDuplicate source list.'));
  assert.throws(() => assertAiPulse(data, content.replace('## What happened', '## What might happen')));
  assert.throws(() => assertAiPulse(data, content.replace('No news is asserted by this test.', '')));
  assert.throws(() => assertAiPulse(data, content.replace('## What happened', '## My take').replace(/## My take(?=\nNo opinion)/, '## What happened')));
  assert.throws(() => assertAiPulse(data, '```markdown\n' + content + '\n```'));
});

test('internal placeholders cannot advance into review or public statuses', () => {
  const { data } = prepareAiPulseDraft(payload({ internal_test: true }));
  assert.throws(() => prepareTransition(data, content, 'review'), /internal test/);
  assert.throws(() => assertAiPulse({ ...data, status: 'published', publishedAt: '2026-10-07T07:00:00+04:00' }, content), /internal test/);
  assert.throws(() => assertAiPulse({ ...data, status: 'scheduled', scheduledFor: '2026-10-07T07:00:00+04:00' }, content), /internal test/);
});

test('published and scheduled content requires precise clocks; evergreen validation stays unchanged', () => {
  const { data } = prepareAiPulseDraft(payload());
  assert.throws(() => assertAiPulse({ ...data, status: 'published' }, content), /requires publishedAt/);
  assert.throws(() => assertAiPulse({ ...data, status: 'scheduled' }, content), /requires scheduledFor/);
  assert.throws(() => assertAiPulse({ ...data, status: 'published', publishedAt: '2026-10-07' }, content), /timezone/);
  assert.deepEqual(aiPulseErrors({ category: 'advanced-strategies', status: 'published', publishedAt: '2025-01-01' }, 'Legacy article'), []);
  assert.deepEqual(aiPulseErrors({ ...data, status: 'published', publishedAt: new Date('2026-10-07T03:00:00Z') }, content, { allowDates: true }), []);
});

test('updates require a later editorial timestamp and workflow transitions never synthesize one', () => {
  const { data } = prepareAiPulseDraft(payload());
  const reviewed = prepareTransition(data, content, 'review');
  const scheduled = prepareTransition(reviewed, content, 'scheduled', { 'scheduled-for': '2026-10-08T07:00:00+04:00' });
  const published = prepareTransition(scheduled, content, 'published', { 'published-at': '2026-10-08T07:00:00+04:00' });
  assert.equal(published.updatedAt, undefined);
  assert.throws(() => assertAiPulse({ ...published, updatedAt: published.publishedAt }, content));
  assert.throws(() => assertAiPulse({ ...data, updatedAt: '2026-10-08T08:00:00+04:00' }, content));
  const updated = { ...published, updatedAt: '2026-10-08T08:00:00+04:00' };
  const afterUpdate = new Date('2026-10-09T07:00:00+04:00');
  const returned = prepareTransition(updated, content, 'draft', {}, afterUpdate);
  assert.equal(returned.updatedAt, updated.updatedAt);
  const republished = prepareTransition({ ...returned, status: 'scheduled' }, content, 'published', {}, afterUpdate);
  assert.equal(republished.publishedAt, published.publishedAt);
  assert.equal(republished.updatedAt, updated.updatedAt);
});

test('scheduled dual dates agree as instants and editorial updates cannot be future-dated', () => {
  const { data } = prepareAiPulseDraft(payload());
  const now = new Date('2026-10-07T09:00:00+04:00');
  const scheduled = { ...data, status: 'scheduled', scheduledFor: '2026-10-07T07:00:00+04:00' };
  assert.throws(() => assertAiPulse({ ...scheduled, publishedAt: '2026-10-08T07:00:00+04:00' }, content, { now }), /same instant/);
  assert.deepEqual(aiPulseErrors({ ...scheduled, publishedAt: '2026-10-07T03:00:00Z' }, content, { now }), []);
  for (const status of ['draft', 'review', 'scheduled', 'published']) {
    const dated = { ...scheduled, status, publishedAt: scheduled.scheduledFor };
    assert.throws(() => assertAiPulse({ ...dated, updatedAt: '2026-10-07T10:00:00+04:00' }, content, { now }), /cannot be in the future/);
    assert.deepEqual(aiPulseErrors({ ...dated, updatedAt: '2026-10-07T08:00:00+04:00' }, content, { now }), []);
  }
});

test('late scheduled promotion preserves publication time; early publication uses the real clock', () => {
  const { data } = prepareAiPulseDraft(payload());
  const scheduled = { ...data, status: 'scheduled', scheduledFor: '2026-10-07T07:00:00+04:00' };
  const due = prepareTransition(scheduled, content, 'published', {}, new Date('2026-10-08T04:00:00Z'));
  assert.equal(due.publishedAt, scheduled.scheduledFor);
  assert.equal(due.updatedAt, undefined);
  assert.throws(() => prepareTransition(scheduled, content, 'published', { 'published-at': '2026-10-08T04:00:00Z' }, new Date('2026-10-08T04:00:00Z')), /Publication time already exists/);
  const earlyNow = new Date('2026-10-07T01:00:00Z');
  const early = prepareTransition(scheduled, content, 'published', {}, earlyNow);
  assert.equal(early.publishedAt, earlyNow.toISOString());
  assert.throws(() => prepareTransition({ ...due, status: 'scheduled' }, content, 'published', { 'published-at': '2026-10-09T07:00:00+04:00' }), /Publication time already exists/);
});

test('intake cannot traverse paths or overwrite either Markdown format', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ai-pulse-contract-'));
  t.after(() => {
    const resolved = resolve(root);
    assert.ok(resolved.startsWith(resolve(tmpdir()) + sep));
    assert.match(resolved, /ai-pulse-contract-[^\\/]+$/);
    rmSync(resolved, { recursive: true, force: true });
  });
  for (const slug of ['../escape', '..\\escape', '/absolute', 'ai-pulse/nested', 'a.md', '', 'UPPER']) assert.throws(() => writeAiPulseDraft(payload({ slug }), root), /slug/);
  const path = writeAiPulseDraft(payload(), root);
  assert.match(path, /\.md$/);
  const original = readFileSync(path, 'utf8');
  assert.throws(() => writeAiPulseDraft(payload(), root), /already exists/);
  assert.equal(readFileSync(path, 'utf8'), original);
  writeFileSync(join(root, 'ai-pulse', 'existing-mdx.mdx'), 'existing');
  assert.throws(() => writeAiPulseDraft(payload({ slug: 'existing-mdx' }), root), /already exists/);
});
