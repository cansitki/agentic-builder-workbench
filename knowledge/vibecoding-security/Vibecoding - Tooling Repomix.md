---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: pull-in
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - Repomix

**Repo:** https://github.com/yamadashy/Repomix
**Stars:** 24,091
**Last activity:** Very active — pushed 2026-04-29 (today). JSNation Open Source Awards 2025 nominee.
**License:** MIT

## What it is
A CLI that packs an entire repository into a single AI-friendly file (XML, Markdown, or plain text) so you can hand it to an LLM. Off-thesis for security per se — but its **Secretlint integration** and **tree-sitter compression** make it the right preprocessor before any LLM-driven audit.

## Activity signal
Top-tier active. 24k stars, Discord, browser extension, VSCode extension, hosted website (repomix.com). Mature and maintained.

## Core features
- Single command (`npx repomix@latest`) packs the repo into `repomix-output.xml`.
- **Token counting per file and total** — know if your context will fit before you paste.
- **Security via Secretlint** — automatically scans output for secrets and refuses to include them. Critical for vibecoding hygiene.
- **`--compress` mode** uses tree-sitter to extract function signatures + structure only, dropping bodies. Massive token savings for big repos.
- Honors `.gitignore`, `.ignore`, and `.repomixignore`.
- Multiple output formats (XML/Markdown/plain), configurable include/exclude globs.
- Browser extension: one-click "Repomix" button on any GitHub repo page.
- Available as CLI, web UI, browser extension, VSCode extension.

## How it works mechanically
- Node.js CLI: `npx repomix` / `repomix path/to/dir` / `repomix --include "src/**/*.ts" --ignore "**/*.log"`.
- Walks the file tree, applies ignore rules, runs Secretlint, optionally tree-sitter compresses, concatenates with structured headers, writes single output file.
- No daemon, no upload (unless you choose the website). Local-only by default.

## When to use it
- Preparing a codebase digest to hand to Claude/GPT for a security review or refactor — the `--compress` flag + Secretlint scrub is exactly the right hygiene before you paste.
- Onboarding an LLM to a new repo without 50 file reads.
- Pairs perfectly with [[Vibecoding - Threat Modeling in 20 Minutes]] (compressed repo → "what are the trust boundaries?") and [[Vibecoding - Secrets and Env Hygiene]] (Secretlint catches leaks before they hit any prompt).

## When NOT to use it
- Don't use the hosted repomix.com on private code unless you've read their privacy policy — packing is fast enough locally.
- Compressed mode loses implementation details. Use full mode when reviewing logic, compressed when reviewing structure.
- For continuous-analysis workflows, prefer [[Vibecoding - Tooling truecourse]]; Repomix is a one-shot snapshot tool.

## Verdict: **pull-in**
Already on the radar for the workflow. Should be the first thing run before any "ask Claude to audit X" task — it both compresses and de-secrets the input. Add `npx repomix --compress -o /tmp/digest.xml` as a standard step in [[Vibecoding - Audit Checklist]].

## Distinctive quotes
> "Repomix is a powerful tool that packs your entire repository into a single, AI-friendly file. Perfect for when you need to feed your codebase to Large Language Models."

> "**Security-Focused**: Incorporates Secretlint for robust security checks to detect and prevent inclusion of sensitive information."

> "The `--compress` option uses Tree-sitter to extract key code elements, reducing token count while preserving structure."

## Cross-links
- [[Vibecoding - Audit Checklist]]
- [[Vibecoding - Secrets and Env Hygiene]]
- [[Vibecoding - Threat Modeling in 20 Minutes]]
- [[Vibecoding - Tooling truecourse]]
