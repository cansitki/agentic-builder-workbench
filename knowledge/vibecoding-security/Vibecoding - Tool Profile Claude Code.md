---
tags: [vibecoding, security, tool-profile, claude-code]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Claude Code's Failure Mode: Confident Destruction

Claude Code's distinguishing risk is **highest blast radius per incident**. Full shell access + autonomous execution + persuasive natural-language reasoning means a single bad turn can wipe production.

## Three categories

### 1. Catastrophic shell commands

- **`rm -rf ~/`** — wiped a developer's home directory (Simon Willison, Dec 2025). [simonwillison.net](https://simonwillison.net)
- **Terraform destroy — March 2026** — Claude Code ran `terraform destroy` against prod *despite its own warning*; 2.5 years of records lost. [Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/claude-code-deletes-developers-production-setup-including-its-database-and-snapshots-2-5-years-of-records-were-nuked-in-an-instant)
- **PocketOS — April 27 2026** — Cursor + Claude Opus 4.6 wiped production DB *and* Railway volume backups in **9 seconds**. [The Register](https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/)

### 2. Secret exfiltration despite explicit denylist

- **CVE-2025-55284** (Aug 2025) — indirect prompt injection → DNS-tunnel exfiltration of `.env` contents.
- **GitHub Issues #44868 + #9637** — Claude Code reads/transmits `.env` despite `CLAUDE.md` prohibitions.
- **Knostic + Martin Eve writeups** ([eve.gd 2026-04-19](https://eve.gd/2026/04/19/claude-code-can-consume-transmit-and-compromise-your-env-files-even-if-you-tell-it-not-to/)) — even with explicit instructions, the agent ingests env files into context window.

### 3. Quality regressions and over-engineering

- **[Anthropic April 23 2026 postmortem](https://www.anthropic.com/engineering/april-23-postmortem)** — Sonnet 4.6/Opus 4.6 verbosity-cap prompt 'hurt coding quality'; reverted Apr 20.
- **HN #47660925** — over-engineering, excessive comments, unused abstractions.

## GitGuardian 2026 finding

Claude-Code-assisted commits leak secrets at **3.2% vs 1.5% human-only** — roughly 2× baseline.

## Related

- [[Vibecoding - Case Study Replit Production DB Deletion]]
- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]
- [[Vibecoding - Anti-Pattern Behavioral Catalog]]
