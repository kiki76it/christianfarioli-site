// Duplicate imports with the same article body. Keep their source files for
// editorial history, but publish and link only the original article.
export const INSIGHT_REDIRECTS = Object.freeze({
  'advanced-strategies/email-marketing-training-2': 'advanced-strategies/email-marketing-training',
  'advanced-strategies/marketing-strategy-training-2': 'advanced-strategies/marketing-strategy-training',
  'advanced-strategies/seo-companies-in-dubai-2': 'advanced-strategies/seo-companies-in-dubai',
});

/** @param {string} id */
export function isRedirectedInsight(id) {
  return Object.hasOwn(INSIGHT_REDIRECTS, id);
}

/** Return a canonical path only for the explicitly consolidated article URLs.
 * @param {string} pathname
 * @returns {string | null}
 */
export function insightRedirectPath(pathname) {
  if (!pathname.startsWith('/insights/')) return null;
  const id = pathname.slice('/insights/'.length).replace(/\/$/, '');
  return isRedirectedInsight(id) ? `/insights/${INSIGHT_REDIRECTS[id]}/` : null;
}
