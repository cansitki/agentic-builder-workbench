---
tags: [security, vibecoding, payment, pci, stripe]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Payment and PCI Scope

Most vibecoded SaaS uses Stripe / Paddle / similar to keep PCI scope narrow (SAQ-A: redirect or hosted iframe). The moment your code touches a raw card number, scope balloons (SAQ-D, full PCI-DSS). Almost every vibecoded payment bug is in the orchestration around the gateway, not in the gateway itself.

## Stay out of scope

- Use Stripe Checkout / Elements / Payment Element. Never collect card number / CVV on your origin.
- The `<iframe>` in Elements is what keeps you SAQ-A. Don't read its contents.
- Don't log Stripe responses that contain `card.number` even partially. Stripe redacts in their API but be defensive.
- Don't store full card numbers anywhere. Use the Stripe customer + payment method ID.

## Webhook handling

See [[Vibecoding - Missing Webhook Verification]] and [[Vibecoding - Race Conditions and Concurrency]].

Critical events to handle:
- `checkout.session.completed` — grant entitlement, create order.
- `charge.refunded` — revoke entitlement, invalidate downloads, flip order state.
- `charge.dispute.created` — freeze relevant funds, notify support, document evidence.
- `charge.dispute.closed` — un-freeze if won; if lost, ensure refund propagated.
- `invoice.payment_failed` — for subscriptions, dunning + grace period.
- `customer.subscription.deleted` — clean up entitlements at period end.
- `account.updated` (Connect) — reflect onboarding state changes.
- `payment_intent.payment_failed` — log, don't retry blindly (could be fraud).

Idempotency is non-negotiable: Stripe retries, your handler MUST be safe to receive the same event N times.

## Connect / marketplace specifics

- Standard / Express / Custom — choose based on liability stance.
- `account.updated` flips can be transient — never regress terminal state on a single false; document the asymmetric UPDATE pattern in the project's knowledge notes.
- Payouts: hold periods, dispute reserves, frozen funds — model these as separate states, not one boolean.
- 1099 / DAC7 / VAT reporting: collect tax info at onboarding, export per regulatory deadlines.
- KYC / AML: Stripe handles in Standard/Express. In Custom you own it.

## Refunds & chargebacks

- Document partial vs full refund flow.
- Refund triggers MUST revoke entitlement + invalidate active download tokens + flip purchase state. The "refund the money but keep the access" bug is a frequent vibecoded miss.
- Chargeback evidence collection automated where possible (delivery receipts, IP, UA, login history, ToS acceptance timestamp).

## Fraud signals

- Stripe Radar enabled with sensible rules.
- Review high-risk transactions before fulfillment.
- Velocity checks: many cards on one account, same card across many accounts.
- 3DS / SCA enforced for EU. Make sure your flows actually trigger SCA when required.

## Tax & compliance

- VAT collection / display per EU rules. Reverse-charge for B2B.
- Sales tax for US states where you have nexus.
- Invoices generated and retained per tax law (often 7+ years).
- Tax IDs validated where required (VIES for EU VAT).

## Payment data lifecycle

- Customer requests deletion: delete from your DB but retain financial records per tax law (anonymize if possible — drop PII, keep transaction record).
- Stripe customer also deleted on account closure (their API supports it).
- DAC7 / KYC docs retained per regulator timeline, then deleted.

## Quick checks

- Refund a test purchase. Verify entitlement revoked + download tokens invalidated within seconds.
- Replay a `checkout.session.completed` event 5 times. Verify single fulfillment.
- Send unsigned webhook to your handler. Must reject with 400 / 401, not process.
- Check logs after a real charge. Card last4 OK, full number / CVV must NOT appear anywhere.
- Curl `/api/admin/refund` as a non-admin. Must 403.

## Related

- [[Vibecoding - Missing Webhook Verification]]
- [[Vibecoding - Missing Refund Handlers]]
- [[Vibecoding - Race Conditions and Concurrency]]
- [[Vibecoding - Things to Check on Your Code]]
