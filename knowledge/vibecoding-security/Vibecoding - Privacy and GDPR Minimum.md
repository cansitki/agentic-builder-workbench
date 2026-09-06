---
tags: [security, vibecoding, privacy, gdpr, compliance, checklist]
parent: '[[Vibecoding Security Research - Index]]'
date: 2026-04-29
status: active
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding — Privacy and GDPR Minimum

If your app collects any user data — even just an email — you have legal obligations. AI tools never mention this. This is the practical floor for a vibecoded app launching to real users, especially in the EU.

Not legal advice. This is the bare minimum to not get banned by ad platforms, blocked by app stores, or fined by a DPA.

## The trigger: are you a Data Processor or Controller?

If you decide what data is collected and why → **Controller**. That's you, even as a solo vibecoder.
If you only handle data on someone else's behalf → Processor.

Both have obligations. Neither escape.

The moment you collect a user's email for signup, you have triggered GDPR. There is no "my app is too small" exemption.

## What you must have day one

### 1. Privacy Policy
Non-negotiable. Without it:
- Stripe will eventually flag your account.
- Google/Facebook ads will reject your domain.
- Apple/Google app stores will reject your app.
- Any EU user can file a DPA complaint.

**Minimum content:**
- Who you are (legal entity or natural person + contact).
- What you collect (email, name, IP, cookies, payment data via Stripe, etc.).
- Why you collect it (legal basis: consent, contract, legitimate interest).
- Who you share it with (your sub-processors: Supabase, Stripe, Vercel, Resend, PostHog, etc. — list each by name).
- How long you keep it (retention).
- User rights (access, deletion, portability, objection).
- How to exercise those rights (an email address that you actually monitor).
- International transfers (most US-hosted SaaS triggers this).
- Cookies (link to cookie policy or include inline).
- Last updated date.

**Cheap path:** termly.io, iubenda, or Stripe's generator. Review it. Don't just paste.

### 2. Cookie consent (EU)
If you serve EU users and use anything beyond strictly-necessary cookies (analytics, ads, session beyond auth), you need:
- A consent banner that loads BEFORE the cookies do.
- Granular choice (not "Accept all" only).
- Equal prominence "Reject all" button (since 2023 EU rulings).
- Record of consent.

**Cheap path:** Cookiebot, Klaro, or a roll-your-own with PostHog's opt-in mode. "Accept"-only banners are illegal in the EU.

### 3. Data Subject Requests (DSR)
Users can demand:
- **Access** — what do you have on me?
- **Deletion** — erase me.
- **Portability** — export my data in machine-readable form.
- **Rectification** — fix wrong data.
- **Objection** — stop processing for marketing.

You must respond in 30 days. Build the export and delete flows now or you'll scramble at first request.

Common implementations expose authenticated `/account/export` and `/account/delete` flows; verify their authorization, completeness, and downstream propagation.

### 4. Sub-processor list
Every third party that touches user data is a sub-processor. List them in the privacy policy:
- Supabase (DB + auth)
- Stripe (payments)
- Vercel / Cloudflare (hosting)
- Resend / Postmark (email)
- PostHog / Plausible (analytics)
- Sentry (errors)
- OpenAI / Anthropic (if you send user content to LLMs — this is huge and often missed)

Each has its own DPA you should sign (most are click-through).

### 5. Data Processing Agreement (DPA)
You sign DPAs with your sub-processors. If you have B2B customers, they will demand a DPA from you. Have a template ready.

## The retention question

"How long do we keep user data?"

Default AI answer: forever. Wrong.

**Pick a retention period per data class:**
- Account data: while account active + N days after deletion.
- Logs: 30–90 days.
- Analytics: 13 months max (matches Google Analytics default).
- Payment records: as long as tax law requires (often 7 years — talk to an accountant).
- Marketing emails: until unsubscribe.

Document it. Enforce it with scheduled deletion jobs.

## LLM-specific gotchas

If you send user content to OpenAI / Anthropic:
- It is a sub-processor. List it.
- Check the DPA. OpenAI has one; default API does not train on your data; "ZDR" zero-data-retention requires application.
- Sensitive data (health, financial, biometric, kids) — extra rules. Don't pipe it to a default API tier.

## Right to be forgotten — the cascade trap

"Delete my account" must propagate. AI builds the user-row delete and forgets:
- Backup snapshots (acceptable to keep, but document the retention).
- Logs (rotate fast, don't log emails / PII into permanent logs).
- Analytics events (PostHog `identify` calls — purge by distinct_id).
- Sentry breadcrumbs / scope (purge by user_id).
- Email provider contact lists (Resend, Postmark, Mailchimp).
- LLM provider conversation history (if you stored a session).
- CDN cached pages (rare but possible).

## EU Accessibility Act (June 2025)

If you sell to EU consumers, your app must meet WCAG 2.1 AA by **June 28, 2025**. This applies to apps too. Penalties vary by member state.

Practical floor:
- Color contrast 4.5\:1 minimum.
- Keyboard navigation works on every interactive element.
- Form fields have labels.
- Images have alt text.
- Focus indicators visible.
- ARIA labels where semantic HTML doesn't carry meaning.

Run `axe-core` in CI. Fix serious + critical findings.

## Children (if relevant)

If users under 16 (some member states 13) might use your app, you need parental consent (GDPR-K) AND COPPA in the US. If your app isn't designed for kids, add a "you must be 18+" gate and an age check at signup.

## The minimum viable compliance posture

1. Privacy policy live before launch.
2. Cookie banner if EU + non-essential cookies.
3. Sub-processor list current.
4. Data export endpoint working.
5. Account deletion endpoint working and propagating.
6. Retention periods documented and enforced.
7. `/legal/privacy`, `/legal/terms`, `/legal/cookies` linked from footer.
8. Contact email for privacy requests, monitored.
9. WCAG 2.1 AA at least on public surfaces (axe-core in CI).
10. Incident response plan: who do we tell, when, how (72-hour DPA notification rule).

## Drop-in checklist

- [ ] Privacy policy written and linked from footer
- [ ] Terms of service ditto
- [ ] Cookie policy ditto if cookies beyond strictly-necessary
- [ ] Cookie consent banner with granular choice (if EU)
- [ ] Sub-processor list in privacy policy includes ALL real sub-processors
- [ ] DPAs signed with each sub-processor
- [ ] Data export endpoint exists and works
- [ ] Account deletion endpoint cascades through logs/analytics/email lists
- [ ] Retention periods documented per data class
- [ ] No PII in long-term logs
- [ ] LLM provider listed as sub-processor if user content is sent
- [ ] Privacy contact email exists and is monitored
- [ ] WCAG 2.1 AA: axe-core in CI, no serious/critical findings
- [ ] 72-hour breach notification procedure documented

## Related notes

- [[Vibecoding - Things to Check on Your Code]] — security runbook
- [[Vibecoding - Secrets and Env Hygiene]] — secrets often contain PII access
- [[Vibecoding Security Research - Index]] — folder index
