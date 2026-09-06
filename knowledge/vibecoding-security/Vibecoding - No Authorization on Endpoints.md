---
tags: [security, vibecoding, authz, owasp-a01]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# No Authorization on Endpoints

## What it looks like
- `/api/admin/users` returns data without checking `is_admin()`
- `/api/listings/[id]` lets anyone update any listing (no owner check)
- Layout-level auth gate present, but per-route gates absent → API routes wide open
- IDOR (Insecure Direct Object Reference): `/api/orders/123` returns anyone's order

## Why this is now the dominant bug class
AI no longer mistypes — it forgets to check who's asking. Privilege-escalation and architectural-flaw growth rates: see [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]].

## Why AI generates it
Demos rarely show authorization. Tutorial `getUserById` returns the user; the model writes the same shape for `getOrderById`, `getListingById`, `getInvoiceById` without reasoning about ownership.

## Fix
- Every server action / route handler: `const user = await getUser(); if (!user) return 401`
- Resource-level: `if (resource.owner_id !== user.id) return 403`
- Defense-in-depth: page guard + RLS + API guard
- Audit harness: enumerate every route, assert authn middleware
