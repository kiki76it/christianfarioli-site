// src/pages/api/publish.ts
// Server endpoint for the admin UI. Only active in hybrid/server mode.
// In pure static deploys, the in-page "Advance" button will surface a
// helpful error and the team should run `npm run publish` locally instead.
//
// To enable this endpoint, change the Astro config to:
//   output: 'hybrid' (or 'server')
// and add a server adapter (e.g. @astrojs/cloudflare).
//
// This endpoint:
//   - Validates the requested transition
//   - Edits the file's frontmatter
//   - Optionally enqueues a deploy
//
// Authentication is intentionally left to the hosting layer (Cloudflare Access,
// basic auth, or a CF Workers middleware). The endpoint should NEVER be
// reachable from the public internet without one of those guards.

import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { canTransition, nextStatuses } from '../../lib/status.js';
import { INSIGHT_STATUSES } from '../../lib/status-types.js';

// Default: prerender so the build is pure static.
// To activate the API at runtime, switch the project to 'hybrid' or 'server'
// output and uncomment the next line:
// export const prerender = false;

interface PublishRequest {
  slug: string;
  action: 'transition' | 'validate';
  to?: string;
}

function resolveFile(slug: string): string | null {
  const candidates = [
    join(process.cwd(), 'src/content/insights', `${slug}.mdx`),
    join(process.cwd(), 'src/content/insights', `${slug}.md`),
    join(process.cwd(), 'src/content/insights', slug),
  ];
  for (const p of candidates) if (existsSync(p)) return p;
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  let body: PublishRequest;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!body.slug || !body.action) {
    return new Response('Missing slug or action', { status: 400 });
  }

  const filePath = resolveFile(body.slug);
  if (!filePath) {
    return new Response(`No file found for slug "${body.slug}"`, { status: 404 });
  }

  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const from = (parsed.data.status as string) || 'draft';
  // Narrow to the known status type for downstream helpers.
  const fromNarrowed = (INSIGHT_STATUSES as readonly string[]).includes(from)
    ? (from as 'draft' | 'review' | 'scheduled' | 'published')
    : 'draft' as const;

  if (body.action === 'validate') {
    return new Response(
      JSON.stringify({ from, allowed: nextStatuses(fromNarrowed) }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (body.action === 'transition') {
    const to = body.to;
    if (!to || !INSIGHT_STATUSES.includes(to)) {
      return new Response(`Invalid --to: ${to}`, { status: 400 });
    }
    // After the includes() check, narrow to the known status type.
    const toNarrowed = to as 'draft' | 'review' | 'scheduled' | 'published';
    if (!canTransition(fromNarrowed, toNarrowed)) {
      return new Response(
        `Illegal transition: ${from} → ${to}. From ${from} you can move to: ${nextStatuses(fromNarrowed).join(', ')}`,
        { status: 400 },
      );
    }
    parsed.data.status = to;
    if (to === 'published') parsed.data.publishedAt = new Date();
    parsed.data.updatedAt = new Date();
    writeFileSync(filePath, matter.stringify(parsed.content, parsed.data));
    return new Response(JSON.stringify({ ok: true, from, to }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Unknown action', { status: 400 });
};

export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ status: 'ok', method: 'POST to /api/publish with { slug, action, to? }' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
