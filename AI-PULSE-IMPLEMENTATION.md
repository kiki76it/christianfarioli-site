# AI Pulse implementation record

Baseline: `8d861a2` (origin/main, 7 October 2026). Isolated branch: `feat/ai-pulse-20261007`.
Backup: `backups/ai-pulse-20261007/baseline-main.zip` in the parent workspace; SHA-256 `33826F27464D541AED5787CC6D82FD6806564949551EE72ACD35066E2EDBCE10`.

## Architecture inspected before changes

Astro 5 + MDX, static output with Cloudflare Pages Functions. No WordPress, PHP, Elementor, Gutenberg, ACF or Yoast is involved in this site. The content collection category enum is the native taxonomy; `InsightsLayout.astro` supplies the archive, cards and link-based filters. Existing categories use `/insights/category/{category}/`; article paths are `/insights/{category}/{slug}/`. The publication workflow is file-backed draft/review/scheduled/published. Existing JSON-LD and SEO are rendered by Astro. The author profile is the main website, with its About, books, speaking and contact sections.

Existing design: Inter and Playfair Display, warm white, charcoal and the site's red accent. Archives use 968/640px breakpoints and horizontal category scrolling; bylines use 680/540px. There is no existing pagination or image transformation service. Reuse the archive grid and CSS; introduce server-rendered pagination only for the daily AI Pulse archive.

## Planned changes identified before editing

- Taxonomy and validation: `src/content.config.ts`, shared category/editorial helpers, `scripts/validate.mjs`, `scripts/new-article.mjs`, `scripts/publish.mjs`, future publishing documentation and a draft-only JSON intake script.
- Archive/filter: `src/layouts/InsightsLayout.astro`, `src/lib/links.ts`, `src/pages/category/[category].astro`, new AI Pulse archive/page/feed routes, `src/pages/sitemap.xml.ts`.
- Article: `src/layouts/ArticleLayout.astro`, `src/components/ArticleByline.astro`, `src/layouts/BaseLayout.astro`, one clearly labelled draft under `src/content/insights/ai-pulse/`.
- Transparency: one editorial policy page reusing site typography/navigation, plus archive/article links.
- Draft isolation and route aliases: `scripts/post-build.mjs`, `functions/_middleware.ts`, robots directives as required.
- Focused regression/contract tests and QA records; no external research workflow connection or new framework/plugin.

The test article must remain draft, excluded from public archives, feeds and sitemap. No publication date is fabricated. Editorial updates are explicit content dates, never build/status-transition timestamps.

## Implemented and verified locally

- Archive `/insights/ai-pulse/`, static pages of 12 articles, self-canonical pagination, shared filters and cards. Existing category URLs retained. Dedicated native RSS uses `/insights/ai-pulse/feed.xml`; `/feed/` redirects to it.
- Exact requested archive metadata, CollectionPage/ItemList, sitemap discovery and root `/editorial-policy/`. No top-level navigation item.
- Existing article template emits one NewsArticle for AI Pulse, with the real linked author, image, publication/update metadata and attributed Sources. Evergreen BlogPosting and byline are preserved.
- One internal draft, `ai-pulse/internal-editorial-preview`, remains undated, noindex and unavailable at a public article URL. Its promotion control is disabled and contract validation rejects promotion.
- Root admin duplicates removed. Both admin namespaces, encoded path variants, response caching and malformed paths are guarded. A proper 404 prevents absent draft/pagination URLs from becoming SPA soft-200 pages.
- Build uses the editorial validator; CI runs type, contract, routing and final-output tests. Development-only parser dependencies support these tests; no new client framework or runtime dependency was added.
- Astro check: 0 errors, 0 warnings (existing/advisory hints remain). Build: 340 pages. Focused suite: 36 passed, one isolated-fixture test skipped. A separate temporary 13-article build passed all 9 output suites, exercising All, ordering, page two, explicit updates and scheduled dates.
- Chrome checked archive, cards, article byline/body and policy at 320, 375, 390, 430, 768 and 1440px. Draft toolbar overflow discovered and fixed. Keyboard category navigation, visible focus, search, page navigation and editorial-policy links exercised. No observed console errors. Screenshots inspected in the browser session.

Additional files needed during verification: `astro.config.mjs` (isolated cache), `src/pages/404.astro`, admin preview toolbar, `main-site/_headers`, `public/_routes.json`, `.github/workflows/ci.yml`, and focused test/fixture scripts. No synthetic published content is present in this checkout.

## Integration and limits

See `AI-PULSE-AUTOMATION.md` for the exact JSON/native-field mapping, CLI, GitHub REST endpoints, least-privilege authentication and WordPress boundary. Daily Social Content V3 is not connected. A timed static publication requires an actual rebuild and successful deployment; an eligible scheduled timestamp alone does not update the live site.

Local schema validation is not a claim of Google indexing, Google News/Discover acceptance, Preferred Sources eligibility or field Core Web Vitals. The first real article still needs verified facts, appropriate image rights and Christian's editorial responsibility. No plugin or Google News sitemap engine was installed.

Rollback: revert the isolated release commit or restore the last known-good Cloudflare deployment. Preserve the baseline archive and its recorded hash; no data migration is involved.
