// src/lib/links.ts
// Centralized link builders that prepend Astro's BASE_URL so the platform
// works at any sub-path (e.g. /insights/) without rewriting every href.
//
// Astro exposes the resolved base via `import.meta.env.BASE_URL`. It always
// starts with "/" and never ends with one — so we normalize here.
//
// Two layers:
//   - p(path)    → prepends BASE, idempotent. Use for arbitrary paths.
//   - paths.X()  → semantic helpers. Use these everywhere; they call p() internally.

const RAW_BASE = import.meta.env.BASE_URL || '';
export const BASE = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

/** Build an absolute path for a URL on the platform. Always returns a leading "/".
 *  Always prepends BASE (no idempotent guard). Pass the logical route (e.g.
 *  "/insights/foo/") — the BASE will be added on top. */
export function p(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}`;
}

// ---------------------------------------------------------------------------
// Semantic helpers. Each builds a route that ALREADY includes the leading
// "/insights" or "/category" etc. (the "logical" route), and then `p()`
// prepends the BASE (e.g. "/insights") to produce the full platform path.
// ---------------------------------------------------------------------------

export const paths = {
  home: () => p('/'),
  insights: (slug: string) => p(`/insights/${slug}/`),
  category: (cat: string) => p(`/category/${cat}/`),
  adminHome: () => p('/admin/'),
  adminPreview: (slug: string) => p(`/admin/preview/${slug}/`),
  apiPublish: () => p('/api/publish'),
  rss: () => p('/rss.xml'),
  sitemap: () => p('/sitemap-index.xml'),
  favicon: () => p('/favicon.png'),
  robots: () => p('/robots.txt'),
  /** A public asset (anything in /public). Always prefixed with BASE. */
  publicAsset: (path: string) => p(path.startsWith('/') ? path : `/${path}`),
  /** Root of the main site (one level up from /insights/). */
  mainSite: () => (BASE ? BASE.replace(/\/insights\/?$/, '') || '/' : '/'),
};

/** Compose a fully-qualified absolute URL for the current site.
 *  Use this in RSS, JSON-LD, OG tags, and any place that needs the origin + path. */
export function absolute(path: string, origin?: string): string {
  const siteOrigin = origin ?? import.meta.env.PUBLIC_SITE_URL ?? 'https://christianfarioli.com/insights';
  // `new URL(path, siteOrigin)` handles double-prefix automatically.
  return new URL(path, siteOrigin).toString();
}
