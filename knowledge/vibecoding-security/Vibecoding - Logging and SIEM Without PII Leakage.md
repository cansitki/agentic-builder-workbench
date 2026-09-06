---
tags: [security, vibecoding, logging, siem, observability, pii]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Logging and SIEM Without PII Leakage

You can't detect or respond to attacks without logs. You also can't ship logs that include passwords, tokens, full request bodies, or session cookies — every observability platform has had at least one customer breach because their logs were the easiest target.

## What to log

- Authentication events: login success/fail, MFA challenge, password change, session creation, token issuance.
- Authorization decisions: 403s with reason, role changes, admin actions.
- Data mutations: who changed what, when (especially financial / permissions / privacy-relevant).
- Webhook receipts and signature verification outcomes.
- External calls (LLM providers, payment, email) — request ID, latency, status. Not bodies.
- Errors with stack + request context, but never request bodies untransformed.

## What NOT to log

- Passwords, password hashes, reset tokens, MFA codes, OAuth refresh tokens, API keys.
- Full credit card numbers, CVVs (PCI scope amplifier).
- Full request bodies for endpoints that take any of the above.
- Session cookies / JWTs (logging the token = anyone with log access can replay it).
- PII beyond what your privacy notice covers — full email + IP + UA together is often enough to trigger GDPR scope.
- LLM prompts containing user PII, unless explicitly bound by your DPA.

## Patterns

- Centralized logger with redaction baked in (winston/pino + redact paths, structlog ProcessorChain).
- Redact at log creation, not at egress. "We'll filter at the SIEM" is how leaks happen.
- Separate transports for security audit log (immutable, longer retention) vs application log (rotated 30–90d).
- Audit log is append-only: WORM bucket, ledger DB, or tamper-evident hash chain.
- Structured JSON logs, not free-text. SIEM correlation needs structure.

## Detection content

Once logs flow, write detections:
- Multiple failed logins from one IP / one account
- Login from new country / impossible travel
- Privileged action outside business hours
- Mass data export by single user
- Unusual rate of 403s (enumeration probe)
- Webhook signature failures clustered by source
- LLM tool-use chain hitting destructive tools
- New OAuth grant on existing account
- Account email change followed by password reset within minutes (account takeover pattern)

## Alert hygiene

- Every alert has a runbook, an owner, and a documented false-positive rate.
- Alerts page humans only when human action is required. Everything else is dashboard.
- Track alert MTTA / MTTR. Drop alerts that fire 100x/day with no action — they're noise.

## Related

- [[Vibecoding - Privacy and GDPR Reference]]
- [[Vibecoding - Incident Response Runbook]]
- [[Vibecoding - Things to Check on Your Code]]
