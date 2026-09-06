---
tags: [security, vibecoding, api, cors, versioning, owasp-api]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# API Design Security — CORS, Versioning, Deprecation, Abuse

The OWASP API Top 10 is its own list because APIs fail differently from browser apps. Vibecoded APIs ship with `Access-Control-Allow-Origin: *`, no versioning, no deprecation policy, no abuse contract — and become the easiest attack surface in the system.

## CORS

- `Access-Control-Allow-Origin: *` is incompatible with `Allow-Credentials: true`. Browsers refuse the combination — but a misconfigured server that returns both is a sign the developer didn't understand the model.
- Allowlist of explicit origins. No regex on origin without anchoring (`/example\.com/` matches `evilexample.com.attacker.tld`).
- Preflight cache (`Access-Control-Max-Age`) reasonable (e.g. 600s); too long delays config rollout.
- Don't reflect the `Origin` header without validation. The "echo whatever was sent" pattern defeats CORS entirely.
- `Vary: Origin` set when CORS depends on origin (cache poisoning protection).
- Reject `null` origin unless you specifically need it.

## API versioning & deprecation

- Versioning strategy chosen and documented (URL path `/v1/`, header, content-type negotiation).
- Deprecation policy: announce, dual-run, sunset. Document timelines.
- `Deprecation` and `Sunset` headers (RFC 8594) on deprecated endpoints.
- Don't break clients silently. `Warning` header during transition.
- Old versions retired on schedule, not "forever for that one customer."

## API contracts

- OpenAPI / GraphQL schema as source of truth. Generate clients + validate at edge.
- Strict schema validation: reject unknown fields, type mismatches, oversized payloads.
- No leaking internal IDs, stack traces, DB error messages in response bodies.
- Consistent error shape: `{ error: { code, message, requestId } }` — code is enumerated, message is human, requestId is greppable.

## Rate limiting & abuse

See [[Vibecoding - No Rate Limiting]].
- Per-route, per-user, per-IP, per-API-key — pick the granularity that matches the abuse model.
- Tiered limits per plan (free vs paid) where relevant.
- Burst + sustained limits separately.
- 429 responses with `Retry-After`. Never silent-drop.
- Bot management at the edge (Cloudflare Turnstile / hCaptcha) for high-abuse endpoints (signup, comment, vote).

## Pagination & resource limits

- Server-enforced max page size (e.g. 100). Don't accept `limit=10000`.
- Cursor-based pagination preferred; offset pagination has DOS surface for large offsets.
- Query timeout server-side (e.g. 5s) — runaway queries killed at the DB.
- Result-set size limits — don't dump 1M rows in a single response even if authorized.

## API keys

- Issued with explicit scope and expiry.
- Hashed at rest (you can't show the key again after creation).
- Rotatable without downtime: dual-key window, deprecate old.
- Per-key rate limits + abuse signals.
- Easily revocable from a UI.
- Don't accept API keys in URLs (logged everywhere). Header or POST body only.

## Webhooks (outbound)

- Signed with a per-customer secret. Customers verify the signature.
- Replay protection: include timestamp in signed payload, reject older than 5 min.
- Idempotency key in the body so customer handlers can de-dupe.
- Retry with backoff. Document the retry schedule.
- Disable webhook destination after sustained failures; notify the customer.

## GraphQL specifics

- Disable introspection in prod (or limit to authenticated admins).
- Query complexity / depth limits (graphql-depth-limit, graphql-cost-analysis).
- Persisted queries for client-controlled queries — stops attackers from sending arbitrary expensive queries.
- Field-level authorization, not just resolver-level.
- Don't expose mutations that aren't intended for the public API.

## Related

- [[Vibecoding - No Authorization on Endpoints]]
- [[Vibecoding - No Rate Limiting]]
- [[Vibecoding - Authorization Depth IDOR BOLA]]
- [[Vibecoding - Things to Check on Your Code]]
