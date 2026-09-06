---
tags: [security, vibecoding, csprng, owasp-a02]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Math.random for Security IDs

## What it looks like
- Invoice numbers: `Math.random().toString(16).slice(2,6)`
- Password reset tokens
- Session IDs
- Magic link tokens

`Math.random()` is not cryptographically secure. Birthday collision ≈ 50% at √N. With 4 hex chars (~65K values), collisions begin at ~256 invoices.

## Why AI generates it
`Math.random()` is the universal random in JS tutorials. The model doesn't separate "random for shuffling" from "random for security."

## Fix
- `crypto.randomUUID()` for IDs (Node 19+, all browsers)
- `crypto.getRandomValues(new Uint8Array(32))` for raw bytes
- Server-side only for security-sensitive randomness
