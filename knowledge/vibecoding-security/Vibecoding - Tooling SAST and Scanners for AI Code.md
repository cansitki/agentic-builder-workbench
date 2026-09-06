---
tags: [vibecoding, security, tooling, sast, defense]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Tooling — SAST and Scanners for AI-Generated Code

**Default rulesets miss AI-specific failure modes. The new generation of scanners (Semgrep Multimodal, Snyk MCP, Aikido, Mend) integrate via MCP into Cursor / Claude Code so the agent scans its own output before commit.**

## Why default SAST under-detects AI code
- Default rules tuned for human-written patterns (typos, race conditions)
- AI generates **syntactically clean code with semantic flaws** — no typos to flag
- Misses:
  - Hallucinated package names ([[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]])
  - Left-over example credentials
  - Copy-pasted insecure patterns from training data
  - Business-logic flaws (IDOR, missing authz)

## The new wave (March 2026)
**Semgrep Multimodal** — combines deterministic rules + LLM reasoning. Claims 8× more true positives + 50% less noise vs foundation models. Ships an **MCP server** that lets Cursor / Claude Code run Semgrep scans inline as part of generation. AI-detection beta now catches IDOR + broken authz business-logic flaws.

**Snyk MCP** — CLI-based scanner, exposed as MCP tool. Cursor / Claude can invoke `snyk_scan(file)` mid-generation.

**Mend.io for Cursor** — real-time scan + autoremediation. Suggests fixes inline.

**Aikido** — free IDE plugin (Cursor + Windsurf). Scans on save.

**Cisco AI Agent Security Scanner** — audits the *agent itself*, not just the output. Looks for prompt injection, tool misuse patterns.

## Secrets scanners (always-on, pre-commit)
- **gitleaks** — fast, regex-based, ubiquitous
- **trufflehog** — verifies secrets are still valid (calls the API)
- **GitGuardian** — hosted, broad detector library, also has a CLI
- **detect-secrets** — Yelp's tool, baseline-driven (audit existing secrets, then alert on new ones)

Pre-commit hook gating these is non-negotiable for AI-driven workflows ([[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]: AI-coauthored commits leak ~2× as often).

## Supabase-specific
- **Built-in Security Advisor** (Dashboard → Database) — lints missing RLS, `USING (true)`, SECURITY DEFINER views, unindexed FKs
- **Continue + Supabase MCP workflow** — scripts pg_policy queries to flag tables without per-action policies
- **VibeScan** — third-party LLM-driven auditor, severity-graded PDF from public repo
- See [[Vibecoding - Supabase RLS Audit Patterns]]

## What still gets missed
Even with all of the above:
- Cross-file authorization gaps (function A trusts function B's caller, but B is now exposed)
- Logic flaws in payment / refund flows
- Race conditions in webhook handlers
- Subtle privilege escalations via SECURITY DEFINER functions
This is why [[Vibecoding - Process Multi-Agent Code Review]] matters as a layer on top.

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Audit Checklist]]
- [[Vibecoding - Process Multi-Agent Code Review]]
- [[Vibecoding - Process Secure Prompt Patterns RCI]]

## Sources
- [Semgrep — Vibe Check / MCP](https://dev.to/semgrep/vibe-check-securing-ai-generated-code-using-mcp-4d9n)
- [Semgrep Multimodal launch](https://www.helpnetsecurity.com/2026/03/20/semgrep-multimodal-code-security/)
- [Mend.io x Cursor](https://www.mend.io/newsroom/mend-io-launches-integration-with-cursor/)
- [Snyk MCP for Cursor](https://snyk.io/blog/scan-your-ai-generated-code-from-cursor-using-model-context-protocol-mcp/)
- [Aikido free IDE](https://www.aikido.dev/blog/free-ide)
- [Cisco AI Agent Security Scanner](https://blogs.cisco.com/ai/introducing-the-ai-agent-security-scanner-for-ides-verify-your-agents)
- [Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Continue + Supabase MCP RLS audit](https://docs.continue.dev/guides/supabase-mcp-database-workflow)