---
tags: [security, vibecoding, checklist, runbook]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Audit Checklist

Practitioner checklist for any vibe-coded app before prod.

## Dependencies
- [ ] `pnpm audit` returns 0 critical/high
- [ ] Lockfile present and committed
- [ ] No deprecated packages flagged

## Headers
- [ ] `curl -sI` shows Content-Security-Policy
- [ ] Strict-Transport-Security with preload
- [ ] X-Frame-Options DENY
- [ ] X-Content-Type-Options nosniff
- [ ] Referrer-Policy strict-origin-when-cross-origin
- [ ] Permissions-Policy configured

## Secrets
- [ ] `grep -rE '(VITE_|NEXT_PUBLIC_).*(KEY|SECRET|TOKEN)' src/` is empty
- [ ] No hardcoded JWT secrets
- [ ] Service-role keys server-only

## Randomness
- [ ] `grep -rn 'Math.random' src/` near `token|invoice|reset|session` returns 0

## Database
- [ ] Every public table has `enable row level security`
- [ ] At least one explicit policy per table
- [ ] SECURITY DEFINER functions: `set search_path = ''` + internal auth check OR `revoke execute from public`

## Webhooks
- [ ] Stripe / GitHub / Clerk handlers verify signature before parsing
- [ ] `STRIPE_WEBHOOK_SECRET` required at boot, not optional
- [ ] Refund / dispute / failure events handled

## API routes
- [ ] Every route has Zod validation
- [ ] Rate limit applied (per-IP or per-user)
- [ ] Auth guard present
- [ ] Generic error responses, no stack traces

## Auth
- [ ] OAuth `next` validated: `startsWith('/') && !startsWith('//')`
- [ ] Per-page admin guards (defense-in-depth)
- [ ] Password reset rate-limited

## Resilience
- [ ] `error.tsx` / `global-error.tsx` exist; trigger one error to verify
- [ ] `/api/health` reports DB + storage + queue (not static `ok`)
- [ ] Soft delete on financial / user-content tables
- [ ] Inngest / job queues have onFailure handlers

## LLM-specific
- [ ] User input not concatenated into system prompt
- [ ] LLM output never `eval`'d or used as code
- [ ] Tool-use sandboxed with allowlist
