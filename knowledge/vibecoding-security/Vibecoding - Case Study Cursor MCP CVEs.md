---
tags: [vibecoding, security, case-study, cursor, mcp]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study — Cursor MCP CVEs

**Three back-to-back CVEs against the same product in the same year. Each one is a different shape of "the agent did something the user didn't ask for."**

## CVE-2025-54135 — CurXecute (Aim Security)
**Vector:** Public prompts (e.g. a forum post, a GitHub README, any web content the agent might browse) → local RCE on the developer's machine.

The MCP auto-start feature would launch new MCP servers based on context. Crafted prompts could specify a malicious server. Code execution before user noticed.

## CVE-2025-54136 — MCPoison (Check Point)
**Vector:** Approve once, exploited forever.

Cursor's MCP config approval flow:
1. User gets a PR adding `.cursor/rules/mcp.json` with a benign command
2. User reviews, approves
3. **Attacker silently mutates the config to a malicious command** post-approval
4. Cursor never re-prompts — config is "trusted" now
5. Persistent backdoor in the developer's IDE

Patched in Cursor 1.3 — **mandatory re-approval on every MCP config change**, no matter how small.

## Cursor + Jira zero-click (Snyk Labs)
**Vector:** Malicious Jira ticket. No user interaction.

1. Attacker files a Jira ticket containing prompt-injection payload
2. User has Cursor connected to Jira via MCP
3. Cursor reads the ticket as part of normal context
4. Embedded payload causes Cursor to read repo secrets
5. Embedded payload causes Cursor to POST secrets to attacker URL

**Zero clicks. Zero intent. The user did nothing wrong.** This is the [[Vibecoding - Tool-Use Confused Deputy]] pattern in production.

## The pattern across all three
Cursor's threat model was "agent helps with code." It became "agent reads adversarial input from N sources, has tools, has secrets." Every input source is a prompt-injection surface. The architectural fix is per-task scoping, not per-feature patches.

## Lessons
- "Trusted once" is not a viable approval model for AI agents
- Every connected service (Jira, GitHub, Slack, Linear) is now an injection surface
- IDE-resident agents need different security than chat agents — they have shell access
- Patching individual CVEs is rearguard action; the architectural problem (see [[Vibecoding - MCP Ecosystem Vulnerabilities]]) is unaddressed

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - Tool-Use Confused Deputy]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]

## Sources
- [Check Point: MCPoison CVE-2025-54136](https://research.checkpoint.com/2025/cursor-vulnerability-mcpoison/)
- [Aim Security: CurXecute CVE-2025-54135](https://www.aim.security/post/when-public-prompts-turn-into-local-shells-rce-in-cursor-via-mcp-auto-start)
- [Snyk Labs: Cursor + Jira 0-click](https://labs.snyk.io/resources/cursor-jira-mcp-vulnerability-explained/)