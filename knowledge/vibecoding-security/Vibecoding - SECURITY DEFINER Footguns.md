---
tags: [security, vibecoding, postgres, supabase, owasp-a01]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# SECURITY DEFINER Footguns

## What it looks like
Postgres function declared `SECURITY DEFINER` to bypass RLS — without internal `auth.uid()` checks. Exposed via PostgREST. Any authenticated user calls it directly and reaches admin-only state transitions.

Plus: missing `SET search_path = ''`. Attacker creates a schema with a malicious `similarity()` shadowing the real one and triggers it via SQL injection vector.

## Real exposure
`transition_listing_status` / `transition_dispute_state` patterns found in dozens of Supabase scaffolds — anyone can reject listings or resolve disputes via REST.

## Why AI generates it
Supabase examples use SECURITY DEFINER liberally (it's the simplest way to write triggers and aggregates). Internal auth checks aren't in the examples.

## Fix
- `set search_path = ''` on every DEFINER function; schema-qualify everything as `public.x`
- Internal: `if auth.uid() <> owner_id and not is_admin() then raise exception`
- For service-role-only functions: `revoke execute from authenticated, anon`
- pgTAP test: switch role to `authenticated`, call function, assert error
