---
tags: [security, vibecoding, authorization, idor, bola, owasp-api]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Authorization Depth — IDOR, BOLA, BFLA, Mass Assignment

`A01:2021 — Broken Access Control` is the #1 OWASP category and the #1 OWASP API Top 10 category (BOLA). RLS catches table-level isolation; it does NOT catch object-level or function-level authorization, and it does NOT catch mass assignment. Vibecoded apps routinely ship with all four broken.

## The four failure modes

### 1. IDOR / BOLA (Broken Object-Level Authorization)
`GET /api/invoices/123` returns invoice 123 regardless of who's asking. The auth guard checks "is logged in" but not "owns this resource."

- Every object-fetching route must check ownership: `where id = $1 AND user_id = auth.uid()`
- UUIDs help but are not authorization. Treat them as if they were sequential.
- Nested objects: line items, comments, attachments — each level needs its own ownership check, not just the parent.

### 2. BFLA (Broken Function-Level Authorization)
The admin dashboard route is gated by `role === 'admin'` in middleware, but `POST /api/admin/refund` has no role check of its own. Anyone who finds the path can call it.

- Every admin-only endpoint enforces role server-side at the handler, not just at the layout/middleware.
- API routes don't trust client-supplied role hints.
- "Hidden" admin paths are not secret — assume they're enumerated.

### 3. Mass assignment
`PATCH /api/users/me { role: "admin" }` — the handler does `db.update(req.body)` and the user just promoted themselves.

- Whitelist updatable fields explicitly. Never `update(...req.body)`.
- Zod schemas: use `.strict()` to reject extra keys, not `.passthrough()`.
- Sensitive columns (`role`, `email_verified`, `credit_balance`, `is_admin`, `stripe_customer_id`) live behind dedicated endpoints with their own auth gates.

### 4. Multi-tenant boundary leaks
SaaS apps where one tenant's data leaks to another via a missing `tenant_id` filter, or via a join that forgets to scope.

- Every query has both `user_id` AND `tenant_id` in the predicate when both apply.
- RLS policies cover joined queries — test with a real cross-tenant probe.
- Background jobs run with explicit tenant scope, not "service role for whoever."

## Probes

- Pick three random object IDs from your own account. Try them logged in as a different user. Each must 404 or 403, not 200.
- Curl the admin endpoints as a regular user. Must 403.
- `PATCH /api/me { role: "admin", credits: 9999 }` — must reject or strip.
- Run an API fuzzer (ZAP, Caido) against authenticated routes; look for 200s where 403 was expected.

## Related

- [[Vibecoding - No Authorization on Endpoints]]
- [[Vibecoding - RLS Disabled or Permissive]]
- [[Vibecoding - Case Study Base44 Auth Flaw]]
- [[Vibecoding - OWASP Top 10 Mapping]]
- [[Vibecoding - Things to Check on Your Code]]
