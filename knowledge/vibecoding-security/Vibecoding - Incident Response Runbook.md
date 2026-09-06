---
tags: [security, vibecoding, incident-response, ir, runbook]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Incident Response Runbook

The first 24 hours of an incident make or break the cost. Vibecoded teams often have no runbook, no on-call, no defined comms — they discover a breach via a blog post and Twitter at the same time as their users.

## Roles

- **Incident commander.** Owns the response. Not the engineer fixing — the person coordinating.
- **Tech lead.** Drives the technical investigation and remediation.
- **Comms lead.** Handles internal updates, customer notification, regulator notification.
- **Scribe.** Timeline of every decision. Becomes the post-mortem source-of-truth.

For solo / small teams: same person can hold multiple roles, but they must be named for the incident.

## Phases

### 1. Detect (minutes 0–5)
Trigger sources: alert, customer report, security researcher email, Twitter mention, vendor breach notice.
- Open a dedicated war-room channel (Slack / Discord). Pin the runbook.
- Page the on-call engineer.
- IC declares severity (SEV1/2/3) — doesn't have to be right, just declared.

### 2. Contain (minutes 5–60)
- Stop the bleeding before understanding it. Acceptable to be heavy-handed:
  - Rotate the suspected leaked credential.
  - Put up a maintenance page.
  - Disable the compromised feature flag.
  - Block the suspected attacker IP at the edge.
- Snapshot evidence BEFORE making changes — DB state, logs, tokens, file system. Containment that destroys evidence makes investigation impossible.

### 3. Investigate (hour 1–24)
- What was accessed / modified / exfiltrated?
- How did they get in? (root cause, not symptom)
- Are they still in?
- What other systems share this vuln / credential?
- Timeline reconstruction from logs, audit trail, vendor data.

### 4. Eradicate
- Remove the attacker's access. Rotate every credential they may have touched.
- Patch the root cause. Deploy with extra review.
- Hunt for persistence: backdoor accounts, scheduled tasks, modified webhooks, malicious OAuth grants.

### 5. Recover
- Restore from clean backups if data was destroyed.
- Re-enable affected features.
- Increased monitoring on the affected surface for 30+ days.

### 6. Notify
- Customers: per breach notification laws (GDPR 72h to DPA, individual notice if "high risk").
- Regulators: GDPR DPA, state AGs in US, sector regulators.
- Vendors / partners: if the breach affects shared systems.
- Public statement: status page + blog post. Be specific about what happened, what data, what you've done. Vague PR-speak destroys trust faster than the breach.

### 7. Post-mortem
- Blameless. Focus on systemic gaps, not individuals.
- 5-whys to root cause.
- Action items with owners and dates. Track to completion.
- Update this runbook with what was missing.

## Pre-staged artifacts

Have these ready BEFORE an incident:
- On-call rotation with phone numbers.
- War-room channel template.
- Customer notification email template (legal-reviewed).
- Status page with auth to update.
- Forensic snapshot scripts (DB dump, log archive, token rotation).
- Contact list: legal counsel, cyber insurance, regulator portal, key vendors' security contacts.

## Tabletop exercises

Run one quarterly. Pick a scenario:
- Stripe API key leaks via a public S3 bucket.
- Engineer's laptop stolen, full disk encryption status unknown.
- Customer reports their account was deleted by someone who isn't them.
- LLM-driven tool call wiped a customer's data (Replit pattern).
- Sub-processor announces breach affecting your data.

Walk through the runbook. Find the gaps. Fix them.

## Related

- [[Vibecoding - Logging and SIEM Without PII Leakage]]
- [[Vibecoding - Privacy and GDPR Reference]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]
- [[Vibecoding - Things to Check on Your Code]]
