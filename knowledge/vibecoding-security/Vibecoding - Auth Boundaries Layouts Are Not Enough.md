---
tags: [security, vibecoding, auth, nextjs, framework-pitfalls]
parent: "[[Vibecoding Security Research - Index]]"
related: ["[[Vibecoding - Client-Side Authentication]]", "[[Vibecoding - No Authorization on Endpoints]]", "[[Vibecoding - Authorization Depth IDOR BOLA]]"]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Auth Boundaries — Layouts Are Not Enough

## The trap

In Next.js App Router (and similar RSC frameworks), `layout.tsx` looks like a security boundary but isn't one. Two failure modes:

1. **Streaming / partial prerendering** — page content can render alongside the layout's `redirect()`, so an unauthenticated visitor gets a brief flash of dashboard chrome before the redirect resolves. Scrapers and link previews see the full payload.
2. **Middleware bypass** — CVE-2025-29927 (March 2025) let attackers skip Next.js middleware by spoofing `x-middleware-subrequest`. Patched, but the lesson stuck: middleware-only auth is fragile.

The framework will not stop you from writing a "secure" route that leaks under load.

## Three-layer rule

Treat any route that requires login as needing checks at **route, page, and data**:

- **Route / layout** — first line, redirects unauthenticated users, sets up shared chrome.
- **Page** — re-checks auth in the page component itself. Catches layout drift, new route groups added without a guard, and streaming-order issues.
- **Data** — RLS (Postgres / Supabase) or equivalent at the database. Even if UI renders, queries return empty for `auth.uid() IS NULL`. This is what saves you when the first two layers fail.

## What to check

- [ ] Every protected segment has BOTH a layout guard AND a page-level guard
- [ ] `'use client'` dashboards do not fetch sensitive data on mount before an auth round-trip
- [ ] Loading skeletons / fallbacks do not reveal user-specific info (names, balances, lists)
- [ ] Middleware is never the only auth check (CVE-2025-29927 lesson)
- [ ] RLS is on for every table read by an authenticated UI; RLS policies tested with `auth.uid() IS NULL`
- [ ] New route groups added via PR review checklist must explicitly state which layer enforces auth
- [ ] Admin routes have an extra `is_admin` (or equivalent) check at BOTH layout and page
- [ ] Prefetch / link-rel-prerender does not leak protected pages to logged-out crawlers
- [ ] Error boundaries inside protected segments do not bypass the redirect (a thrown error during auth check should fail closed, not render the page)

## How this fails in practice

- Engineer adds `(reports)` route group, copies `(dashboard)/layout.tsx`, forgets the `getUser` call. Page-level guard catches it.
- Engineer adds page-level guard, forgets RLS on the new table. Layout + page catch it for the dashboard, but a sibling API route reading the same table from elsewhere leaks.
- Engineer enables PPR (partial prerendering) on a page expecting the layout guard to redirect first. Streaming reorders, dashboard flashes.
- Engineer caches a protected page at the CDN. CDN serves it to logged-out users. (Pair with [[Vibecoding - Caching and CDN Security]].)

The pattern: **defense in depth, every layer assumes the others will fail, RLS is the floor.**
