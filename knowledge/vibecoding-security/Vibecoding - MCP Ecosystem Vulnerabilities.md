---
tags: [vibecoding, security, mcp, agents, supply-chain]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# MCP Ecosystem Vulnerabilities

**The Anthropic Model Context Protocol shipped a parade of CVEs across 2025-2026. The architectural verdict from OX Security: STDIO config-to-command is RCE-by-design across ~150M downloads.**

## CVE roll-call
| CVE | Component | What it does |
|---|---|---|
| **CVE-2025-49596** | MCP Inspector (official debugging tool) | RCE — any visited webpage could pwn dev machines |
| **CVE-2025-53109 / 53110** ("EscapeRoute", Cymulate) | Anthropic Filesystem MCP server | Path traversal bypassed allowed-directory scope |
| **CVE-2025-54135** ("CurXecute") | Cursor MCP auto-start | See [[Vibecoding - Case Study Cursor MCP CVEs]] |
| **CVE-2025-54136** ("MCPoison") | Cursor MCP config approval | See [[Vibecoding - Case Study Cursor MCP CVEs]] |
| **MCP Git Server** (Jan 2026) | Anthropic Git MCP | 3 flaws: arbitrary file read + RCE |
| **CVE-2025-68664** ("LangGrinch", Cyata) | LangChain-Core | LLM responses contain `lc`-keyed dicts → deserialized as trusted objects → secret extraction (when `secrets_from_env=True`, default), Jinja2 RCE. CVSS 9.3 |

## The architectural disclosure (OX Security, April 2026)
The STDIO config-to-command pipeline in MCP SDKs (Python, TS, Java, Rust) is **RCE-by-design**:
- ~150M total downloads
- 200,000 servers
- 7,000 public servers
- **9 of 11 MCP marketplaces successfully poisoned with malicious servers**

Anthropic's response: declined to change the protocol — "sanitization is the developer's responsibility."

## The Cursor + Jira zero-click
Canonical writeup in [[Vibecoding - Case Study Cursor MCP CVEs]] — patched in Cursor 1.3 with mandatory approval on every MCP config change.

## Implications for vibe-coded apps
If your app exposes an MCP server (so AI agents can use it as a tool), you are now:
- A supply-chain target (poisoned marketplace)
- A confused-deputy victim (any data your server returns is a prompt-injection vector for the calling agent)
- Subject to RCE-by-design unless you sandbox aggressively

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
- [[Vibecoding - Tool-Use Confused Deputy]]
- [[Vibecoding - Case Study Cursor MCP CVEs]]

## Sources
- [OX Security MCP architectural RCE](https://www.ox.security/blog/the-mother-of-all-ai-supply-chains-critical-systemic-vulnerability-at-the-core-of-the-mcp/)
- [The Register: MCP 200k servers](https://www.theregister.com/2026/04/16/anthropic_mcp_design_flaw/)
- [Cymulate EscapeRoute](https://cymulate.com/blog/cve-2025-53109-53110-escaperoute-anthropic/)
- [Oligo: CVE-2025-49596 MCP Inspector RCE](https://www.oligo.security/blog/critical-rce-vulnerability-in-anthropic-mcp-inspector-cve-2025-49596)
- [Three flaws in Anthropic MCP Git Server (Jan 2026)](https://thehackernews.com/2026/01/three-flaws-in-anthropic-mcp-git-server.html)
- [Check Point MCPoison](https://research.checkpoint.com/2025/cursor-vulnerability-mcpoison/)
- [Aim Security CurXecute](https://www.aim.security/post/when-public-prompts-turn-into-local-shells-rce-in-cursor-via-mcp-auto-start)
- [Snyk: Cursor + Jira 0-click](https://labs.snyk.io/resources/cursor-jira-mcp-vulnerability-explained/)
- [Cyata LangGrinch CVE-2025-68664](https://cyata.ai/blog/langgrinch-langchain-core-cve-2025-68664/)