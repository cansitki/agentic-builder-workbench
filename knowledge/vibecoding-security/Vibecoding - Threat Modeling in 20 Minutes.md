---
tags: [security, vibecoding, threat-modeling, stride, process]
parent: '[[Vibecoding Security Research - Index]]'
created: 2026-04-29
status: draft
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Threat Modeling in 20 Minutes

> **The bug:** You ship the payment flow / auth handler / file uploader without ever asking *what could go wrong here*. Two weeks later you find out from a Stripe email or a stranger on Twitter. Threat modeling is the cheapest possible way to find these bugs — before you write the code.

Most vibecoders skip threat modeling because the literature is enterprise-coded: kickoff meetings, dedicated tools, security architects, sign-off. Forget all that. **For a solo builder, threat modeling is one person + paper + 20 minutes, run once per risky feature.** That's the whole thing.

## The four questions (Shostack)

Adam Shostack's framework is the only one you need to memorize:

1. **What are we working on?**
2. **What can go wrong?**
3. **What are we going to do about it?**
4. **Did we do a good job?**

If you answer these four for one feature, in writing, you've threat-modeled. That's it. Everything below is just scaffolding to help you answer them faster.

## STRIDE — the prompt list for question 2

STRIDE is a checklist of the six things that can go wrong. Walk it. Don't try to invent threats from scratch.

| Letter | Threat | Violates | Vibecoder example |
|---|---|---|---|
| **S** | Spoofing | Authentication | Forging a webhook from "Stripe" — see [[Vibecoding - Webhook Security]] |
| **T** | Tampering | Integrity | Editing the price in a hidden form field on checkout |
| **R** | Repudiation | Non-repudiation | User claims "I never bought that" and you have no audit log |
| **I** | Info disclosure | Confidentiality | IDOR on `/orders/123` leaks another user's invoice — see [[Vibecoding - IDOR and Authz Patterns]] |
| **D** | Denial of service | Availability | Someone hammers your `/signup` endpoint and burns your Resend quota |
| **E** | Elevation of privilege | Authorization | Regular user calls `/api/admin/*` and the route doesn't check role |

That table is the whole point of STRIDE. Print it, tape it next to your monitor.

## The ONLY rule: per-feature, not per-app

The single biggest mistake in DIY threat modeling is **boiling the ocean** — sitting down with a blank page and trying to model your entire SaaS. You will give up in 40 minutes with nothing to show.

Instead: **one feature, one session, one page of paper.**

Pick the riskiest feature you're about to ship. Model only that. Move on.

### When to threat-model

Do it *before* you write the code, when the design is still cheap to change. Mandatory for:

- Anything touching **money** (checkout, payouts, refunds, subscriptions)
- Anything touching **auth** (login, password reset, OAuth, session)
- Anything touching **other people's files** (uploads, downloads, signed URLs)
- Anything touching **other people's data** (multi-tenant queries, sharing, exports)
- Anything that runs **as admin** (cron jobs, webhooks, internal endpoints)
- Anything that **calls an LLM with user input** (prompt injection, tool abuse)

Don't threat-model the marketing site. Don't threat-model the dark mode toggle.

## The 20-minute session template

Copy this into a scratch note (or actual paper — paper is faster) every time you're about to build a risky feature.

```
Feature: ____________________   Date: ____________

1. WHAT ARE WE BUILDING? (3 min)
   One paragraph. The user does X, the system does Y, data Z is touched.

2. SKETCH THE DATA FLOW (4 min)
   Draw boxes for: user, your app, your DB, third parties.
   Draw arrows showing what data moves where.
   Draw a DOTTED LINE around each trust boundary
   (browser <-> server, your app <-> Stripe, your app <-> Supabase service role).
   Anywhere data crosses a dotted line = where threats live.

3. LIST ASSETS (2 min)
   What does an attacker actually want?
   Concrete only: "the buyer's email", "the file in S3",
   "my Stripe secret key", "the admin role".
   Skip abstract assets like "trust" or "reputation".

4. WALK STRIDE (8 min)
   For each arrow crossing a trust boundary, ask:
     S - can the source be faked?
     T - can the data be modified in transit or at rest?
     R - if this goes wrong, can we prove what happened?
     I - who else could read this?
     D - what if someone calls this 1000x/sec?
     E - what if the caller lies about their role / user_id?
   Write down every "yeah that could happen".

5. BACKLOG (3 min)
   For each "could happen", write ONE line:
   - Fix now (write the code defensively)
   - Fix later (ticket it)
   - Accept (document why it's OK)
   Feed the "fix now" items into [[Vibecoding - Things to Check on Your Code]].
```

**Rules of the session:**
- Set a timer. When it rings, stop.
- One feature only. If you find yourself drifting into another feature, write "also model X" on the page and come back.
- It's fine to end with no findings. That's a result.
- It's fine to end with 12 findings. Triage ruthlessly — most go in "fix later".

## Trust boundaries — the only diagram concept that matters

A **trust boundary** is any place where data crosses from a less-trusted zone to a more-trusted one. That's where bugs live. Examples:

