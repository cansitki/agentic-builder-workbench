---
tags: [security, vibecoding, database, checklist]
parent: '[[Vibecoding Security Research - Index]]'
date: 2026-04-29
status: active
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding — Database Hygiene

The data-layer failure modes AI tools ship by default. None of these are security per se, but they collapse the same way security does: silently, until real users hit them.

Pairs with [[Vibecoding - Things to Check on Your Code]] (RLS section) and [[Vibecoding - IDOR and Authz Patterns]].

## The five recurring failures

### 1. Flat schemas
The AI puts everything in one table. `users` ends up with name, email, billing address, last 10 orders as JSON, notification preferences, profile bio, all on one row.

**Why it breaks:** every read pulls the whole row. Every write contends with every other write. You cannot index your way out.

**Fix:** normalize when you see repeating groups or 1\:N relationships. `users`, `addresses`, `orders`, `order_items`, `notification_prefs` — separate tables, FK-linked. JSONB is fine for *truly* schemaless config, not for relational data the AI was too lazy to model.

### 2. Missing indexes
Every query scans the whole table. Works at 100 rows, dies at 100k.

**Fix:**
- Index every FK column. Postgres does NOT do this automatically.
- Index every column you filter or sort on (`WHERE status = ?`, `ORDER BY created_at DESC`).
- Composite indexes for multi-column `WHERE` clauses, in the right column order (most-selective first).
- `EXPLAIN ANALYZE` your slow queries. Look for `Seq Scan` on tables \>10k rows.

### 3. SQLite as default in serverless
Cursor / Lovable / Bolt happily ship SQLite. SQLite stores data in a file. Serverless functions have ephemeral filesystems. **The file gets wiped between cold starts.** Users see their data disappear.

**Fix:** never deploy SQLite to Vercel/Cloudflare/Lambda. Migrate before launch:
- Supabase (Postgres + auth + RLS bundled)
- Neon (Postgres, branchable)
- Turso (SQLite-compatible but actually persistent)
- PlanetScale (MySQL)

Migration prompt: *“Migrate this app from SQLite to Supabase. Keep the schema identical. Generate a migration script. Update the connection code. Add a `.env.example`.”*

### 4. Connection pool exhaustion
Serverless function spawns a new DB client per request. At 100 concurrent requests you have 100 connections. Postgres caps at \~100 by default. Everything 500s.

**Fix:**
- Supabase / Neon: use the **pooler** connection string (port 6543, transaction mode), not the direct one (port 5432).
- Cloudflare Workers: use Hyperdrive or the Supabase JS client (HTTP-based, no pool).
- Long-running Node servers: use `pg-pool` with a sane max (10–20).

### 5. No backup posture
The AI doesn't set up backups. The day you delete a row by mistake is the day you learn this.

**Fix:**
- Supabase: PITR is on by default for paid tiers; verify the retention window.
- Neon: branches *are* your backups, but pin a daily branch you don't touch.
- Anywhere else: scheduled `pg_dump` to S3/R2, retention 30 days minimum.
- Test restoring at least once. Untested backups don't exist.

## RLS is not optional

Covered in detail in [[Vibecoding - IDOR and Authz Patterns]]. One-line summary: if your client uses an anon key (Supabase, Firebase) and you skip RLS, anyone with browser devtools can dump your entire DB. RLS isn't paranoia — it's the price of admission for client-side DB SDKs.

## Migrations as code

The AI will happily edit your DB schema interactively (`ALTER TABLE` in the Supabase studio). This is a trap. You cannot reproduce the schema, cannot review changes, cannot roll back.

**Fix:** every schema change is a migration file in `supabase/migrations/` (or `prisma/migrations`, or wherever your tool puts them). Commit them. Apply via `supabase db push` or equivalent.

Migration files must be:
- **Idempotent** when possible (`create table if not exists`, `do $$ ... if not exists ... end $$`).
- **Forward-only** in production. Never edit a migration after it's been applied.
- **Reviewable** — small, single-purpose. "Add column X to table Y" not "refactor whole schema".

## Concurrency: the read-modify-write trap

The AI writes:

```ts
const { data: row } = await supabase.from('counters').select('value').eq('id', 1).single();
await supabase.from('counters').update({ value: row.value + 1 }).eq('id', 1);
```

Two requests at once = one increment lost. Race condition.

**Fix:** atomic updates server-side.
- Supabase: RPC function with `update counters set value = value + 1 where id = 1`.
- Postgres: `UPDATE ... SET col = col + 1` directly.
- Optimistic locking: `UPDATE ... WHERE id = ? AND version = ?` and check rowcount.

Example: a webhook calls `increment_discount_uses` after a successful event.

## N+1 query patterns

The AI loops over results and queries inside the loop:

```ts
const orders = await supabase.from('orders').select('*');
for (const o of orders) {
  o.items = await supabase.from('order_items').select('*').eq('order_id', o.id);
}
```

100 orders = 101 queries.

**Fix:**
- Supabase: `select('*, order_items(*)')` — single round trip with the join.
- Prisma: `include: { items: true }`.
- Raw SQL: `JOIN` or `IN (...)` with batched ids.

## Soft delete vs hard delete

Hard `DELETE` destroys audit trail. For anything financial (orders, refunds, discount codes used in completed purchases), soft delete:

```sql
alter table bundles add column deleted_at timestamptz;
```

All read paths add `.is('deleted_at', null)`. RLS policies filter the same. FK references use `ON DELETE NO ACTION` so historical purchases keep their bundle reference. Document this invariant in the project plan and regression tests.

Hard delete is fine for: drafts, scratch data, anything with no downstream record.

## Drop-in checklist

- [ ] Schema is normalized — no flat `users` table with everything dumped in
- [ ] Every FK column has an index
- [ ] Every column in `WHERE` / `ORDER BY` has an index
- [ ] No SQLite in production serverless deploys
- [ ] Connection pooler in use (Supabase port 6543, Neon pooler URL, etc.)
- [ ] Backups configured AND restoration tested
- [ ] RLS enabled on every table the client can read with anon key
- [ ] Migrations live in version control, not the studio
- [ ] No read-modify-write counters in app code — use atomic SQL
- [ ] No N+1 queries — joins or batched IN clauses
- [ ] Soft delete on financial / audit-trail tables, hard delete elsewhere

## Related notes

- [[Vibecoding - Things to Check on Your Code]] — full security runbook
- [[Vibecoding - IDOR and Authz Patterns]] — RLS depth
- [[Vibecoding - Secrets and Env Hygiene]] — DB connection strings as secrets
