---
tags: [security, vibecoding, webhooks, stripe, checklist]
parent: '[[Vibecoding Security Research - Index]]'
created: 2026-04-29
status: draft
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Webhook Security

> **The bug:** Webhook endpoints are public POST endpoints that grant high-trust state changes (mark order paid, grant entitlement, refund). If you don't verify, deduplicate, and handle them defensively, an attacker — or a flaky network — turns your business logic upside down.

## The five things every webhook handler must do

1. **Verify the signature** before reading the body.
2. **Reject events older than 5 minutes** (replay protection).
3. **Deduplicate by event ID** (idempotency).
4. **Return 2xx fast (<20s)**, do real work async.
5. **Never widen state on negative events** (asymmetric updates).

Skip any of these and you have a real bug. Most vibecoded apps skip 3 and 5.

## 1. Signature verification

The endpoint is public — anyone can POST to it. The signature is what proves the body actually came from Stripe (or GitHub, or Linear, etc.).

```ts
import Stripe from 'stripe';

const sig = req.headers.get('stripe-signature');
const body = await req.text();   // RAW body — never parse JSON first

let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(body, sig!, env.STRIPE_WEBHOOK_SECRET);
} catch (err) {
  return new Response('bad signature', { status: 400 });
}
```

**Critical traps:**
- Use the **raw body**. JSON-parse → re-stringify breaks the signature (whitespace, key order). In Next.js App Router, `req.text()` is correct; `req.json()` is wrong.
- Use the **library**, not a hand-rolled HMAC. Constant-time compare matters.
- Make `STRIPE_WEBHOOK_SECRET` **required** in env validation, not optional. Optional → app boots fine but signature verification silently fails open in some implementations; this has appeared in real marketplace audits.
- Each environment has its own webhook secret. Don't reuse staging's secret in prod.

## 2. Replay protection

Stripe includes a timestamp in the signature header and `constructEvent` rejects events older than 5 minutes by default. **Don't lengthen the tolerance.** If your secret leaks, the 5-minute window is what limits how long an attacker can replay captured events.

```ts
// Default tolerance is 300s — leave it alone
stripe.webhooks.constructEvent(body, sig, secret /*, tolerance: 300 */);
```

## 3. Idempotency / deduplication

Stripe retries on any non-2xx response, **and sometimes delivers the same event twice anyway**. Without dedup, you fulfill the same order twice, send two emails, grant entitlements twice.

The pattern: store `event.id` and check before processing.

```ts
const { data: existing } = await supabaseAdmin
  .from('webhook_events')
  .select('id')
  .eq('id', event.id)
  .maybeSingle();

if (existing) {
  return new Response('already processed', { status: 200 });
}

// ... process the event ...

await supabaseAdmin.from('webhook_events').insert({
  id: event.id,
  type: event.type,
  processed_at: new Date().toISOString(),
});
```

**Better:** make the dedup insert the *first* DB write, with a unique constraint on `event.id`. If the insert fails with a unique-violation, you know it's a duplicate. This is race-free; the read-then-write pattern above has a TOCTOU window where two concurrent retries both pass the check.

```ts
const { error } = await supabaseAdmin
  .from('webhook_events')
  .insert({ id: event.id, type: event.type });

if (error?.code === '23505') {   // unique_violation
  return new Response('duplicate', { status: 200 });
}
```

## 4. Respond fast, work async

Stripe times out at 20s and retries. Heavy work (send email, generate invoice, update CRM) should happen in a queue (Inngest, BullMQ, Cloud Tasks), not in the webhook handler.

```ts
// 1. Verify signature
// 2. Dedup
// 3. Persist a minimal source-of-truth row (mark purchase paid)
// 4. Emit event to queue
// 5. Return 200
```

If step 3 fails, return 500 — Stripe will retry. If step 4 fails, **also return 500** — you don't want to swallow a queue failure with 200.

## 5. Asymmetric state updates (the trap)

