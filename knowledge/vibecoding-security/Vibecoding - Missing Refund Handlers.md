---
tags: [security, vibecoding, stripe, financial]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Missing Refund Handlers

## What it looks like
Stripe webhook handles `checkout.session.completed` and `charge.dispute.created` but not `charge.refunded`, `charge.dispute.closed`, or payout reversals. Refunded buyers keep entitlements indefinitely. Real money liability + chargeback fraud risk.

## Why AI generates it
Tutorials cover the happy path (purchase succeeds). Refund flows aren't included; the model doesn't enumerate Stripe's webhook event taxonomy.

## Fix
- Handle `charge.refunded`: revoke entitlements, mark download tokens revoked
- Handle `charge.dispute.closed` (won/lost): adjust ledger
- Handle `payout.failed`: surface to seller dashboard
- Test with Stripe CLI `trigger` for each event
