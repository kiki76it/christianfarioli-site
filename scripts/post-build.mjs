#!/usr/bin/env node
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const SUBPATH = 'insights';
const DEST = join(DIST, SUBPATH);

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await cp(s, d);
  }
}

console.log(`[post-build] Mirroring ${DIST}/ -> ${DEST}/`);
await rm(DEST, { recursive: true, force: true });
await copyDir(DIST, DEST);
console.log(`[post-build] Done.`);
