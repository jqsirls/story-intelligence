# Emergency Security PR: Secret Containment, Cleanup, and History Scrub

This document is the canonical checklist and runbook for the **Emergency Security PR**. It is written to be pasted into the PR description and used as an operator guide.

## A) Containment + Rotation Checklist (PR description)

Complete these in the relevant environments **before** relying on any branch/commit state:

- [ ] **Rotate Supabase keys**: rotate **anon** + **service_role** keys in every affected Supabase project.
- [ ] **Rotate any DB passwords** referenced anywhere in repo scripts/config.
- [ ] **Invalidate JWTs/tokens** that could be used against any environment (session tokens, API tokens, embed tokens).
- [ ] **Confirm blast radius**: verify which environments were reachable with the leaked material (dev/staging/prod).
- [ ] **Rotate Notion integration token** (if used) referenced by `NOTION_TOKEN` (the repo previously contained a hardcoded token-like value).

## B) Working Tree Cleanup (must land in this PR)

### Required repository changes

- [x] Remove `.config/supabase-credentials.sh` from git tracking and add it to `.gitignore`.
- [x] Add `.config/supabase-credentials.example.sh` with placeholders (no real values).
- [x] Remove token-bearing test artifacts from git (ex: JSON files containing `accessToken`).
- [x] Replace hardcoded JWT-like strings in scripts/examples with **env lookups only** (no fallback secrets).
- [x] Add a CI guard that fails on secrets in HEAD (**gitleaks**).

### Developer workflow

1. Copy the example locally:

```text
cp .config/supabase-credentials.example.sh .config/supabase-credentials.sh
```

2. Fill in values locally (never commit).
3. Source it for local scripts:

```text
source .config/supabase-credentials.sh
```

## C) History Scrub Plan (required)

Even after removing secrets from HEAD, **git history still contains leaked values**. A history rewrite is required.

### C1) Evidence report (file paths + commit SHAs)

Known secret-bearing paths and commits (from `git log` and string searches; no secret contents):

```text
.config/supabase-credentials.sh
6d196075232baacd8eaba0e0d503881c67181aaf 2025-12-31 Ship: V2 parity image generation - clean prompts + correct sizes

scripts/test-results-all-responses.json
6d196075232baacd8eaba0e0d503881c67181aaf 2025-12-31 Ship: V2 parity image generation - clean prompts + correct sizes

test-results/test-mode-user-credentials.json
6d196075232baacd8eaba0e0d503881c67181aaf 2025-12-31 Ship: V2 parity image generation - clean prompts + correct sizes

packages/storytailor-embed/example/local-test.html
b1648d13c8614f639e2f44b044830576d83678f3 2025-12-10 Initial commit - clean history

scripts/ (JWT-like strings present historically)
6d196075232baacd8eaba0e0d503881c67181aaf Ship: V2 parity image generation - clean prompts + correct sizes
b4ab03876768a7c61110aca6e17bd38be3803cb8 feat(content-agent): Universal halo device solution with wheelchair-pattern transformation
b1648d13c8614f639e2f44b044830576d83678f3 Initial commit - clean history
```

### C2) Run gitleaks across history (recommended)

Run gitleaks locally against full history to generate a report of all secret hits:

```text
gitleaks detect --redact --report-format json --report-path gitleaks-history-report.json --log-level info
```

Attach `gitleaks-history-report.json` to the security PR (or paste a redacted summary: file paths + commit SHAs).

### C3) Rewrite history (git filter-repo)

1. Install `git-filter-repo` (see `git filter-repo --help`).
2. Remove the known secret-bearing paths from history (at minimum):

```text
git filter-repo --path .config/supabase-credentials.sh --path scripts/test-results-all-responses.json --path test-results/test-mode-user-credentials.json --invert-paths
```

3. Replace any remaining leaked values using `--replace-text`:

```text
# Create replacements file (do NOT commit real values)
# Each line: <old-string>==><new-string>
cat > replacements.txt <<'EOF'
# example:
# eyJ...==>[REDACTED_JWT]
EOF

git filter-repo --replace-text replacements.txt
```

4. Force-push rewritten history and require fresh clones:

```text
git push --force --all
git push --force --tags
```

### C4) Operational warnings

- A history rewrite requires coordination. All collaborators must **fresh clone** or hard reset to the rewritten history.
- After rotation, treat any previously leaked values as permanently compromised.

