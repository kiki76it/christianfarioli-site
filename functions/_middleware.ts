// functions/_middleware.ts
// Cloudflare Pages Function that gates /admin/* behind HTTP Basic Auth.
// Credentials are stored as Cloudflare Pages env vars:
//   ADMIN_USERNAME  (default: "admin")
//   ADMIN_PASSWORD  (required)
//
// Browsers prompt the user; the credential is cached for the session.
// On Cloudflare Pages, env vars set in the dashboard are available as the
// platform.env object. Locally, use a .dev.vars file (gitignored) — but the
// middleware silently no-ops if the password is unset, so dev never breaks.

interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Only gate the admin area. Everything else passes through untouched.
  // Note: BASE is the platform's /insights sub-path. /admin is at /insights/admin.
  if (!url.pathname.includes('/admin')) {
    return next();
  }

  const expectedUser = env.ADMIN_USERNAME || 'admin';
  const expectedPass = env.ADMIN_PASSWORD;

  // If the password is not set in the env, fail closed in production
  // and fail open in dev (npm run dev) so the local build still works.
  if (!expectedPass) {
    // In production, the Pages project will have set this env var.
    // In dev, it will be undefined — and we let the request through
    // with a console warning so local development isn't blocked.
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
};
