# Christian Farioli — Insights Platform

The authority publishing platform for **Prof. Christian Farioli**.
Astro + MDX, content collections, status workflow, automation hooks.

> **Status:** Publishing infrastructure complete. No AI agents wired in yet — this repo
> contains only the content architecture, validation, and deployment primitives the
> future automation layer will sit on top of.

---

## What's in here

| Layer | Location | Purpose |
| --- | --- | --- |
| **Content** | `src/content/insights/` | MDX articles with rich frontmatter (title, category, status, FAQ, etc.) |
| **Schema** | `src/content.config.ts` | Zod-typed content collections — the contract between the platform and any future agent |
| **Status workflow** | `src/lib/status.ts` | Draft → Review → Scheduled → Published, with allowed transitions |
| **Site** | `src/pages/`, `src/layouts/` | Homepage, category pages, article pages, admin dashboard, RSS, sitemap |
| **Admin** | `src/pages/admin/` | Static dashboard for humans + preview page for in-progress articles |
| **API** | `src/pages/api/publish.ts` | Optional server endpoint for in-browser status transitions (hybrid mode only) |
| **Automation scripts** | `scripts/` | Node scripts the future AI agent will call to create, validate, transition, and deploy |
| **Brand styles** | `src/styles/global.css` | Palette + typography matching `christianfarioli.com` |

---

## Quick start

```bash
npm install
npm run dev           # http://localhost:4321
npm run build         # static output → dist/
npm run preview       # serve dist/ locally
```

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run validate` | Lint every MDX file against the schema. Run before committing. |
| `npm run content:list` | Dump a JSON manifest of every article (--group to bucket by status). |
| `npm run content:new -- --title "..." --category ai-strategy` | Scaffold a new draft. |
| `npm run publish -- --slug ai-strategy/foo --to review` | Transition an article's status. |
| `npm run deploy` | Build, git commit content changes, push to GitHub, trigger Cloudflare. |

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Content layer (MDX + frontmatter)                                │
│    src/content/insights/**/*.mdx                                  │
│    Validated by Zod schema in src/content.config.ts              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Presentation layer (Astro + MDX)                                 │
│    src/pages/* → static HTML at build time                        │
│    Layouts: BaseLayout, InsightsLayout, ArticleLayout             │
│    Filter: only status=published (or past-scheduled) renders      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Admin + API                                                      │
│    /admin/        static dashboard for humans                     │
│    /admin/preview/ shows drafts / review / scheduled in context   │
│    /api/publish   server endpoint (only when hybrid mode is on)   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Automation (Node scripts in scripts/)                            │
│    validate.mjs    schema lint                                    │
│    list-articles.mjs  manifest dump                               │
│    new-article.mjs  scaffold                                      │
│    publish.mjs     transition status                              │
│    deploy.mjs      build + commit + push + Cloudflare trigger     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  External (future)                                                │
│    AI agent runs scripts/publish.mjs and scripts/deploy.mjs       │
│    GitHub stores content, Cloudflare Pages serves the static site │
└──────────────────────────────────────────────────────────────────┘
```

For the deep dive, see [ARCHITECTURE.md](./ARCHITECTURE.md).
For how the future AI agent plugs in, see [AUTOMATION.md](./AUTOMATION.md).

---

## Content model at a glance

Every MDX file in `src/content/insights/` carries this frontmatter:

```yaml
title: "Why AI Strategy Beats AI Tools: The Executive Playbook"
description: "Buying AI tools is easy. Building an AI strategy is rare. ..."
category: "ai-strategy"            # one of 7 allowed categories
tags: [strategy, leadership, governance, moat]
author:
  name: "Prof. Christian Farioli"
  role: "AI Strategist, Educator & Advisor"
  avatar: "/images/authors/christian-farioli.svg"
featuredImage: "/images/articles/ai-strategy-hero.svg"
featuredImageAlt: "A strategist with a chess board"
status: "published"                 # draft | review | scheduled | published
publishedAt: 2025-08-20
readingTime: 7
executiveSummary: "Tools are commodities; strategy is the moat. ..."
keyTakeaways:
  - "Tools are commodities; strategy is the moat."
  - "..."
faq:
  - question: "What is the difference between AI strategy and AI tools?"
    answer: "AI tools are products. ..."
related:
  - slug: "ai-strategy/aiso-the-new-ranking-factor"
```

### The 7 allowed categories

| Slug | Display label |
| --- | --- |
| `ai-strategy` | AI Strategy |
| `human-centered-ai` | Human-Centered AI |
| `ai-leadership` | AI Leadership |
| `aiso` | AISO |
| `ai-marketing` | AI Marketing |
| `executive-education` | Executive Education |
| `future-of-work` | Future of Work |

### The 4 status states

```
draft ──▶ review ──▶ scheduled ──▶ published
   ▲          │            │              │
   └──────────┘            └──────────────┘
   (rollback allowed)
```

`published` is the only state visible on the public site. `scheduled` becomes
visible on its `scheduledFor` date automatically. `draft` and `review` are
admin-only and viewable at `/admin/preview/<slug>/`.

---

## Directory layout

```
insights-platform/
├── astro.config.mjs          Astro config (MDX, sitemap, RSS, remark-gfm)
├── package.json              All scripts defined here
├── tsconfig.json
├── public/                   Static assets (favicon, robots.txt, images)
│   └── images/
│       ├── articles/         Hero images per article
│       └── authors/          Author avatars
├── scripts/                  Automation scripts (Node)
│   ├── validate.mjs
│   ├── list-articles.mjs
│   ├── new-article.mjs
│   ├── publish.mjs
│   └── deploy.mjs
├── src/
│   ├── content.config.ts     The Zod schema — the contract
│   ├── content/insights/     The actual MDX articles
│   ├── layouts/              BaseLayout, InsightsLayout, ArticleLayout
│   ├── lib/                  Pure helpers (status, insights, reading-time)
│   ├── pages/
│   │   ├── index.astro
│   │   ├── insights/[...slug].astro
│   │   ├── category/[category].astro
│   │   ├── rss.xml.js
│   │   ├── admin/index.astro
│   │   ├── admin/preview/[...slug].astro
│   │   └── api/publish.ts
│   └── styles/global.css
├── ARCHITECTURE.md           Deep dive on the design
└── AUTOMATION.md             How the future AI agent plugs in
```

---

## License

Internal — © Prof. Christian Farioli.
