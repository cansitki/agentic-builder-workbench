---
tags: [security, vibecoding, antipattern, owasp-a01]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Client-Side Authentication

## What it looks like
Login flow runs in the browser — password check in JavaScript, role flag in localStorage. View-source is the exploit. Hardcoded admin emails compared client-side. JWT decoded but not verified.

## Why AI generates it
Lovable/Bolt scaffolds spin up React+Supabase apps with auth glued in the frontend. The model averages toward demo-grade tutorials where the contrast between *authenticated UI* and *authorized request* never gets drawn.

## Real-world manifestation
- Base44 platform (2025): single misconfigured auth endpoint exposed every project — fixed only after disclosure.
- Lovable apps: `if (user.email === 'admin@example.com')` checks in client components routing to /admin.

## Fix
- Server-side session verification on every protected route
- Authorization derived from server-trusted source (RLS policy, server function, signed claim)
- Never trust `user.role` from a JWT without verifying signature server-side
