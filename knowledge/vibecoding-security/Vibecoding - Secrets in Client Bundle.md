---
tags: [security, vibecoding, secrets, owasp-a02]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Secrets in Client Bundle

## What it looks like
- `VITE_STRIPE_SECRET_KEY`, `NEXT_PUBLIC_OPENAI_API_KEY` — public prefix exposes server secrets in JS bundle
- Service-role Supabase keys hardcoded in React components
- JWT signing secrets like `'supersecretjwt'` baked in
- Firebase admin SDK config exposed because model didn't distinguish admin vs web SDK

## Why AI generates it
Models can't reliably tell which env prefixes are public. Frontend frameworks (Vite, Next.js) require a public prefix for client-readable vars; the model treats it as decoration.

## Real-world numbers
- Escape.tech sweep: see [[Vibecoding - Case Study Bolt and Multi-Platform Scans]]
- AI-vs-human leak rate: see [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]
- Wiz: 1 in 5 vibe-coded apps shipped with at least one credential leak

## Fix
- Stripe / OpenAI / etc keys ALWAYS server-side only
- Use Supabase `anon` key client-side; `service_role` server-only
- Pre-commit hook: grep `(VITE_|NEXT_PUBLIC_).*(KEY|SECRET|TOKEN)` → block
- Rotate any key ever shipped to a client bundle
