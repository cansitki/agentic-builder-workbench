---
tags: [security, vibecoding, audit, gdpr]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Missing Soft Delete

## What it looks like
DELETE endpoint runs `delete from listings where id=...`. Cascade rules destroy purchases, payouts, invoices. Audit trail gone. GDPR/DAC7/financial-retention obligations broken (7-year tax retention).

## Why AI generates it
`DELETE FROM` is the obvious answer. Soft delete patterns (`deleted_at`, archive table, retain-then-anonymize) are domain-specific.

## Fix
- `deleted_at timestamptz` column, all reads `where deleted_at is null`
- Account deletion: archive financial records before CASCADE
- Anonymize PII (email → hash), retain transactional records
- Document retention policy per table
