---
tags: [security, vibecoding, idor, authorization, checklist]
parent: '[[Vibecoding Security Research - Index]]'
created: 2026-04-29
status: draft
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# IDOR and Authz Patterns

> **The bug:** "User is logged in" ≠ "user owns this row." IDOR (Insecure Direct Object Reference) is when an authenticated user can access or mutate someone else's data by changing an ID in a URL, body, or query string. OWASP classifies it under **Broken Access Control (A01)** — the #1 web security risk.

## The mental model

Three layers must agree. If any one disagrees, you have an IDOR.

1. **Route layer** — is this user logged in?
2. **Object layer** — does this user own (or have a role on) the specific object they're asking about?
3. **Data layer** — does the database itself refuse to return rows the user doesn't own?

Logged-in is necessary, not sufficient. The bug almost always lives at layer 2.

## The canonical wrong pattern

```ts
// /api/purchases/[id]/route.ts
const { id } = await params;
const purchase = await supabaseAdmin
  .from('purchases')
  .select('*')
  .eq('id', id)         // BUG: no owner check
  .single();
return Response.json(purchase);
```

Any logged-in user can pass any UUID and read any purchase. `supabaseAdmin` bypasses RLS, so the DB doesn't save you.

## The canonical right pattern

```ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('unauth', { status: 401 });

const { id } = await params;
const purchase = await supabase
  .from('purchases')
  .select('*')
  .eq('id', id)
  .eq('buyer_id', user.id)   // owner check in the query, not in JS
  .single();

if (!purchase.data) return new Response('not found', { status: 404 });
return Response.json(purchase.data);
```

Three things matter:
- **Use a session-bound client, not `supabaseAdmin`.** RLS only fires on session-bound clients.
- **Scope the query, don't post-check.** Fetching the row first and then checking `if (purchase.buyer_id !== user.id)` in JS is a TOCTOU smell and leaks information via timing.
- **Return 404, not 403.** Telling the attacker "this exists, you just can't have it" enables enumeration.

## The four IDOR shapes (memorize these)

### 1. Path/query ID
`/api/purchases/[id]`, `/api/listings/[id]/edit`, `?orderId=42`. Anywhere a client-supplied ID flows into a query.

### 2. Body ID
`POST /api/reviews { listing_id, rating }` — does the user own a purchase of `listing_id`? `POST /api/team/invite { team_id, email }` — does the user have admin on `team_id`? Body params are the most common miss because devs assume "the form sent the right ID."

### 3. Indirect / relational
User can edit `/api/listings/[id]` if they own it. But can they update the `seller_id` field to someone else's? Mass-assignment IDOR. Same shape: `PATCH /api/users/me { role: 'admin' }`. Allowlist editable fields explicitly.

### 4. Function-level
`POST /api/admin/refund` — is this user actually an admin? Layout/middleware-only checks fail here (see [[Vibecoding - Auth Boundaries Layouts Are Not Enough]]). Re-check in the route handler.

## Defense in depth — three layers

| Layer | What it does | Why you need it |
|---|---|---|
| **Route handler** | `getUser()` + ownership check in query `.eq()` | Primary defense |
| **RLS policy** | DB refuses to return rows where `auth.uid() <> owner_id` | Catches misses at layer 1 |
| **Audit logging** | Log who accessed what, alert on enumeration | Catches the bypass you didn't think of |

If route + RLS both have owner checks, an attacker needs to break both to win.

## RLS owner-check patterns (Supabase)

```sql
-- Read your own
create policy "buyers see own purchases"
  on purchases for select
  using (auth.uid() = buyer_id);

-- Update only own, and never let user change buyer_id
create policy "buyers update own purchases"
  on purchases for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);   -- <-- prevents ownership flip
```

**The `with check` clause is non-negotiable on UPDATE.** Without it, a user can fetch their own row and update `buyer_id` to someone else's — they pass `using` (it was their row when read), and `with check` is what fires on the *new* row. Mass-assignment IDOR via RLS.

For multi-tenant / team apps:

```sql
create policy "team members read team listings"
  on listings for select
  using (
    seller_id in (
      select user_id from team_members
      where team_id = listings.team_id
    )
  );
```

