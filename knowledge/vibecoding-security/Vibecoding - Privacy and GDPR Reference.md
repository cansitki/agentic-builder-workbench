---
tags: [security, vibecoding, privacy, gdpr, compliance, dpa]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Privacy and GDPR Compliance

Compliance is not security, but a privacy violation in the EU is a security incident with regulatory teeth. GDPR fines run up to 4% of global revenue. Most vibecoded apps ignore privacy entirely until a user files an Article 15 access request and the team panics.

## Minimum viable privacy program

### Data inventory (PII map)
- List every column / log field / third-party tool that holds personal data.
- For each: lawful basis (consent / contract / legitimate interest), retention period, where it lives (DB / Sentry / analytics / email tool), and which sub-processor sees it.
- Stale: not refreshed in 12 months → assume it's wrong.

### Lawful basis & consent
- No analytics / marketing cookies before consent (EU). Strictly-necessary only by default.
- Consent is opt-in, granular, withdrawable, logged with timestamp + IP + version of the notice.
- Pre-ticked boxes are not consent. Cookie banners that bury "reject" are dark patterns and unlawful.

### Data subject rights (DSAR)
- **Article 15 (access):** export all personal data in machine-readable form within 30 days.
- **Article 16 (rectify):** user can edit their profile / preferences without contacting support.
- **Article 17 (erasure):** account deletion actually deletes (or anonymizes) — see [[Vibecoding - Missing Soft Delete]] for the soft-delete-vs-hard-delete tradeoff.
- **Article 20 (portability):** export in JSON / CSV that another service can ingest.
- **Article 21 (object):** unsubscribe from marketing in one click.

### Retention
- Every data class has a documented retention period (e.g. payment records 7 years for tax, support tickets 24 months, marketing logs 13 months EU).
- Cron job actually deletes / anonymizes after retention. "We have a policy" without enforcement is theater.
- Backups: documented restore-then-delete process for DSAR erasure requests.

### Sub-processors
- Public list of sub-processors (Stripe, Sentry, Resend, Inngest, Supabase, OpenAI, ...).
- DPA / Standard Contractual Clauses signed with each.
- Notification mechanism if sub-processors change.

### Cross-border transfers
- US-bound data: SCCs + Transfer Impact Assessment (post-Schrems II).
- Document where data physically lives (region selection on Supabase / S3 / etc.).

## Minimization checklist

- [ ] Don't ask for fields you don't use (DOB, full address, phone) — minimize at signup
- [ ] Don't log full request bodies; redact PII at the logger layer
- [ ] Don't send PII to LLM providers without explicit consent + zero-retention API tier
- [ ] Pseudonymize where you can (hashed user IDs in analytics, not emails)
- [ ] Don't ship fingerprinting / session-replay without disclosure

## Account deletion specifics

The hardest privacy bug in vibecoded apps: account deletion that doesn't propagate.
- Delete from primary DB (or anonymize FK chain — financial records often must persist for tax law).
- Purge Sentry events.
- Remove from email provider, marketing tool, analytics warehouse.
- Invalidate all sessions, refresh tokens, OAuth grants.
- Delete uploaded files from object storage (don't just unlink the row).
- Remove from backups on next rotation cycle, with documented timeline communicated to user.

## Related

- [[Vibecoding - Missing Soft Delete]]
- [[Vibecoding - Logging and SIEM Without PII Leakage]]
- [[Vibecoding - Things to Check on Your Code]]
