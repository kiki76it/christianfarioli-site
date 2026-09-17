import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createMarkdownProcessor, markdownConfigDefaults, parseFrontmatter } from '@astrojs/markdown-remark';
import { createMdxProcessor } from '../node_modules/@astrojs/mdx/dist/plugins.js';
import { VFile } from 'vfile';
import rehypeArticleContactCTA from '../src/lib/rehype-article-contact-cta.mjs';
import { ARTICLE_CONTACT, resolveArticleCTA } from '../src/lib/article-contact-cta.mjs';

const words = (count) => Array(count).fill('editorial').join(' ');
const element = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const paragraph = (count) => element('p', [text(words(count))]);
const heading = () => element('h2', [text('Section')]);
const root = (...children) => ({ type: 'root', children });
const article = (slug = 'example', category = 'ai-strategy') => ({
  path: `C:\\site\\src\\content\\insights\\${category}\\${slug}.md`,
  data: { astro: { frontmatter: { category } } },
});
const run = (tree, file = article()) => { rehypeArticleContactCTA()(tree, file); return tree; };
const reminders = (tree) => tree.children.filter((node) => node.properties?.className?.includes('article-contact-reminder'));
const reminderLink = (tree) => reminders(tree)[0]?.children[0].children[1];

test('requires at least 1500 editorial words, including the headings', () => {
  assert.equal(reminders(run(root(heading(), paragraph(748), heading(), paragraph(749)))).length, 0);
  assert.equal(reminders(run(root(heading(), paragraph(749), heading(), paragraph(749)))).length, 1);
});

test('chooses the complete top-level section closest to the midpoint', () => {
  const tree = root(heading(), paragraph(599), heading(), paragraph(199), heading(), paragraph(199), heading(), paragraph(599));
  const originalNodes = [...tree.children];
  const originalContent = structuredClone(tree);
  run(tree);
  assert.equal(tree.children.indexOf(reminders(tree)[0]), 4);
  assert.deepEqual(tree.children.filter((node) => !reminders(tree).includes(node)), originalContent.children);
  assert.deepEqual(tree.children.filter((node) => !reminders(tree).includes(node)), originalNodes);
  for (const node of originalNodes) assert.ok(tree.children.includes(node));
});

test('skips articles with no eligible section boundary near the midpoint', () => {
  assert.equal(reminders(run(root(heading(), paragraph(1300), heading(), paragraph(300)))).length, 0);
  assert.equal(reminders(run(root(paragraph(800), heading(), paragraph(800)))).length, 0);
  assert.equal(reminders(run(root(heading(), paragraph(800), heading(), heading(), paragraph(800)))).length, 1);
});

test('never inserts into nested paragraphs, lists, tables, blockquotes or code', () => {
  for (const tag of ['p', 'ul', 'ol', 'table', 'blockquote', 'pre']) {
    const nested = element(tag, [paragraph(400), heading(), paragraph(400)]);
    const tree = root(heading(), paragraph(400), nested, paragraph(400));
    const original = structuredClone(tree);
    run(tree);
    assert.deepEqual(tree, original, tag);
  }
});

test('preserves a complete nested section when placing a reminder after it', () => {
  const nested = element('blockquote', [paragraph(749)]);
  const tree = root(heading(), nested, heading(), element('ul', [element('li', [paragraph(749)])]));
  run(tree);
  assert.equal(tree.children[1], nested);
  assert.equal(tree.children[2], reminders(tree)[0]);
  assert.equal(tree.children[3].tagName, 'h2');
});

test('skips unresolved raw HTML wrappers instead of treating enclosed headings as safe', () => {
  const tree = root(
    { type: 'raw', value: '<blockquote>' }, heading(), paragraph(800),
    heading(), paragraph(800), { type: 'raw', value: '</blockquote>' },
  );
  const original = structuredClone(tree);
  run(tree);
  assert.deepEqual(tree, original);
});

test('excludes code, scripts, styles, raw HTML, expressions and CTA text from the threshold', () => {
  const ignored = [
    ...['pre', 'code', 'script', 'style'].map((tag) => element(tag, [text(words(2000))])),
    element('aside', [paragraph(2000)], { className: ['article-contact-cta'] }),
    { type: 'raw', value: `<p>${words(2000)}</p>` },
    { type: 'mdxFlowExpression', value: words(2000) },
  ];
  for (const node of ignored) {
    const tree = root(heading(), paragraph(350), node, heading(), paragraph(350));
    assert.equal(reminders(run(tree)).length, 0, node.tagName ?? node.type);
  }
});

