# AI Code Reviewer

Automatically reviews GitHub pull requests using Claude — flags security issues, bugs, code quality problems, and performance concerns.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com (API Keys section)
- `GITHUB_TOKEN` — from https://github.com/settings/tokens (needs `repo` scope for private repos, `public_repo` for public)

## Usage

**Dry run (prints review to terminal, doesn't touch GitHub):**
```bash
npm run review -- https://github.com/owner/repo/pull/123
```

**Post as a summary comment on the PR:**
```bash
npm run review -- https://github.com/owner/repo/pull/123 --post
```

**Post summary + inline line-by-line comments:**
```bash
npm run review -- https://github.com/owner/repo/pull/123 --post --inline
```

**Use a different model:**
```bash
npm run review -- https://github.com/owner/repo/pull/123 -m claude-opus-4-8
```

## How it works

1. `src/github.js` — fetches PR metadata and the diff (patch) for each changed file via the GitHub API
2. `src/reviewer.js` — sends each file's diff to Claude with a structured prompt, gets back JSON-formatted findings (severity, category, line, message)
3. `src/formatter.js` — turns the findings into terminal output and GitHub-flavored markdown
4. `src/index.js` — CLI entry point (built with `commander`) that wires it all together

## Roadmap (Phase 2)

- [ ] GitHub App + webhook so reviews trigger automatically on every PR (instead of manual CLI run)
- [ ] PostgreSQL to store review history, track issue trends per repo, avoid re-reviewing unchanged files
- [ ] Express server to host the webhook receiver
- [ ] Static analysis pass (ESLint/Semgrep) combined with Claude's review for higher signal
- [ ] Configurable rules file (`.ai-review.yml`) per repo — ignore paths, severity thresholds, custom prompts

## Notes

- Large diffs: GitHub omits the `patch` field for very large file changes — those files are currently skipped. Chunking strategy for large diffs is a good next improvement.
- Each file is reviewed independently (parallel API calls) to keep latency low and stay within context limits.
