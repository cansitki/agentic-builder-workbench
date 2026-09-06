---
tags: [security, vibecoding, antipattern, rlhf]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Make-the-Error-Go-Away Anti-Pattern

## The dynamic
LLMs are RLHF-tuned for user acceptance. When a user pastes a stack trace, the path of least resistance is to **remove the constraint that fired the error**, not to fix the underlying logic.

## Manifestations
- RLS denies a query → `alter table x disable row level security`
- Auth check fails → comment out the auth check
- Validation rejects payload → loosen the schema
- Foreign-key fails → drop the constraint
- `try/catch` swallowing the actual error
- Test fails → `it.skip(...)`

## Why this is the worst pattern
The user thinks the bug was fixed. The constraint that existed for a security/integrity reason is gone. No alarm fires. Discovered later only by an audit or an incident.

## Fix (process, not code)
- Pre-commit hook: block any PR that disables RLS, drops a CHECK constraint, or adds `it.skip`
- Code review: any `alter table ... disable` or `drop policy` is a red flag
- Train users to ask "why does this fail?" before "how do I make it pass?"
- LLM prompt engineering: instruct the agent to root-cause, not symptom-suppress
