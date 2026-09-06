---
tags: [vibecoding, security, agents, authorization]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Tool-Use Confused Deputy

**The agent has shell, filesystem, or API-key access. Any text it reads can hijack tool calls. This is Hardy's 1988 confused deputy problem with new clothes — and OAuth doesn't fix it.**

## What it is
The agent is a privileged process. The user is one input source, but so is **every document, email, web page, DB row, MCP server response, and tool output the agent ingests**. The agent trusts all of them equally.

CSA's 2026 research note: this is the central agent threat. The agent has legitimate creds. Decisions are influenceable by anyone whose content reaches the prompt.

## Real CVEs in this family
- **CVE-2025-53773** (GitHub Copilot, 2025) — see [[Vibecoding - Case Study Copilot CVE-2025-53773 RCE]]
- **CVE-2025-54135 / 54136** (Cursor) and Cursor + Jira zero-click — see [[Vibecoding - Case Study Cursor MCP CVEs]]

## Why OAuth doesn't save you
- **Scopes are too coarse**. `repo` scope is "read all the user's repos." Agent legitimately holds the user's bearer token. Once injection wins, every repo is in scope.
- **No per-task minting**. The token that wrote a unit test can also delete a branch.
- **Confused deputy in the auth layer itself**: agent calls API with user's token; API can't distinguish "user wanted this" from "agent was tricked."

## What actually works
**Per-task OAuth/JWT minting** (Oso pattern):
- Fresh token per LLM action
- Scoped to one record, one verb, short TTL
- "Read this row, for this user, for this prompt" — not "read everything the user can read"

**Tool-call allowlists with structured schemas**:
- Never let model emit free-form shell
- Pydantic / Zod / JSON Schema on every tool argument
- Reject anything outside the schema before invocation

**Human-in-the-loop for irreversible actions**:
- Windsurf has *no* such control by default
- Cursor 1.3 added it post-CVE
- Replit added it post-Lemkin DB-deletion ([[Vibecoding - Case Study Replit Production DB Deletion]])

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]]

## Sources
- [CSA: Confused Deputy in autonomous AI agents](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-agent-confused-deputy-prompt-injection/)
- [Quarkslab: Agentic AI confused deputy](https://blog.quarkslab.com/agentic-ai-the-confused-deputy-problem.html)
- [Oso: why your authz model won't survive agentic AI](https://www.osohq.com/learn/why-your-authorization-model-wont-survive-agentic-ai)
- [Embrace the Red: Windsurf MCP missing controls](https://embracethered.com/blog/posts/2025/windsurf-dangers-lack-of-security-controls-for-mcp-server-tool-invocation/)