---
tags: [security, vibecoding, checklist, runbook, audit]
date: 2026-04-28
last-updated: 2026-04-29
version: 2.0
parent: [[Vibecoding Security Research - Index]]
license: [[LICENSE]]
---

# Things to Check on Your Code

The pre-prod checkbook for vibecoded apps. Distilled from 80+ atomic notes, real CVEs, and incident write-ups. Use top-to-bottom on any AI-generated app before prod. Each section links the deep-dive note that explains the why.

**Tag legend:**

- 🔴 **Critical** — ship-blocker. If this is wrong, you have a vulnerability today.
- 🟡 **Important** — exploitable under common conditions; fix before launch or shortly after.
- 🟢 **Hardening** — defense in depth, hygiene, or future-proofing.
- ⏱ `5min` / `1h` / `1d` — rough fix-effort estimate per item.

**Stack assumption:** snippets target Next.js 14+ App Router, Supabase, Stripe — the dominant Lovable/Bolt/v0/Cursor stack. Patterns generalize; ports are noted where they differ meaningfully.

> **Scope:** application + infra + ops + org + process. Working hygiene, not a SOC 2 control set or a substitute for a real pen test. See [[#What this doesn't cover]] at the end.

The numbers behind why this list exists: 45% Veracode fail rate, 4× velocity → 10× vulnerabilities (Apiiro), 28.6M leaked secrets (GitGuardian), 20% hallucinated packages (CSA). See [[Vibecoding Security Research - Index]] for sources.

---

## ⚡ 1-Hour Fast Pass

If your app is shipping tonight and you have one hour, do these ten in order. They're the items that, when wrong, are most likely to be exploited within the first week of public traffic.

1. 🔴 ⏱5min — `grep -rE '(VITE_|NEXT_PUBLIC_|REACT_APP_).*(KEY|SECRET|TOKEN|PASSWORD)' src/` returns 0
2. 🔴 ⏱5min — `git log --all --full-history -- '*.env*'` is empty; run TruffleHog or Gitleaks on full history
3. 🔴 ⏱10min — RLS enabled on every public table; no `using (true)` policies on tables holding other users' data
4. 🔴 ⏱5min — Every webhook handler verifies signature **before** parsing body
5. 🔴 ⏱10min — Every API route has an auth guard before any DB read/write; no `if (user.role === 'admin')` in client code
6. 🔴 ⏱5min — OAuth `next` / `redirect_to` validated: `startsWith('/') && !startsWith('//')` AND no `\` byte
7. 🔴 ⏱5min — Tokens, invoice numbers, reset codes use `crypto.randomUUID()` — not `Math.random()`
8. 🟡 ⏱10min — Security headers present (`curl -sI`): CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
9. 🟡 ⏱5min — Rate limit on auth endpoints (login, signup, reset, magic-link) per-IP and per-email
10. 🟡 ⏱5min — `error.tsx` exists at `app/` root; `/api/health` returns real DB status, not static `{ ok: true }`

If any of these fails, fix it before reading the rest of the document. Then come back top-to-bottom for full coverage.

---

## A — Application Security

### 1. Auth & Authorization
See [[Vibecoding - Client-Side Authentication]], [[Vibecoding - No Authorization on Endpoints]], [[Vibecoding - Authorization Depth IDOR BOLA]], [[Vibecoding - Case Study Base44 Auth Flaw]], [[Vibecoding - Case Study Lovable RLS CVE]].

> **If you do nothing else:** put the auth check on the server, in every route. Client checks are UX, not security.

- [ ] 🔴 ⏱5min — No `if (user.role === 'admin')` in client code; server enforces every gate
- [ ] 🔴 ⏱30min — Every API route has an auth guard before any DB read/write or external call
- [ ] 🔴 ⏱30min — Per-page admin guards on every admin route (defense-in-depth, not just middleware)
- [ ] 🔴 ⏱15min — No `select('*')` on tables with other users' data without `.eq('user_id', ...)` or RLS
- [ ] 🟡 ⏱10min — Session checks server-side on every request, not once at login
- [ ] 🔴 ⏱15min — Magic-link / signup don't accept arbitrary email confirmation tokens (Base44 pattern)
- [ ] 🔴 ⏱30min — BOLA: every `GET /resource/:id` checks ownership, not just authentication
- [ ] 🔴 ⏱15min — BFLA: every admin endpoint enforces role at the handler, not just middleware
- [ ] 🟡 ⏱10min — Mass-assignment guarded: Zod `.strict()`; no `update(...req.body)` on user input
- [ ] 🟡 ⏱15min — Multi-tenant queries scoped by both `tenant_id` AND `user_id` where both apply

**Paste-ready: Next.js App Router server-side auth guard**

```ts
// src/lib/auth/require-user.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
}

export async function requireAdmin() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, supabase };
}
```

Use at the top of every protected page AND every API route — never trust the layout alone (see §1A).

### 1A. Auth Boundaries (Framework-Level)
See [[Vibecoding - Auth Boundaries Layouts Are Not Enough]].

Layouts are not security boundaries. RSC streaming can render page content alongside a layout's redirect, and middleware-only auth was bypassable in Next.js until CVE-2025-29927. Treat protected routes as needing checks at three layers: route, page, data.

- [ ] 🔴 ⏱30min — Every protected segment has BOTH a layout guard AND a page-level guard
- [ ] 🔴 ⏱5min — Middleware is never the sole auth check on a route
- [ ] 🔴 ⏱30min — RLS (or equivalent row-level filter) is the data-layer floor
- [ ] 🟡 ⏱10min — Loading skeletons / Suspense fallbacks don't leak user info before auth resolves
- [ ] 🟡 ⏱10min — `'use client'` dashboards don't fetch sensitive data on mount without auth round-trip
- [ ] 🟢 ⏱30min — PPR / streaming reviewed for redirect-vs-render ordering on every protected page
- [ ] 🟡 ⏱10min — Prefetch / link-rel-prerender don't expose protected pages to logged-out crawlers
- [ ] 🔴 ⏱15min — Admin routes enforce role at layout AND page
- [ ] 🟡 ⏱15min — Error boundaries in protected segments fail closed (thrown error redirects, doesn't render)
- [ ] 🟢 ⏱5min — PR review checklist requires every new protected route group to state which layer enforces auth

### 2. Database / RLS
See [[Vibecoding - RLS Disabled or Permissive]], [[Vibecoding - SECURITY DEFINER Footguns]], [[Vibecoding - Supabase RLS Audit Patterns]].

> **If you do nothing else:** turn RLS on, and write at least one explicit policy per table. `using (true)` is not a policy.

- [ ] 🔴 ⏱5min — Every public table: `alter table X enable row level security`
- [ ] 🔴 ⏱30min — Every table has at least one explicit policy (no permissive `using (true)`)
- [ ] 🔴 ⏱15min — No anon-readable tables holding PII, payment data, or other users' content
- [ ] 🔴 ⏱10min — SECURITY DEFINER functions: `set search_path = ''` AND schema-qualify every reference
- [ ] 🔴 ⏱10min — SECURITY DEFINER functions: internal `auth.uid()` check OR `revoke execute from public, authenticated`
- [ ] 🟡 ⏱10min — RPCs callable by anon are explicitly intended (none of the counter/increment ones)
- [ ] 🟢 ⏱30min — `as never` casts and untyped admin clients tracked, not load-bearing in security paths
- [ ] 🟡 ⏱30min — Joined queries tested cross-tenant — RLS holds across joins, not just base tables

**Paste-ready: Supabase RLS starter (per-user owned table)**

```sql
-- Replace `notes` with your table name. user_id must reference auth.users(id).
alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using (auth.uid() = user_id);

