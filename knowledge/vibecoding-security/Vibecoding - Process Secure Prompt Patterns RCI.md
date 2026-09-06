---
tags: [vibecoding, security, defense, prompt-engineering]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Process — Secure Prompt Patterns and RCI

**Generic "make it secure" suffixes have limited effect. Security-focused prefixes cut vulns 56%. Recursive Criticism & Improvement (RCI) cuts them 77.5%. Adversarial prompts can still re-introduce vulnerabilities — prompt hardening is necessary but insufficient.**

## What doesn't work
- Suffix: "Also make it secure." — minimal effect (reported gains in single digits)
- Generic "best practices" reminder — model already saw it in training, doesn't change behavior
- "Don't generate vulnerabilities" — the negative framing is poorly attended

## What works — measured

**Security-focused prefix** (arXiv 2407.07064 / TOSEM 2026):
- Up to **56% vulnerability reduction** on GPT-4o
- Mechanism: front-loads security as the *primary task*, not a side-constraint
- Format: explicit threat-model statement before the functional task

**Recursive Criticism & Improvement (RCI)** (same paper):
- Generate → self-critique → revise
- Up to **77.5% reduction** in vulnerability density on GPT-4
- Cost: 3× tokens, 3× latency
- Replicated across models in "Guiding AI to Fix Its Own Flaws" (arXiv 2506.23034)

## RCI in practice (a template)
```
Round 1 (generate): "Implement <feature>. Output code only."
Round 2 (criticize): "Review the code above for security vulnerabilities.
                      Specifically check for: SQL injection, XSS, auth bypass,
                      hardcoded secrets, missing input validation, IDOR.
                      List each finding with severity."
Round 3 (revise): "Apply the fixes from your review. Output the corrected code only."
```

A multi-agent variant: separate Generator and Reviewer models. Disagreement is the strongest signal — see [[Vibecoding - Process Multi-Agent Code Review]].

## What still doesn't help
- Adversarial prompts can re-introduce vulnerabilities even after RCI hardening (arXiv 2601.07084)
- Models can be jailbroken to skip the security pass entirely
- Prompt hardening is **necessary-but-not-sufficient** — must be paired with SAST + multi-agent review

## The "vibe-coded" prompt anti-pattern
Most vibe-coding prompts are pure functional spec: "Build a checkout flow that takes Stripe tokens." Zero threat model. The model defaults to demo-grade defaults: no rate limiting, no webhook verification, no payment_status guard. RCI on the same prompt: 77% fewer vulns. Cost: minutes.

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Process Multi-Agent Code Review]]
- [[Vibecoding - Tooling SAST and Scanners for AI Code]]

## Sources
- [Prompting techniques for secure code (TOSEM)](https://dl.acm.org/doi/10.1145/3722108)
- [Prompting Techniques arXiv 2407.07064](https://arxiv.org/abs/2407.07064)
- [Guiding AI to Fix Its Own Flaws](https://arxiv.org/html/2506.23034v1)
- [Adversarial Prompts vs Secure Code Gen](https://arxiv.org/html/2601.07084)