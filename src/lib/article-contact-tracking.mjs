/**
 * Queue one click event on the existing GTM dataLayer. Transport and any configured
 * consent stay with the existing container; neither is configured by this helper.
 * It adds no tracker, consent state, callback or navigation wait.
 * No title, canonical URL or visitor data enters the event.
 * @param {{dataLayer?: {push: (event: Record<string, string>) => unknown}}} host
 * @param {{articleCtaLink?: string, articleSlug?: string, ctaVariant?: string, ctaPosition?: string}} data
 */
export function trackArticleContactClick(host, data) {
  if (data.articleCtaLink !== 'booking' || !data.articleSlug
    || !['general', 'marketing', 'ai', 'training'].includes(data.ctaVariant ?? '')
    || !['end_article', 'mid_article'].includes(data.ctaPosition ?? '')) return;
  try {
    host.dataLayer?.push({
      event: 'article_contact_click',
      contact_method: data.articleCtaLink,
      article_slug: data.articleSlug,
      cta_variant: data.ctaVariant,
      cta_position: data.ctaPosition,
    });
  } catch {
    // An unavailable or failing analytics integration must never affect the link.
  }
}