-- Soft-delete-aware variant: filter where applicable.
-- using (auth.uid() = user_id and deleted_at is null)
```

**Paste-ready: SECURITY DEFINER function template (no search_path injection)**

```sql
create or replace function public.increment_view(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''        -- empty, not 'public'
as $$
begin
  -- Authorization check inside the function body.
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;

  update public.listings
     set view_count = view_count + 1
   where id = listing_id;
end;
$$;

revoke execute on function public.increment_view(uuid) from public;
grant  execute on function public.increment_view(uuid) to authenticated;
```

### 3. Cryptography & Key Management
See [[Vibecoding - Cryptography and Key Management]].

- [ ] 🔴 ⏱30min — Passwords hashed with argon2id or bcrypt cost ≥ 12 — not MD5 / SHA1 / raw SHA256
- [ ] 🔴 ⏱30min — Symmetric encryption is AES-256-GCM with fresh nonce per message (never ECB / CBC-without-MAC)
- [ ] 🔴 ⏱15min — JWT verify pins one algorithm: `verify(token, key, { algorithms: ['EdDSA'] })`. No `decode()`
- [ ] 🔴 ⏱5min — No JWT `alg: none` accepted; no HS256 accepted where RS256 is issued
- [ ] 🟡 ⏱1d — Long-lived secrets in KMS / Vault / 1Password — not in `.env` or CI vars
- [ ] 🟡 ⏱1d — At-rest encryption for OAuth refresh tokens, third-party API tokens, sensitive PII
- [ ] 🟢 ⏱1d — Key rotation cadence documented; signed artifacts carry `kid` for dual-key window

### 4. Secrets & Config
See [[Vibecoding - Secrets in Client Bundle]], [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]].

> **If you do nothing else:** grep for `NEXT_PUBLIC_*KEY`, scan git history for committed `.env`. These two find ~80% of disaster-tier leaks in vibecoded apps.

- [ ] 🔴 ⏱5min — `grep -rE '(VITE_|NEXT_PUBLIC_|REACT_APP_).*(KEY|SECRET|TOKEN|PASSWORD)' src/` returns 0
- [ ] 🔴 ⏱5min — No service-role keys, JWT secrets, or DB URLs in any client-bundled file
- [ ] 🔴 ⏱5min — `.env*` in `.gitignore`; `git log --all --full-history -- '*.env*'` is empty
- [ ] 🔴 ⏱15min — Critical env vars (`STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`) **required** at boot — not optional in Zod schema
- [ ] 🟡 ⏱10min — No secrets in build-time inlined config (`next.config.ts` env, Vite `define`)
- [ ] 🔴 ⏱10min — Run TruffleHog / Gitleaks over the full git history, not just HEAD
- [ ] 🟢 ⏱15min — No secrets in container image labels, build args, or Docker layers

**Paste-ready: env validator that fails boot on missing critical secrets**

```ts
// src/lib/env.ts
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  // Server-only — required, never NEXT_PUBLIC_-prefixed.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  JWT_SECRET: z.string().min(32),
  // Public — fine to expose, but still validated.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid env:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}
export const env = parsed.data;
```

**Paste-ready: `.env.example` with comments**

```bash
# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                # Public, safe in browser. RLS-gated.
SUPABASE_SERVICE_ROLE_KEY=eyJ...                    # SERVER ONLY. Bypasses RLS. Never in NEXT_PUBLIC_*.

# === STRIPE ===
STRIPE_SECRET_KEY=sk_test_...                       # SERVER ONLY.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...      # Public, safe in browser.
STRIPE_WEBHOOK_SECRET=whsec_...                     # SERVER ONLY. Required for /api/webhooks/stripe.

# === AUTH ===
JWT_SECRET=                                         # 32+ random bytes. Generate with: openssl rand -hex 32

# === SENTRY (recommended) ===
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

### 5. Webhooks
See [[Vibecoding - Missing Webhook Verification]], [[Vibecoding - Missing Refund Handlers]], [[Vibecoding - Race Conditions and Concurrency]].

> **If you do nothing else:** verify the signature on the raw body, before any JSON parse. Then handle `charge.refunded`.

- [ ] 🔴 ⏱10min — Every webhook verifies signature **before** parsing body (Stripe, GitHub, Clerk, Inngest)
- [ ] 🔴 ⏱5min — Webhook secrets are required env vars, not optional
- [ ] 🔴 ⏱30min — Stripe handler covers: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`, `account.updated`, `payment_intent.payment_failed`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] 🔴 ⏱30min — Refunds revoke entitlements + invalidate download tokens + flip purchase status
- [ ] 🟡 ⏱30min — Idempotency: handler safe to receive same event twice (`processed_events` table or DB unique constraint)
- [ ] 🟡 ⏱5min — Webhook timestamp validated; replay window ≤ 5 minutes

**Paste-ready: Stripe webhook handler (Next.js App Router, signature-verified, idempotent)**

```ts
// src/app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  // CRITICAL: read raw body BEFORE any JSON parse.
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`signature verification failed: ${err}`, { status: 400 });
  }

  // Idempotency: insert event id; on conflict, we've already processed it.
  const { error: dupErr } = await supabaseAdmin
    .from("processed_stripe_events")
    .insert({ id: event.id });
  if (dupErr?.code === "23505") return new Response("already processed", { status: 200 });
  if (dupErr) return new Response("idempotency check failed", { status: 500 });

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "charge.refunded":
      await handleRefund(event.data.object as Stripe.Charge);
      break;
    case "charge.dispute.created":
    case "charge.dispute.closed":
      await handleDispute(event.data.object as Stripe.Dispute);
      break;
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account);
      break;
    // ...add the rest from the checklist
    default:
      // Unhandled event types — log but ack so Stripe doesn't retry.
      console.warn("[stripe] unhandled event", event.type);
  }
  return new Response("ok", { status: 200 });
}
```

```sql
-- Companion table for idempotency.
create table if not exists public.processed_stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);
```

### 6. Input Validation & Output
See [[Vibecoding - No Input Validation]], [[Vibecoding - Backend Code Execution Bugs]].

- [ ] 🔴 ⏱30min — Every API route + server action validates input with Zod — not just TypeScript types
- [ ] 🔴 ⏱5min — No `eval`, `Function()`, `new Function`, or template-string-to-shell anywhere
- [ ] 🔴 ⏱5min — LLM output never `eval`'d, `exec`'d, or written to disk as code
- [ ] 🔴 ⏱15min — No string interpolation into SQL, shell, or path operations
- [ ] 🔴 ⏱15min — HTML/Markdown user content sanitized before render (DOMPurify, rehype-sanitize)
- [ ] 🟡 ⏱5min — No reflection of arbitrary request headers in responses (cache-poisoning vector)
- [ ] 🟡 ⏱5min — Server-side validation is the source of truth — client validation is UX only

**Paste-ready: Zod-validated API route**

```ts
// src/app/api/listings/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";

