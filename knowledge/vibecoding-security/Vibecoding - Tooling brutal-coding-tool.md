---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: skip
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - brutal-coding-tool

**Repo:** https://github.com/fabriziosalmi/brutal-coding-tool
**Stars:** 24
**Last activity:** Stale — last push 2025-12-08 (~5 months idle)
**License:** MIT // "USE AT YOUR OWN RISK"

## What it is
A React webapp ("Brutal Rep Auditor") that points at a GitHub repo URL, slurps its file tree + commits via the GitHub API, throws it at Gemini 2.5 Flash, and renders a three-phase "Brutal Reality Check" report.

## Activity signal
Stale. ~30-line README, single screenshot, no tests visible, no CI. Looks like a one-shot Gemini-prompted UI demo, not an evolving tool. Stars are vibe-driven, not engineering signal.

## Core features
- "Phase 1: The Matrix" — 20-point dive into Architecture / Engineering / Performance / Security / QA.
- "Phase 2: Vibe Check" — Gemini-driven "Generic ChatGPT Code vs Production Engineering" classification.
- "Phase 3: The Fix Plan" — prioritized remediation list.
- Print-ready PDF mode (hides "Audit Another Repo" button when printing).
- Tech: React 19 + Tailwind + Lucide + Recharts + React-Markdown.

## How it works mechanically
- Browser-side React app. You enter a Gemini API key as `API_KEY` env var.
- Calls GitHub REST for file tree, README, commit log.
- Single Gemini 2.5 Flash call per phase with the repo digest in context.
- No AST, no static analysis, no local execution — purely "LLM looks at README + tree."

## When to use it
It may be useful as a **one-shot orientation report** before contributing to an unfamiliar repository. Do not treat it as an ongoing audit control.

## When NOT to use it
- Anything you actually own. The depth ends where the LLM's context-window summary ends.
- Anything private — the Gemini API key sits in your browser env.
- Repos larger than what fits in a flash-model context. No chunking strategy described.
- Don't expect reproducibility — same repo, different run, different verdict.

## Verdict: **skip**
The "ruthless reality check" framing is fun, but mechanically this is "feed README + file tree to Gemini." Anything serious in [[Vibecoding - Audit Checklist]] needs AST + per-file inspection, which this doesn't do. Note that the same author's `vibe-check` is the more substantive sibling — see [[Vibecoding - Tooling vibe-check]].

## Distinctive quotes
> "Is your code Engineering Substance or AI Slop?"

> "It uses Google's Gemini 2.5 Flash model to ingest a GitHub repository's structure, commit history, and critical files to generate a 'Brutal Reality Check' report."

> "MIT // USE AT YOUR OWN RISK"

## Cross-links
- [[Vibecoding - Tooling vibe-check]]
- [[Vibecoding - Audit Checklist]]
