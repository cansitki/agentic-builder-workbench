---
tags: [vibecoding, security, tool-profile, cursor]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Cursor's Failure Mode: Agent-Mode Trust Collapse

Cursor's distinguishing risk is **agentic over-trust + aggressive auto-execution**. Once an agent gains write capability over local files (especially `.cursor/mcp.json` and `.cursor/rules`), indirect prompt injection escalates to RCE.

## 2025 CVE cluster

- **CVE-2025-54135 — CurXecute** (AIM Security, Aug 1 2025). Indirect prompt injection via Slack/MCP source writes `.cursor/mcp.json` → RCE without user confirmation.
- **CVE-2025-54136 — MCPoison** (Check Point). Once-approved MCP servers can be silently swapped to reverse shells; trust survives the swap.
- **CVE-2025-59944** (Lakera). Case-sensitivity bypass of file-protection allowlists.
- **HiddenLayer Nov 2025 advisory** — three additional issues.
- **StackAware red team** — additional findings.

## The 'Rules File Backdoor' (Pillar Security, March 2025)

Invisible-Unicode characters embedded in `.cursor/rules` (and `copilot-instructions.md`) inject malicious instructions invisible to human review. GitHub responded by adding a Unicode warning May 1 2025. PoC: [github.com/0x6f677548/copilot-instructions-unicode-injection](https://github.com/0x6f677548/copilot-instructions-unicode-injection).

## Attack surface unique to Cursor-class tools

- MCP server config writable by the agent itself
- Auto-edit + tool-execution = attacker only needs write-once to a config file
- Indirect injection sources are diverse: Slack messages, GitHub issues, fetched URLs, Notion docs, even file *names*

## Related

- [[Vibecoding - Case Study Cursor MCP CVEs]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Tool Profile Windsurf]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