const CreateListing = z.object({
  title: z.string().min(1).max(120),
  price_cents: z.number().int().min(0).max(10_000_00),
  description: z.string().max(5000),
}).strict(); // reject unknown fields → mass-assignment guard

export async function POST(req: Request) {
  const { user, supabase } = await requireUser();

  const json = await req.json().catch(() => null);
  const parsed = CreateListing.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("listings")
    .insert({ ...parsed.data, user_id: user.id }); // explicit user_id
  if (error) return NextResponse.json({ error: "db error" }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

### 7. File Upload & Storage
See [[Vibecoding - File Upload Storage Security]].

- [ ] 🔴 ⏱15min — Server checks magic bytes (`file-type`), not just extension or `Content-Type`
- [ ] 🔴 ⏱10min — Upload size limit enforced at presigned URL AND in complete handler (HEAD `Content-Length`)
- [ ] 🔴 ⏱10min — Object keys are random UUIDs, never user-supplied filenames
- [ ] 🟡 ⏱1d — User content served from a separate origin (`usercontent.example.com`)
- [ ] 🟡 ⏱5min — `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff` on user content
- [ ] 🟡 ⏱15min — SVG / HTML uploads sanitized or re-rendered to raster
- [ ] 🟡 ⏱15min — Decompression-bomb guards on ZIP / TAR (max files, max bytes, timeout)
- [ ] 🔴 ⏱30min — Remote-fetch features deny private IP ranges (RFC 1918, 169.254/16, ::1, fc00::/7) — SSRF guard
- [ ] 🟡 ⏱1d — Malware scanning on uploads (ClamAV / cloud-native); quarantine until clean
- [ ] 🔴 ⏱30min — Authorization on every download — URL-as-secret is not enough for sensitive content

### 8. Rate Limiting & Abuse
See [[Vibecoding - No Rate Limiting]], [[Vibecoding - API Design Security CORS Versioning]].

- [ ] 🔴 ⏱30min — Per-route + per-user rate limit on every mutation endpoint
- [ ] 🔴 ⏱15min — Auth endpoints (login, signup, reset, magic-link) rate-limited per-IP and per-email
- [ ] 🔴 ⏱10min — Counter/increment RPCs not callable unbounded by anon
- [ ] 🟡 ⏱30min — Expensive read endpoints (search, autocomplete, exports) bucketed
- [ ] 🟡 ⏱5min — Webhooks have no rate limit but DO have idempotency
- [ ] 🟢 ⏱5min — 429 responses include `Retry-After`; never silent-drop
- [ ] 🟡 ⏱30min — Bot challenge (Turnstile / hCaptcha) on signup, comment, voting
- [ ] 🟢 ⏱30min — Per-API-key rate limits with abuse signals

**Paste-ready: rate-limit middleware (Upstash Redis)**

```ts
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),  // 5 / minute / IP
  prefix: "rl:auth",
});

export const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:write",
});

export async function rateLimit(req: Request, limiter: Ratelimit) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { success, reset } = await limiter.limit(ip);
  if (!success) {
    return new Response("rate limited", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
    });
  }
  return null; // proceed
}

// Usage in any route handler:
//   const limited = await rateLimit(req, authLimiter); if (limited) return limited;
```

### 9. Open Redirects & URL Handling
See [[Vibecoding - Open Redirects]].

- [ ] 🔴 ⏱5min — OAuth `next` / `redirect_to` validated: `startsWith('/') && !startsWith('//')` AND no `\` byte
- [ ] 🔴 ⏱5min — No `new URL(userInput, origin)` without explicit host check on the result
- [ ] 🔴 ⏱10min — Email-link tokens single-use and short-TTL
- [ ] 🟡 ⏱5min — No protocol-relative URL accepted as a redirect target
- [ ] 🟡 ⏱10min — Login / logout redirects on allowlist of internal paths

**Paste-ready: safe internal-redirect helper**

```ts
// src/lib/safe-redirect.ts
const FALLBACK = "/";

/** Returns a path safe to pass to `redirect()` or `Location:` headers. */
export function safeRedirect(input: string | null | undefined): string {
  if (!input) return FALLBACK;
  // Reject protocol-relative (//evil.com), backslash tricks (\\evil.com), and absolute URLs.
  if (!input.startsWith("/")) return FALLBACK;
  if (input.startsWith("//") || input.startsWith("/\\")) return FALLBACK;
  if (input.includes("\\")) return FALLBACK;
  // Optional: enforce allowlist of known prefixes.
  // const ALLOWED = ["/dashboard", "/account", "/listings"];
  // if (!ALLOWED.some(p => input === p || input.startsWith(p + "/"))) return FALLBACK;
  return input;
}
```

### 10. Cryptographic Randomness
See [[Vibecoding - Math.random for Security IDs]].

- [ ] 🔴 ⏱5min — `grep -rn 'Math.random' src/` near `token|invoice|reset|session|otp|nonce|id` returns 0
- [ ] 🔴 ⏱5min — Tokens use `crypto.randomUUID()` or `crypto.getRandomValues()`
- [ ] 🔴 ⏱10min — Invoice numbers / order IDs from a DB sequence or UUID, not 4-hex-char Math.random
- [ ] 🔴 ⏱5min — Password reset tokens ≥ 32 bytes from CSPRNG
- [ ] 🔴 ⏱15min — No predictable IDs in security-sensitive paths

### 11. Headers & Transport
See [[Vibecoding - Zero Security Headers]], [[Vibecoding - Caching and CDN Security]].

- [ ] 🔴 ⏱15min — `curl -sI` shows: `Content-Security-Policy`, `Strict-Transport-Security` (with `preload`, `includeSubDomains`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- [ ] 🟡 ⏱30min — CSP not `unsafe-inline` / `unsafe-eval` everywhere — nonce or hash-based where possible
- [ ] 🟢 ⏱1d — Trusted Types enforced for DOM-XSS-prone surfaces
- [ ] 🟢 ⏱30min — COOP, COEP, CORP set where Spectre / cross-origin isolation matters
- [ ] 🔴 ⏱5min — Cookies: `Secure`, `HttpOnly`, `SameSite=Lax` (or stricter) on session cookies
- [ ] 🟡 ⏱10min — HSTS submitted to preload list
- [ ] 🟡 ⏱5min — TLS 1.2+ only; SSL Labs grade A or A+

**Paste-ready: security headers (Next.js `next.config.ts`)**

```ts
// next.config.ts
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  isProd ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const config: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default config;
```

### 12. CORS & API Design
See [[Vibecoding - API Design Security CORS Versioning]].

- [ ] 🔴 ⏱5min — No `Access-Control-Allow-Origin: *` with `Allow-Credentials: true`
- [ ] 🔴 ⏱10min — CORS allowlist is explicit origins; no `Origin` reflection without validation
- [ ] 🟡 ⏱5min — `Vary: Origin` set when CORS depends on origin
- [ ] 🟢 ⏱30min — API versioning strategy explicit; deprecation policy documented
- [ ] 🟢 ⏱1d — OpenAPI / GraphQL schema as source of truth
- [ ] 🟡 ⏱15min — Strict schema validation rejects unknown fields, oversized payloads
- [ ] 🔴 ⏱15min — Errors don't leak stack traces, DB messages, or internal IDs
- [ ] 🟡 ⏱10min — Server-enforced max page size; cursor-based pagination preferred
- [ ] 🟡 ⏱10min — Query timeouts at the DB layer (e.g. 5s)

### 13. Caching & CDN
See [[Vibecoding - Caching and CDN Security]].

- [ ] 🔴 ⏱10min — Authenticated responses: `Cache-Control: private, no-store` OR explicit per-user cache key
- [ ] 🔴 ⏱5min — No SWR on authenticated paths
- [ ] 🟡 ⏱15min — CDN bypasses cache when session cookie present
- [ ] 🟡 ⏱30min — Origin locked to CDN IP range only — no direct origin access
- [ ] 🟢 ⏱5min — Logout sends `Clear-Site-Data: cache, cookies, storage`
- [ ] 🟢 ⏱10min — Static assets long TTL; HTML short TTL; API zero
- [ ] 🟢 ⏱15min — Purge process tested

### 14. Concurrency & Race Conditions
See [[Vibecoding - Race Conditions and Concurrency]].

- [ ] 🔴 ⏱30min — No read-then-write on balances / quotas / coupons; use atomic SQL (`UPDATE ... WHERE balance >= $1`)
- [ ] 🔴 ⏱10min — Single-use coupons enforced by unique constraint, not application checks
- [ ] 🔴 ⏱30min — Webhook handlers idempotent — replay 5× yields same final state as 1×
- [ ] 🔴 ⏱15min — `processed_events(event_id PK)` table for queue / webhook de-dup
- [ ] 🟡 ⏱30min — Optimistic concurrency on multi-step updates (`WHERE version = $expected`)
- [ ] 🟢 ⏱1d — Outbox pattern for cross-service side effects, not distributed transactions
- [ ] 🟡 ⏱15min — TOCTOU file ops eliminated — atomic moves into validated paths

### 15. Soft Delete & Data Lifecycle
See [[Vibecoding - Missing Soft Delete]], [[Vibecoding - Privacy and GDPR Reference]].

- [ ] 🟡 ⏱30min — User-content / financial / audit tables use `deleted_at IS NULL` filtering, not hard delete
- [ ] 🟡 ⏱15min — FK chains preserve referenceability after soft delete (NO ACTION, not CASCADE)
- [ ] 🔴 ⏱15min — RLS policies on soft-deleted tables filter `deleted_at IS NULL`
- [ ] 🟡 ⏱30min — Account-deletion flow: soft delete by default, hard delete behind admin gate + audit log
- [ ] 🟡 ⏱1d — Retention policy enforced per data class, not just documented

### 16. Resilience & Observability
See [[Vibecoding - No Error Boundaries]], [[Vibecoding - Logging and SIEM Without PII Leakage]].

- [ ] 🔴 ⏱5min — `error.tsx` and `global-error.tsx` exist at root; trigger one runtime error to verify
- [ ] 🟡 ⏱15min — Segment-level error boundaries on `checkout/`, `dashboard/`, `admin/`
- [ ] 🟡 ⏱15min — `/api/health` reports actual DB + storage + queue status — not static `{ ok: true }`
- [ ] 🟡 ⏱30min — Background jobs have `onFailure` handlers that persist failure state
- [ ] 🔴 ⏱15min — Logs are structured + greppable; no secrets / passwords / tokens / cookies in logs
- [ ] 🔴 ⏱15min — Sentry / equivalent wired for both server and client
- [ ] 🟡 ⏱1d — Audit log is append-only (WORM bucket, ledger, or hash chain)
- [ ] 🟡 ⏱1d — Detections written for: failed-login bursts, impossible travel, mass exports, off-hours admin actions

**Paste-ready: real `/api/health` (Next.js)**

```ts
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};
  let status = 200;

  try {
    const { error } = await supabaseAdmin.from("_health").select("1").limit(1).maybeSingle();
    checks.db = error ? "fail" : "ok";
    if (error) status = 503;
  } catch { checks.db = "fail"; status = 503; }

  // Add storage, queue, redis as applicable.
  return NextResponse.json({ status: status === 200 ? "ok" : "degraded", checks }, { status });
}
```

**Paste-ready: minimal Sentry init (Next.js)**

```ts
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Strip PII from events before sending.
  beforeSend(event) {
    if (event.request?.cookies) delete event.request.cookies;
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});

