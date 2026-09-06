---
tags: [security, vibecoding, secrets, env, checklist]
parent: '[[Vibecoding Security Research - Index]]'
created: 2026-04-29
status: draft
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Secrets and Env Hygiene

> **The bug:** Secrets leak through five doors — the client bundle, git history, logs, error pages, and build artifacts. Vibecoders close one and forget the other four. Once a secret is leaked, the only fix is rotation; deleting the file or force-pushing does not unleak it.

## What counts as a secret

If an attacker holding this string can spend your money, read your users' data, impersonate your domain, or pivot deeper — it is a secret. Concretely:

- DB connection strings (incl. pooler URLs)
- Supabase `service_role` / `sb_secret_*` keys
- Stripe `sk_live_*` / restricted keys / webhook signing secrets
- OAuth client secrets, JWT signing keys, session encryption keys
- Resend / Postmark / SendGrid API keys (spoofing your domain)
- S3 / R2 / Cloudflare API tokens
- AI provider keys (Anthropic, OpenAI) — direct $ on your card
- Inngest signing key, Sentry DSN with admin scope, PostHog personal key
- `.env`, dump files, backup tarballs, `*.pem`, `id_rsa`

**Not secrets** (safe to ship to client): Supabase publishable/anon key, Stripe `pk_live_*` publishable key, public PostHog project key, Sentry public DSN. These are designed to be public and gated by RLS / origin checks / per-event auth.

## The five doors secrets leak through

### 1. The client bundle (`NEXT_PUBLIC_*`)

In Next.js, **anything prefixed `NEXT_PUBLIC_` is inlined into the JS bundle at build time** and visible to anyone who opens DevTools. There is no runtime check, no header gate, no CDN redaction. It is literal text in `_next/static/chunks/*.js`.

The vibecoder failure mode: you have a server-only secret called `STRIPE_SECRET_KEY`. The build crashes because it is "undefined on the client." Cursor "fixes" it by renaming to `NEXT_PUBLIC_STRIPE_SECRET_KEY`. Build now passes. Your prod key is now public.

**Rules:**
- Only use `NEXT_PUBLIC_*` for values you would print on a billboard.
- Never rename a server var to `NEXT_PUBLIC_*` to fix a build error. The error is telling you a server-only value is being read in a Client Component — fix the boundary, not the prefix.
- Grep your built bundle before every prod deploy: `grep -rE "(sk_live|sb_secret|service_role|-----BEGIN)" .next/`. Should return nothing.
- See [[Vibecoding - Secrets in Client Bundle]] for the failure pattern.

### 2. Git history

Force-push does not delete a secret from the remote — GitHub keeps dangling commits accessible by SHA, scrapers index them within minutes, and forks/clones already have it. Treat any secret that touched a public repo as **compromised, full stop.** Rotate, do not "git filter-repo and hope."

### 3. Logs

`console.log(req.headers)` ships the `Authorization` and `Cookie` headers to your log aggregator. `console.log(env)` dumps everything. Stripe error objects sometimes contain the request body which contains the API key. **Treat stdout as a third-party service.**

- Allowlist-log, never object-log: log `{ userId, route }`, not `{ ...req }`.
- Redact at the logger layer (pino redact, Sentry `beforeSend`).
- See [[Vibecoding - Logging and SIEM Without PII Leakage]].

### 4. Error pages and Sentry

A 500 page with stack trace can include env values from frame locals. Sentry's default `beforeSend` does not redact custom env keys. Set `NODE_ENV=production` (Next.js auto-strips stacks from prod error pages) and configure Sentry's `beforeSend` to drop `request.headers.authorization`, `request.headers.cookie`, and any frame-local matching `/key|secret|token|password/i`.

### 5. Build artifacts

`.next/`, `dist/`, source maps, Docker images, and CI logs all happily embed env values that were available at build time. Source maps uploaded to a public CDN are the classic leak path. Set `productionBrowserSourceMaps: false` (Next.js default) or upload them to Sentry only.

CI logs: most CI providers redact known-secret env values, but only ones registered as secrets. A `console.log(process.env)` in a build step prints everything that is *not* registered. Echo nothing.

## Required vs optional in env validation (zod)

Vibecoders using `@t3-oss/env-nextjs` or a hand-rolled zod env schema hit one specific bug repeatedly. The mental model:

- **Build-time-required** = needed for `next build` to compile correctly, e.g. a public URL inlined into pages.
- **Runtime-required** = needed when a request arrives, e.g. webhook secret.

If you mark a runtime-only secret as `z.string()` (required) but the value is **not** present in the build environment (e.g. local dev, CI without prod secrets, a Docker image that gets envs injected by the orchestrator), the build fails with a confusing "ENV missing" error. Vibecoders then make it `.optional()` — and now in prod, signature verification silently passes through because `env.STRIPE_WEBHOOK_SECRET` is `undefined` and the verifier short-circuits. This failure mode has appeared in real marketplace audits (see [[Vibecoding - Webhook Security]]).

