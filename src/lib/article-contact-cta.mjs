// Shared by the Astro component and the Markdown/MDX build-time reminder.
// Booking destination verified against SiteNav.astro and main-site/index.html.
export const ARTICLE_CONTACT = Object.freeze({
  bookingUrl: 'https://calendly.com/chrisfarioli/30min',
  portrait: '/images/authors/christian-farioli.jpg',
  authorName: 'Prof. Christian Farioli',
  bookingLabel: 'Book a Call with Prof.Christian',
  inlinePrompt: 'Ready to put these ideas to work?',
  inlineLinkLabel: 'Book a call',
});

export const ARTICLE_CTA_COPY = Object.freeze({
  general: {
    title: 'Let’s put these ideas to work.',
    description: 'Planning a leadership event, developing your team or rethinking your strategy? Let’s discuss how I could support your organisation through a keynote, executive workshop or advisory engagement.',
  },
  marketing: {
    title: 'What would a stronger growth strategy look like for your business?',
    description: 'Let’s discuss your growth priorities and whether a strategy workshop or advisory engagement would be the right next step for your team.',
  },
  ai: {
    title: 'What should AI change in your organisation?',
    description: 'Let’s discuss where AI could create value for your business and whether a leadership workshop or advisory engagement would be the right next step.',
  },
  training: {
    title: 'Give your team the skills to put these ideas into practice.',
    description: 'Let’s discuss a tailored workshop or executive training programme built around your organisation’s priorities.',
  },
});

/** @typedef {keyof typeof ARTICLE_CTA_COPY} ArticleCTAVariant */

// Only specific, existing schema categories belong here. Broad categories such
// as advanced-strategies and ai-leadership deliberately use the general copy.
/** @type {Readonly<Record<string, ArticleCTAVariant>>} */
export const ARTICLE_CTA_CATEGORIES = Object.freeze({
  'ai-strategy': 'ai',
  'ai-marketing': 'marketing',
  aiso: 'marketing',
  'executive-education': 'training',
});

// Reviewed per-post choices take precedence over the primary category.
// Add future editorial overrides here without modifying article content.
/** @type {Readonly<Record<string, {variant: ArticleCTAVariant, title?: string}>>} */
export const ARTICLE_CTA_OVERRIDES = Object.freeze({
  'advanced-strategies/b2b-marketing-strategy': {
    variant: 'marketing',
    title: 'What would a stronger B2B strategy look like for your business?',
  },
});

/** @param {string} slug @param {string} category */
export function resolveArticleCTA(slug, category) {
  const override = Object.hasOwn(ARTICLE_CTA_OVERRIDES, slug)
    ? ARTICLE_CTA_OVERRIDES[slug] : undefined;
  const variant = override?.variant ?? (Object.hasOwn(ARTICLE_CTA_CATEGORIES, category)
    ? ARTICLE_CTA_CATEGORIES[category] : 'general');
  return { variant, ...ARTICLE_CTA_COPY[variant], ...(override?.title ? { title: override.title } : {}) };
}