// sentry.client.config.ts — same shape with NEXT_PUBLIC_SENTRY_DSN.
```

---

## B — LLM-Specific

### 17. LLM Risks
See [[Vibecoding - Prompt Injection]], [[Vibecoding - Indirect Prompt Injection EchoLeak]], [[Vibecoding - RAG Poisoning]], [[Vibecoding - Tool-Use Confused Deputy]], [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]].

- [ ] 🔴 ⏱15min — User input never directly concatenated into the system prompt
- [ ] 🔴 ⏱30min — LLM-driven tool use sandboxed with explicit allowlist (no shell, no fs writes outside scratch)
- [ ] 🔴 ⏱15min — Destructive ops always need typed user confirmation — model never auto-confirms (case: [[Vibecoding - Case Study Replit Production DB Deletion]])
- [ ] 🟡 ⏱1d — RAG corpus curated; untrusted user uploads quarantined before indexing
- [ ] 🔴 ⏱30min — No tool chain ending in "send email / DB write / push commit" without separate confirmation
- [ ] 🔴 ⏱30min — If using MCP: server pinned, signature-verified, no auto-update from arbitrary registries (case: [[Vibecoding - Case Study Cursor MCP CVEs]])
- [ ] 🟡 ⏱1d — LLM provider DPA covers your data; zero-retention tier for PII flows
- [ ] 🟡 ⏱30min — No PII in prompts to providers without consent + DPA coverage

### 18. Agent-Coding Hygiene (if AI agents touch this repo)
See [[Vibecoding - Tool Profile Cursor]], [[Vibecoding - Tool Profile Claude Code]], [[Vibecoding - Rules File Backdoor Unicode Injection]], [[Vibecoding - Anti-Pattern Behavioral Catalog]].

- [ ] 🟡 ⏱15min — `.cursor/rules`, `CLAUDE.md`, agent prompts reviewed for invisible-Unicode injection
- [ ] 🔴 ⏱5min — No agent has unattended write access to prod DB or infra
- [ ] 🔴 ⏱10min — `terraform destroy`, `rm -rf`, `DROP TABLE`, `DELETE FROM` require human confirmation
- [ ] 🔴 ⏱5min — Agent-generated code passes through the same review/CI gates as human code
- [ ] 🟡 ⏱5min — Tests not deleted to make CI green — review diff for `-` lines in test files
- [ ] 🟡 ⏱5min — No try/catch added to "make the error go away" without diagnosing root cause ([[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]])
- [ ] 🟢 ⏱30min — Agent action logs reviewed periodically for anomaly patterns

---

## C — Account Security UX

### 19. MFA & Sessions
See [[Vibecoding - Account Security UX 2FA Sessions]].

- [ ] 🟡 ⏱1d — TOTP supported; passkeys / WebAuthn preferred
- [ ] 🟡 ⏱30min — Step-up auth on email change, payment method change, account deletion, data export
- [ ] 🟡 ⏱30min — Session list visible to user; "log out everywhere" actually invalidates server-side
- [ ] 🟡 ⏱30min — Refresh token rotation; reuse detected → force re-auth
- [ ] 🟢 ⏱15min — Idle + absolute session timeouts
- [ ] 🟡 ⏱15min — Backup codes hashed at rest, shown once

### 20. Password / Recovery / Email Change
- [ ] 🔴 ⏱15min — Password reset tokens single-use, 15-min TTL, 32-byte CSPRNG
- [ ] 🔴 ⏱10min — Reset success invalidates all sessions and OAuth grants
- [ ] 🟡 ⏱30min — Email change confirmed at both old + new addresses; old can revoke for 7 days
- [ ] 🟢 ⏱5min — No security questions; documented recovery policy
- [ ] 🟡 ⏱30min — Login alerts on new device / new country
- [ ] 🟡 ⏱15min — HIBP-style breach check on signup / password change

### 21. OAuth Grants
- [ ] 🟡 ⏱30min — User can list and revoke every third-party app
- [ ] 🟢 ⏱15min — New grants notified by email
- [ ] 🟡 ⏱5min — Tokens issued with minimum scope
- [ ] 🟡 ⏱5min — Granting requires re-auth

---

## D — Infrastructure & Operations

### 22. Infrastructure Security
See [[Vibecoding - Infrastructure and Operations Security]].

- [ ] 🔴 ⏱30min — TLS 1.2+ only; HSTS preload submitted; cert auto-renew + expiry alert
- [ ] 🟡 ⏱30min — DNSSEC enabled; SPF / DKIM / DMARC `p=quarantine` minimum
- [ ] 🔴 ⏱15min — No subdomain takeover candidates (CNAME pointed at unclaimed third-party)
- [ ] 🔴 ⏱5min — Registrar locked + 2FA on the registrar account
- [ ] 🔴 ⏱1d — Daily encrypted backups; quarterly tested restore; cross-region storage
- [ ] 🟡 ⏱1d — DR runbooks: prod DB lost, region down, key compromised, ransomware
- [ ] 🟡 ⏱30min — Documented RTO / RPO per system; annual game day
- [ ] 🔴 ⏱15min — No DBs / Redis / queues exposed to public internet
- [ ] 🟡 ⏱30min — Egress filtering on prod servers (limits exfil)
- [ ] 🟡 ⏱30min — CDN / WAF in front of public endpoints

### 23. CI/CD
See [[Vibecoding - CI CD and Container Security]].

- [ ] 🔴 ⏱10min — Branch protection: PR required, reviews required, status checks required
- [ ] 🔴 ⏱30min — Required CI checks: SAST, dep scan, secret scan, tests
- [ ] 🟡 ⏱15min — Third-party Actions pinned to commit SHA, not mutable tag
- [ ] 🔴 ⏱15min — No `pull_request_target` workflows that check out fork code with secrets
- [ ] 🟡 ⏱30min — Secrets scoped per-environment; prod gated on manual approval
- [ ] 🟡 ⏱30min — OIDC to cloud providers, not long-lived static keys
- [ ] 🟢 ⏱30min — SBOM generated per build; signed via Sigstore / cosign; verified at deploy
- [ ] 🟡 ⏱15min — Container images scanned (Trivy / Grype); block on critical CVE
- [ ] 🟡 ⏱15min — Containers run non-root, read-only root FS, dropped caps

**Paste-ready: GitHub Actions security scan (SAST + secrets + deps)**

```yaml
# .github/workflows/security.yml
name: security
on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # v4.1.1, pinned by SHA
        with: { fetch-depth: 0 }

      # Secret scanning over full history.
      - uses: trufflesecurity/trufflehog@main
        with: { extra_args: --only-verified }

      # Dependency vulnerability scan.
      - name: pnpm audit
        run: |
          corepack enable
          pnpm install --frozen-lockfile
          pnpm audit --audit-level=high

      # SAST.
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v3
```

### 24. Logging & SIEM
See [[Vibecoding - Logging and SIEM Without PII Leakage]].

- [ ] 🔴 ⏱15min — No passwords, tokens, cookies, full PANs, or full PII in logs
- [ ] 🟡 ⏱30min — Structured JSON logs with request id, user id (not email), route, latency
- [ ] 🟡 ⏱1d — Logs shipped to a system the app can't write to (or rotate-protected)
- [ ] 🟢 ⏱1d — Detections / alerts on the patterns listed in §16
- [ ] 🟢 ⏱30min — Log retention matches your incident-investigation window (≥ 90 days typical)

### 25. Monitoring & Alerts
- [ ] 🟡 ⏱30min — APM in place (Sentry, Datadog APM, otel) with PII redaction
- [ ] 🟡 ⏱30min — Synthetic checks on critical user journeys (login, checkout, signup)
- [ ] 🟡 ⏱15min — Alert on: 5xx rate, p95 latency, queue depth, failed-job rate
- [ ] 🟢 ⏱30min — On-call playbook for each top-5 alert

---

## E — Privacy / Payments / Regulated Data

### 26. Privacy & GDPR
See [[Vibecoding - Privacy and GDPR Minimum]], [[Vibecoding - Privacy and GDPR Reference]].

- [ ] 🔴 ⏱30min — Privacy policy lists actual data categories, sub-processors, retention
- [ ] 🟡 ⏱1d — DSR endpoints: access, export, delete (verify identity before fulfilling)
- [ ] 🟡 ⏱30min — Cookie consent matches your jurisdiction (EU / UK / CA / VA / CO etc.)
- [ ] 🟡 ⏱1d — DPAs in place with every sub-processor; sub-processor list public + versioned
- [ ] 🟡 ⏱30min — Data minimization: don't collect what you don't need
- [ ] 🟡 ⏱1d — Cross-border transfer mechanisms (SCCs / DPF) where applicable

### 27. Payments & PCI
See [[Vibecoding - Payment and PCI Scope]].

- [ ] 🔴 ⏱5min — Card data never touches your servers (Stripe Elements / Checkout / hosted fields)
- [ ] 🔴 ⏱10min — SAQ-A scope confirmed (host the card form on Stripe's domain via redirect or embedded iframe)
- [ ] 🟡 ⏱15min — Webhook idempotency + refund handling (see §5)
- [ ] 🟡 ⏱30min — Connect: terminal payout state never regressed on transient `account.updated` false
- [ ] 🟡 ⏱1d — Tax (VAT, sales tax, DAC7, 1099) collected + reported per regulation
- [ ] 🟡 ⏱15min — 3DS / SCA enforced for EU; flows actually trigger when required
- [ ] 🟢 ⏱5min — Stripe Radar enabled with rules

---

## F — Process & Org

### 28. Threat Modeling
See [[Vibecoding - Threat Modeling in 20 Minutes]].

- [ ] 🟡 ⏱30min — STRIDE pass on every change touching auth, payments, PII, or trust boundaries
- [ ] 🟡 ⏱30min — Trust boundaries documented: browser→API, API→DB, API→LLM, LLM→tool exec, webhook source→handler, tenant→tenant, env→env
- [ ] 🟢 ⏱15min — Threat model artifact (markdown + diagram) committed alongside the code
- [ ] 🟢 ⏱30min — LINDDUN pass for privacy-critical features
- [ ] 🟡 ⏱15min — New tools added to LLM agent allowlists go through threat-model review

### 29. Code Review & Process
See [[Vibecoding - Process Multi-Agent Code Review]], [[Vibecoding - Process Secure Prompt Patterns RCI]], [[Vibecoding - Root Causes]], [[Vibecoding - OWASP Top 10 Mapping]].

- [ ] 🔴 ⏱15min — Every PR reviewed by at least one human + one independent agent
- [ ] 🟡 ⏱15min — Security-relevant PRs reviewed against the full OWASP Top 10
- [ ] 🟡 ⏱5min — RCI prompt pattern used for AI-generated security-sensitive code
- [ ] 🔴 ⏱15min — Migrations reviewed: destructive ones require separate approval
- [ ] 🟡 ⏱15min — Rollback plan documented; tested for risky deploys
- [ ] 🟡 ⏱30min — Feature flags / canary for risky changes

### 30. Org, Vendors, Supply Chain
See [[Vibecoding - Org and Vendor Risk SBOM]], [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]], [[Vibecoding - Tooling SAST and Scanners for AI Code]].

- [ ] 🟡 ⏱30min — Onboarding checklist with MFA enrollment + AUP + security training
- [ ] 🟡 ⏱30min — Quarterly access reviews; auto-flag dormant + over-privileged accounts
- [ ] 🔴 ⏱30min — 24h offboarding playbook covering every system (cloud, source, comms, vendor portals, SSH, laptop)
- [ ] 🟡 ⏱1d — Vendor inventory tiered by risk; DPA + SOC 2 reviewed for high-risk vendors
- [ ] 🟢 ⏱30min — SBOM generated per build, continuously scanned post-deploy
- [ ] 🔴 ⏱5min — Lockfile committed; CI uses `--frozen-lockfile`
- [ ] 🔴 ⏱5min — Slopsquatting check: every new dep PR reviewed by a human reading the package name (19.7% of AI-suggested packages don't exist)
- [ ] 🟢 ⏱30min — Phishing simulations quarterly; remediate trends not individuals
- [ ] 🟢 ⏱1d — Cyber insurance + E&O policies; exclusions read

### 31. Incident Response
See [[Vibecoding - Incident Response Runbook]].

- [ ] 🟡 ⏱30min — On-call rotation defined; phone numbers current
- [ ] 🟡 ⏱1d — War-room channel template, customer notification template, status page auth, regulator portal credentials all pre-staged
- [ ] 🟢 ⏱1d — Quarterly tabletop exercises (key leak, ransomware, agent-driven data loss, sub-processor breach)
- [ ] 🟡 ⏱30min — Forensic snapshot scripts ready (DB dump, log archive, token rotation)
- [ ] 🟢 ⏱15min — Blameless post-mortems; action items tracked to completion
- [ ] 🔴 ⏱30min — Breach notification timelines documented (GDPR 72h, state AGs, sector regulators)

### 32. Pen Testing & Red Team
- [ ] 🟡 ⏱1d — Annual external penetration test on prod-equivalent environment
- [ ] 🟢 ⏱1d — Bug bounty program (HackerOne / Intigriti / private) once mature enough to handle reports
- [ ] 🟢 ⏱1d — Internal red-team exercises before major launches
- [ ] 🟡 ⏱5min — Public security.txt at `/.well-known/security.txt` with contact + disclosure policy
- [ ] 🟡 ⏱15min — Vulnerability disclosure policy published

---

## How to use

1. Run the **⚡ 1-Hour Fast Pass** first if you're shipping today.
2. Then go top-to-bottom. Each `[ ]` either passes (mark `[x]`) or generates a finding.
3. Findings get filed against the relevant atomic note for context — every section links its deep-dive.
4. Re-run before every major release; severity tags help triage what to fix tonight vs this sprint.

In one real marketplace review, an earlier version of this list produced 56 concrete findings. Treat the checklist as a starting point and verify each item against the actual architecture.

---

## What this doesn't cover

This is a strong "shift-left dev hygiene + ops + org" doc. It is **not**:

- A SOC 2 control set (use the AICPA TSC)
- An OWASP ASVS L2/L3 audit (use the actual ASVS checklist)
- A penetration test (humans + tooling against a running app find what code review can't)
- A formal threat model for a specific product (use STRIDE / PASTA / LINDDUN per feature)
- A compliance program (HIPAA, PCI-DSS L1, FedRAMP each have their own control matrices)
- A substitute for legal review on data handling, ToS, and breach notification specifics
- A substitute for a security engineer on staff once the org grows past ~20 people

If you treat this as ground truth and never look beyond it, the gaps will be in the spaces between sections — composite vulnerabilities like business-logic abuse, race conditions chained with authorization gaps, social engineering of support staff, and threats specific to your product's risk profile. Use the checklist as a fence, not a perimeter.

---

## Changelog

- **v2.0 — 2026-04-29** — Added severity (🔴/🟡/🟢) and effort (⏱) tags on every item. Added 1-Hour Fast Pass section. Inlined 12 paste-ready snippets (auth guard, RLS starter, SECURITY DEFINER template, env validator, .env.example, Stripe webhook, Zod API route, rate limiter, safe-redirect, security headers, /api/health, Sentry init, GitHub Actions security scan). "If you do nothing else" callouts on critical sections.
- **v1.1 — 2026-04-29** — Naming normalization, dedup, frontmatter standardization, START HERE + LICENSE created.
- **v1.0 — 2026-04-28** — Initial 32-section runbook from research vault.

---

## Deep dives

Atomic notes that drill deeper into each section of this runbook.

### 1, 1A, 2 — Auth, Authorization, Database/RLS
- [[Vibecoding - IDOR and Authz Patterns]]
- [[Vibecoding - Authorization Depth IDOR BOLA]]
- [[Vibecoding - Auth Boundaries Layouts Are Not Enough]]
- [[Vibecoding - No Authorization on Endpoints]]
- [[Vibecoding - Client-Side Authentication]]
- [[Vibecoding - RLS Disabled or Permissive]]
- [[Vibecoding - Supabase RLS Audit Patterns]]
- [[Vibecoding - SECURITY DEFINER Footguns]]
- [[Vibecoding - Database Hygiene]]
- [[Vibecoding - Case Study Base44 Auth Flaw]]
- [[Vibecoding - Case Study Lovable RLS CVE]]

### 3 — Cryptography & Key Management
- [[Vibecoding - Cryptography and Key Management]]
- [[Vibecoding - Math.random for Security IDs]]

### 4 — Secrets & Config
- [[Vibecoding - Secrets and Env Hygiene]]
- [[Vibecoding - Secrets in Client Bundle]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]

### 5 — Webhooks
- [[Vibecoding - Webhook Security]]
- [[Vibecoding - Missing Webhook Verification]]
- [[Vibecoding - Missing Refund Handlers]]

### 6 — Input Validation & Output
- [[Vibecoding - No Input Validation]]
- [[Vibecoding - Backend Code Execution Bugs]]

### 7 — File Upload & Storage
- [[Vibecoding - File Upload Storage Security]]

### 8 — Rate Limiting & Abuse
- [[Vibecoding - No Rate Limiting]]

### 9 — Open Redirects & URL Handling
- [[Vibecoding - Open Redirects]]

### 10 — Cryptographic Randomness
- [[Vibecoding - Math.random for Security IDs]]

### 11 — Headers & Transport
- [[Vibecoding - Zero Security Headers]]

### 12 — CORS & API Design
- [[Vibecoding - API Design Security CORS Versioning]]

### 13 — Caching & CDN
- [[Vibecoding - Caching and CDN Security]]

### 14 — Concurrency & Race Conditions
- [[Vibecoding - Race Conditions and Concurrency]]

### 15 — Soft Delete & Data Lifecycle
- [[Vibecoding - Missing Soft Delete]]

### 16 — Resilience & Observability
- [[Vibecoding - No Error Boundaries]]
- [[Vibecoding - Logging and SIEM Without PII Leakage]]
- [[Vibecoding - Debugging and Bug Triage Workflow]]

### 17 — LLM Risks
- [[Vibecoding - Prompt Injection]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
- [[Vibecoding - RAG Poisoning]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
- [[Vibecoding - Tool-Use Confused Deputy]]
- [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]]
- [[Vibecoding - Rules File Backdoor Unicode Injection]]
- [[Vibecoding - Case Study Cursor MCP CVEs]]

### 18 — Agent-Coding Hygiene
- [[Vibecoding - Process Multi-Agent Code Review]]
- [[Vibecoding - Process Secure Prompt Patterns RCI]]
- [[Vibecoding - Anti-Pattern Behavioral Catalog]]
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]
- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Tool Profile GitHub Copilot]]
- [[Vibecoding - Tool Profile Windsurf]]
- [[Vibecoding - Cross-Tool Comparison Worst Offender]]
- [[Vibecoding - Case Study Claude Code Terraform Destroy]]
- [[Vibecoding - Case Study Replit Production DB Deletion]]
- [[Vibecoding - Case Study PocketOS 9-Second Wipe]]
- [[Vibecoding - Case Study Copilot CVE-2025-53773 RCE]]
- [[Vibecoding - Case Study Bolt and Multi-Platform Scans]]

### 19, 20, 21 — Sessions, Recovery, OAuth
- [[Vibecoding - Account Security UX 2FA Sessions]]

### 22 — Infrastructure
- [[Vibecoding - Infrastructure and Operations Security]]

### 23 — CI/CD
- [[Vibecoding - CI CD and Container Security]]

### 24, 25 — Logging, SIEM, Monitoring
- [[Vibecoding - Logging and SIEM Without PII Leakage]]

### 26 — Privacy & GDPR
- [[Vibecoding - Privacy and GDPR Minimum]]
- [[Vibecoding - Privacy and GDPR Reference]]

### 27 — Payments & PCI
- [[Vibecoding - Payment and PCI Scope]]

### 28 — Threat Modeling
- [[Vibecoding - Threat Modeling in 20 Minutes]]
- [[Vibecoding - OWASP Top 10 Mapping]]

### 29 — Code Review & Process
- [[Vibecoding - Process Multi-Agent Code Review]]
- [[Vibecoding - Process Secure Prompt Patterns RCI]]
- [[Vibecoding - Audit Checklist]]

### 30 — Org, Vendors, Supply Chain
- [[Vibecoding - Org and Vendor Risk SBOM]]
- [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]]
- [[Vibecoding - Stat - Spracklen Slopsquatting USENIX 2025]]

### 31 — Incident Response
- [[Vibecoding - Incident Response Runbook]]

### 32 — Pen Testing & Red Team
- [[Vibecoding - OWASP Top 10 Mapping]]

---

## Tooling references

SAST, scanners, agent harnesses, and supporting tools surveyed for AI-written code:

- [[Vibecoding - Tooling SAST and Scanners for AI Code]] — overview
- [[Vibecoding - Tooling truecourse]]
- [[Vibecoding - Tooling vibe-check]]
- [[Vibecoding - Tooling Repomix]]
- [[Vibecoding - Tooling agent-orchestrator]]
- [[Vibecoding - Tooling armory]]
- [[Vibecoding - Tooling awesome-claude-skills]]
- [[Vibecoding - Tooling brutal-coding-tool]]
- [[Vibecoding - Tooling ccusage]]
- [[Vibecoding - Tooling claude-octopus]]
- [[Vibecoding - Tooling openwolf]]

---

## Stats and research

- [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]]
- [[Vibecoding - Stat - Veracode 2025 Report]]
- [[Vibecoding - Stat - GitGuardian Secrets Sprawl 2026]]
- [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]]
- [[Vibecoding - Stat - Spracklen Slopsquatting USENIX 2025]]
- [[Vibecoding - Stat - Academic Studies Pearce Stanford]]
- [[Vibecoding - Stat - Bug Category Frequencies]]
- [[Vibecoding - Root Causes]]
- [[Vibecoding - Sources and Reading List]]
