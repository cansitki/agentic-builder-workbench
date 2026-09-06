---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: index-only
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - ccusage

**Repo:** https://github.com/ryoppippi/ccusage
**Stars:** 13,551
**Last activity:** Very active — pushed 2026-04-29 (today). Listed in Awesome Claude Code.
**License:** MIT

## What it is
A CLI tool that parses local Claude Code (and Codex / OpenCode / Pi / Amp) JSONL session files and renders daily / monthly / session / 5-hour-block reports of token usage and costs. **Off-thesis for security** — purely a cost/usage observability tool.

## Activity signal
Very active. Whole "ccusage family" of sibling packages. Maintained by ryoppippi (well-known JS author). Tiny install size, no telemetry, no API key.

## Core features
- `npx ccusage@latest` — daily, monthly, session, blocks, statusline reports out of the box.
- **5-hour billing-block tracking** with active-block monitoring (matches Claude's actual billing windows).
- Per-model breakdown (`--breakdown`), per-project filtering (`--project`, `--instances`).
- Date filtering (`--since`/`--until`), JSON output, locale + timezone flags.
- Statusline integration for Claude Code status bar (Beta).
- Sibling packages: `@ccusage/codex`, `@ccusage/opencode`, `@ccusage/pi`, `@ccusage/amp`, `@ccusage/mcp` (MCP server exposing usage data to Claude Desktop).

## How it works mechanically
- Reads local `~/.claude/projects/**/*.jsonl` session files (no network call, no API key).
- Computes token totals from the JSONL log entries, multiplies by model rate cards to estimate cost.
- Distributed as small Node CLI. Deno-runnable with explicit `-E -R -S -N` permission flags (good security hygiene by the author).
- MCP server variant exposes the same data via Model Context Protocol so Claude itself can answer "how much did I spend yesterday?"

## When to use it
- You want to know if a session ate $40 in tokens before your invoice tells you.
- You want daily breakdowns in a dashboard / statusline so you can self-regulate.
- Useful adjacent to [[Vibecoding - Logging and SIEM Without PII Leakage]] in spirit: visibility into your own usage = visibility into anomalous usage (a runaway agent spending tokens is a soft security signal).

## When NOT to use it
- This is **not a security tool**. It does not look at code, secrets, or vulnerabilities. Don't index it under [[Vibecoding - Audit Checklist]].
- Cost figures are estimates from local logs vs. published rate cards — drift from your real Anthropic invoice.
- Doesn't catch a leaking-API-key scenario unless you happen to notice the spike.

## Verdict: **index-only** (off-thesis but useful)
`npx ccusage` can be useful periodic hygiene, but it is an observability tool rather than a security control. Keep it outside the security audit workflow.

## Distinctive quotes
> "Analyze your Claude Code token usage and costs from local JSONL files — incredibly fast and informative!"

> "Thanks to ccusage's incredibly small bundle size, you can run it directly without installation."

> "deno run -E -R=$HOME/.claude/projects/ -S=homedir -N='raw.githubusercontent.com:443' npm:ccusage@latest"

## Cross-links
- [[Vibecoding - Logging and SIEM Without PII Leakage]]
- [[Vibecoding - Tooling openwolf]] (also tracks tokens, but with hooks)