The right pattern:

```ts
// env.ts — schema declares the truth
server: {
  STRIPE_WEBHOOK_SECRET: z.string().min(1),   // required
  RESEND_API_KEY: z.string().min(1),          // required
  OPTIONAL_FEATURE_KEY: z.string().optional() // genuinely optional
},
// Skip validation only during `next build`, not at runtime
skipValidation: !!process.env.SKIP_ENV_VALIDATION,
```

Then at the **runtime entry points** (API route, webhook handler), assert again:

```ts
if (!env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET missing at runtime');
}
```

Never let a missing secret degrade silently to "skip the check."

**Manual destructure** `runtimeEnv` (not `experimental__runtimeEnv`) — Next.js only includes vars in the bundle that are explicitly referenced. Spread/dynamic access strips them out.

## Rotation — what breaks if you don't

Rotate when:

- A team member with access leaves
- You suspect any leak (always assume yes if a `.env` was ever committed, even briefly)
- On a schedule (quarterly minimum for prod)
- After any security incident, even unrelated

What breaks during rotation (plan for this before you rotate):

| Secret | Cutover hazard |
|---|---|
| Stripe secret key | In-flight requests with old key 401. Stripe supports a 7-day delayed expiration — use it. |
| Stripe webhook secret | Each endpoint has its own secret; rotating one does not affect others. |
| Supabase service-role | All long-running serverless cold-starts must redeploy. |
| Supabase JWT signing key | All currently-issued JWTs become invalid → mass logout. Plan for it or use the new asymmetric signing keys with overlap. |
| OAuth client secret | Existing in-flight redirects fail; users mid-login must retry. |
| DB password | Connections held open in a pooler must be drained. |

**Rule:** never rotate a secret without a rollback path. Stripe's 7-day delayed expiration and Supabase's new "multiple secret keys" feature exist precisely so you can have N+1 valid keys during cutover.

## .env hygiene

The non-negotiables:

- `.gitignore` lists `.env`, `.env.*`, `!.env.example` (keep example committed, all real envs ignored)
- `.env.example` exists, lists every key with a fake placeholder, no real values
- Pre-commit hook: **gitleaks** (fast, ~ms, blocks at commit). MIT-licensed, single binary.
- CI scan: **trufflehog** (verifies if leaked secrets are actually live, slower but actionable). Run on every PR.
- Block direct pushes to main; require PR review.
- GitHub: enable secret scanning + push protection (free for public repos, paid for private).

```bash
# .pre-commit-config.yaml — minimum viable
- repo: https://github.com/gitleaks/gitleaks
  rev: v8.x
  hooks:
    - id: gitleaks
```

If you cannot install pre-commit, at least: `gitleaks detect --source . --redact -v` in your CI pipeline as a required check.

## Provider-specific patterns

### Vercel
- Mark sensitive vars as **Sensitive Environment Variable** — stored unreadable, can't be viewed in dashboard or `vercel env ls` after creation. Production + Preview only.
- Scope per environment: never let a Production secret be available to Preview deployments. Preview branches are accessible by anyone with a link to your project — treat them as semi-public.
- For high-security: pull from AWS Secrets Manager / Doppler / HCP Vault at runtime instead of injecting at build.

### Supabase
- **Anon / publishable key** (`sb_publishable_*`): safe to ship in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Gated by RLS. If RLS is off, this key is a full read of your DB — see [[Vibecoding - RLS Disabled or Permissive]].
- **Service-role / secret key** (`sb_secret_*`): server-only. Bypasses RLS entirely. Never in `NEXT_PUBLIC_*`, never in a Client Component, never in middleware that runs on Edge with public env injection. The new `sb_secret_*` keys 401 if used from a browser User-Agent — defense in depth, not a substitute.
- **JWT signing keys**: prefer the new asymmetric (RS256/ES256) signing keys — you can rotate without invalidating existing JWTs.
- See [[Vibecoding - IDOR and Authz Patterns]] for why service-role + missing owner checks = full IDOR.

### Stripe
- **Use restricted keys** (`rk_live_*`) with the minimum scope your integration needs. Drop-in replacement for `sk_live_*`. If your code only creates Checkout Sessions, give it `Checkout Sessions: write` and nothing else. Dispute monitor for a vendor? `Disputes: read` only.
- **IP-restrict** secret keys to your known servers in the Stripe dashboard.
- Each environment (test / prod) and each webhook endpoint has its own signing secret. Don't reuse.
- Rotate immediately on any suspicion, use the 7-day delayed expiration to avoid downtime.

