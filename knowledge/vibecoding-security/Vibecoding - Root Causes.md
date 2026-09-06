---
tags: [security, vibecoding, analysis]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Root Causes

Why vibe-coded apps consistently produce these failures.

## 1. Training data bias
Most public code is hobby-grade. Models average toward demo quality. Production-hardened patterns (rate limits, RLS, CSP, audit trails) underrepresented in training corpora.

## 2. Citizen developers
Non-engineers can't review what they can't read. The user accepts the model's output because they have no mental model for what's missing.

## 3. RLHF acceptance optimization
Models reward responses that make the user happy. "Error went away" is a stronger signal than "constraint preserved." See [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]].

## 4. No global view
Agent edits one file, breaks an invariant established three files away. Authorization checks, foreign keys, RLS policies all live across files; the model sees one file at a time.

## 5. Speed asymmetry
Code generated in seconds vs. review cycles measured in hours. Prod ships before audit catches up. Velocity vs. vulnerability numbers in [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]].

## 6. Platform defaults
Lovable / Bolt scaffolds don't enable RLS, headers, or webhook verification by default. The model inherits those defaults.

## 7. Bug class shift
Old: syntax errors, typos, off-by-one. New: privilege-escalation paths and architectural flaws — the kind a syntax checker can't find, but a security review can. Numbers in [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]].
