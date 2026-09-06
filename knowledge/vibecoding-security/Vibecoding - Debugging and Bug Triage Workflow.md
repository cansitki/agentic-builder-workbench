---
tags: [security, vibecoding, debugging, workflow, runbook]
parent: "[[Vibecoding Security Research - Index]]"
created: 2026-04-29
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding - Debugging and Bug Triage Workflow

The operational side of shipping vibecoded apps. Not a security note — a survival note. Written for solo builders who ship daily and need to diagnose, fix, and learn from bugs without a QA team or staging environment.

Companion to [[Vibecoding - Things to Check on Your Code]] (prevention) and [[Vibecoding - Incident Response Runbook]] (incidents at scale). This note covers the day-to-day: a button doesn't work, the deploy 500s, a user emails "it's broken."

## The mental model

Three loops, in order:

1. **Reproduce** — can you make it happen on demand? If not, you're guessing.
2. **Locate** — where does the failure actually live? Symptom site is rarely the cause.
3. **Fix and verify** — change one thing, confirm it fixed the symptom AND didn't break a sibling.

Skipping step 1 is the #1 vibecoder mistake. "Try this" without a repro burns AI tokens and destroys your context window for nothing.

## The error message is your currency

Every error has two parts: the **message** (what failed) and the **stack** (where). Both matter. Copy them verbatim — never paraphrase, never truncate.

**Where errors live:**
- Terminal running the dev server — server-side crashes, build errors
- Browser DevTools console — client-side JS errors, network failures
- Browser DevTools Network tab — failed API calls (red status codes), CORS blocks
- Sentry / Logtail / your error tracker — production errors users hit
- The user's bug report — usually incomplete, ask follow-ups

**Read order for a 500:** server terminal first → Sentry → browser network tab. The server log has the real stack trace; the browser only sees "500 Internal Server Error."

**Read order for a UI bug:** browser console first → network tab → server log. Most UI bugs are client-side.

## The minimal repro format

Before asking AI, a teammate, or Stack Overflow — write it down in this shape:

```
**State before**: I'm logged in as a buyer, on the /listings/abc page, with item already in cart.
**Action**: Click "Buy now."
**Expected**: Redirect to /checkout/abc with cart preserved.
**Actual**: 500 error, redirected to /error page.
**Error**: [paste exact message + stack from server terminal]
**Reproduces**: 5/5 attempts, fresh incognito too.
```

Five lines. If you can't fill all five, you're not ready to fix it — you're ready to investigate.

The act of writing it usually surfaces the answer. If it doesn't, paste the whole block into the AI verbatim.

## The AI debugging loop

```
1. Write minimal repro (above).
2. Paste repro + relevant file(s) into AI.
3. AI proposes a fix. Read it — don't apply blindly.
4. Apply, run repro again.
5. If fixed: commit with descriptive message. Done.
6. If not fixed: paste new error + what you tried back into the same context.
7. After 3 failed loops: STOP. Switch tools. (See "When AI fails" below.)
```

**Anti-patterns to avoid:**
- "Just make this work" without a repro → AI invents fixes for imagined bugs
- Accepting a fix that adds try/catch around the symptom → see [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]
- Letting AI rewrite the whole file when you only need to change a few lines → loses context, introduces regressions
- Pasting your entire codebase → AI ignores most of it, response quality drops

## When AI fails

After three failed AI loops, the AI doesn't have enough context, or you don't have enough understanding. Switch:

1. **Read the actual library docs** — not the version AI remembers. Use Context7 / `/docs` / official site. Especially for Next.js, Supabase, Stripe — APIs change fast and AI training data lags.
2. **Search the exact error message** — Google, Stack Overflow, GitHub issues for the library. Quote the error in `"double quotes"` to force exact match. Filter to the last year.
3. **Read your own code** — open the file, read top-to-bottom. Often the bug is two lines above where the stack points.
4. **Add logging at suspected boundaries** — `console.log({ userId, listingId, status })` before and after the suspect line. Run repro. Inspect.
5. **Bisect via git** — `git log --oneline` to find the last working commit. `git diff <last-good>..HEAD <suspect-file>` to see what changed. Often "I don't know what broke" becomes obvious.
6. **Ask a human** — Discord/Slack of the relevant tool, with your minimal repro. People will help if you've done the work.

## Logging strategy

You don't need a logging framework. You need three things:

- **Boundary logs** — at every external API call: `console.log('[stripe.checkout]', { listingId, userId, ts: Date.now() })`. Tag with the subsystem in brackets so you can grep.
- **Failure logs** — every catch block: `console.error('[stripe.checkout] failed', err)`. Never swallow silently.
- **State transition logs** — when something changes status: `console.log('[purchase] status', { id, from: 'pending', to: 'completed' })`.

