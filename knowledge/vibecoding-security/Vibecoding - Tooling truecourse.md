---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: pull-in
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - truecourse

**Repo:** https://github.com/truecourse-ai/truecourse
**Stars:** 301 (npm: `truecourse`)
**Last activity:** Active — pushed 2026-04-29 (today)
**License:** MIT

## What it is
AI architecture & code intelligence platform that combines tree-sitter static analysis with LLM-powered review to surface architectural, security, and bug findings across JS/TS and Python codebases.

## Activity signal
Active. Daily commits, npm package, badge-tagged CI, 1.2k+ deterministic rules + 100 LLM rules across 8 categories. Looks like a serious product, not a weekend repo.

## Core features
- 1,200+ deterministic tree-sitter AST rules + 100 LLM rules across security, bugs, architecture, code quality, performance, reliability, database, style.
- Architectural detection traditional linters miss: circular deps, layer violations, god modules, dead modules, tight coupling, cross-service imports.
- Local-first: stores everything in `.truecourse/` as plain JSON. No daemon, no DB, no cloud.
- Pre-commit hook (`truecourse hooks install`) blocks new violations at configured severity, diffs against last full analysis baseline.
- Web dashboard (`truecourse dashboard`), CLI list/diff, Claude Code skills (`/truecourse-analyze`, `/truecourse-fix`, etc.).
- LLM rules use the local `claude` CLI — graceful degrade to deterministic-only when `claude` not on PATH.

## How it works mechanically
- **Tree-sitter AST visitors** for the 1,200 deterministic rules — fast, zero-cost.
- **LLM rules** spawn `claude` CLI subprocesses. Configurable concurrency (`CLAUDE_CODE_MAX_CONCURRENCY=10` default).
- Honors `.gitignore` + custom `.truecourseignore`. Per-repo config via `.truecourse/hooks.yaml` (committed) and `~/.truecourse/.env` (local).
- npm CLI: `npx truecourse analyze` / `dashboard` / `list --diff` / `hooks install`.
- Diff mode (`analyze --diff`) shows only NEW or RESOLVED violations vs. baseline — the killer mode for daily use.

## When to use it
The right tool when you want a single deterministic + LLM analyzer running on every commit of a vibecoded JS/TS or Python repo and you already use Claude Code. Especially good for: catching layer violations the team agreed to but nobody enforces, dead-module pruning, finding the N+1 query nobody noticed. Pairs well with [[Vibecoding - Audit Checklist]] and [[Vibecoding - Things to Check on Your Code]].

## When NOT to use it
- Non-JS/TS/Python stacks (C#/Go/Rust marked "Planned" — wait).
- If you're not using Claude Code, LLM rules silently skip — you only get the deterministic half.
- Pre-commit hook adds tens of seconds per commit on large repos. They warn you. Tune severity blocklist or skip LLM in hook config.
- Telemetry on by default outside CI. Disable explicitly if that bothers you (`TRUECOURSE_TELEMETRY=0`).

## Verdict: **pull-in**
This is close to "lint, but for architectural rot." The diff mode and pre-commit gating complement [[Vibecoding - Debugging and Bug Triage Workflow]]. Trial `npx truecourse analyze` on a non-critical repository before making it a required gate.

## Distinctive quotes
> "1,200+ deterministic rules, 100 LLM rules. JavaScript, TypeScript, Python."

> "TrueCourse uses the Claude Code CLI for LLM-powered rules. If `claude` isn't on your PATH, deterministic rules still run and LLM rules are skipped."

> "Commits will take as long as a full diff analysis — on large repos that can be tens of seconds per commit. `truecourse hooks install` warns you and requires confirmation before writing the hook."

## Cross-links
- [[Vibecoding - Things to Check on Your Code]]
- [[Vibecoding - Audit Checklist]]
- [[Vibecoding - Debugging and Bug Triage Workflow]]
- [[Vibecoding - Database Hygiene]]
