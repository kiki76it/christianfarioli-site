# Architecture

This document explains the design decisions behind the Insights publishing platform
and the rationale for each. Read this before changing the schema or the workflow.

## Goals (in order of priority)

1. **Authority surface** — the public site should feel like a serious publication,
   not a blog. Long-form, editorial, SEO-strong.
2. **Editorial discipline** — every article moves through a real workflow with
   gates. Nothing goes from "idea" to "public" in a single step.
3. **Automation-ready** — every step the human team does today should be
   scriptable tomorrow, without rewrites.
4. **Scales to hundreds of articles** — no per-article config, no manual
   indexing, no deploy-time hacks.
5. **Agnostic of CMS** — the future AI agent doesn't need to learn a CMS
   API. It writes MDX. That's it.

## Non-goals

- Multi-author RBAC with auth (out of scope — use GitHub/Cloudflare for that)
- Live editing in a browser (the platform is file-based; humans edit MDX in their editor)
- Server-side analytics (use a Cloudflare Web Analytics snippet)
- Comments (out of scope — use a third-party or skip)

---

## The content model

### Why MDX, not Markdown

Articles need more than prose — they need FAQs, callouts, comparison tables,
embedded video, and (eventually) interactive components. MDX is a strict
superset of Markdown that lets us embed Astro components inside the article
body without losing the editor-friendly flow.

Trade-off: frontmatter has to be valid YAML, and the body has to be valid
MDX. The validate script catches both.

### Why file-based, not database

- **Diffable.** Every change shows up in `git log -p`. Reviewers can comment
  on the patch, not a row in a CMS.
- **Branchable.** The future AI agent can open a PR per article; the editorial
  team reviews and merges.
- **Backupable.** The repository is the backup.
- **Portability.** When this brand outgrows Astro, the entire archive moves
  in one `git clone`.

Trade-off: search and faceting are weaker than a database. We accept this
because the volume (hundreds, not millions) and editorial workflow make
DB-driven search overkill.

### Why a strict Zod schema

The schema in `src/content.config.ts` is the single source of truth. It:

1. **Validates frontmatter at build time** — broken articles fail the build,
   not production.
2. **Generates TypeScript types** for the rest of the app — components like
   `ArticleLayout` get full IntelliSense on `entry.data`.
3. **Documents the contract** — anyone (including a future AI agent) reading
   the schema knows exactly what fields are required, what the categories are,
   and what the allowed statuses are.

The schema is intentionally **strict on identity** (title, description, slug,
category) and **lenient on body** (the MDX body is just a string). This means
the platform can be re-themed or re-rendered without touching any article.

---

## The status workflow

### Why a state machine, not free-form

A free-form `published: bool` field invites the same mistakes every content
project makes: drafts going live, scheduled posts leaking via RSS, edits
landing on live URLs without review. The four-state machine eliminates
those failure modes at the schema level.

The allowed transitions:

```
draft ──▶ review ──▶ scheduled ──▶ published
   ▲          │            │              │
   └──────────┘            └──────────────┘
```

The `lib/status.ts` module is the only place transitions are checked. Every
entry point (the admin UI, the API, the publish script) calls
`assertTransition(from, to)`.

### Why the rollback edges

- **draft ← review** — the editor can send an article back with notes.
- **scheduled ← review** — the editor can move something from "approved, waiting"
  to "needs more work" without losing the `scheduledFor` date.
- **scheduled ← published** — a typo discovered on a live article; pull it
  back to scheduled, fix, re-publish.
- **draft ← published** — a longer fix; demote to draft while you work.

### Why status="published" isn't the only gate

We also have a `draft: bool` field. Why? For two reasons:

1. **The kill switch.** A sensitive article can be `status: "published"` and
   `draft: true` simultaneously — the article remains in the admin (the team
   knows it exists) but disappears from the public site instantly on the
   next build. No rollback dance, no Git revert.
2. **Pinning.** `pinned: true` puts an article at the top of category and
   index lists. It's independent of status so the editorial team can pin
   a draft ("This is the next big thing") without prematurely publishing it.

---

## The presentation layer

### Three layouts, no more

- **BaseLayout** — head, SEO, body, skip-link. Used by every page.
- **InsightsLayout** — homepage + category index. Shows the article grid,
  category strip, empty state.
