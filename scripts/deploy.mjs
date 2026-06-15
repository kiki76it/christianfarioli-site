#!/usr/bin/env node
// scripts/deploy.mjs
// Commit changed MDX files to GitHub and trigger a Cloudflare Pages build.
//
// Flow:
//   1. Run `astro build` to verify the build is clean.
//   2. `git add` any .md/.mdx files in src/content/insights/ that changed.
//   3. `git commit` with a structured message.
//   4. `git push` to the configured branch.
//   5. POST to the Cloudflare Pages deploy hook to rebuild the live site.
//
// All of this is wrapped in env-var configuration so the same script works
// in local dev, CI, and the future AI agent's runtime.
//
// Required env (read from process.env, never hardcoded):
//   GITHUB_TOKEN        PAT with repo scope
//   GITHUB_REPO         e.g. "kiki76it/christianfarioli-site"
//   GITHUB_BRANCH       default "main"
//   CF_PAGES_HOOK_URL   the URL from Cloudflare Pages → Settings → Builds → Deploy hooks
//   CF_PROJECT_NAME     optional, for logging
//
// Optional:
//   COMMIT_AUTHOR_NAME  default "insights-bot"
//   COMMIT_AUTHOR_EMAIL default "insights-bot@christianfarioli.com"

import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const {
  GITHUB_TOKEN,
  GITHUB_REPO = 'kiki76it/christianfarioli-site',
  GITHUB_BRANCH = 'main',
  CF_PAGES_HOOK_URL,
  CF_PROJECT_NAME = 'christianfarioli-insights',
  COMMIT_AUTHOR_NAME = 'insights-bot',
  COMMIT_AUTHOR_EMAIL = 'insights-bot@christianfarioli.com',
} = process.env;

function sh(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });
}

function logStep(n, name) {
  console.log(`\n  [${n}/5] ${name}`);
}

// ------------------------------------------------------------------ Step 1: build
logStep(1, 'Verify build');
try {
  sh('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('  ✗ Build failed. Aborting deploy.');
  process.exit(1);
}

// ------------------------------------------------------------------ Step 2: collect files
logStep(2, 'Stage content files');
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}
const files = walk('src/content/insights');
if (files.length === 0) {
  console.log('    No content files found.');
}
sh(`git config user.name "${COMMIT_AUTHOR_NAME}"`);
sh(`git config user.email "${COMMIT_AUTHOR_EMAIL}"`);
sh(`git add ${files.map((f) => `"${f}"`).join(' ')}`);

// ------------------------------------------------------------------ Step 3: commit
logStep(3, 'Commit');
const today = new Date().toISOString().slice(0, 10);
const commitMsg = process.env.COMMIT_MESSAGE || `chore(content): automated publish ${today}`;
let committed = false;
try {
  sh(`git commit -m "${commitMsg}"`);
  committed = true;
} catch (e) {
  if (String(e.message).includes('nothing to commit')) {
    console.log('    Nothing to commit (content unchanged).');
  } else {
    throw e;
  }
}

// ------------------------------------------------------------------ Step 4: push
logStep(4, 'Push to GitHub');
if (committed) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.error('  ✗ GITHUB_TOKEN and GITHUB_REPO are required to push.');
    process.exit(1);
  }
  const remote = `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git`;
  sh(`git push ${remote} ${GITHUB_BRANCH}`);
  console.log(`  ✓ Pushed to ${GITHUB_REPO}@${GITHUB_BRANCH}`);
} else {
  console.log('    Skipped push (no commit).');
}

// ------------------------------------------------------------------ Step 5: Cloudflare
logStep(5, 'Trigger Cloudflare Pages build');
if (CF_PAGES_HOOK_URL) {
  const r = await fetch(CF_PAGES_HOOK_URL, { method: 'POST' });
  if (!r.ok) {
    console.error(`  ✗ Cloudflare hook returned ${r.status}`);
    process.exit(1);
  }
  console.log(`  ✓ Cloudflare build triggered for ${CF_PROJECT_NAME}.`);
} else {
  console.log('    CF_PAGES_HOOK_URL not set — skipped.');
}

console.log('\n  Deploy complete.\n');
