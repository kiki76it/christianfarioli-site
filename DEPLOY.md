# Deploy Runbook — Insights Platform

**This is the specific step-by-step for this project. Not the general Cloudflare guide.**

**Repo:** https://github.com/kiki76it/christianfarioli-site
**Live URL:** `https://christianfarioli.com/insights/`
**Admin URL:** `https://christianfarioli.com/insights/admin/`
**Main site:** `https://christianfarioli.com/` (separate deploy)

---

## 0. Prerequisites (one-time, ~15 min)

### a. Create the GitHub repo (if not already)

1. https://github.com/new → name: `christianfarioli-site` (under `kiki76it` org/account)
2. Don't initialize with README/license/.gitignore — we have those
3. Push the local repo:
   ```bash
   cd /workspace/project/insights-platform
   git init
   git add .
   git commit -m "Initial Insights platform"
   git branch -M main
   git remote add origin git@github.com:kiki76it/christianfarioli-site.git
   git push -u origin main
   ```

### b. Create a GitHub PAT for the bot

1. https://github.com/settings/tokens → **Fine-grained tokens** → Generate new
2. Resource owner: `kiki76it`
3. Repository access: **Only `christianfarioli-site`**
4. Permissions:
   - **Contents:** Read and write
5. Copy the token (looks like `github_pat_xxxx...`)

### c. Create the Cloudflare Pages project

1. https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Select `kiki76it/christianfarioli-site`
3. **Build settings:**
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: *(leave empty — the whole repo is the platform)*
4. **Environment variables** — add to **Production**:
   | Name | Value |
   | --- | --- |
   | `NODE_VERSION` | `20` |
   | `PUBLIC_SITE_URL` | `https://christianfarioli.com/insights` |
   | `PUBLIC_BASE_PATH` | `/insights` |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | *(strong password — see step e below)* |
5. Click **Save and Deploy** — first deploy will succeed, but the Basic Auth on `/admin/*` is in effect only after step (e).

### d. Create the deploy hook

1. In the Pages project → **Settings** → **Builds** → **Deploy hooks** → **Add hook**
2. Name: `automation-publish`
3. Branch: `main`
4. Save → copy the URL. Format:
   `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/abc123-...`

### e. Set the GitHub PAT as a Cloudflare Pages secret

This is **separate** from the dashboard env vars — secrets don't show up in the dashboard.

```bash
cd /workspace/project/insights-platform
npm install -g wrangler  # if not already
wrangler pages secret put ADMIN_PASSWORD --project-name=christianfarioli-insights
# (paste the strong password)
```

Or do it from the dashboard: Pages → Settings → **Environment variables, encrypted** (not the plain one).

### f. Map the custom domain

1. Pages project → **Custom domains** → **Set up a custom domain**
2. Enter: `christianfarioli.com/insights` — Cloudflare will tell you the path mapping is automatic since the platform's `base` config is `/insights`
3. If `christianfarioli.com` is on Cloudflare DNS, this is instant.
4. If not, copy the CNAME and add it at your registrar, wait 5 min.

---

## 1. Local dev (every day)

```bash
cd /workspace/project/insights-platform
cp .dev.vars.example .dev.vars
# Edit .dev.vars: set ADMIN_PASSWORD=local-dev-pass
npm install
npm run dev          # → http://localhost:4321
```

`/admin/*` will ask for the password. Login is `admin` / `local-dev-pass`.

For testing the Cloudflare-specific functions (auth middleware):

```bash
npm run cf:dev       # → http://localhost:8788
```

---

## 2. Publishing a new article (the editor flow)

### Manual: edit a file in your editor, push, deploy

```bash
# 1. Create a draft
npm run content:new -- --title "..." --category ai-strategy

# 2. Write the body in src/content/insights/<category>/<slug>.mdx
#    (set status: draft in frontmatter)

# 3. Validate
npm run validate

# 4. Move to review when done
npm run publish -- --slug <category>/<slug> --to review

# 5. Commit + push
git add src/content/insights/
git commit -m "content: <title>"
git push
```

