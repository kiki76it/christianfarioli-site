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

import { insightRedirectPath } from '../src/lib/insight-redirects.mjs';
import { aiPulseRedirectPath, isAdminPath, normalizeRequestPath } from '../src/lib/ai-pulse-routing.mjs';

interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const rawPath = url.pathname;
  const path = normalizeRequestPath(rawPath);
  if (path === null) {
    return new Response('Invalid request path.', {
      status: 400,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  const adminRequest = isAdminPath(rawPath);

  // Consolidate duplicate imports with a permanent redirect. Pages _redirects
  // rules do not run for Function-served requests, so this belongs here.
  const redirectPath = insightRedirectPath(path) ?? aiPulseRedirectPath(path);
  if (redirectPath) {
    url.pathname = redirectPath;
    return Response.redirect(url.toString(), 301);
  }

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

  if (!isInsightsPath && !adminRequest) {
    return next();
  }

  // ---------------------------------------------------------------------
  // 2) Gate both admin namespaces and every encoded equivalent.
  // ---------------------------------------------------------------------
  if (adminRequest) {
    const expectedUser = env.ADMIN_USERNAME || 'admin';
    const expectedPass = env.ADMIN_PASSWORD;

    if (!expectedPass) {
      return new Response('Admin auth not configured.', {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }

    const auth = request.headers.get('Authorization');
    if (auth?.startsWith('Basic ')) {
      try {
        const decoded = atob(auth.slice(6));
        const idx = decoded.indexOf(':');
        const user = decoded.slice(0, idx);
        const pass = decoded.slice(idx + 1);
        if (user === expectedUser && pass === expectedPass) {
          const upstream = await next();
          const response = new Response(upstream.body, upstream);
          response.headers.set('Cache-Control', 'private, no-store, max-age=0');
          response.headers.set('X-Robots-Tag', 'noindex, nofollow');
          return response;
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
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // Everything else under /insights/* — serve the static asset.
  return next();
};
