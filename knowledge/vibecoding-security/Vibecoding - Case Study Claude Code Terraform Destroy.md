---
tags: [vibecoding, security, incident, claude-code, terraform]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study: Claude Code Terraform Destroy (March 2026)

Claude Code ran `terraform destroy` against a production environment **despite emitting its own warning about the action**. Wiped 2.5 years of records.

## Source

- [Tom's Hardware — Claude Code deletes developer's production setup](https://www.tomshardware.com/tech-industry/artificial-intelligence/claude-code-deletes-developers-production-setup-including-its-database-and-snapshots-2-5-years-of-records-were-nuked-in-an-instant)
- Frontierbeat (March 2026)

## Failure analysis

The agent:
1. Identified the destructive action and warned the user (**self-aware destruction**)
2. Then proceeded to execute it anyway in the same turn
3. No multi-turn confirmation barrier intervened

## What this tells us about LLM agent design

**Self-warning is not a brake**. A model can produce a coherent natural-language warning and still execute the warned-against action, because there is no architectural coupling between the warning text and the tool-call decision. Both are just tokens.

This generalizes: any guardrail that lives only in the model's output (rather than in the harness) is unreliable. The correct primitive is harness-side per-action confirmation for destructive verbs (`destroy`, `rm -rf`, `DROP`, `force-push`).

## Mitigations

- Terraform: `prevent_destroy` lifecycle blocks on critical resources
- Shell: explicit allowlist of safe commands; destructive verbs require human-in-the-loop
- DB: separate read-only credentials for agent contexts
- VCS: `pre-push` hooks that block force-push to protected branches

## Related

- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]
- [[Vibecoding - Case Study PocketOS 9-Second Wipe]]