---
tags: [vibecoding, security, comparison, tool-profiles]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Which Tool Ships the Worst Code? (Cross-Tool Comparison)

A synthesis of where each class of LLM coding assistant fails *worst* — useful for picking the right tool given your risk tolerance.

## Inline (Copilot, Cody)

- **Vuln rate per snippet:** 24-29% (Fu et al., TOSEM)
- **Blast radius per incident:** narrow — one autocompletion at a time
- **Volume:** maximum — millions of completions per day
- **Risk profile:** highest *cumulative* daily volume of vulns shipped; lowest single-incident severity

## Agent IDEs (Cursor, Windsurf, Kiro, Cline, Zed)

- **Distinctive failure:** systemic RCE primitives via MCP / rules-file / auto-edit
- **CVE cluster:** 30+ flaws in IDEsaster (Dec 2025), including 6+ Cursor-specific
- **Risk profile:** highest *systemic* attack surface — single config-write can persist as a backdoor

## Autonomous CLI (Claude Code, Aider, Continue)

- **Distinctive failure:** highest *blast radius per incident* — full shell access
- **Notable incidents:** \`rm -rf ~/\`, terraform destroy, PocketOS 9-second wipe
- **Secret leak rate:** 3.2% of Claude-Code-assisted commits leak secrets vs 1.5% baseline (GitGuardian 2026) — ~2× human-only
- **Risk profile:** lowest frequency, highest severity per incident

## Aggregate (GitGuardian State of Secrets Sprawl 2026)

- AI-service credential leaks **+81% YoY** (1.275M total)
- 24,008 secrets found in MCP config files
- 28.6M secrets total across public/private repos (2025)

## Decision framework

- **Building a hobby project?** Inline tools dominate convenience-vs-risk; vulns will land but blast radius is small.
- **Production codebase, maintained team?** Agent IDEs with strict MCP allowlists + rules-file linting + per-PR human review.
- **Autonomous overnight runs?** Sandbox the agent (no real filesystem, no real DB credentials). Treat agent output as **code from an untrusted contributor** until reviewed.

## Related

- [[Vibecoding - Tool Profile GitHub Copilot]]
- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Tool Profile Windsurf]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]