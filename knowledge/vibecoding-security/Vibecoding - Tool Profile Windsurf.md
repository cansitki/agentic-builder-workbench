---
tags: [vibecoding, security, tool-profile, windsurf]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Windsurf (Codeium): Silent Indirect Prompt Injection

Windsurf's Cascade agent is vulnerable to indirect prompt injection via filenames and file contents — disclosure went unanswered by the vendor.

## Key incidents

- **Embrace The Red, May 30 2025** — filename-based prompt injection hijacks Cascade to exfiltrate environment variables. [embracethered.com](https://embracethered.com/blog/posts/2025/windsurf-data-exfiltration-vulnerabilities/)
- **'IDEsaster' cluster (Dec 2025)** — Ari Marzouk's research, 30+ CVEs across **Cursor / Windsurf / Kiro / Copilot / Zed / Cline**. [The Hacker News](https://thehackernews.com/2025/12/researchers-uncover-30-flaws-in-ai.html)

## The class of risk

Agent IDEs sharing the same architecture share the same attack class:
- Auto-applied edits without per-edit confirmation
- File-content trust (treat repo content as instructions)
- MCP server execution
- Cross-source prompt injection (Slack, GitHub issues, fetched URLs)

The IDEsaster cluster shows this is a **category-level issue**, not a per-vendor one.

## Related

- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