Don't log: passwords, tokens, full request bodies (might contain PII), raw Stripe webhook payloads in production. Do log: IDs, timestamps, status codes, error codes.

For production, pipe to Sentry or Logtail. Tail in dev with the terminal.

See [[Vibecoding - Logging and SIEM Without PII Leakage]] for the privacy side.

## Bug triage workflow

When users report bugs, you need a system or you'll lose them:

**Intake (1 minute per bug):**
1. Bug arrives (email, form, Discord, Sentry alert).
2. Capture in one place. Options that work:
   - **Notion database** with status (new/triaged/in-progress/done), severity (low/med/high/critical), assignee, link to repro
   - **Linear** if you want a real issue tracker
   - **GitHub Issues** if your repo is the source of truth
   - **Google Form** for user-submitted bugs piped into Notion via Zapier/Make
3. Sentry → Notion via webhook is the highest-leverage automation. Each crash becomes a triage row automatically.

**Triage (2 minutes per bug):**
1. Severity: does it block users from completing the core flow? → critical. Does it affect <10% of users? → low. Everything else → med.
2. Reproducible? Try once. If yes, you can fix later. If no, mark "needs repro" and ask the user for steps.
3. Known? Search the tracker — same bug as #47? Merge.

**Fix (variable):**
- Critical: drop everything, fix now, deploy.
- Med: batch into the next session, fix 3-5 in one pass.
- Low: backlog, revisit weekly.

## Git as your time machine

Vibecoding without git discipline = lost work guaranteed.

**The minimum:**
- `git commit` every time something works. Yes, every time. Small commits = easy reverts.
- Descriptive messages: `fix: webhook signature verification was checking wrong header`. Not `fix bug`.
- Branch for risky experiments: `git checkout -b try-stripe-refactor`. Easy to throw away.
- `git stash` before pulling AI's fix — gives you a one-command undo if it breaks more than it fixes.

**When something breaks:**
- `git log --oneline -20` — see recent commits
- `git diff HEAD~1` — what changed in the last commit
- `git checkout <commit-hash>` — go back to a working state (read-only; create a branch to keep changes)
- `git revert <commit-hash>` — undo a specific commit while keeping history

**Recovery commands you'll need someday:**
- `git reflog` — every HEAD movement, including reset/rebase. Lets you recover from "I deleted my branch by accident."
- `git fsck --lost-found` — find dangling commits when reflog isn't enough.

## Feedback collection

Don't wait for users to email you. Make it easy:

- **In-app feedback button** — bottom right of every page, opens a textarea + screenshot upload. Posts to your tracker.
- **Sentry user feedback prompt** — when an error occurs, ask the user "what were you trying to do?" Sentry has this built in.
- **Public changelog with feedback link** — every release shows what's new + a "report issues" link.
- **Email auto-reply** — when users email support, auto-reply with "we got it, here's the tracker URL." Reduces "did you see my email?" follow-ups.

The shorter the path from "this is broken" to "you have a structured bug report," the more you'll actually fix.

## Production debugging without breaking it

When the bug only happens in production:

1. **Read logs first.** Sentry, Vercel logs, Supabase logs. 80% of the time the answer is there.
2. **Check the database.** Query the actual rows the user touched. Often the data is in a state your code didn't expect.
3. **Replay the request.** If you have the exact payload (Stripe webhook event, signed URL token), POST it to localhost.
4. **Add logging, deploy, wait for it to happen again.** Slow but safe.
5. **Never** debug live by editing prod. Even "one quick fix" via Vercel dashboard creates drift between repo and reality.

For destructive incidents (data loss, mass exposure, payment bugs), use [[Vibecoding - Incident Response Runbook]].

## Drop-in checklist

```
[ ] Every bug has a written minimal repro before AI sees it
[ ] Error messages copied verbatim, never paraphrased
[ ] Sentry (or equivalent) catches all unhandled errors in prod
[ ] Sentry/error-tracker piped into a triage system (Notion/Linear/GitHub)
[ ] Every commit message describes what changed and why
[ ] Commit cadence: every working state, not "end of session"
[ ] Boundary + failure logs at every external API call
[ ] Logs never contain secrets, tokens, or full PII payloads
[ ] In-app feedback button on every page
[ ] After 3 failed AI debug loops, switch to docs / search / git bisect
[ ] No "fixes" that wrap try/catch around the symptom without diagnosis
```

## See also

- [[Vibecoding - Things to Check on Your Code]] — prevention checklist
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]] — what NOT to do when fixing
- [[Vibecoding - Incident Response Runbook]] — when bugs become incidents
- [[Vibecoding - Logging and SIEM Without PII Leakage]] — what to log, what to redact
- [[Vibecoding Security Research - Index]] — folder index
