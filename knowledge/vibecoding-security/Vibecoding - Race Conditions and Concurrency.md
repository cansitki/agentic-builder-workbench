---
tags: [security, vibecoding, race-condition, toctou, concurrency]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Race Conditions and Concurrency

Time-of-check / time-of-use bugs are the most under-tested class of security flaw because unit tests almost never cover them. Vibecoded apps are particularly prone because LLMs default to the read-then-write pattern that the SQL / HTTP / actor model wasn't designed for.

## Classic patterns

### Read-then-write at the application layer
```js
const user = await db.users.find(id);
if (user.balance >= amount) {
  await db.users.update(id, { balance: user.balance - amount });
}
```
Two concurrent requests both pass the check, both subtract — balance goes negative. Fix: atomic `UPDATE ... WHERE balance >= $amount` and check affected-row-count.

### Coupon / referral / discount redemption
"Single use" coupon redeemed N times under load. Fix: unique constraint on (`coupon_code`, `user_id`) plus row-level lock or `INSERT ... ON CONFLICT`.

### Free-trial doubling
User signs up twice, gets two free trials. Fix: unique on `user_email_normalized`, check at signup (not just at trial-grant).

### Refund double-spend
Stripe webhook arrives twice (Stripe retries are real); both refund handlers run; entitlement revoked twice / wallet credited twice. Fix: idempotency key from event ID, unique constraint on `processed_event_id`.

### Order-of-operations leaks
"Create entitlement, then mark purchase complete" — if the second step fails, entitlement leaks. "Mark complete, then create entitlement" — if the second fails, the buyer paid for nothing. Fix: transactional outbox, or idempotent retryable second step that checks state.

### TOCTOU file ops
Check file extension, then save. Attacker replaces between check and save. Fix: atomic move into a quarantine path; validate after, not before.

## Database-level mitigations

- `SELECT ... FOR UPDATE` (pessimistic lock) inside a transaction for hot rows.
- Optimistic concurrency: `UPDATE ... WHERE version = $expected` and check affected rows. If 0, retry.
- Postgres advisory locks for cross-row coordination when row-level isn't enough.
- Serializable isolation for code paths that must not interleave (use sparingly — perf cost).
- Atomic counters: `UPDATE ... SET balance = balance - $1 WHERE balance >= $1` — single statement, single check.

## Webhook / queue idempotency

- Every queue consumer uses an idempotency key derived from message content.
- `processed_events(event_id PK)` table — INSERT before doing work; on conflict, skip.
- Stripe / Inngest / SQS handlers all verify idempotency before any side effect.

## Distributed transactions

- Avoid them. Use the outbox pattern: write the side-effect intent to your DB inside the same transaction, dequeue and dispatch async, retry on failure.
- Saga pattern for multi-service workflows with explicit compensating actions.

## Tests

- Property-based tests with concurrent runners (e.g. `fast-check` async) for hot paths.
- Chaos / load tests that fire 100 parallel duplicates at coupon-redeem, signup, payment-confirm endpoints.
- Test that webhook handlers are idempotent by replaying the same event five times — final state is identical to single-event state.

## Related

- [[Vibecoding - Missing Webhook Verification]]
- [[Vibecoding - No Rate Limiting]]
- [[Vibecoding - Things to Check on Your Code]]
