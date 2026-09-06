---
tags: [security, vibecoding, headers, owasp-a05]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Zero Security Headers

## What it looks like
`curl -sI yoursite.com` returns no CSP, no X-Frame-Options, no HSTS, no X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy. Site embeddable in iframe → clickjacking. Mixed content. MIME sniffing exploits.

## Why AI generates it
Headers are platform config (next.config.ts, vercel.json, nginx). Outside the model's typical edit scope.

## Fix (Next.js)
```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
}
```
