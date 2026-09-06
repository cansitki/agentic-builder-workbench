---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: pull-in
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - vibe-check

**Repo:** https://github.com/fabriziosalmi/vibe-check (a.k.a. "VibeGuard Auditor", v1.4.0)
**Stars:** 18
**Last activity:** Active — pushed 2026-04-27
**License:** MIT
**Note:** This is the real source behind the marketplace listing "vibeguard-auditor".

## What it is
An "anti-slop CI/CD gatekeeper" — a Python scanner packaged as a GitHub Action that scores a repo 0-1000 across 300+ rules covering security, code smells, AI-generated slop, and git anti-patterns, with auto-fail thresholds.

## Activity signal
Active but small. v1.4.0 with a recent refactor from one 730-line god-file into a modular `src/` layout (rules/scanner/reporter/logger). Author practices what they preach.

## Core features
- 300+ rules across 11 categories: security, stability, maintainability, hygiene, smells, testing, performance, docs, UI/UX, **AI-slop detection** (copy-pasted ChatGPT, Lorem Ipsum), git hygiene (lazy commits, merge conflicts, unprofessional messages).
- **AST-based Python analysis** (no regex false positives), regex+AST hybrid for other langs.
- 0-1000 scoring with severity weights: critical=100, high=50-90, med=20-49, low=2-19. `--brutal-mode` doubles penalties + fail-fast on critical.
- GitHub Actions native: emits `::error file=...,line=...::` annotations + job-summary markdown with score progress bar + per-file breakdown.
- Inline `# vibeguard:ignore` suppressions, `.vibeguardrc` config, externalized rules in `config/rules.yaml`.
- Git history audit (requires `fetch-depth: 50` checkout) — analyzes commit message quality.

## How it works mechanically
- Pure Python 3.8+ scanner, runs as `python vibeguard.py` locally or `uses: fabriziosalmi/vibe-check@main` in CI.
- For Python files: AST visitor pass. For others: regex + heuristic patterns from `config/rules.yaml`.
- Subtracts severity weights from a starting score of 1000. Fails build if score < threshold (default 800).
- No LLM dependency — fully deterministic, reproducible, no API key needed.

## When to use it
- Adding a CI gate to a vibecoded repo where you want a single number to gate PRs.
- Catching "this looks like ChatGPT pasted it" patterns and lazy commit messages without writing a custom linter.
- Pairs well with [[Vibecoding - CI CD and Container Security]] and [[Vibecoding - Audit Checklist]].
- Good complement to truecourse: vibe-check is fast and deterministic, truecourse is deeper but slower.

## When NOT to use it
- Non-Python projects get only regex-grade analysis (false-positive risk on top of the 300 rules).
- The "score < 800 fails CI" heuristic is gameable / arbitrary — tune threshold per repo or it'll feel like style theater.
- AI-slop pattern detection is heuristic, not classifier-grade. Expect false positives on legitimately verbose markdown.

## Verdict: **pull-in**
Try the GitHub Action in one non-critical repository with a deliberately permissive threshold, inspect what fires, then tighten the gate from observed results. It is cheap to install and can block obvious failure modes.

## Distinctive quotes
> "Anti-slop CI/CD gatekeeper detecting security vulnerabilities, code smells, AI-generated slop, and git anti-patterns with intelligent 0-1000 scoring."

> "**Before (God Object)**: Single 730-line file with everything mixed together [...] **After (Modular)**: src/rules.py, src/scanner.py, src/reporter.py, src/logger.py."

> "Built with love and refactored to follow its own rules."

## Cross-links
- [[Vibecoding - Audit Checklist]]
- [[Vibecoding - CI CD and Container Security]]
- [[Vibecoding - Things to Check on Your Code]]
- [[Vibecoding - Tooling truecourse]]
- [[Vibecoding - Tooling brutal-coding-tool]]