- **ArticleLayout** — single article. Shows the executive summary, the body,
  the key takeaways, the FAQ, the related articles.

Each layout owns its styles. There is no `components.css` or shared utility
class. This means a layout can be deleted without breaking the others.

### Why the category strip is a sticky header

Once an article is published, the editor's primary need is "where is the
rest of the content?". The sticky category strip answers that in one click
from any article page. The "All / [Cat 1] / [Cat 2] / ..." pattern is
intentionally minimal — it doesn't compete with the article.

### Why executive summary is a field, not an MDX block

The summary is meta, not body. It's a different consumer (the index, the
RSS, the OG card, the search snippet). Pulling it out of the body means
we can render it consistently across every surface and never accidentally
ship a half-written draft summary.

The blockquote convention `> **Executive Summary:** ...` is a fallback for
human-written previews in the editor.

### Why FAQ is structured, not freeform

LLMs and answer engines (ChatGPT, Perplexity, Google AEO) preferentially
surface Q&A blocks. By giving the FAQ a stable JSON shape, the same
content can be:

- Rendered as `<details>` accordions on the article page
- Emitted as `FAQPage` JSON-LD for Google rich results
- Exposed as a structured RSS extension
- Trained on by future internal QA bots

A freeform MDX section would lose all four affordances.

---

## The admin layer

### Why a static admin at all

A real CMS would mean a database, a server, auth, and ongoing maintenance
for a system that is read-mostly. The static admin is built every time the
site is built and re-deployed — it shows the *current* state of the file
system, no caching tricks.

### Why `prerender = true` on the API route

The current build is `output: 'static'`. In that mode, the API route at
`/api/publish` is documented but not active. The publish script
(`scripts/publish.mjs`) is the active path.

To switch to live in-browser transitions, the operator:

1. Changes `output` to `'hybrid'` in `astro.config.mjs`
2. Adds `@astrojs/cloudflare` to dependencies
3. Uncomments the `export const prerender = false;` in `src/pages/api/publish.ts`
4. Adds Cloudflare Access (or similar) in front of the API

This separation lets the team run a static deploy today, without blocking
the future hybrid upgrade.

---

## Scalability considerations

### How this scales to 1,000 articles

The build is O(n) over the number of articles. Astro's content loader reads
the frontmatter once and caches it for the build. The page generator
re-uses that data. At 1,000 articles:

- Build time: ~30s
- Output: ~1,000 article HTML files + 7 category pages + 1 index
- Bandwidth: CDN-cached
- Search: external (Algolia, Pagefind) — not bundled

The 7 category pages are static and don't multiply with article count.

### How this scales to 10,000 articles

At 10K articles, the same architecture works but the category pages
should switch to a paginated list (current implementation shows everything
in one grid). The category `[category].astro` page would gain `paginate()`
and `/category/[category]/[page].astro`.

We are well below that threshold today.

### Where the bottleneck is, when it hits

- **Build time** — addressed by Astro's incremental builds (turned on by
  default in 5.x with `experimental.assets`).
- **Search** — when a search box is added, it should be client-side
  (Pagefind) or external (Algolia). Don't run search at build time.
- **Image optimization** — keep using Astro's `<Image>` or a CDN. The current
  implementation uses string paths (SVGs are not optimized by Astro's
  pipeline). When the platform moves to raster hero images, switch the
  schema to `image().or(z.string())` and move assets to `src/assets/`.

---

## What this is NOT

- A monolithic publishing platform with auth, billing, multi-tenant.
- A live editor. Editors write in their own editor and commit to git.
- A database. The repo is the database.
- A comment system. (Use Disqus, Giscus, or skip.)

---

## Future extensions (out of scope today, designed-for)

| Extension | Where it plugs in |
| --- | --- |
| Multi-author profiles | `src/content/authors/` collection already defined |
| Tags archive page | `src/pages/tag/[tag].astro` (mirror category pages) |
| Series (multi-part articles) | Add `series` field to schema + new collection |
| Localized i18n | Astro 5 has built-in i18n routing — add `defaultLocale` |
| Email newsletter | RSS feed already exists; plug in any RSS-to-email tool |
| Search | Drop in Pagefind as a post-build step |
| Live editing UI | Switch to hybrid mode + add a CMS like Decap/Sveltia |

Each of these can be added without touching the schema or the existing
content. That's the point.
