/** Release configuration. No query string, cookie or browser storage can enable it. */
export const preferredSources = Object.freeze({
  enabled: true,
  eligibilityStatus: 'verified',
  eligibilityCheckedAt: '2026-11-08T08:54:03Z',
  eligibilityMaxAgeDays: 7,
  activationApprovedAt: '2026-11-09T09:00:49Z', // Owner approved direct display with automatic Google loading.
  previewEnabled: true, // Only used by the separate loopback QA server; never by build.
  sourceDomain: 'christianfarioli.com',
  language: 'en-GB', // Explicitly listed as English (UK) in Google's supported-language CSV.
  theme: 'light',
  consentPolicy: 'approved', // Owner approved automatic loading; analytics measurement remains disabled.
  measurementEnabled: false,
  articleInitialVariant: 'intro', // intro | byline | sidebar | none (alternatives, not additions)
  articleIntroMinWords: 600,
  placements: Object.freeze({
    article_intro: true, article_end: true, ai_pulse_archive: true,
    insights_grid: true, homepage_insights: true, footer: true,
    category_archive: true, newsletter_success: false, download_success: false,
    about_end: true, books_editorial: true, event_recap_end: true,
    services_secondary: true, resources_end: false, insights_menu: false,
    article_byline: false, article_sidebar: false,
  }),
});

export function publiclyEnabled(config = preferredSources, now = Date.now()) {
  const checked = Date.parse(config.eligibilityCheckedAt);
  const approved = Date.parse(config.activationApprovedAt);
  return config.enabled === true && config.eligibilityStatus === 'verified'
    && (config.consentPolicy === 'on-request' || config.consentPolicy === 'approved')
    && config.sourceDomain === 'christianfarioli.com'
    && Number.isFinite(checked) && Number.isFinite(approved)
    && checked <= approved && approved <= now
    && approved - checked <= config.eligibilityMaxAgeDays * 86400000;
}

const insights = ['Good ideas deserve a second visit.', 'Add Christian Farioli as a preferred source on Google.'];
const success = ['One more way to stay connected.', 'Find my insights more easily on Google.'];
const about = ['Keep the ideas coming.', 'Make it easier to find my perspectives on Google.'];
export const placementCopy = Object.freeze({
  article_intro: ['A little less AI noise. A little more insight.', insights[1]],
  article_end: ['Enjoyed this perspective?', 'Make it easier to find more of my insights on Google.'],
  ai_pulse_archive: ['Less AI hype. More perspective.', 'Make it easier to find my AI insights on Google.'],
  insights_grid: insights, homepage_insights: insights, category_archive: insights,
  footer: ['Find me on Google, too.', ''], newsletter_success: success, download_success: success,
  about_end: about, books_editorial: ['More ideas beyond the book.', 'Find my latest perspectives on Google.'],
  event_recap_end: about, services_secondary: ['Keep exploring.', 'Find my AI and business perspectives on Google.'],
  resources_end: insights, insights_menu: ['', 'Add me as a preferred source on Google'],
  article_byline: insights, article_sidebar: insights,
});
