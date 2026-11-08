import { placementCopy } from './preferred-sources-config.mjs';
const escape = (value) => String(value).replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

export function preferredSourceTextLink(config) {
  const deeplink = `https://www.google.com/preferences/source?q=${config.sourceDomain}`;
  return `<a class="preferred-source-link" href="${escape(deeplink)}" target="_blank" rel="noopener">Add me as a preferred source on Google<span class="preferred-source-sr-only"> (opens in a new tab)</span></a>`;
}

/** A real text fallback. Grid callers insert one slot at each native row boundary;
 * CSS exposes exactly one according to the existing one/two/three-column layout. */
export function preferredSourceNoscript(placement, config, { generic = false, gridColumns } = {}) {
  if (config.eligibilityStatus !== 'verified') return '';
  const [title] = placementCopy[generic ? 'insights_grid' : placement];
  const grid = [1, 2, 3].includes(gridColumns)
    ? ` class="preferred-source-noscript-grid" data-preferred-source-grid-columns="${gridColumns}"` : '';
  return `<noscript${grid}><div class="preferred-source preferred-source-noscript" data-preferred-source-noscript="${escape(placement)}"><p class="preferred-source-title">${escape(title)}</p>${preferredSourceTextLink(config)}</div></noscript>`;
}

/** One component for both the existing Astro and static-HTML publishing paths. */
export function preferredSourceComponent(placement, pageType, config, { generic = false, includeNoscript = true } = {}) {
  const variant = placement === 'article_end' ? 'article-end'
    : placement === 'footer' ? 'footer'
    : placement.endsWith('_success') ? 'success-state'
    : placement.includes('archive') || placement === 'insights_grid' ? 'archive' : 'compact';
  const [title, copy] = placementCopy[generic ? 'insights_grid' : placement];
  const textLink = preferredSourceTextLink(config);
  const widget = placement !== 'footer' && placement !== 'insights_menu';
  const fallback = widget && config.eligibilityStatus === 'verified'
    ? `<div class="preferred-source-fallback" hidden>${textLink}</div>` : '';
  const consent = widget && config.consentPolicy === 'on-request'
    ? '<div class="preferred-source-consent" hidden><button type="button" class="preferred-source-consent-button">Show Google’s preferred-source button</button><p class="preferred-source-consent-copy">Loads Google content. No preference is changed until you choose it on Google.</p></div>' : '';
  // Hidden attribute is on our container only; Google's internal DOM/styles are untouched.
  // Failures cannot leave empty promotional panels. No JS falls back to plain text only.
  const content = `<div class="preferred-source" data-preferred-source-placement="${escape(placement)}" data-variant="${variant}" data-page-type="${escape(pageType)}" data-integration-type="${widget ? 'widget' : 'deeplink'}"${widget ? ' hidden' : ''}><div class="preferred-source-editorial"><p class="preferred-source-title">${escape(title)}</p>${copy ? `<p class="preferred-source-copy">${escape(copy)}</p>` : ''}</div>${widget ? `${consent}<div class="preferred-source-widget"><div google-add-preferred-source-btn data-theme="${escape(config.theme)}" data-lang="${escape(config.language)}"></div></div>${fallback}` : textLink}</div>`;
  const noScript = widget && includeNoscript ? preferredSourceNoscript(placement, config, { generic }) : '';
  return `<!-- preferred-source:${placement}:start -->${content}${noScript}<!-- preferred-source:${placement}:end -->`;
}
