import assert from 'node:assert/strict';
import test from 'node:test';
import { ARTICLE_CTA_COPY, resolveArticleCTA } from '../src/lib/article-contact-cta.mjs';
import { trackArticleContactClick } from '../src/lib/article-contact-tracking.mjs';

test('explicit B2B override wins over category with exact marketing description', () => {
  assert.deepEqual(resolveArticleCTA('advanced-strategies/b2b-marketing-strategy', 'ai-strategy'), {
    variant: 'marketing', title: 'What would a stronger B2B strategy look like for your business?',
    description: ARTICLE_CTA_COPY.marketing.description,
  });
});
test('specific existing categories have deterministic variants and broad categories fall back', () => {
  for (const [category, variant] of Object.entries({
    'ai-strategy': 'ai', 'ai-marketing': 'marketing', aiso: 'marketing',
    'executive-education': 'training', 'advanced-strategies': 'general',
    'ai-leadership': 'general', 'human-centered-ai': 'general', 'future-of-work': 'general',
    'unknown-future-category': 'general', constructor: 'general',
  })) assert.equal(resolveArticleCTA('new-post', category).variant, variant);
});
test('each contact click queues one minimal event through the existing dataLayer', () => {
  for (const [articleCtaLink, ctaPosition] of [['booking', 'end_article'], ['booking', 'mid_article']]) {
    const dataLayer = [];
    trackArticleContactClick({ dataLayer }, { articleCtaLink, articleSlug: 'category/post', ctaVariant: 'marketing', ctaPosition });
    assert.deepEqual(dataLayer, [{ event: 'article_contact_click', contact_method: articleCtaLink,
      article_slug: 'category/post', cta_variant: 'marketing', cta_position: ctaPosition }]);
  }
});
test('missing, blocked or throwing analytics never blocks links; malformed attributes are ignored', () => {
  const data = { articleCtaLink: 'booking', articleSlug: 'post', ctaVariant: 'general', ctaPosition: 'end_article' };
  assert.doesNotThrow(() => trackArticleContactClick({}, data));
  assert.doesNotThrow(() => trackArticleContactClick({ dataLayer: { push() { throw new Error('blocked'); } } }, data));
  const dataLayer = [];
  trackArticleContactClick({ dataLayer }, { ...data, articleCtaLink: 'lead_acquired' });
  trackArticleContactClick({ dataLayer }, { ...data, ctaPosition: 'other' });
  assert.equal(dataLayer.length, 0);
});
