---
tags: [security, vibecoding, owasp]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# OWASP Top 10 Mapping

How the recurring vibecoded failures map to OWASP Top 10 (2021).

| OWASP | Vibe-coded manifestation | Atomic note |
|---|---|---|
| A01 Broken Access Control | RLS off, missing auth guards, IDOR | [[Vibecoding - RLS Disabled or Permissive]], [[Vibecoding - No Authorization on Endpoints]] |
| A02 Cryptographic Failures | Math.random tokens, weak JWT secrets, HTTP in prod | [[Vibecoding - Math.random for Security IDs]], [[Vibecoding - Secrets in Client Bundle]] |
| A03 Injection | Shell/SQL concat, command injection | [[Vibecoding - Backend Code Execution Bugs]], [[Vibecoding - No Input Validation]] |
| A04 Insecure Design | Client-side auth, no rate limits, no soft delete | [[Vibecoding - Client-Side Authentication]], [[Vibecoding - No Rate Limiting]] |
| A05 Security Misconfig | No CSP/HSTS, default Supabase policies | [[Vibecoding - Zero Security Headers]] |
| A06 Vulnerable Components | Stale deps from training data | (covered in audit checklist) |
| A07 Auth Failures | Open redirects, predictable session IDs | [[Vibecoding - Open Redirects]] |
| A08 Software/Data Integrity | Unsigned webhooks, unverified uploads | [[Vibecoding - Missing Webhook Verification]] |
| A09 Logging/Monitoring | Static health endpoints, no failure persistence | [[Vibecoding - No Error Boundaries]] |
| A10 SSRF | Image proxy, OG fetcher, AI-tool URL handlers | [[Vibecoding - Backend Code Execution Bugs]] |

## Plus the LLM-specific ones (OWASP LLM Top 10)
- LLM01 Prompt Injection — see [[Vibecoding - Prompt Injection]]
- LLM02 Insecure Output Handling
- LLM06 Sensitive Information Disclosure
- LLM08 Excessive Agency
