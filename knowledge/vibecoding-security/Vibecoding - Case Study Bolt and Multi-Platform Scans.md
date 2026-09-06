---
tags: [vibecoding, security, case-study, escape, bolt, lovable]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study — Bolt.new and Multi-Platform Scans

**Escape.tech ran the largest public scan of vibe-coded apps. Headline: 2,038 critical vulnerabilities across 1,400-5,600 apps (depending on cutoff). The pattern is the same across every platform — Bolt.new, Lovable, Base44, Vibe Studio.**

## Escape.tech methodology
- Black-box DAST + secrets scanning
- Public endpoints only (no auth bypass needed — the apps were genuinely public)
- Coverage: ~4,000+ Lovable apps, ~159 Base44, ~449 Create.xyz, smaller samples Bolt.new + Vibe Studio
- Two figures circulate: 5,600 (early marketing) and 1,400 (CSA citation) — methodology disclosure is partial

## Headline findings
- **2,038 highly critical vulnerabilities**
- **400+ leaked secrets**
- **175 PII exposures** (medical records, IBANs, phone numbers, emails)
- **>60% of vibe-coded apps exposed API keys or DB credentials**
- 53% of devs surveyed admitted shipping AI code that later turned out to have security issues

## Bolt.new specific
- Scanned alongside Lovable, Base44, Vibe Studio by safevibe.codes (independent scanner)
- Failure profile matches the others — secrets in client bundles, missing RLS, no auth checks on API routes
- Smaller absolute count of public apps but same per-app vuln density

## A representative anecdote
> "One developer built a social media app in 5-6 hours using Lovable and Supabase. Three days later, it was compromised — user data leaked, API keys exposed."

This is the lifecycle: build fast → ship → get pwned within a week. The platforms don't ship security defaults that prevent this.

## Why every platform fails the same way
- They all scaffold against the same backends (Supabase, Firebase, Stripe)
- They all train on the same public code (mostly demo-grade)
- They all optimize for time-to-deploy, not time-to-secure-deploy
- None of them ship pre-deploy security gates as default

## Lovable's positioning vs reality
Lovable disputes some scan results as "intentional behavior" (apps were *meant* to be public). But CVE-2025-48757 — see [[Vibecoding - Case Study Lovable RLS CVE]] — was unambiguously not intentional.

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Case Study Lovable RLS CVE]]
- [[Vibecoding - Case Study Base44 Auth Flaw]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]

## Sources
- [Escape.tech: 2k+ Vulnerabilities in Vibe-Coded Apps](https://escape.tech/blog/methodology-how-we-discovered-vulnerabilities-apps-built-with-vibe-coding/)
- [Security Boulevard mirror](https://securityboulevard.com/2025/10/methodology-how-we-discovered-over-2k-high-impact-vulnerabilities-in-apps-built-with-vibe-coding-platforms/)
- [Snyk: Highs and Lows of Vibe Coding](https://snyk.io/articles/the-highs-and-lows-of-vibe-coding/)
- [The Register: Lovable denies data leak](https://www.theregister.com/2026/04/20/lovable_denies_data_leak/)
- [Awesome Agents: 69 Vulnerabilities in 5 AI tools](https://awesomeagents.ai/news/vibe-coding-security-69-vulnerabilities/)