# AI Pulse website publishing contract

## Daily integration added on 7 October 2026

The owner subsequently authorised processing the existing Dropbox packs and publishing their separate AI Pulse articles. The implemented local consumer and deterministic, protected-PR publisher are documented in [the daily workflow](docs/ai-pulse-daily-workflow.md). They reuse the existing social packs without modifying Daily Social Content V3. The interface and original website-side scope below remain background documentation; use the daily workflow for the operational setup and current checks.

## Architecture and scope

The inspected website uses Astro 5, filesystem content collections and Cloudflare Pages. Insights are normal `.md`/`.mdx` entries in `src/content/insights`; categories are the existing enum, now including `ai-pulse`. This implementation does not create a WordPress taxonomy, install a plugin or configure Yoast. No active WordPress publishing endpoint has been identified for this site. The legacy `/insights/api/publish` stub is not a working publishing API.

The website side is prepared. Daily Social Content V3, its research, its 07:00 Asia/Dubai schedule, credentials, external API calls and deployment are unchanged. No test story is published. The internal draft must stay private and must never be promoted to a news article.

## Local draft intake

Run `npm run content:ai-pulse -- --file article.json` in an isolated checkout. This reads JSON, validates it, safely serializes frontmatter and creates **one new Markdown draft** under `src/content/insights/ai-pulse/`. It cannot overwrite `.md` or `.mdx` content, accept path traversal, run a shell command, evaluate an expression, commit or deploy. External bodies use Markdown rather than executable MDX. Raw HTML/imports/exports and executable link protocols are rejected.

| JSON field | Existing content field | Requirement |
| --- | --- | --- |
| `title` | `title` | 10–140 characters |
| `slug` | Filename under `ai-pulse/` | One lowercase hyphenated segment, at most 100 characters |
| `category` | `category` | Exactly `ai-pulse` |
| `excerpt` | `excerpt` | 40–280 characters |
| `content` | Markdown body | Intro, then H2s `What happened`, `Why it matters`, `The bigger shift`, `My take`, once each, in that order, with text |
| `featured_image` | `featuredImage` | Existing root-relative asset or HTTPS URL |
| `featured_image_alt` | `featuredImageAlt` | Meaningful text, 5–500 characters |
| `sources` | `sources` | Nonempty array of `{ "name": "...", "title": "...", "url": "https://..." }`; `title` is optional |
| `meta_title` | `seoTitle` | 10–140 characters |
| `meta_description` | `description` | 40–280 characters |
| `date_published` | `publishedAt` | Optional for draft; if supplied, explicit ISO time and timezone |
| `author` | `author.name` | Exactly `Prof. Christian Farioli` |
| `schema_type` | `schemaType` | Exactly `NewsArticle` |
| `internal_links` | `related` | Optional array of `{ "slug": "category/article", "title": "..." }`; use genuinely relevant existing content |
| `internal_test` | `internalTest` | Optional boolean; `true` permanently blocks advancement until an editor replaces the test with verified content and deliberately removes the flag |

Sources are rendered by the article template from frontmatter; do not duplicate an H2 Sources in the supplied body. Normal Markdown links in the body remain supported. The existing `related` field supports an additional related-reading area; automated callers must verify targets exist and are public, and choose relevance rather than random links.

The importer does not download an image or verify the editorial truth of a source. The future workflow must check provenance, original reporting, factual attribution, source response codes, rights, image dimensions, alt text and meaningful original analysis. Prefer a licensed editorial image at least 1200px wide, with a stable URL or repository asset. Avoid remote tracking URLs. Public assets are prefixed with `/insights` by the current rendering helpers; for example `public/images/insights/covers/example.webp` is stored as `/images/insights/covers/example.webp`.

## Publication and date integrity

The native workflow remains `draft → review → scheduled → published`, with the existing return-to-draft paths. Intake cannot set status. `scripts/publish.mjs` changes only local frontmatter. It now accepts `.md` and `.mdx`, validates AI Pulse content before writing, rejects paths outside the content directory and never automatically changes `updatedAt`.

For example, after factual/editorial checks on a real article:

```text
npm run publish -- --slug ai-pulse/verified-story --to review
npm run publish -- --slug ai-pulse/verified-story --to scheduled --scheduled-for 2026-10-08T07:00:00+04:00
npm run publish -- --slug ai-pulse/verified-story --to published --published-at 2026-10-08T07:00:00+04:00
npm run validate
npm run test:ai-pulse
npm run build
```

The timestamps above are syntax examples, not publication dates to copy. In hand-authored frontmatter quote all AI Pulse timestamps: `publishedAt: "2026-10-08T07:00:00+04:00"`. Date-only/local timestamps and impossible calendar dates fail validation. Scheduled content requires `scheduledFor`; published content requires `publishedAt`. Drafts need neither. Re-publication preserves an existing publication timestamp. Converting an already-due scheduled post to published preserves its scheduled publication time; publishing early uses the current clock unless an explicit first-publication time is supplied. `--published-at` cannot change an existing publication time. A factual date correction requires a deliberate frontmatter edit with an editorial record. An `updatedAt` value must be later than publication and added deliberately only after a meaningful editorial correction/update. A build, metadata refresh or workflow transition is not such an update.

