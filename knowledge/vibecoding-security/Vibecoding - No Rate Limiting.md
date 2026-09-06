---
tags: [security, vibecoding, abuse, owasp-a04]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# No Rate Limiting

## What it looks like
Auth, password reset, checkout, file upload all unbounded. Credential stuffing, coupon-code brute force, R2/S3 bandwidth abuse, SMS toll fraud on Twilio-backed reset flows.

In-memory counters that reset on worker restart — useless under serverless.

## Why AI generates it
Rate limiting requires picking a backend (Upstash, Redis, durable-objects). Models default to in-memory or skip entirely.

## Fix
- Upstash Ratelimit / Cloudflare Rate Limiter on every public mutating endpoint
- `Retry-After` header on 429
- Per-IP for unauth flows, per-user-id for auth flows
- Aggressive limits on auth (5/min) and password reset (3/hour)
