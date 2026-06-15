#!/usr/bin/env node
// scripts/post-build.mjs
// Post-build: mirror the dist into dist/insights/ so the platform can be
// served from a sub-path with all asset paths resolving correctly.

import { cp, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';
const SUBPATH = 'insights';
const DEST = join(DIST, SUBPATH);

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
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