Cloudflare Pages rebuilds within ~30s.

### Automated: the future AI agent

```bash
# Single command does everything:
GITHUB_TOKEN=... CF_PAGES_HOOK_URL=... npm run deploy
```

This is the contract. The agent runs this. No other side effects.

---

## 3. Admin workflow

```
https://christianfarioli.com/insights/admin/        ← all 4 statuses listed
https://christianfarioli.com/insights/admin/preview/ai-strategy/<slug>/  ← draft preview
```

Login: `admin` / the `ADMIN_PASSWORD` you set in the dashboard.

The preview page has:
- Sticky black action bar with the current status
- "Edit File" button (opens VS Code via the vscode:// protocol — requires desktop)
- "Advance → <next>" button (POSTs to the API; in static deploys this is a no-op, use `npm run publish` locally instead)

---

## 4. Roll back a published article

**Option A — kill switch (no rebuild):**
1. Edit the MDX file: set `draft: true` in frontmatter
2. Commit and push
3. The article disappears from the public site within ~30s
4. (Reverse when ready: set `draft: false`)

**Option B — proper revert:**
1. `git revert <commit-sha>` or `git reset --hard <previous-sha>`
2. `git push --force-with-lease`
3. Cloudflare rebuilds

**Option C — pull back to scheduled:**
1. `npm run publish -- --slug <slug> --to scheduled --scheduled-for <new-date>`
2. Commit and push

---

## 5. Adding a new category

Categories live in `src/content.config.ts` in the `INSIGHT_CATEGORIES` tuple.

```typescript
// src/content.config.ts
export const INSIGHT_CATEGORIES = [
  'ai-strategy',
  'human-centered-ai',
  'ai-leadership',
  'aiso',
  'ai-marketing',
  'executive-education',
  'future-of-work',
  'my-new-category',  // ← add here
] as const;
```

Also add a display label:

```typescript
export const CATEGORY_LABELS = {
  // ...existing...
  'my-new-category': 'My New Category',
};
```

Commit. The category page at `/insights/category/my-new-category/` is auto-generated at build time.

---

## 6. Rotate the admin password

**Dashboard (production):**
1. Pages → Settings → Environment variables
2. Edit `ADMIN_PASSWORD`
3. The next deploy uses the new password (Cloudflare re-encrypts the env on save)

**Local dev:**
1. Edit `.dev.vars`
2. Restart `npm run cf:dev`

---

## 7. Disaster recovery

**The full archive is in git.** If Cloudflare Pages dies:

1. Clone the repo anywhere
2. `npm install && npm run build`
3. `npx wrangler pages deploy ./dist --project-name=christianfarioli-insights`
4. Point DNS to the new Pages project

RTO: ~15 minutes. RPO: zero (every change is a git commit).

---

## 8. Quick reference

| Action | Command |
| --- | --- |
| Add an article | `npm run content:new -- --title "..." --category ai-strategy` |
| Lint content | `npm run validate` |
| List articles | `npm run content:list` or `npm run content:list -- --group` |
| Move to review | `npm run publish -- --slug <slug> --to review` |
| Schedule | `npm run publish -- --slug <slug> --to scheduled --scheduled-for 2025-12-15` |
| Publish now | `npm run publish -- --slug <slug> --to published` |
| Build static | `npm run build` |
| Build + push + deploy | `npm run deploy` (requires GITHUB_TOKEN + CF_PAGES_HOOK_URL) |
| Test auth locally | `npm run cf:dev` |

---

## 9. What lives where

```
GitHub (kiki76it/christianfarioli-site)        ← source of truth for content
   ↓
Cloudflare Pages (christianfarioli-insights)    ← builds + serves static
   ↓
christianfarioli.com/insights/                 ← public site
christianfarioli.com/insights/admin/           ← Basic Auth gated
```

**The build is the validation.** If `npm run build` succeeds, the site works.
**Git is the backup.** Every change is a commit, every commit is a deploy.
**The schema is the contract.** `src/content.config.ts` is the single source of truth for what an article looks like.
