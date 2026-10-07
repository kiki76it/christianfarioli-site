#!/usr/bin/env node
// Generate synthetic news ONLY in a fresh temporary copy. Never writes content
// into the source checkout, deploys, or removes a workspace. Artifacts are kept
// for browser QA. Assets/dependencies are read through directory junctions.
// Usage: node scripts/build-ai-pulse-fixtures.mjs [--build]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, realpath, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--build'), 'Usage: node scripts/build-ai-pulse-fixtures.mjs [--build]');
const source = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const workspace = await realpath(await mkdtemp(join(tmpdir(), 'ai-pulse-fixture-')));
const within = (parent, child) => { const rel = relative(parent, child); return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)); };
assert.notEqual(workspace, source);
assert.ok(!within(source, workspace), 'Fixture must be outside the source checkout');
const marker = { version: 1, purpose: 'AI Pulse synthetic build; never deploy', source, workspace, createdAt: new Date().toISOString() };
await writeFile(join(workspace, '.ai-pulse-fixture-workspace.json'), JSON.stringify(marker, null, 2));
console.log(`Fixture workspace: ${workspace}`);
for (const directory of ['src', 'scripts']) await cp(join(source, directory), join(workspace, directory), { recursive: true });
for (const file of ['astro.config.mjs', 'tsconfig.json', 'package.json', 'package-lock.json']) {
  if (await stat(join(source, file)).catch(() => null)) await cp(join(source, file), join(workspace, file));
}
for (const directory of ['node_modules', 'public', 'main-site']) {
  const target = await realpath(join(source, directory));
  await symlink(target, join(workspace, directory), process.platform === 'win32' ? 'junction' : 'dir');
}
// Cache isolation matters because dependencies are shared with the primary build.
const config = await readFile(join(workspace, 'astro.config.mjs'), 'utf8');
assert.match(config, /cacheDir:\s*['"]\.\/\.astro\/cache['"]/, 'The build must use a workspace-local Astro cache');
const fixtureDirectory = join(workspace, 'src/content/insights/ai-pulse');
await mkdir(fixtureDirectory, { recursive: true });
const publicEntries = [];
for (let index = 1; index <= 13; index++) {
  const number = String(index).padStart(2, '0');
  const day = String(14 - index).padStart(2, '0');
  const publishedAt = `2026-09-${day}T07:05:00+04:00`;
  const status = index === 3 ? 'scheduled' : 'published';
  const id = `ai-pulse/fixture-pulse-${number}`;
  const data = {
    title: `Fixture ${number}: AI Pulse editorial rendering test`,
    description: `Synthetic fixture ${number} for isolated AI Pulse build verification. This is not a news report and must never be deployed to the production website.`,
    excerpt: `Synthetic fixture ${number}, created only in a temporary QA copy to exercise native article rendering, archive pagination and timestamp handling.`,
    language: 'en-GB', category: 'ai-pulse', schemaType: 'NewsArticle',
    author: { name: 'Prof. Christian Farioli', role: 'AI Strategist, Educator & Advisor', avatar: '/images/authors/christian-farioli.jpg' },
    featuredImage: '/images/insights/covers/why-ai-strategy-beats-ai-tools.jpg',
    featuredImageAlt: 'Existing AI strategy image reused only for a temporary synthetic QA fixture',
    status,
    ...(status === 'scheduled' ? { scheduledFor: publishedAt } : { publishedAt }),
    ...(index === 2 ? { updatedAt: '2026-09-14T09:15:00+04:00' } : {}),
    pinned: index === 13, featured: index === 13,
    sources: [{ name: 'Google Search Central', title: 'Article structured data documentation: technical fixture reference', url: 'https://developers.google.com/search/docs/appearance/structured-data/article' }],
    related: [{ slug: 'ai-pulse/internal-editorial-preview' }, { slug: 'ai-strategy/why-ai-strategy-beats-ai-tools' }],
  };
  const body = `**Synthetic QA fixture ${number} — never deploy.** This temporary test content is not a real news article or an approved personal opinion.\n\n## What happened\n\nNo event is reported. This block exercises factual section rendering only.\n\n## Why it matters\n\nNo business claim is made. This block tests the analysis section.\n\n## The bigger shift\n\nA deliberate link to [the evergreen AI strategy article](/insights/ai-strategy/why-ai-strategy-beats-ai-tools/) tests normal internal navigation.\n\n## My take\n\nNo view is attributed to Christian Farioli. This is synthetic content for a local build test.\n`;
  await writeFile(join(fixtureDirectory, `fixture-pulse-${number}.md`), matter.stringify(body, data));
  publicEntries.push({ id, title: data.title, status, publishedAt, ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}), pinned: data.pinned, featured: data.featured, dubaiPublished: `${14 - index} September 2026, 07:05` });
}
const manifestPath = join(workspace, 'fixture-manifest.json');
await writeFile(manifestPath, JSON.stringify({ version: 1, warning: 'Synthetic QA output. Never deploy.', source, workspace, public: publicEntries }, null, 2));
console.log(`Fixture manifest: ${manifestPath}`);
console.log(`Retained output for browser QA: ${join(workspace, 'dist')}`);
if (!args.includes('--build')) {
  console.log('Prepared only; no build was started. Run this script with --build to prepare and verify a fresh fixture workspace.');
} else {
  // All commands run in the isolated copy; never invoke publish/deploy scripts.
  const commands = [
    ['validate', ['scripts/validate.mjs']],
    ['astro-build', ['node_modules/astro/astro.js', 'build']],
    ['post-build', ['scripts/post-build.mjs']],
    ['output-tests', ['--test', 'scripts/check-ai-pulse-output.mjs']],
  ];
  for (const [name, command] of commands) {
    // Recheck the exact marker/source relationship before tools create output.
    const current = JSON.parse(await readFile(join(workspace, '.ai-pulse-fixture-workspace.json'), 'utf8'));
    assert.equal(current.source, source);
    assert.equal(current.workspace, workspace);
    assert.notEqual(await realpath(workspace), source);
    const log = createWriteStream(join(workspace, `${name}.log`));
    console.log(`Running ${name} in isolated workspace`);
    const exit = await new Promise((resolveExit, reject) => {
      const child = spawn(process.execPath, command, { cwd: workspace, windowsHide: true, env: { ...process.env, AI_PULSE_BUILD_ROOT: join(workspace, 'dist'), AI_PULSE_FIXTURE_MANIFEST: manifestPath }, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
      child.on('error', reject);
      child.on('close', (code) => { log.end(() => resolveExit(code)); });
    });
    assert.equal(exit, 0, `${name} failed; inspect ${join(workspace, `${name}.log`)}`);
  }
  await writeFile(join(workspace, 'fixture-build-result.json'), JSON.stringify({ ...marker, status: 'passed', manifestPath, dist: join(workspace, 'dist') }, null, 2));
  console.log(`PASS: isolated fixture build and output tests. Artifacts retained at ${workspace}`);
}
