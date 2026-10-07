# AI Pulse daily workflow

This local consumer reads the existing Daily Social Content V3 packs without changing Dropbox or the social workflow. The site uses Astro and the existing GitHub/Cloudflare publication path. The user authorised external Codex processing and publication on 7 October 2026. The archive includes that edition; unattended processing starts on **8 October 2026**.

## Separate generation and publication

`run-ai-pulse-daily.mjs` only researches and imports Markdown drafts. It cannot push, publish or deploy. `publish-ai-pulse-daily.mjs` independently revalidates the exact imported draft and creates one scoped GitHub PR. No model participates in Git operations or receives credentials. The generic `deploy.mjs` script is never used.

The Windows wrapper resumes publication first. Only an idle publisher or a verified live publication permits a clean checkout sync and one new generation. A pending PR/deployment, unexplained lock or failure stops that tick before another draft is generated. Each invocation performs one bounded check inspection; green checks are read again immediately before merge. Pending work resumes at the next scheduled tick.

## Source and editorial controls

- Read-only source: `C:\Users\bel-b\Dropbox\Sent files\SM Chris DBOX`.
- Canonical names are `Daily Content Pack - YYYY-MM-DD.docx` or `.md`; explicit `FRESH.docx` and numbered `Vn.docx` revisions take precedence. Ambiguity stops for review.
- A file must be stable for at least five minutes. SHA-256 is checked before and after extraction, after research and before publication preparation. Changed packs are held rather than overwritten.
- The standard-library Python extractor preserves tables and hyperlinks. Tracked deletions trigger review. It does not launch Word or execute embedded content.
- Codex receives the extracted pack, inspected images and published evergreen links. Pack/page instructions are untrusted evidence. The configured CLI disables shell, apps, computer, browser-control and remote-plugin features; public web research remains available.
- Deterministic validation checks the four sections, word count, inert Markdown, images, published internal links, news dates, duplicate titles and source claims. Every source needs a successful page-open result in the evidence. Snippets and failed opens do not qualify.
- Source-access logs and claim ledgers establish machine-assisted verification, not individual human review. No reviewed date or reviewed-by claim is invented. Unverifiable stories remain on hold.
- Imports are create-only. One edition is generated per invocation, with at most two attempts for the same source hash. Counters are never automatically reset.

## Publication contract

Only an `imported` generator record qualifies. The publisher rechecks the ID, canonical source/hash, result hash, exact Markdown hash and evidence-directory containment. It derives the destination from the validated slug and configured content root, then reruns intake, source-access, image and evergreen-link validation. Internal tests, tracked articles, conflicting MDX files, changed drafts and path redirections are rejected.

The exact draft and promoted Markdown are journalled outside the repository before the original draft is removed. Only that exact, hash-checked **untracked** file can be removed; tracked files are never deleted. Promotion sets `status: published`, `draft: false`, an actual release-preparation timestamp and `sourceEditionDate`. Pack/news dates are not publication dates. The timestamp stays fixed across CI waits/retries; it is not represented as the precise Cloudflare deployment instant.

The dedicated checkout uses local branch `automation/ai-pulse-daily` and exact origin `https://github.com/kiki76it/christianfarioli-site.git`. It fetches main and permits only a fast-forward of a clean checkout. It never resets, stashes, rebases or broadly stages files. A temporary isolated Git index creates a deterministic commit with exactly one added article, leaving the working branch and normal index unchanged. Commit identity is the existing `kiki76it` identity with its GitHub no-reply address.

A non-force push creates `automation/ai-pulse-<edition>-<draft-hash-prefix>` and a PR targeting main. Existing branches/PRs must match the expected head and exact added file/blob. Git Credential Manager supplies the existing credential into memory only. Tokens are never stored in configuration, prompts, journals, remote URLs or logs.

Merge requires successful, completed checks on the exact PR head:

- `build`, from GitHub Actions app `15368`;
- `Cloudflare Pages: christianfarioli-main`, from app `85455`;
- `Cloudflare Pages: christianfarioli-insights`, from app `85455`.

The latest result for each check must pass. Main must retain enforced administrator protection, a strict required GitHub Actions build and disabled force pushes. PR head, base, files and checks are reread immediately before a squash merge with the expected SHA. There is no direct main push, protection bypass or automatic approval. A main change during publication holds for explicit reconciliation and renewed review rather than rewriting the branch unattended.

Push, PR creation and merge each allow at most two mutation attempts. Existing branch/PR evidence is queried before retrying a lost response. A verified merged PR is recognised before any remote branch action; crash recovery does not recreate a deleted merged branch. Failed checks, closed PRs, changed heads and exhausted attempts require inspection.

