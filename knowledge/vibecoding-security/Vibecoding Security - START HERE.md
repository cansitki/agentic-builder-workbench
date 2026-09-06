---
tags: [security, vibecoding, index, start-here]
parent: '[[Vibecoding Security Research - Index]]'
last-updated: 2026-04-29
status: published
---

# Vibecoding Security — START HERE

A security playbook for builders shipping AI-coded apps (Lovable, Bolt, v0, Cursor, Claude Code, Windsurf). Distilled from 56 production findings on a real Stripe-backed marketplace, plus public case studies, vendor advisories, and academic research.

> [!IMPORTANT]
> This is a sanitized research snapshot, primarily last reviewed in April 2026. Recheck time-sensitive claims and provider behavior against current primary sources before relying on them.

This is **shift-left dev hygiene** — what to check, fix, and verify before you ship. It is not a substitute for SOC 2 / ISO 27001 / pen testing, and it is not legal advice.

## How this folder is structured

The vault has three layers. Pick whichever one matches the time you have.

1. **The Checkbook** — [[Vibecoding - Things to Check on Your Code]]. The 32-section runbook with check items. This is the spine. Every section links to deep-dive notes for the why.
2. **The Quick Audit** — [[Vibecoding - Audit Checklist]]. A condensed version. Skim before launch.
3. **Atomic notes** — ~80 deep-dives, case studies, stat references, and tool profiles. Open these when you hit a checkbook item you want to understand.

## Three usage paths

### If you have 1 hour (pre-launch panic)
1. Open [[Vibecoding - Audit Checklist]]. Walk it top to bottom. Mark anything you cannot answer ''yes'' to.
2. For every red mark, click through to the linked deep-dive in the checkbook.
3. Fix the criticals tonight. Schedule the rest.

### If you have a day (proper pre-launch review)
1. Run the full [[Vibecoding - Things to Check on Your Code]] checkbook.
2. Do a 20-minute threat model on each risky surface — see [[Vibecoding - Threat Modeling in 20 Minutes]].
3. Run the AI-driven code review prompts in [[Vibecoding - Process Multi-Agent Code Review]] and [[Vibecoding - Process Secure Prompt Patterns RCI]].
4. Confirm your stack profile is hardened — see the relevant [[Vibecoding - Tool Profile Claude Code]] / [[Vibecoding - Tool Profile Cursor]] / [[Vibecoding - Tool Profile GitHub Copilot]] / [[Vibecoding - Tool Profile Windsurf]] note.

### If you want ongoing reference
- Bookmark this note and the index.
- Re-run the checkbook at every release.
- Read one case study a week — they are short and the lessons stick.
- Subscribe to the sources in [[Vibecoding - Sources and Reading List]] for fresh advisories.

## What stack this assumes

The defaults are written for a modern JS/TS web stack: **Next.js + Supabase + Stripe + Vercel/Cloudflare + Sentry**. That is the dominant Lovable/Bolt/v0 stack. The principles generalize — the snippets do not always.

Where stack matters, the note will say so.

## Where to start by topic

