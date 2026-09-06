---
tags: [vibecoding, security, supabase, rls]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Supabase RLS — Audit Patterns Beyond "Enable RLS"

**Enabling RLS is necessary but not sufficient. The next layer of failure: `USING (true)` policies, missing INSERT/UPDATE/DELETE policies, JWT user_metadata trust, missing indexes on policy columns, and SECURITY DEFINER functions that bypass policies entirely.**

## The next-level misconfigurations
After "RLS enabled," these are what audits actually find:

### 1. `USING (true)` policies
```sql
CREATE POLICY "Users can insert" ON user_profiles FOR INSERT USING (true);
```
Allows everyone. Reads as "users can insert" but enforces nothing. The most common AI-generated mistake — the model writes a policy because it knows it should, but doesn't know the predicate language.

### 2. Missing INSERT / UPDATE / DELETE policies
RLS denies by default when no policy matches. AI-generated code often writes a SELECT policy and stops. Result: SELECT-only tables. Worse — when WITH CHECK is missing on UPDATE, anyone with row visibility can change any column.

**Rule:** every table with RLS needs explicit policies for SELECT, INSERT, UPDATE, DELETE. Always include `WITH CHECK` on INSERT and UPDATE.

### 3. JWT `user_metadata` trust
```sql
USING (auth.jwt() ->> 'role' = 'admin')  -- WRONG
```
`user_metadata` is **client-modifiable**. An authenticated end user can update their own metadata via the Supabase client. Use `app_metadata` (admin-only) or `auth.uid()` joined to a server-controlled `user_roles` table.

### 4. Missing indexes on policy columns
RLS is enforced by adding the policy predicate to every query. If `user_id` isn't indexed, every query is a sequential scan multiplied by RLS. **Top performance killer in production Supabase apps.**

### 5. SECURITY DEFINER bypass
A function marked `SECURITY DEFINER` runs as the function owner (typically postgres role) — bypassing RLS entirely. If exposed via PostgREST and not REVOKE'd from anon/authenticated, any client can call it. See [[Vibecoding - SECURITY DEFINER Footguns]].

### 6. JOIN-based RLS bypass
Subselect through a related table without RLS:
```sql
SELECT * FROM messages
WHERE thread_id IN (SELECT id FROM threads WHERE owner = auth.uid());
```
If `threads` has RLS but the subselect runs as service role somewhere, RLS on `messages` is moot. Audit every cross-table query path.

### 7. Storage bucket policies
**Separate from table RLS.** Buckets have their own policy system. Vibe-coded apps frequently miss this — uploaded files are world-readable even when the metadata table is locked.

## Audit checklist (for an existing Supabase app)
1. Every table in `public` schema has `enable row level security` (`SELECT * FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity`)
2. Every table has explicit policies for SELECT/INSERT/UPDATE/DELETE (query `pg_policies`)
3. Zero policies with `USING (true)` or `WITH CHECK (true)`
4. Zero references to `auth.jwt() ->> 'user_metadata'` in policies
5. Every column referenced in policies has an index
6. Every SECURITY DEFINER function has `SET search_path = ''` and either internal `auth.uid()` checks or `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`
7. Every storage bucket has explicit policies
8. Build a pgTAP test suite that asserts a non-owner cannot read/write rows it shouldn't

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - RLS Disabled or Permissive]]
- [[Vibecoding - SECURITY DEFINER Footguns]]
- [[Vibecoding - Case Study Lovable RLS CVE]]

## Sources
- [10 Common Supabase Security Misconfigurations (ModernPentest)](https://modernpentest.com/blog/supabase-security-misconfigurations)
- [Supabase RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Complete Guide to Supabase RLS (AuditYourApp)](https://www.audityour.app/guides/supabase-rls-complete-guide)
- [Row-Level Recklessness (Precursor Security)](https://www.precursorsecurity.com/blog/row-level-recklessness-testing-supabase-security)
- [Securing Supabase API](https://supabase.com/docs/guides/api/securing-your-api)