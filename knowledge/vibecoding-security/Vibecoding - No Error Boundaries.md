---
tags: [security, vibecoding, react, observability]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# No Error Boundaries

## What it looks like
Runtime error → React unmounts → white screen. On commerce sites: lost conversion, no monitoring signal, user has no recovery path. Stack traces sometimes leak via unsanitized error messages.

## Why AI generates it
`error.tsx` / `global-error.tsx` / ErrorBoundary classes are framework-specific and rarely demoed. Models default to happy-path components.

## Fix
- `app/global-error.tsx` + `app/error.tsx` at minimum
- Per-route-group boundaries for distinct recovery flows (checkout vs admin)
- `'use client'` + `unstable_retry` (Next 16) + `console.error` for Sentry capture
- Branded recovery copy with contextual CTA
