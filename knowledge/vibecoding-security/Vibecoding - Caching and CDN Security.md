---
tags: [security, vibecoding, caching, cdn, cache-poisoning]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Caching and CDN Security

Caching is where authenticated and unauthenticated content collide and the wrong user sees the wrong page. Vibecoded apps with a CDN in front routinely ship cache-key configs that leak data across users.

## Auth-bleed via shared cache

- **Symptom.** Logged-in user A loads `/dashboard`. CDN caches the HTML. Logged-in user B (or worse, anon) loads the same URL and sees A's data.
- **Cause.** Cache key didn't include the auth identity (cookie, header, or query). CDN treated all requests as equivalent.
- **Fix.**
  - Authenticated responses: `Cache-Control: private, no-store` OR explicitly key by user.
  - `Vary: Cookie` only if the cookie is part of the cache key — most CDNs ignore Vary.
  - Use CDN-native cache key customization (Cloudflare cache rules, Vercel `s-maxage` + `private`).
  - Server-rendered pages with user data are NOT cacheable on the CDN. Pre-render only what's truly public.

## Cache poisoning

- Attacker sends a malformed header that becomes part of the cache key without being part of normal requests.
- Classic: `X-Forwarded-Host` poisoning where reflected in the response.
- Fix: known headers in the cache key, strip everything else at the edge.
- Don't reflect arbitrary request headers in responses unless intentional.

## Stale-while-revalidate gotchas

- SWR + auth → stale auth response served while a fresh one is fetched. Verify SWR is not on authenticated paths.
- SWR on signed URLs may serve URLs after they've been revoked.

## CDN config

- Default deny: only explicitly-allowed paths cached.
- Different cache TTLs per path family. Static assets long, HTML short, API zero.
- Bypass cache on `Cookie: session=*` for routes that read sessions.
- Purge process documented and tested. After a sensitive deploy, you need to be able to invalidate immediately.

## Browser caching of sensitive responses

- API responses: `Cache-Control: no-store` for any response containing user data.
- Logout: invalidate browser-cached HTML by setting `Clear-Site-Data: cache, cookies, storage` on the logout response.

## CDN as a WAF

- CDN-level rules: bot management, geo-blocking, OWASP managed ruleset, rate limiting.
- IP reputation lists.
- Origin shielding so attackers can't bypass the CDN by hitting your origin IP directly. Lock origin ingress to CDN IP range only.

## CDN signed URLs

- Used for private content delivery (uploads, downloads, video).
- Short TTL. Tied to the requesting IP where possible.
- Don't use the same signing key for years; rotate.
- Don't put sensitive params in the signed URL beyond what's necessary.

## Image / asset CDNs

- Some CDNs run user-supplied transformations (resize, format). SSRF via referer/origin headers if not careful.
- Image proxies: fetch through a sanitized proxy, never the user's browser pulling from arbitrary origins (privacy + SSRF).

## Quick checks

- Curl an authenticated page anonymously. Must NOT return cached private content.
- Inspect `Cache-Control` on every endpoint family (static, HTML, API, auth).
- Test purge: deploy a change, verify CDN serves new content within expected window.
- Lock down origin: from a non-CDN IP, can you hit `https://origin.example.com`? Must be no.

## Related

- [[Vibecoding - Zero Security Headers]]
- [[Vibecoding - API Design Security CORS Versioning]]
- [[Vibecoding - Things to Check on Your Code]]