test('is idempotent and recognises existing nested reminders', () => {
  const tree = run(root(heading(), paragraph(800), heading(), paragraph(800)));
  const firstResult = structuredClone(tree);
  run(tree);
  assert.deepEqual(tree, firstResult);
  const nestedTree = root(heading(), paragraph(800), element('div', [reminders(tree)[0]]), heading(), paragraph(800));
  const nestedOriginal = structuredClone(nestedTree);
  run(nestedTree);
  assert.deepEqual(nestedTree, nestedOriginal);
});

test('is scoped to Insight .md and .mdx source files', () => {
  for (const path of [undefined, '/site/src/content/categories/ai.md', '/site/src/pages/insights.mdx', '/site/src/content/insights/example.txt', '/site/src/content/insights/../categories/ai.md']) {
    const tree = root(heading(), paragraph(800), heading(), paragraph(800));
    assert.equal(reminders(run(tree, { path })).length, 0, path);
  }
  for (const path of ['/site/src/content/insights/ai-strategy/example.mdx', 'src/content/insights/example.md']) {
    assert.equal(reminders(run(root(heading(), paragraph(800), heading(), paragraph(800)), { path })).length, 1, path);
  }
});

test('renders an ordinary accessible booking link with accurate tracking attributes', () => {
  const tree = run(root(heading(), paragraph(800), heading(), paragraph(800)));
  const link = reminderLink(tree);
  assert.equal(link.tagName, 'a');
  assert.equal(link.properties.href, ARTICLE_CONTACT.bookingUrl);
  assert.equal(link.properties['data-article-cta-link'], 'booking');
  assert.equal(link.properties['data-article-slug'], 'ai-strategy/example');
  assert.equal(link.properties['data-cta-variant'], resolveArticleCTA('ai-strategy/example', 'ai-strategy').variant);
  assert.equal(link.properties['data-cta-position'], 'mid_article');
  assert.equal(link.children[0].value.trim(), ARTICLE_CONTACT.inlineLinkLabel);
  assert.equal(link.children[1].properties['aria-hidden'], 'true');
  assert.equal(link.properties.onClick, undefined);
});

test('honours Astro frontmatter slug overrides', () => {
  const file = article();
  file.data.astro.frontmatter.slug = 'custom/article-name';
  const tree = run(root(heading(), paragraph(800), heading(), paragraph(800)), file);
  assert.equal(reminderLink(tree).properties['data-article-slug'], 'custom/article-name');
});

test('Astro Markdown renders a representative source article with one reminder', async () => {
  const fileURL = new URL('../src/content/insights/advanced-strategies/content-marketing-strategy-2.md', import.meta.url);
  const { content, frontmatter } = parseFrontmatter(await readFile(fileURL, 'utf8'));
  const processor = await createMarkdownProcessor({ syntaxHighlight: false, rehypePlugins: [rehypeArticleContactCTA] });
  const result = await processor.render(content, { fileURL, frontmatter });
  assert.equal((result.code.match(/class="article-contact-reminder"/g) ?? []).length, 1);
  assert.ok(result.code.includes(`href="${ARTICLE_CONTACT.bookingUrl}"`));
  assert.ok(result.code.includes('data-article-slug="advanced-strategies/content-marketing-strategy-2"'));
  assert.ok(result.code.includes('data-cta-position="mid_article"'));
});

test('the installed Astro MDX pipeline accepts HAST insertion and preserves headings', async () => {
  const fileURL = new URL('../src/content/insights/ai-strategy/how-to-choose-an-ai-keynote-speaker-in-dubai.mdx', import.meta.url);
  const { content, frontmatter } = parseFrontmatter(await readFile(fileURL, 'utf8'));
  const processor = createMdxProcessor({
    ...markdownConfigDefaults, syntaxHighlight: false, optimize: true,
    remarkPlugins: [], rehypePlugins: [rehypeArticleContactCTA], recmaPlugins: [],
  }, { sourcemap: false, experimentalHeadingIdCompat: false });
  const file = new VFile({ value: content, path: fileURLToPath(fileURL), data: { astro: { frontmatter } } });
  const result = await processor.process(file);
  const code = String(result.value);
  assert.equal((code.match(/article-contact-reminder/g) ?? []).length, 1);
  assert.ok(code.includes(ARTICLE_CONTACT.bookingUrl));
  assert.ok(code.includes('mid_article'));
  assert.ok(code.includes('Start with the audience and the decision'));
});
