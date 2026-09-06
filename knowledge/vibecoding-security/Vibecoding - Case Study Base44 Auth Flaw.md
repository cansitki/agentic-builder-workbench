---
tags: [security, vibecoding, case-study, base44]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study: Base44 Authentication Flaw

## Summary
Mid-2025. Wiz researchers found a single misconfigured authentication endpoint in Base44 (Wix-acquired vibecoding platform) that exposed every project hosted on the platform. Critical-severity. Single point of failure across the entire tenant.

## Pattern
- Base44 authentication flow had a server-side bypass
- One endpoint accepted unverified tokens
- Cross-tenant data accessible to any authenticated user
- Auth-flow design assumption ("token verified upstream") didn't hold

## Disclosure
- Wiz disclosed privately
- Base44 patched within days
- Public report after patch

## Lesson
Multi-tenant vibe platforms concentrate risk. One platform-level auth bug ≠ "170 apps affected" — it's "every app affected." Tenants have no defense; they don't write the auth code.

## Sources
- [Infosecurity Magazine — Base44 Authentication Flaw](https://www.infosecurity-magazine.com/news/authentication-flaw-base44/)

Related: [[Vibecoding - Client-Side Authentication]], [[Vibecoding - No Authorization on Endpoints]]
