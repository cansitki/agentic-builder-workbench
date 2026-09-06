---
tags: [security, vibecoding, webhooks, owasp-a08]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Missing Webhook Verification

## What it looks like
Stripe / GitHub / Clerk / Inngest webhooks accept any unsigned POST. Endpoint reads `req.body.payment_intent` directly and grants entitlements. Anyone can curl the endpoint and forge state.

## Why AI generates it
Verification adds 5–10 lines of crypto code; tutorials skip it for brevity. Models match the tutorial pattern. `STRIPE_WEBHOOK_SECRET` often defined as optional (`z.string().optional()`) so the app boots without it — silent failure mode.

## Attack
Forged `checkout.session.completed` POST with an attacker's `metadata.user_id` → free entitlement. Or a forged `charge.refunded` to grief other users.

## Fix
- `stripe.webhooks.constructEvent(body, sig, secret)` BEFORE parsing JSON
- Raw body required; framework body parsers will break sig verification
- Reject if `STRIPE_WEBHOOK_SECRET` missing at boot, not at request time
- Unit test: fixture invalid-sig POST returns 400
