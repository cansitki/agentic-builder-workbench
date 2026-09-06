---
tags: [vibecoding, security, secrets, gitguardian]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Stat — GitGuardian State of Secrets Sprawl 2026

**Public GitHub leaked 28.6M new secrets in 2025 (+34% YoY). AI-coauthored commits leak secrets at ~2× the baseline rate. 70% of leaked secrets stay active for years.**

## Scope
- ~1.94 billion public GitHub commits scanned in 2025 (+43% YoY)
- Developer base +33%

## Key numbers
- **28,649,024 new secrets** leaked in 2025 (+34% YoY, +152% vs 2021)
- **AI-service secrets** (OpenAI, Anthropic, etc.): **1,275,105** (+81% YoY)
- Fastest-growing detector hits:
  - Brave Search **+1,255%**
  - Firecrawl **+796%**
  - **Supabase +992%**
- **Claude Code-coauthored commits leak secrets at 3.2% vs 1.5% baseline (~2×)**
- **MCP-related config files**: 24,008 unique secrets, **2,117 verified valid**
- **70% of leaked secrets remain active for years** (longitudinal 2022–Jan 2026)

## Why AI-coauthored commits leak more
- Models pattern-match: they paste credentials into examples to make code "work locally"
- They don't reliably distinguish `.env.example` from `.env`
- They suggest `VITE_` / `NEXT_PUBLIC_` prefixes for keys that should be server-only
- They generate test fixtures with literal API keys instead of mocks
- Pre-commit hooks (gitleaks, trufflehog, GitGuardian) are the only meaningful defense — they must be wired before the AI ever touches the repo

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Secrets in Client Bundle]]
- [[Vibecoding - Audit Checklist]]

## Sources
- [GitGuardian State of Secrets Sprawl 2026](https://blog.gitguardian.com/the-state-of-secrets-sprawl-2026/)
- [Help Net Security: GitGuardian 29M secrets](https://www.helpnetsecurity.com/2026/04/14/gitguardian-ai-agents-credentials-leak/)