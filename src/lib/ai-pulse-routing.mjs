/**
 * Classify the path that an asset server can resolve, rather than its encoded
 * spelling. Bound repeated decoding, resolve dot segments and reject malformed
 * escapes/control characters before handing the request to static hosting.
 * @param {string} pathname
 * @returns {string | null}
 */
export function normalizeRequestPath(pathname) {
  let decoded = pathname;
  for (let pass = 0; pass < 4; pass++) {
    let next;
    try { next = decodeURIComponent(decoded); } catch { return null; }
    decoded = next;
    if (!/%[\da-f]{2}/i.test(decoded)) break;
    if (pass === 3) return null;
  }
  if (!decoded.startsWith('/') || /[\u0000-\u001f\u007f]/.test(decoded)) return null;
  decoded = decoded.replace(/\\/g, '/');
  const segments = [];
  for (const segment of decoded.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return '/' + segments.join('/') + (segments.length && decoded.endsWith('/') ? '/' : '');
}

/** Single canonical archive and policy URL; retain incoming query strings. */
export function aiPulseRedirectPath(pathname) {
  if (/^\/(?:insights\/)?category\/ai-pulse\/?$/.test(pathname)) return '/insights/ai-pulse/';
  if (/^\/insights\/editorial-policy(?:\/index\.html)?\/?$/.test(pathname)) return '/editorial-policy/';
  if (/^\/insights\/ai-pulse\/page\/1\/?$/.test(pathname)) return '/insights/ai-pulse/';
  if (/^\/insights\/ai-pulse\/feed\/?$/.test(pathname)) return '/insights/ai-pulse/feed.xml';
  if (/^\/ai-pulse(?:\/|$)/.test(pathname)) {
    const canonical = `/insights${pathname}`;
    // Files retain their extension without an extra trailing slash.
    return /\.[a-z0-9]+$/i.test(pathname) || pathname.endsWith('/') ? canonical : `${canonical}/`;
  }
  return null;
}

/** Cover both namespaces, including static index.html aliases. */
export function isAdminPath(pathname) {
  const normalized = normalizeRequestPath(pathname);
  return normalized !== null && /^\/(?:insights\/)?admin(?:\/|$)/.test(normalized);
}
