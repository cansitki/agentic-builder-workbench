---
tags: [security, vibecoding, oauth, owasp-a07]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Open Redirects

## What it looks like
OAuth callback or login flow accepts `?next=//evil.com` and redirects there post-auth. Protocol-relative URLs bypass naive `startsWith('/')` checks. Phishing payload sent via legitimate-looking `yoursite.com/login?next=//evil.com`.

## Why AI generates it
`next/router.push(searchParams.next)` is a common idiom. Validation requires distinguishing `/path` (safe) from `//host` (off-origin) — non-obvious to a model that thinks of URLs as strings.

## Fix
```js
const safeDest = next.startsWith('/') && !next.startsWith('//') ? next : '/'
```
Or use an allowlist of paths.
