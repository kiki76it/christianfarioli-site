import { ARTICLE_CONTACT, resolveArticleCTA } from './article-contact-cta.mjs';

const MIN_WORDS = 1500;
const MIN_REMAINING_WORDS = 400;
const SKIPPED_ELEMENTS = new Set(['pre', 'code', 'script', 'style']);
const BLOCK_ELEMENTS = new Set([
  'p', 'div', 'section', 'article', 'aside', 'blockquote', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'br', 'hr', 'dl', 'dt', 'dd',
]);

function attribute(node, name) {
  const camelName = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  if (node.properties) return node.properties[name] ?? node.properties[camelName];
  const value = node.attributes?.find((item) => item.type === 'mdxJsxAttribute' && item.name === name)?.value;
  return typeof value === 'string' ? value : undefined;
}

function classes(node) {
  const value = attribute(node, 'className') ?? attribute(node, 'class');
  return Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\s+/) : [];
}

function isReminder(node) {
  return classes(node).includes('article-contact-reminder') || attribute(node, 'data-cta-position') === 'mid_article';
}

function isContactCTA(node) {
  return isReminder(node)
    || classes(node).includes('article-contact-cta')
    || attribute(node, 'data-article-cta-link') != null;
}

function containsReminder(node) {
  return isReminder(node) || (node.children?.some(containsReminder) ?? false);
}

// Only count visible, static editorial text. Raw HTML and MDX expressions are
// deliberately excluded: evaluating them would require executing author code.
function editorialText(node) {
  if (node.type === 'text') return node.value;
  const tag = node.tagName ?? node.name;
  if (SKIPPED_ELEMENTS.has(tag) || isContactCTA(node)) return '';
  if (!['root', 'element', 'mdxJsxFlowElement', 'mdxJsxTextElement'].includes(node.type)) return '';
  const text = (node.children ?? []).map(editorialText).join('');
  return BLOCK_ELEMENTS.has(tag) || node.type === 'mdxJsxFlowElement' ? ` ${text} ` : text;
}

function editorialWords(node) {
  return (editorialText(node).match(/[\p{L}\p{N}]+(?:['’\u002d][\p{L}\p{N}]+)*/gu) ?? []).length;
}

function articleContext(file) {
  if (typeof file?.path !== 'string') return null;
  const path = file.path.replace(/\\/g, '/');
  const match = path.match(/(?:^|\/)src\/content\/insights\/(.+)\.mdx?$/i);
  if (!match || match[1].split('/').some((part) => part === '.' || part === '..')) return null;
  const frontmatter = file.data?.astro?.frontmatter ?? {};
  return {
    slug: typeof frontmatter.slug === 'string' && frontmatter.slug.trim() ? frontmatter.slug.trim() : match[1],
    category: frontmatter.category,
  };
}

function reminder(slug, variant) {
  return {
    type: 'element',
    tagName: 'aside',
    properties: { className: ['article-contact-reminder'], 'aria-label': 'Discuss these ideas' },
    children: [{
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [
        { type: 'text', value: `${ARTICLE_CONTACT.inlinePrompt} ` },
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: ARTICLE_CONTACT.bookingUrl,
            'data-article-cta-link': 'booking',
            'data-article-slug': slug,
            'data-cta-variant': variant,
            'data-cta-position': 'mid_article',
          },
          children: [
            { type: 'text', value: `${ARTICLE_CONTACT.inlineLinkLabel} ` },
            {
              type: 'element', tagName: 'span', properties: { 'aria-hidden': 'true' },
              children: [{ type: 'text', value: '→' }],
            },
          ],
        },
      ],
    }],
  };
}

/**
 * Add one optional reminder to long Insight articles at build time. Only root
 * H2 boundaries are eligible, after a section containing editorial text.
 * Existing editorial nodes retain their identity, order, content and properties.
 */
export default function rehypeArticleContactCTA() {
  return (tree, file) => {
    const context = articleContext(file);
    if (!context || tree.type !== 'root' || !Array.isArray(tree.children) || containsReminder(tree)) return;
    // Astro's Markdown pipeline parses raw HTML after user plugins. A raw
    // opening/closing tag could wrap otherwise top-level Markdown nodes, so no
    // boundary is assumed safe until those tags have become a proper subtree.
    if (tree.children.some((node) => node.type === 'raw')) return;

    const words = tree.children.map(editorialWords);
    const total = words.reduce((sum, count) => sum + count, 0);
    if (total < MIN_WORDS) return;

    let preceding = 0;
    let hasSection = false;
    let sectionWords = 0;
    let bestIndex = -1;
    let bestDistance = Infinity;

    for (let index = 0; index < tree.children.length; index += 1) {
      const node = tree.children[index];
      if (node.type === 'element' && node.tagName === 'h2') {
        const fraction = preceding / total;
        if (hasSection && sectionWords > 0 && fraction >= 0.35 && fraction <= 0.65 && total - preceding >= MIN_REMAINING_WORDS) {
          const distance = Math.abs(fraction - 0.5);
          if (distance < bestDistance) {
            bestIndex = index;
            bestDistance = distance;
          }
        }
        hasSection = true;
        sectionWords = 0;
      } else if (hasSection && !/^h[1-6]$/.test(node.tagName ?? '')) {
        sectionWords += words[index];
      }
      preceding += words[index];
    }

    if (bestIndex < 0) return;
    const { variant } = resolveArticleCTA(context.slug, context.category);
    tree.children.splice(bestIndex, 0, reminder(context.slug, variant));
  };
}
