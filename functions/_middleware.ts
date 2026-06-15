// functions/_middleware.ts
// Cloudflare Pages Function — runs on EVERY request to the Pages project.
//
// Responsibilities:
//   1. Route /insights/* to the Insights platform (pass through)
//   2. Gate /insights/admin/* behind HTTP Basic Auth
//   3. Redirect everything else (i.e. the apex christianfarioli.com/) to the
//      main site on tqv4jhprd4ud.space.minimax.io
//
// Credentials (for /admin auth) are stored as Cloudflare Pages env vars:
//   ADMIN_USERNAME  (default: "admin")
//   ADMIN_PASSWORD  (required in production)
//
// The main-site redirect target can be overridden via the MAIN_SITE_URL env var
// for future migration flexibility.

interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  MAIN_SITE_URL?: string;
}

const MAIN_SITE_DEFAULT = 'https://tqv4jhprd4ud.space.minimax.io';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // ---------------------------------------------------------------------
  // 1) Main-site redirect — anything that ISN'T the /insights/* namespace
  //    gets a 302 to the real main site. This makes christianfarioli.com/
  //    serve the main site while christianfarioli.com/insights/* serves
  //    this Pages project.
  // ---------------------------------------------------------------------
  const isInsightsPath =
    path === '/insights' ||
    path === '/insights/' ||
    path.startsWith('/insights/');

  if (!isInsightsPath) {
    const mainSite = env.MAIN_SITE_URL || MAIN_SITE_DEFAULT;
    const target = mainSite.replace(/\/+$/, '') + path + url.search;
    // Use a manual Location header instead of Response.redirect() — this
    // means Cloudflare doesn't wait for the origin to respond before
    // sending the redirect, avoiding 522 timeouts.
    return new Response(null, {
      status: 302,
      headers: { Location: target },
    });
  }

  // ---------------------------------------------------------------------
  // 2) Admin auth — only gate /insights/admin/* (not /insights/api/* etc).
  // ---------------------------------------------------------------------
  if (path.includes('/admin')) {
    const expectedUser = env.ADMIN_USERNAME || 'admin';
    const expectedPass = env.ADMIN_PASSWORD;

    if (!expectedPass) {
      // Fail closed in production, fail open in dev.
      // @ts-ignore - import.meta.env is Vite's, available in dev
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.warn('[admin-auth] ADMIN_PASSWORD not set; skipping auth in dev mode.');
        return next();
      }
      return new Response('Admin auth not configured.', { status: 503 });
    }

    const auth = request.headers.get('Authorization');
    if (auth?.startsWith('Basic ')) {
      try {
        const decoded = atob(auth.slice(6));
        const idx = decoded.indexOf(':');
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedPass) {
          return next();
        }
      } catch {
        // Malformed auth header — fall through to challenge.
      }
    }

    return new Response('Authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Christian Farioli Admin", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Everything else under /insights/* — serve the static asset.
  return next();
};