Helper functions (`is_admin()`, `has_role(team_id, role)`) keep policies readable. Mark them `SECURITY DEFINER SET search_path = ''`, schema-qualify everything, and document the search-path injection risk in the project knowledge base.

## SECURITY DEFINER trap

Any RPC marked `SECURITY DEFINER` runs as the function owner, **bypassing RLS**. If it doesn't check `auth.uid()` internally, you've just built an IDOR factory.

```sql
-- BUG: any authenticated user can resolve any dispute
create function resolve_dispute(dispute_id uuid, verdict text)
returns void security definer language plpgsql as $$
begin
  update disputes set status = verdict where id = dispute_id;
end; $$;

-- FIX: check role inside
create function resolve_dispute(dispute_id uuid, verdict text)
returns void security definer set search_path = '' language plpgsql as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.disputes set status = verdict where id = dispute_id;
end; $$;
```

Same applies to functions like `increment_discount_uses()` — if anyone can call it, anyone can exhaust seller promotions. Always `revoke execute ... from anon` on RPCs that mutate state.

## Identifier strategy

- **Use UUIDs, not sequential integers.** Sequential IDs let attackers enumerate (`/api/order/1`, `/api/order/2`, ...). UUIDs are not a security control on their own (still need owner checks), but they raise the cost of blind probing and help with monitoring.
- **Avoid leaking IDs in URLs when possible.** Prefer `/api/me/orders` (scoped from session) over `/api/orders/[id]`.
- **Don't trust IDs from the client when the server already knows them.** If a checkout already has a session-bound cart, don't accept `cart_id` from the body.

## Signed URLs and tokens

Download tokens, signed Stripe checkout URLs, password reset links — same IDOR rules apply:
- Bind the token to a user (or to a single-use claim).
- Set a short expiry.
- Use compare-and-swap on consumption (so a leaked token can be redeemed only once).
- Don't put the user's ID in the token if a stranger can mint one.

## Detection — what to look for

Things that smell like IDOR before you even read the code:

- Routes shaped `/api/<resource>/[id]/...` that don't dereference the session.
- `supabaseAdmin` used inside a route that takes user input.
- `.eq('id', id)` without a paired `.eq('owner_id', user.id)`.
- RPCs with `SECURITY DEFINER` and no `if not is_admin()` / `if v_caller <> v_owner`.
- UPDATE policies with `using` but no `with check`.
- Anywhere the client supplies an ID that should be derivable from the session.

## Checklist (drop-in)

- [ ] Every `/api/<resource>/[id]` route checks `auth.uid()` AND scopes the query by ownership.
- [ ] Owner check is in the SQL (`.eq('owner_id', user.id)`), not in JS after fetch.
- [ ] Routes return 404 (not 403) on ownership mismatch — no enumeration oracle.
- [ ] Session-bound Supabase client used; `supabaseAdmin` reserved for webhooks/cron only.
- [ ] All RLS UPDATE policies have a `with check` clause.
- [ ] All `SECURITY DEFINER` functions check role/ownership internally.
- [ ] All public-facing RPCs that mutate state have `revoke execute ... from anon`.
- [ ] Identifiers are UUIDs or otherwise non-sequential.
- [ ] Body params allowlist editable fields (no mass-assignment).
- [ ] Audit log records `(user_id, resource, action, target_id)` for sensitive ops.
- [ ] At least one route has an automated test that confirms user A cannot read user B's row (catches regressions).

## Related

- [[Vibecoding - Auth Boundaries Layouts Are Not Enough]] — function-level IDOR is the same shape as layout-only auth.
- [[Vibecoding - Things to Check on Your Code]] — main runbook; this note expands its RLS section.
- [[Vibecoding - Audit Checklist]] — original audit checklist.

## Sources

- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP IDOR community page](https://owasp.org/www-community/attacks/insecure_direct_object_reference)
- [PortSwigger Web Security Academy — IDOR](https://portswigger.net/web-security/access-control/idor)
- [MDN — IDOR](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/IDOR)
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS best practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
