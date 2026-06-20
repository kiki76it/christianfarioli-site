#!/usr/bin/env node
// scripts/post-build.mjs
// Post-build: mirror the dist into dist/insights/ so the platform can be
// served from a sub-path with all asset paths resolving correctly.

import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DIST = 'dist';
const SUBPATH = 'insights';
const DEST = join(DIST, SUBPATH);
const ABS_DEST = resolve(DEST);

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = resolve(join(src, entry.name));
    const d = join(dst, entry.name);

    // CRITICAL: skip the destination directory itself. Without this, copying
    // dist/ → dist/insights/ recursively re-copies dist/insights/ → dist/insights/insights/...
    // until the path exceeds OS limits and crashes with ENAMETOOLONG.
    if (s === ABS_DEST) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await cp(s, d);
    }
  }
}

console.log(`[post-build] Mirroring ${DIST}/ → ${DEST}/`);
// Astro already built the CMS (incl. published article detail pages) under dist/insights/.
// Stash it OUTSIDE dist before wiping, then restore it on top of the mirror so the
// article pages (and any other /insights-routed pages) survive.
const CMS_TMP = 'dist-cms-tmp';
await rm(CMS_TMP, { recursive: true, force: true });
await copyDir(DEST, CMS_TMP);
await rm(DEST, { recursive: true, force: true });
await copyDir(DIST, DEST);
await copyDir(CMS_TMP, DEST);
await rm(CMS_TMP, { recursive: true, force: true });
console.log(`[post-build] Done. /insights/ sub-path is now servable (article pages preserved).`);

// ---------------------------------------------------------------------------
// Overlay the main site onto the dist ROOT, AFTER the /insights mirror exists.
// Source: main-site/ (index.html, testimonials.html, imgs/, videos/).
// Result:
//   dist/index.html          → main site            (christianfarioli.com/)
//   dist/insights/index.html → Insights homepage    (already mirrored, untouched)
// The main site is copied last, so its root index.html overwrites the Astro
// homepage at the root while the Insights copy under dist/insights/ stays intact.
// ---------------------------------------------------------------------------
const MAIN_SITE = 'main-site';
console.log(`[post-build] Overlaying ${MAIN_SITE}/ → ${DIST}/ (main site at root)`);
await copyDir(MAIN_SITE, DIST);
console.log('[post-build] Main site overlaid at root. christianfarioli.com/ now serves the main site.');
