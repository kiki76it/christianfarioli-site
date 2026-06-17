// functions/_middleware.ts
// Cloudflare Pages Function — runs on EVERY request to the Pages project.
//
// Responsibilities:
//   1. Serve the static main site at the root (everything not under /insights/)
//   2. Route /insights/* to the Insights platform (pass through)
//   3. Gate /insights/admin/* behind HTTP Basic Auth
//
// Credentials (for /admin auth) are stored as Cloudflare Pages env vars:
//   ADMIN_USERNAME  (default: "admin")
//   ADMIN_PASSWORD  (required in production)

interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // ---------------------------------------------------------------------
  // 1) Main site — anything that ISN'T the /insights/* namespace is served
  //    as a static asset from this Pages project. The main site files live
  //    at the root of the build output (public/index.html, testimonials.html,
  //    imgs/, videos/), while the Astro CMS is namespaced under /insights/
  //    via `base: '/insights'`, so the two never collide.
  // ---------------------------------------------------------------------
  const isInsightsPath =
    path === '/insights' ||
    path === '/insights/' ||
    path.startsWith('/insights/');

  if (!isInsightsPath) {
    return next();
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
        'WWW-Authenticate': 'Basic realm="Prof. Christian Farioli Admin", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Everything else under /insights/* — serve the static asset.
  return next();
};