- Browser → your API (user input is hostile)
- Your API → your DB (did you check the user owns this row?)
- Stripe → your webhook (did you verify the signature?)
- Your app → Supabase service role (you just left RLS-land — every query is now god-mode)
- User-uploaded file → your image processor (ImageMagick CVEs say hi)

If you only model one thing, model the trust boundaries. Forget formal DFDs. A box-and-arrow napkin sketch with dotted lines for boundaries beats any tool.

## Tooling

**Use paper.** Or a whiteboard. Or a markdown file. That's the recommendation.

If you really want a tool:

- **OWASP Threat Dragon** — free, open source, runs in browser or as desktop app, GitHub integration, saves models as JSON. The right answer if you want a tool.
- **Microsoft Threat Modeling Tool** — Windows-only, enterprise-shaped, generates threats automatically from a DFD. Overkill for solo work, but the auto-generated threat list is a useful learning aid if you've never done STRIDE before.
- **IriusRisk / ThreatModeler / SD Elements** — commercial, ignore.

The failure mode of tools is that you spend 2 hours fighting the tool and 5 minutes thinking about threats. Paper has no UI.

## Common mistakes

- **Boiling the ocean.** Modeling the whole app. Always pick one feature.
- **Abstract assets.** "Customer trust" is not an asset. "The customer's email and password hash in the `users` table" is.
- **Threat theater.** Listing 40 threats and fixing none. The output is a backlog, not a book.
- **Modeling after shipping.** Doing it on already-deployed code, when changing the design is expensive. Do it *before*.
- **Forgetting the third question.** Listing what could go wrong, never deciding what to do. Every finding gets a verdict: fix now / fix later / accept.
- **Skipping question 4.** A week later, ask: did the fixes actually land? Did the feature ship with the threats addressed? If no, the model was theatre.
- **One-shot mentality.** Threat models go stale. Re-run when the feature changes shape (new auth method, new third party, new data type).

## Drop-in checklist

Before writing risky code:

- [ ] Identified this feature is risky (touches money / auth / files / other-user data / admin / LLM)
- [ ] Set a 20-minute timer
- [ ] Wrote one paragraph: what the feature does
- [ ] Sketched data flow with trust boundaries (dotted lines)
- [ ] Listed concrete assets an attacker would want
- [ ] Walked STRIDE on every arrow crossing a trust boundary
- [ ] Each finding has a verdict: fix now / fix later / accept
- [ ] "Fix now" items added to [[Vibecoding - Things to Check on Your Code]]
- [ ] "Fix later" items ticketed
- [ ] Saved the page (photo of paper is fine) so you can revisit
- [ ] One week after shipping: re-read the model, confirm fixes actually landed

## References

- Adam Shostack, *Threat Modeling: Designing for Security* (Wiley, 2014) — the canonical book. Chapter 3 (STRIDE) and Chapter 18 (lightweight) are the relevant ones.
- Shostack's Four Question Framework: https://shostack.org/resources/threat-modeling
- 4QuestionFrame repo: https://github.com/adamshostack/4QuestionFrame
- OWASP Threat Dragon: https://owasp.org/www-project-threat-dragon/
- Microsoft STRIDE intro (still the clearest short read): https://learn.microsoft.com/en-us/archive/msdn-magazine/2006/november/uncover-security-design-flaws-using-the-stride-approach

## Related

- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Things to Check on Your Code]] — where the "fix now" findings land
- [[Vibecoding - IDOR and Authz Patterns]] — most STRIDE-I and STRIDE-E findings end up here
- [[Vibecoding - Webhook Security]] — STRIDE-S and STRIDE-T on the Stripe boundary


## Trust boundaries vibecoded apps usually miss

When sketching the data flow (step 2), draw a dotted boundary at every one of these:

- Browser → API (most people remember this)
- API → DB (RLS is the boundary, not just the auth check above it)
- API → LLM provider (your prompts and any embedded user data leave your perimeter)
- LLM → tool execution (the confused-deputy boundary — see [[Vibecoding - Tool-Use Confused Deputy]])
- Webhook source → your handler (signature verification is the boundary)
- One tenant → another (multi-tenant isolation lives here)
- One environment → another (prod creds must not exist in staging)

## After STRIDE: decide what to do per threat

For each threat you list, pick exactly one disposition:

- **Mitigate** — write the code/config that prevents it.
- **Transfer** — push the risk to a vendor with an SLA (Stripe handles card data, Auth0 handles password storage).
- **Accept** — write down why this is acceptable, who signed off, and when to revisit.
- **Eliminate** — cut the feature.

Writing these down is the artifact. The diagram + threat list + dispositions in a markdown doc is the threat model.

## Adjacent frameworks (when STRIDE is not enough)

- **PASTA** — Process for Attack Simulation and Threat Analysis. Heavier; used in regulated industries.
- **LINDDUN** — privacy-focused threat modeling. Complements STRIDE for any feature touching PII (pairs with [[Vibecoding - Privacy and GDPR Minimum]]).
- **Attack trees** — useful when you have identified the goal and want to enumerate paths to it.
- **Microsoft Threat Modeling Tool** — free GUI for STRIDE if drag-drop diagrams beat markdown for you.