- **Auth bugs**: [[Vibecoding - No Authorization on Endpoints]] · [[Vibecoding - Auth Boundaries Layouts Are Not Enough]] · [[Vibecoding - Authorization Depth IDOR BOLA]]
- **Database / RLS**: [[Vibecoding - RLS Disabled or Permissive]] · [[Vibecoding - Supabase RLS Audit Patterns]] · [[Vibecoding - SECURITY DEFINER Footguns]] · [[Vibecoding - Database Hygiene]]
- **Secrets**: [[Vibecoding - Secrets and Env Hygiene]] · [[Vibecoding - Secrets in Client Bundle]]
- **Webhooks / payments**: [[Vibecoding - Missing Webhook Verification]] · [[Vibecoding - Webhook Security]] · [[Vibecoding - Payment and PCI Scope]] · [[Vibecoding - Missing Refund Handlers]]
- **Input / output**: [[Vibecoding - No Input Validation]] · [[Vibecoding - File Upload Storage Security]] · [[Vibecoding - Open Redirects]] · [[Vibecoding - Zero Security Headers]]
- **Resilience**: [[Vibecoding - No Error Boundaries]] · [[Vibecoding - No Rate Limiting]] · [[Vibecoding - Race Conditions and Concurrency]]
- **LLM / agent risks**: [[Vibecoding - Prompt Injection]] · [[Vibecoding - Indirect Prompt Injection EchoLeak]] · [[Vibecoding - Tool-Use Confused Deputy]] · [[Vibecoding - MCP Ecosystem Vulnerabilities]] · [[Vibecoding - RAG Poisoning]] · [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]] · [[Vibecoding - Rules File Backdoor Unicode Injection]]
- **Privacy / GDPR**: [[Vibecoding - Privacy and GDPR Minimum]] · [[Vibecoding - Privacy and GDPR Reference]]
- **Process**: [[Vibecoding - Threat Modeling in 20 Minutes]] · [[Vibecoding - Process Multi-Agent Code Review]] · [[Vibecoding - Process Secure Prompt Patterns RCI]] · [[Vibecoding - Debugging and Bug Triage Workflow]]
- **Infra / ops**: [[Vibecoding - Infrastructure and Operations Security]] · [[Vibecoding - Cryptography and Key Management]] · [[Vibecoding - Logging and SIEM Without PII Leakage]] · [[Vibecoding - Caching and CDN Security]] · [[Vibecoding - Incident Response Runbook]]
- **Org**: [[Vibecoding - Org and Vendor Risk SBOM]] · [[Vibecoding - Account Security UX 2FA Sessions]] · [[Vibecoding - CI CD and Container Security]] · [[Vibecoding - API Design Security CORS Versioning]]

## Case studies (read for the lessons)

- [[Vibecoding - Case Study Base44 Auth Flaw]]
- [[Vibecoding - Case Study Bolt and Multi-Platform Scans]]
- [[Vibecoding - Case Study Claude Code Terraform Destroy]]
- [[Vibecoding - Case Study Copilot CVE-2025-53773 RCE]]
- [[Vibecoding - Case Study Cursor MCP CVEs]]
- [[Vibecoding - Case Study Lovable RLS CVE]]
- [[Vibecoding - Case Study PocketOS 9-Second Wipe]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]

## Numbers to keep you honest

See the Stat notes in the folder. Headlines:
- Apiiro: AI-coded repos ship features 4× faster but introduce 10× more vulnerabilities.
- Veracode 2025: 45% of LLM-generated code samples ship with at least one OWASP Top 10 issue.
- GitGuardian 2026: secret leaks up YoY; AI tooling is a measurable contributor.
- Spracklen / USENIX 2025: ''slopsquatting'' — LLMs hallucinate package names that attackers then squat.

## What this folder does not cover

- Formal compliance frameworks (SOC 2 controls, ISO 27001 evidence, PCI-DSS L1).
- Regulated-domain specifics beyond GDPR (HIPAA, COPPA, deeper PCI).
- Production SRE: SLOs, error budgets, chaos testing, capacity planning.
- Adversary playbooks / red-team scenarios beyond STRIDE prompts.

If your business needs any of those, hire a specialist.

## License & redistribution

See [[LICENSE]]. Use by explicitly invited private collaborators is permitted; public redistribution and resale are not.

## Changelog

- **2026-04-29** — START HERE published. Naming normalized (Tooling/Tool Profile split). Threat Modeling notes merged into [[Vibecoding - Threat Modeling in 20 Minutes]]. Privacy split clarified: Minimum (practitioner) vs Reference (formal). Index rewritten as taxonomy.
- **2026-04-28** — 86-note baseline. Checkbook + Audit Checklist + atomic notes + case studies + stats + tool profiles + tooling references.