**Merged is not live.** The journal keeps `liveStatus: pending` and blocks new generation until the merge commit's build and both Cloudflare checks pass. The publisher then fetches the actual canonical article, sitemap and AI Pulse feed over verified HTTPS. It checks the canonical URL, one NewsArticle with expected headline/date, H1, indexability and matching feed/sitemap entries. A status-200 homepage fallback cannot pass. Only successful output verification sets `liveStatus: verified`. Pending propagation retries on a later tick.

## Configuration and local schedule

Use an isolated automation checkout, not a development/release checkout. Configuration and state must be outside that checkout and Dropbox and must not be committed. Example:

```json
{
  "mode": "draft",
  "sourceDirectory": "C:/Users/bel-b/Dropbox/Sent files/SM Chris DBOX",
  "stateDirectory": "C:/Users/bel-b/OneDrive/JV/AI Experiments/ChristianFarioli Website/automation-state/ai-pulse-daily",
  "contentRoot": "C:/Users/bel-b/OneDrive/JV/AI Experiments/ChristianFarioli Website/work/ai-pulse-daily/src/content/insights",
  "codexExe": "C:/Users/bel-b/.vscode/extensions/openai.chatgpt-26.1002.51308-win32-x64/bin/windows-x86_64/codex.exe",
  "pythonExe": "C:/ProgramData/miniforge3/python.exe",
  "startDate": "2026-10-08",
  "stabilityMinutes": 5,
  "publication": {
    "enabled": true,
    "repositoryPath": "C:/Users/bel-b/OneDrive/JV/AI Experiments/ChristianFarioli Website/work/ai-pulse-daily",
    "expectedBranch": "automation/ai-pulse-daily"
  }
}
```

`--preflight` validates paths and checkout identity without model/GitHub calls or writes. `--dry-run` additionally validates an imported candidate and its evidence without authentication, deletion, commit or push. Run both intake and publisher preflight before installation. An idle dry-run reports `idle` when no eligible draft exists; it does not fabricate a candidate.

`install-ai-pulse-daily-task.ps1` registers `ChristianFarioli - AI Pulse Daily`: 07:45 Dubai time, then hourly for twelve hours. The task uses an explicit `+04:00` boundary, least privilege, hidden PowerShell, no overlapping instances and a thirty-minute execution limit. The installer refuses to replace an existing task and uses absolute verified PowerShell/Node paths. Do not invoke installation as a test.

The Windows user must remain logged in, the machine available, Dropbox synced and Codex/GitHub authentication valid. Missed editions from the configured start date are processed oldest first. This is a local job, not an always-on hosted service. An extension update may require verifying the pinned Codex binary path.

## Evidence, holds and recovery

`ledger.json` and `runs/<edition>/<run>/` retain generator provenance, source access, prompt and result. `publication.json` retains exact snapshots, Git/PR identity and bounded counters. `publication-last-run.json`, `last-run.json` and `scheduler-last-output.log` describe recent steps. These records remain private outside the site repository.

Generation/publication share exclusive `run.lock`. After an interrupted process, inspect its PID and Windows task state before removing that exact lock. Never clear a ledger or reset attempts to force an import. Changed main/head, failed checks, changed source or closed PR require reviewed reconciliation; do not edit hashes to accept different content. Normal pending CI/deployment needs no manual action.

To pause reversibly:

```powershell
Disable-ScheduledTask -TaskName 'ChristianFarioli - AI Pulse Daily'
```

## Verification evidence

- A real authorised 7 October pack-to-draft run passed with installed Codex CLI `0.162.0-alpha.2` and existing authentication. It opened the original DNB announcement and Reuters coverage hosted by The Economic Times, imported one draft into an isolated QA content root and left Dropbox unchanged. A second invocation returned `already-imported`: one attempt, one run directory, one unchanged article and no second model call. Evidence: workspace `qa/ai-pulse-archive-20261007/daily-live-test/`, outside this checkout.
- Publisher tests use synthetic sources, real temporary local Git commits and simulated GitHub/production responses. They cover no-write dry-run, scope/hash/path guards, check issuer/head matching, PR/merge crash recovery, remote/base divergence and merged-versus-live evidence. They do not establish a live PR, deployment or active schedule. Intake and OOXML extraction tests remain separate.
- On 7 October at 19:21:51 UTC, the production verifier passed against the already published DNB article and merge commit `aad1960131ea66cd70ef9fb39707126fba1ea220`: real GitHub checks, canonical, NewsArticle/headline/date/H1, sitemap and feed. This was a read-only probe, with no new publication or model call. Evidence is `daily-live-test/production-verifier-result.json` in the same QA directory.
- PowerShell scripts are syntax-checked without registering a task. Task registration and live publisher verification are separate release operations; passing local tests does not imply they occurred.
