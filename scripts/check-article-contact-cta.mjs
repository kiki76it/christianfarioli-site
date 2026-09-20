import assert from 'node:assert/strict';
import test from 'node:test';
import { ARTICLE_CONTACT, ARTICLE_CTA_COPY, articleCTAWhatsAppUrl, resolveArticleCTA } from '../src/lib/article-contact-cta.mjs';
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

const aiTrainingCostSlug = 'executive-education/corporate-ai-training-cost-dubai';
const aiTrainingCostCanonical = `https://christianfarioli.com/insights/${aiTrainingCostSlug}/`;

test('AI training cost article has the exact requested per-post CTA', () => {
  const copy = resolveArticleCTA(aiTrainingCostSlug, 'executive-education');
  assert.equal(copy.variant, 'training');
  assert.equal(copy.title, 'Planning AI training for your team in Dubai?');
  assert.equal(copy.description, 'Share your team size, roles, learning priorities and preferred dates. Let’s discuss the right programme for your organisation and a tailored training proposal.');
  assert.equal(copy.bookingLabel, 'Book a Call with Christian');
  assert.equal(copy.whatsapp.prompt, 'Prefer to request a quote in writing?');
  assert.equal(copy.whatsapp.label, 'WhatsApp');
  assert.equal(ARTICLE_CONTACT.bookingUrl, 'https://calendly.com/chrisfarioli/30min');
});

test('new article CTA does not restore WhatsApp or change booking labels on other posts', () => {
  for (const category of ['executive-education', 'ai-strategy', 'ai-marketing', 'aiso', 'ai-leadership', 'advanced-strategies', 'future-of-work', 'human-centered-ai']) {
    const slug = `${category}/another-post`;
    const copy = resolveArticleCTA(slug, category);
    assert.equal(copy.whatsapp, undefined);
    assert.equal(copy.bookingLabel, undefined);
    assert.equal(articleCTAWhatsAppUrl(slug, `https://christianfarioli.com/insights/${slug}/`), undefined);
  }
  const existingB2B = resolveArticleCTA('advanced-strategies/b2b-marketing-strategy', 'advanced-strategies');
  assert.equal(existingB2B.whatsapp, undefined);
  assert.equal(existingB2B.bookingLabel, undefined);
  assert.equal(ARTICLE_CONTACT.bookingLabel, 'Book a Call with Prof.Christian');
  assert.equal(ARTICLE_CONTACT.inlinePrompt, 'Ready to put these ideas to work?');
  assert.equal(ARTICLE_CONTACT.inlineLinkLabel, 'Book a call');
});

test('training enquiry preserves exact punctuation, blank lines, prompts and production canonical', () => {
  const link = new URL(articleCTAWhatsAppUrl(aiTrainingCostSlug, aiTrainingCostCanonical));
  assert.equal(link.origin + link.pathname, 'https://wa.me/971509596182');
  assert.deepEqual([...link.searchParams.keys()], ['text']);
  assert.equal(link.searchParams.get('text'), 'Hi Christian, I’ve read your guide to corporate AI training costs in Dubai. I’d like to discuss a training proposal for our team.\n\nOur team size:\nRoles or departments:\nMain learning priorities:\nPreferred dates and format:\n\n' + aiTrainingCostCanonical);
  assert.ok(link.href.includes('%E2%80%99'));
  assert.ok(link.href.includes('%0A%0A'));
  assert.equal(articleCTAWhatsAppUrl(aiTrainingCostSlug, undefined), undefined);
});

test('each contact click queues one minimal event through the existing dataLayer', () => {
  for (const [articleCtaLink, ctaPosition] of [['booking', 'end_article'], ['booking', 'mid_article'], ['whatsapp', 'end_article']]) {
    const dataLayer = [];
    trackArticleContactClick({ dataLayer }, { articleCtaLink, articleSlug: 'category/post', ctaVariant: 'marketing', ctaPosition });
    assert.deepEqual(dataLayer, [{ event: 'article_contact_click', contact_method: articleCtaLink,
      article_slug: 'category/post', cta_variant: 'marketing', cta_position: ctaPosition }]);
  }
});

test('training WhatsApp tracking reports a click without message content or conversion claims', () => {
  const dataLayer = [];
  trackArticleContactClick({ dataLayer }, {
    articleCtaLink: 'whatsapp', articleSlug: aiTrainingCostSlug,
    ctaVariant: 'training', ctaPosition: 'end_article',
    message: 'This must not enter analytics', canonicalUrl: aiTrainingCostCanonical,
  });
  assert.deepEqual(dataLayer, [{
    event: 'article_contact_click', contact_method: 'whatsapp',
    article_slug: aiTrainingCostSlug, cta_variant: 'training', cta_position: 'end_article',
  }]);
  trackArticleContactClick({ dataLayer }, {
    articleCtaLink: 'whatsapp_sent', articleSlug: aiTrainingCostSlug,
    ctaVariant: 'training', ctaPosition: 'end_article',
  });
  assert.equal(dataLayer.length, 1);
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
