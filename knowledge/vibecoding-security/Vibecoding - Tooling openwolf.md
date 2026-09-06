---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: skip
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - openwolf

**Repo:** https://github.com/cytostack/openwolf
**Stars:** 968
**Last activity:** Stale-ish — pushed 2026-03-20 (~6 weeks idle as of 2026-04-29). v1.0.4.
**License:** AGPL-3.0

## What it is
A "second brain for Claude Code" — installs 6 lifecycle hook scripts plus a `.wolf/` directory in your project to give Claude a file index (`anatomy.md`), learning memory (`cerebrum.md`), bug log, action log, and a token ledger. Pitches ~65-80% token savings via "don't re-read files you've already read."

## Activity signal
Moderate. Single author (Cytostack / Farhan Palathinkal Afsal). Reasonable star count for a young project, but slowing. README literally says "This is v1.0.4. Things may break."

## Core features
- 6 Claude Code hooks fire on read/write/edit lifecycle events.
- `.wolf/anatomy.md` — auto-maintained project file map with per-file token estimates and descriptions; Claude reads it before opening files.
- `.wolf/cerebrum.md` — "Do-Not-Repeat" list + user preferences + key learnings, updated when you correct Claude.
- `.wolf/buglog.json` — searchable bug-fix memory; Claude checks before debugging.
- `.wolf/token-ledger.json` — lifetime token tracking, repeated-read detection.
- `openwolf dashboard`, `openwolf scan`, `openwolf daemon` (PM2-style scheduler), `openwolf designqc` (puppeteer screenshot QC), `openwolf reframe` (UI framework migration prompts).

## How it works mechanically
- Pure Node.js hooks registered via Claude Code's hook system.
- On `Read`: emits "anatomy says this file is X tokens, description Y" — and warns/blocks if already read this session.
- On `Write`: post-hook updates `anatomy.md` and `memory.md`, increments token ledger.
- On `Edit`: pre-hook checks `cerebrum.md` for known mistake patterns.
- Token estimation is character-ratio-based (~15% accuracy disclaimed by author).

## When to use it
- Greenfield Claude Code project where you want token visibility and a "lessons learned" file.
- Useful as inspiration for [[Vibecoding - Debugging and Bug Triage Workflow]] — the buglog.json idea is good even without this tool.

## When NOT to use it (and why this is a skip)
- **AGPL-3.0** for proprietary work is a non-starter without a careful read of obligations.
- **Compliance is "85-90%"** by author admission — `cerebrum.md` only gets updated if Claude follows the instruction. That's a load-bearing assumption.
- **Trust surface**: 6 hook scripts that intercept every Claude action and write to disk. If a malicious update lands, every action is hooked. Pin a version, audit the hooks, or skip.
- The token-savings claim ("80% saved") is a self-reported number on one project. No reproducible benchmark.
- The `.wolf/` files become a parallel source of truth that drifts from reality if not scanned. `openwolf scan --check` exists but you have to remember to run it.
- v1.0.4, single author, 6-week idle. Risk-adjusted, not worth pulling into a production workflow.

## Verdict: **skip** (mine the patterns)
The `cerebrum.md` "Do-Not-Repeat" idea, the `anatomy.md` file map, and the `buglog.json` deduplication-of-debugging are all good ideas. Steal the patterns into a hand-rolled `CLAUDE.md` workflow rather than installing the AGPL hook framework.

## Distinctive quotes
> "Claude Code is powerful but it works blind. It doesn't know what a file contains until it opens it. It can't tell a 50-token config from a 2,000-token module."

> "OpenWolf saved ~80% of tokens compared to bare Claude CLI on the same project."

> "`cerebrum.md` depends on Claude following instructions to update it after corrections. Compliance is ~85-90%, not 100%."

## Cross-links
- [[Vibecoding - Debugging and Bug Triage Workflow]]
- [[Vibecoding - Tooling ccusage]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
