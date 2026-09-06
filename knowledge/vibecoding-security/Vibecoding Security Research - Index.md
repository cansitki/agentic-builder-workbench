---
tags: [security, vibecoding, index, moc]
last-updated: 2026-04-30
status: published
---

# Vibecoding Security Research — Index

A taxonomy of every note in this vault. New here? Open [[Vibecoding Security - START HERE]] first.

## Start here

- [[Vibecoding Security - START HERE]] — orientation, usage paths, stack assumption, license.
- [[Vibecoding - Things to Check on Your Code]] — the 32-section pre-launch checkbook (the spine).
- [[Vibecoding - Audit Checklist]] — condensed pass for the 1-hour review.
- [[Vibecoding - Root Causes]] — why these bugs ship in the first place.
- [[Vibecoding - Sources and Reading List]] — research references.

## Failure patterns by domain

### Auth & authorization
- [[Vibecoding - No Authorization on Endpoints]]
- [[Vibecoding - Auth Boundaries Layouts Are Not Enough]]
- [[Vibecoding - Authorization Depth IDOR BOLA]]
- [[Vibecoding - IDOR and Authz Patterns]]
- [[Vibecoding - Client-Side Authentication]]
- [[Vibecoding - Account Security UX 2FA Sessions]]

### Database & RLS
- [[Vibecoding - RLS Disabled or Permissive]]
- [[Vibecoding - Supabase RLS Audit Patterns]]
- [[Vibecoding - SECURITY DEFINER Footguns]]
- [[Vibecoding - Database Hygiene]]
- [[Vibecoding - Race Conditions and Concurrency]]
- [[Vibecoding - Missing Soft Delete]]

### Secrets & env
- [[Vibecoding - Secrets and Env Hygiene]]
- [[Vibecoding - Secrets in Client Bundle]]

### Webhooks & payments
- [[Vibecoding - Missing Webhook Verification]]
- [[Vibecoding - Webhook Security]]
- [[Vibecoding - Payment and PCI Scope]]
- [[Vibecoding - Missing Refund Handlers]]

### Input, output, headers
- [[Vibecoding - No Input Validation]]
- [[Vibecoding - File Upload Storage Security]]
- [[Vibecoding - Open Redirects]]
- [[Vibecoding - Zero Security Headers]]
- [[Vibecoding - API Design Security CORS Versioning]]
- [[Vibecoding - Math.random for Security IDs]]

### Resilience & ops
- [[Vibecoding - No Error Boundaries]]
- [[Vibecoding - No Rate Limiting]]
- [[Vibecoding - Caching and CDN Security]]
- [[Vibecoding - Backend Code Execution Bugs]]
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]

### Cryptography & infra
- [[Vibecoding - Cryptography and Key Management]]
- [[Vibecoding - Infrastructure and Operations Security]]
- [[Vibecoding - Logging and SIEM Without PII Leakage]]
- [[Vibecoding - CI CD and Container Security]]

## LLM & agent risks

- [[Vibecoding - Prompt Injection]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
- [[Vibecoding - Tool-Use Confused Deputy]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - RAG Poisoning]]
- [[Vibecoding - Rules File Backdoor Unicode Injection]]
- [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]]

## Process & review

- [[Vibecoding - Threat Modeling in 20 Minutes]] (canonical — STRIDE, PASTA, LINDDUN merged in)
- [[Vibecoding - Process Multi-Agent Code Review]]
- [[Vibecoding - Process Secure Prompt Patterns RCI]]
- [[Vibecoding - Debugging and Bug Triage Workflow]]
- [[Vibecoding - Anti-Pattern Behavioral Catalog]]
- [[Vibecoding - Cross-Tool Comparison Worst Offender]]
- [[Vibecoding - Incident Response Runbook]]

## Privacy & compliance

- [[Vibecoding - Privacy and GDPR Minimum]] — practitioner playbook.
- [[Vibecoding - Privacy and GDPR Reference]] — formal articles, retention, DSAR detail.
- [[Vibecoding - Org and Vendor Risk SBOM]]
- [[Vibecoding - OWASP Top 10 Mapping]]

## Tool profiles (AI coding assistants)

- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Tool Profile GitHub Copilot]]
- [[Vibecoding - Tool Profile Windsurf]]

## Tooling references (security & audit tooling)

- [[Vibecoding - Tooling truecourse]]
- [[Vibecoding - Tooling vibe-check]]
- [[Vibecoding - Tooling Repomix]]
- [[Vibecoding - Tooling agent-orchestrator]]
- [[Vibecoding - Tooling armory]]
- [[Vibecoding - Tooling awesome-claude-skills]]
- [[Vibecoding - Tooling brutal-coding-tool]]
- [[Vibecoding - Tooling ccusage]]
- [[Vibecoding - Tooling claude-octopus]]
- [[Vibecoding - Tooling openwolf]]
- [[Vibecoding - Tooling SAST and Scanners for AI Code]]

## Case studies

- [[Vibecoding - Case Study Base44 Auth Flaw]]
- [[Vibecoding - Case Study Bolt and Multi-Platform Scans]]
- [[Vibecoding - Case Study Claude Code Terraform Destroy]]
- [[Vibecoding - Case Study Copilot CVE-2025-53773 RCE]]
- [[Vibecoding - Case Study Cursor MCP CVEs]]
- [[Vibecoding - Case Study Lovable RLS CVE]]
- [[Vibecoding - Case Study PocketOS 9-Second Wipe]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]

## Quantitative research

- [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]]
- [[Vibecoding - Stat - Veracode 2025 Report]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]
- [[Vibecoding - Stat - Spracklen Slopsquatting USENIX 2025]]
- [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]]
- [[Vibecoding - Stat - Academic Studies Pearce Stanford]]
- [[Vibecoding - Stat - Bug Category Frequencies]]

## Meta

- [[vibecoding security/LICENSE]]

---

**Last updated:** 2026-04-29 — naming normalized (Tooling/Tool Profile split), Threat Modeling notes merged, Privacy split clarified, START HERE published.
