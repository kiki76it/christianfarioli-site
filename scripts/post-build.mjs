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
await rm(DEST, { recursive: true, force: true });
await copyDir(DIST, DEST);
console.log(`[post-build] Done. /insights/ sub-path is now servable.`);