Webhooks deliver state transitions. Some are terminal (`charge.succeeded`, `account.updated` with `charges_enabled=true`). Some are flaky and reverse themselves (Stripe Connect's `account.updated` can flip `charges_enabled` to false and back during onboarding hiccups).

**Rule:** when an event flips a flag to a "better" state, persist the full set of derived terminal fields. When it flips back to "worse," persist *only* the flag — never clear the terminal fields.

```ts
// account.updated fires with charges_enabled && payouts_enabled
await supabaseAdmin.from('sellers').update({
  stripe_onboarding_complete: true,
  onboarding_step: 3,
  onboarding_completed_at: new Date().toISOString(),
}).eq('stripe_account_id', acct.id);

// account.updated fires later with charges_enabled = false
await supabaseAdmin.from('sellers').update({
  stripe_onboarding_complete: false,
  // DO NOT also clear onboarding_step / onboarding_completed_at
  // — that would dump an onboarded seller back into the wizard
}).eq('stripe_account_id', acct.id);
```

Document this pattern in the project's knowledge base. The mirror trap: never use the same handler for "+" and "−" events without thinking about what gets cleared.

## 6. Order-of-operations: events arrive out of order

`charge.succeeded` can arrive before `payment_intent.succeeded`. `checkout.session.completed` can race with `charge.refunded` if a buyer refunds within seconds. Don't assume sequence.

- Persist by **state target**, not by **event sequence**. "Mark this purchase paid" is idempotent; "increment paid_count" is not.
- Use compare-and-swap on transitions: `UPDATE purchases SET status='paid' WHERE id=? AND status IN ('pending', 'paid')`. Refuse downgrades unless explicit.

## 7. The events you might be missing

A real marketplace audit found handlers for `checkout.session.completed`, `account.updated`, and `charge.dispute.created`, but **no `charge.refunded` handler** — refunded buyers kept entitlements, download tokens, and "completed" purchase status. Same shape:

- `charge.refunded` / `charge.dispute.closed` — revoke entitlements
- `payment_intent.payment_failed` — clean up half-created orders
- `customer.subscription.deleted` — for SaaS, cut off access
- `payout.failed` — for marketplaces, alert the seller

If your business logic depends on a "happy" event firing, the unhappy counterpart needs a handler too.

## 8. Error handling: don't 200-on-fail

Returning 200 from a handler that threw silently drops the event. Stripe's dashboard says "delivered"; your DB never saw it. The only way to fix this later is to manually replay events from the Stripe dashboard.

```ts
try {
  await processEvent(event);
  return new Response('ok', { status: 200 });
} catch (err) {
  console.error('webhook failed', { event_id: event.id, type: event.type, err });
  return new Response('error', { status: 500 });   // <-- Stripe retries
}
```

Return 500 only on transient errors. If the event is *structurally* unprocessable (event type you don't handle, malformed payload from a manual replay), return 200 — retrying won't help.

## 9. Network / transport

- **HTTPS only.** Stripe rejects HTTP endpoints, but if you ever proxy through your own infra, don't downgrade.
- **No IP allowlisting** — Stripe doesn't publish a stable IP range. Signature verification is the trust boundary.
- **Rate-limit the endpoint.** Even with signature checks, an attacker spamming bad signatures consumes CPU. Bucket by IP at the edge.
- **Don't put secrets in URL paths.** `/api/webhook/stripe/<secret>` ends up in logs.

## 10. Observability

- Log `event.id`, `event.type`, processing duration, outcome. Don't log the body (PII / card metadata).
- Alert on: signature failures (someone is probing), retry storms (downstream is broken), > 5s p95 (heading toward Stripe's 20s timeout).
- Track event-type coverage: which event types arrived in the last 30 days, which are unhandled. Surfaces missing handlers.

## Checklist (drop-in)

- [ ] Raw body used for signature verification (`req.text()`, not `req.json()`).
- [ ] Webhook secret is required in env validation.
- [ ] Library used for signature verification, not hand-rolled HMAC.
- [ ] Default 5-minute replay tolerance untouched.
- [ ] Event IDs deduplicated via DB unique constraint (insert-first pattern).
- [ ] Heavy work happens in a queue; handler returns 2xx within ~1s.
- [ ] Asymmetric state updates: positive events persist terminal fields, negative events update only the flag.
- [ ] Compare-and-swap on state transitions; out-of-order events tolerated.
- [ ] Refund / dispute / cancel events have handlers (not just the happy paths).
- [ ] Errors return 500, not 200. Unprocessable events return 200 with a log line.
- [ ] No webhook secret in URL path or logs.
- [ ] Endpoint is rate-limited at the edge.
- [ ] Alerts on signature failures, retry storms, slow handlers.
- [ ] At least one synthetic test that replays an event twice and asserts no double-fulfillment.

## Related

- [[Vibecoding - IDOR and Authz Patterns]] — webhook handlers run as service-role and bypass RLS; the asymmetric-state trap is an authorization-shaped bug.
- [[Vibecoding - Things to Check on Your Code]] — main runbook; this note expands its webhook section.

## Sources

- [Stripe — Receive events in your webhook endpoint](https://docs.stripe.com/webhooks)
- [Stripe Webhook Security: Signature Verification, Idempotency, and Local Testing (DEV)](https://dev.to/whoffagents/stripe-webhook-security-signature-verification-idempotency-and-local-testing-1lk3)
- [Best practices I wish we knew when integrating Stripe webhooks (Stigg)](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- [Webhook Security Vulnerabilities Guide (Hookdeck)](https://hookdeck.com/webhooks/guides/webhook-security-vulnerabilities-guide)
- [Handling Payment Webhooks Reliably — Idempotency, Retries, Validation](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