## Detection and response — leaked secret playbook

You discover (or GitGuardian / GitHub secret scanning tells you) a secret is in a commit. Do this in order, in under an hour:

1. **Revoke at the provider first.** Not "remove from repo first" — revoke first. Stripe dashboard, Supabase API keys, GitHub PAT settings. Until revoked, deleting the file does nothing — the secret already escaped.
2. **Issue a replacement** and deploy it (Vercel env update + redeploy).
3. **Audit logs** at the provider for unauthorized usage between leak time and revocation. Stripe logs, Supabase auth logs, your own request logs. Scope of breach drives next steps.
4. **Notify** if user data may have been accessed (legal requirement under GDPR within 72 hours — see [[Vibecoding - Privacy and GDPR Reference]]).
5. **Clean history** (optional, cosmetic): `git filter-repo` and force-push. **This does not unleak the secret** — assume scrapers already have it. Step 1 is what matters.
6. **Post-mortem**: how did it land in git? Add a gitleaks pre-commit hook so it cannot happen again.

The order matters. The cardinal sin is "delete the file, push, hope." Scrapers index public commits within seconds; private repos are leaked through stolen laptops, accidental fork-public events, ex-employees, and CI log dumps.

---

## Drop-in checklist

Run through this before every prod deploy and once a quarter regardless.

### Inventory & classification
- [ ] Every key in `.env` is classified: client-safe vs server-only.
- [ ] No `NEXT_PUBLIC_*` value is sensitive (re-read each one out loud).
- [ ] `.env.example` is committed, lists every key, contains no real values.
- [ ] `.env` and `.env.*` are in `.gitignore`.

### Validation
- [ ] `env.ts` (zod / t3-env) declares every var with explicit `.optional()` only when truly optional.
- [ ] Runtime-required secrets are `z.string().min(1)` — never `.optional()` "to make build pass."
- [ ] `runtimeEnv` is destructured manually (not spread) so Next.js bundles only what you reference.
- [ ] Webhook handlers re-assert their secrets at request time, not just at boot.

### Bundle & build
- [ ] After `next build`, grep `.next/` for `sk_live`, `sb_secret`, `service_role`, `-----BEGIN`. Returns nothing.
- [ ] `productionBrowserSourceMaps` is `false`, or source maps go only to Sentry.
- [ ] CI does not `echo $SOMETHING` for unregistered env vars.

### Repo hygiene
- [ ] gitleaks pre-commit hook installed locally.
- [ ] gitleaks (or trufflehog) runs in CI on every PR as a required check.
- [ ] GitHub secret scanning + push protection enabled.
- [ ] Branch protection on `main`; PRs required.

### Provider config
- [ ] Stripe: using restricted keys, IP-restricted where possible.
- [ ] Stripe: each webhook endpoint has its own signing secret, marked **required** in env.
- [ ] Supabase: RLS on every table; `sb_secret_*` (or service role) only ever read server-side.
- [ ] Supabase: JWT signing key is asymmetric (RS/ES) for non-disruptive rotation.
- [ ] Vercel: sensitive vars are flagged Sensitive; scoped per environment; Preview ≠ Production.
- [ ] OAuth client secrets stored as sensitive; redirect URIs allowlisted.

### Logging & errors
- [ ] No `console.log(req)`, `console.log(headers)`, `console.log(env)` anywhere.
- [ ] Sentry `beforeSend` redacts `authorization`, `cookie`, and any frame-local matching `/key|secret|token|password/i`.
- [ ] Production error pages do not leak stack frames or env values.

### Rotation readiness
- [ ] Documented rotation procedure for each provider (one-line each is fine).
- [ ] Rotation has a rollback path (delayed expiration, key overlap window, or staged cutover).
- [ ] Quarterly rotation calendar entry exists.
- [ ] Offboarding checklist rotates every shared secret a leaver touched.

### Incident response
- [ ] Runbook says "revoke at provider FIRST, then everything else."
- [ ] Provider audit log access is documented; you know where to look.
- [ ] 72-hour GDPR notification path is defined for breaches involving user data.

---

## Related notes

- [[Vibecoding - Secrets in Client Bundle]] — the failure pattern
- [[Vibecoding - Webhook Security]] — why optional webhook secrets silently fail open
- [[Vibecoding - IDOR and Authz Patterns]] — service-role + no owner check = full IDOR
- [[Vibecoding - RLS Disabled or Permissive]] — why anon key safety depends on RLS
- [[Vibecoding - Logging and SIEM Without PII Leakage]] — log redaction patterns
- [[Vibecoding - Cryptography and Key Management]] — KMS, envelope encryption
- [[Vibecoding - CI CD and Container Security]] — pipeline secret hygiene
- [[Vibecoding - Things to Check on Your Code]] — full runbook this slots into
