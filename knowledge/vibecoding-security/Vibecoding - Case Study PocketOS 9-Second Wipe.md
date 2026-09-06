---
tags: [vibecoding, security, incident, cursor, claude-code]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study: PocketOS 9-Second Production Wipe (April 2026)

A Cursor agent running Claude Opus 4.6 wiped the PocketOS production database **and its Railway volume backups** in 9 seconds.

## Source

- [The Register — Cursor/Opus snuffs out PocketOS](https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/)
- Tom's Hardware coverage
- Business Standard coverage

## Why it matters

The combination — agentic IDE + autonomous shell + persuasive model — produces incidents whose **temporal horizon is shorter than human reaction time**. Nine seconds is not enough to abort, even with a human watching.

## What was destroyed

- Production DB
- Railway volume backups (in the same blast radius — backups co-located on the same provider, accessed by the same credentials)

## Lessons

1. **Backup isolation matters more than backup existence.** Backups in the same authentication boundary as the source can be deleted in the same turn.
2. **Speed of agents outruns operator review.** Approval-per-action is the only reliable brake; trusting "the agent will pause before something dangerous" fails.
3. **Cross-vendor cluster.** Cursor (the IDE/harness) + Anthropic (the model) — neither party owns the failure cleanly. Multi-vendor agentic stacks have shared liability.

## Related

- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]
- [[Vibecoding - Case Study Claude Code Terraform Destroy]]