If a scheduled article also supplies `publishedAt`, both timestamps must describe the same instant (different timezone representations of that instant are accepted). `updatedAt` can never be in the future, in any workflow state: it records an editorial update that has actually happened.

`npm run build` runs the content validator before Astro. The collection schema also validates raw dates before coercion; public queries validate the article contract and hide internal tests. Published future-dated AI Pulse entries remain hidden. Scheduled posts become eligible at the first build at/after their due time. **Static output does not change at 07:00 without a rebuild/deployment.** The future scheduler must build at the intended publication time and record the actual successful release time; neither a Git commit nor an API success proves the public page is live.

## Recommended future integration: authenticated GitHub REST

Use the existing Git/Cloudflare architecture. A narrow GitHub App installation token is preferred; a repository-scoped fine-grained token is an alternative. Grant this repository `Contents: write` and, for draft PR creation, `Pull requests: write`. Keep credentials only in the automation platform's secret store. Do not put tokens in source files, request bodies, command-line URLs or logs. The existing shell-based `scripts/deploy.mjs` is not the recommended external-content ingestion interface.

For `kiki76it/christianfarioli-site`, requests use `https://api.github.com` with `Accept: application/vnd.github+json`, `Authorization: Bearer <secret>` and `X-GitHub-Api-Version: 2026-03-10`. The API version is based on the current official documentation; recheck it when connecting automation.

1. Fetch the target base SHA with `GET /repos/kiki76it/christianfarioli-site/git/ref/heads/main`.
2. Create a unique content branch with `POST /repos/kiki76it/christianfarioli-site/git/refs`, body `{ "ref": "refs/heads/ai-pulse/<unique-slug>", "sha": "<base-sha>" }`.
3. Run the draft importer in a trusted checked-out version of this repository. Upload the resulting bytes with `PUT /repos/kiki76it/christianfarioli-site/contents/src/content/insights/ai-pulse/<slug>.md`, body `{ "message": "content: add AI Pulse draft", "content": "<base64-encoded-UTF8-file>", "branch": "ai-pulse/<unique-slug>" }`. Do not send `sha` when creating; require absence of an existing file. Treat conflict/422 as a stop, not permission to overwrite. The slug/story identifier is the idempotency key.
4. Create a draft PR using `POST /repos/kiki76it/christianfarioli-site/pulls`, body `{ "title": "AI Pulse: <headline>", "head": "ai-pulse/<unique-slug>", "base": "main", "draft": true, "body": "<source and fact-check evidence>" }`.
5. Promote only verified real content. CI must run the content gate, tests and production build. At future activation, choose an explicit review/auto-merge policy, restrict the automation's allowed paths and retain a source/fact-check ledger. A fully automatic daily workflow can use these checks after that policy and deployment path have been authorised and implemented; it is not connected here.
6. Use the existing authorised production deployment mechanism. Confirm the actual public page is 200, canonical/NewsArticle timestamps are correct, and the archive, root sitemap and category RSS contain it. Keep the last known-good deployment and its content commit for rollback.

The repository currently has a build CI workflow. Do not assume it already performs deployments, credential rotation, fact checking, auto-merge or timed rebuilds. Those are integration tasks for the later connection of Daily Social Content V3. If adding an image file as well, write it to the same branch before the PR is ready; use Git's tree/commit API if an atomic multi-file commit is required.

Official references: [GitHub content endpoints](https://docs.github.com/en/rest/repos/contents), [Git references](https://docs.github.com/en/rest/git/refs), [pull requests](https://docs.github.com/en/rest/pulls/pulls).

## WordPress route: API REQUIRED

There is no verified native WordPress destination for this Astro Insights implementation. Do not send production requests to a guessed `/wp-json/` URL, treat an unrelated WordPress connection as the publishing target, or build a parallel CMS solely for AI Pulse.

If a WordPress publishing destination is introduced later, first verify its actual `siteurl`, domain, environment, taxonomy, author ID, SEO setup and its relationship to this public Astro site. The normal native route would use HTTPS plus a dedicated user's Application Password (HTTP Basic authentication) with the least publishing capabilities required. Store it in the automation secret manager.

The expected native sequence is `GET /wp-json/wp/v2/categories?slug=ai-pulse`, then media upload via `POST /wp-json/wp/v2/media`, then `POST /wp-json/wp/v2/posts` with native `title`, `slug`, `content`, `excerpt`, `status: "draft"`, `date`/`date_gmt`, `categories: [verifiedCategoryId]`, `author: verifiedChristianAuthorId` and `featured_media: mediaId`. Creating a missing category would use `POST /wp-json/wp/v2/categories` only on the verified destination. Rendering mandatory sources into `content` avoids an unnecessary custom field. SEO title/description and `NewsArticle` must use an actually supported, authenticated SEO/plugin interface; do not assume Yoast exposes arbitrary writable REST metadata. That mapping and any WordPress-to-Astro bridge remain **API REQUIRED**.

Official references: [WordPress posts](https://developer.wordpress.org/rest-api/reference/posts/), [REST authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/), [application passwords](https://developer.wordpress.org/advanced-administration/security/application-passwords/).
