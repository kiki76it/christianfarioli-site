# Automation

This document describes how a future AI agent (or any automation system) will
plug into this publishing platform. **No agents exist yet.** The hooks are
built and waiting.

> The contract is the npm scripts. The agent calls them. Nothing else.

## The two flows

### Flow 1 — Publishing a new article

```
┌────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐
│ Generate   │───▶│ new-article  │───▶│ publish.mjs  │───▶│ deploy.mjs │
│ MDX + body │    │ scaffold     │    │ transition   │    │ push + CF  │
└────────────┘    └──────────────┘    └──────────────┘    └────────────┘
```

### Flow 2 — Rescheduling a queued article

```
┌────────────┐    ┌──────────────┐
│ Update     │───▶│ publish.mjs  │    (no deploy — just a date change)
│ frontmatter│    │ transition   │
└────────────┘    └──────────────┘
```

---

## Script reference (for the agent)

All scripts live in `scripts/`. All of them return exit code 0 on success
and 1 on failure. All of them print a single useful status line per step.

### `validate.mjs` — lint

```bash
node scripts/validate.mjs
```

Walks `src/content/insights/`, parses every frontmatter, checks against
the Zod schema (with extra business rules). Exits 1 on any error.

**When the agent calls it:** before opening a PR, or before a deploy.

### `list-articles.mjs` — manifest

```bash
node scripts/list-articles.mjs
node scripts/list-articles.mjs --group    # bucket by status
```

Dumps JSON of every article to stdout. The agent can pipe this to its
prompt to figure out what's pending.

**When the agent calls it:** as the first step of any batch operation, to
understand current state.

### `new-article.mjs` — scaffold

```bash
node scripts/new-article.mjs \
  --title "Why AI Strategy Beats AI Tools" \
  --category ai-strategy \
  --author-name "Prof. Christian Farioli" \
  --author-role "AI Strategist, Educator & Advisor" \
  --tags "strategy,leadership,governance,moat" \
  --description "Optional meta description override" \
  --featured-image "/images/articles/foo.jpg" \
  --featured-image-alt "Alt text for the hero" \
  --status draft                 # or review, scheduled, published
```

Scaffolds an MDX file with valid frontmatter and a TODO body. The agent
then fills in the body content. Files are organized as
`src/content/insights/<category>/<slug>.mdx`.

**When the agent calls it:** before writing any new content.

### `publish.mjs` — transition

```bash
# Move a draft to review
node scripts/publish.mjs --slug ai-strategy/why-ai-strategy-beats-tools --to review

# Approve a review and schedule it
node scripts/publish.mjs --slug ai-strategy/foo --to scheduled --scheduled-for 2025-12-15

# Publish a scheduled article
node scripts/publish.mjs --slug ai-strategy/foo --to published

# Publish immediately (skip the scheduled step)
node scripts/publish.mjs --slug ai-strategy/foo --to published
```

Edits the file's frontmatter. Validates the transition against
`STATUS_TRANSITIONS` — illegal transitions fail with a clear error.

**When the agent calls it:** after content is written, or when re-scheduling.

### `deploy.mjs` — push + build trigger

```bash
# Required env
export GITHUB_TOKEN=ghp_xxx
export GITHUB_REPO=farioli/insights-platform
export CF_PAGES_HOOK_URL=https://api.cloudflare.com/.../deploy_hooks/xxx

# Optional env
export GITHUB_BRANCH=main
export CF_PROJECT_NAME=insights-platform
export COMMIT_MESSAGE="chore(content): published 3 new articles"
```

Runs `astro build`, stages every changed MDX file, commits, pushes to GitHub,
and POSTs to the Cloudflare Pages deploy hook.

**When the agent calls it:** after a publish transition that should go live.

---

## The agent's contract

The agent is expected to do exactly this, in this order:

1. **Inspect state.** `list-articles.mjs` to know what's already there.
2. **Validate inputs.** Before generating, mentally check the schema. Don't
   try to bypass it.
3. **Scaffold.** `new-article.mjs` to create the file. Fill the body.
4. **Validate the result.** `validate.mjs` to catch any schema mistakes.
5. **Transition.** `publish.mjs` to move through the workflow.
6. **Deploy.** `deploy.mjs` to push to production.

If any step fails, **stop and surface the error to the human**. Don't
retry, don't fall back to a different path, don't silently succeed.

---

## What the agent is NOT allowed to do

- Edit the schema (`src/content.config.ts`) without human review.
- Push to a branch other than the configured one.
- Skip `validate.mjs`. The build is the validation; this is the second guard.
- Set `status: "published"` without first ensuring `publishedAt` is set.
- Set `status: "scheduled"` without first ensuring `scheduledFor` is set.
- Touch any file outside `src/content/insights/`, `public/images/`, or
  the scripts' working directory.

---

## Suggested agent prompts (for the future)

These are starter prompts the agent can be given. They are intentionally
short — the contract is the script interface, not a long prompt.

### "Generate one article on `<topic>`"

```
1. Run `node scripts/list-articles.mjs --group` to see existing content.
2. Pick the most relevant category. Don't repeat an existing title.
3. Run `node scripts/new-article.mjs --title "<topic>" --category <cat> --tags "..."`.
4. Write a 600-900 word article in the same voice as the existing ones.
   - Start with a one-paragraph executive summary.
   - Use 2-3 H2 sections.
   - End with 2-3 Key Takeaways and 1-2 FAQ Q&As.
5. Run `node scripts/validate.mjs`. Fix any errors.
6. Leave the file at `status: "draft"`. Do not auto-publish.
```

### "Publish the articles scheduled for today"

```
1. Run `node scripts/list-articles.mjs --group` to find `status: "scheduled"`
   entries whose `scheduledFor` is today or earlier.
2. For each:
   a. Run `node scripts/publish.mjs --slug <slug> --to published`.
3. Run `npm run deploy` with the GITHUB_TOKEN + CF_PAGES_HOOK_URL env vars set.
4. Report the list of newly published slugs back to the user.
```

### "Re-schedule an article"

```
1. Run `node scripts/publish.mjs --slug <slug> --to scheduled --scheduled-for <new-date>`.
   (Allowed from review or published — both rollback to scheduled.)
2. Do NOT redeploy unless asked; the next scheduled publish will pick up the new date.
```

---

## What the future looks like

When the agent layer lands:

```
┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│  AI agent    │───▶│ scripts/*.mjs  │───▶│ git + Cloudfl│
│  (Python,    │    │ (this repo)    │    │ are deploy   │
│   Node, or   │    └────────────────┘    └──────────────┘
│   anything)  │
└──────────────┘
```

The agent can be implemented in any language. It can live in a separate
repo, in a serverless function, or in a CI pipeline. The only thing it
needs is `node` available to run the scripts and git configured with push
access to the content repo.

The schema is the contract. The scripts are the API. The repo is the
state. Everything else is implementation detail.
