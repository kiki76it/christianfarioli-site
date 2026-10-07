# AI Pulse daily intake

This is a separate local consumer of the existing Daily Social Content V3 files. It does not change that workflow, its research or its social outputs. The site is Astro on Cloudflare; there is no WordPress publishing endpoint to connect.

## Scope and publication boundary

`run-ai-pulse-daily.mjs` reads a Daily Content Pack, independently checks the Hero Story against public sources with the installed, authenticated Codex CLI and creates a complete Markdown draft using the existing strict importer. It has no Git push, deployment or publication operation. The 12 evergreen articles remain drafts as separately requested.

Drafts appear under `src/content/insights/ai-pulse/`. Pack date and actual news date are recorded in the private run ledger. An article receives a real publication timestamp only in a later authorised site release. Machine-assisted source verification does not imply human editorial approval.

## Input and controls

- Read-only source: `C:\Users\bel-b\Dropbox\Sent files\SM Chris DBOX`.
- Accepted names: `Daily Content Pack - YYYY-MM-DD.docx` or `.md`; an explicit `FRESH.docx` or numbered `Vn.docx` revision wins. Ambiguous selections stop for review.
- A file must be stable for at least five minutes. Its SHA-256 is checked before extraction, after extraction and after research.
- The extractor uses Python's standard ZIP/XML libraries. It preserves table paragraph order and hyperlinks; tracked deletions trigger review. It never opens Word or executes embedded content.
- The generator receives the extracted pack, inspected image choices and a list of published evergreen links. Pack/page instructions are treated as untrusted text. Shell, apps, computer, browser-control and remote-plugin features are disabled; public web research remains available.
- Codex output is constrained by a JSON schema. The deterministic validator checks structure, word count, source evidence, safe Markdown, image selection, internal-link allowlist, dates and duplicate titles.
- Every listed source needs a successful page-open result in the run log and a supporting claim. Search snippets and failed opens do not qualify. This establishes actual source access, not a guarantee that every interpretation is correct.
- Import is create-only. Existing slugs are never overwritten. A changed pack after import is held for editorial reconciliation.
- One new edition per invocation, at most two generation attempts for the same file hash. Unverifiable stories remain on hold. There is no unattended reset of retry counters.
- An exclusive run lock prevents overlap. If a crash leaves a lock, inspect the recorded PID and task state before removing that exact lock file.

## Local scheduling

`install-ai-pulse-daily-task.ps1` prepares the Windows task `ChristianFarioli - AI Pulse Daily Draft`: 07:45 Dubai time, then hourly checks for twelve hours. Already processed editions are skipped. The start boundary contains `+04:00`; the machine's timezone was independently verified as Arabian Standard Time.

The Windows user must remain logged in, the machine must be available, Dropbox must sync and Codex authentication must remain valid. Missed editions from the configured start date are processed oldest first. This is a local scheduled job, not an always-on hosted service.

The configuration and run state belong outside the public repository. Required JSON fields: `mode: "draft"`, `sourceDirectory`, `stateDirectory`, `contentRoot`, `codexExe`, `pythonExe`, `startDate`, `stabilityMinutes`. No credentials are written to this configuration. Saved Codex authentication is reused under the same Windows user.

## Review and recovery

Inspect `last-run.json` for the latest outcome, `ledger.json` for edition provenance and each `runs/<date>/<run>/` directory for the extracted pack, prompt, output, claim ledger and source-access log. These are local editorial records and must not be copied into the public site.

To stop the workflow reversibly:

```powershell
Disable-ScheduledTask -TaskName 'ChristianFarioli - AI Pulse Daily Draft'
```

After an authorised fix, inspect and retry only the affected edition. Do not overwrite an existing article or clear the ledger to force a duplicate import.

## Verification status

- Basic read-only Codex/web probe: passed with the already installed VS Code Codex binary version `0.162.0-alpha.2`; it opened DNB's original announcement and returned verified source/date fields.
- Older PATH CLI version `0.151.0` could not run the configured model; no global update or model downgrade was performed.
- Deterministic intake unit tests (4), read-only OOXML extraction tests (2), and synthetic path preflight checks (6): passed. The wrapper validates canonical paths before writing logs; state is excluded from Dropbox, website content and the website repository. No real pack was used in those preflight tests.
- Full pack-to-draft run and task registration: pending specific consent for external processing of pack content. Automatic approval review rejected that test because it considered the external Codex destination insufficiently authorised. No schedule is claimed active at this stage.
