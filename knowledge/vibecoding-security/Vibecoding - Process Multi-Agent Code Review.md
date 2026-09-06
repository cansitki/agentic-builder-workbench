---
tags: [vibecoding, security, defense, code-review]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Process — Multi-Agent Code Review and Devil's Advocate

**Single-agent self-review is weaker than two adversarial agents disagreeing. Inter-agent disagreement is the strongest signal — weight findings by it, not by individual confidence.**

## The pattern
Adversarial multi-agent loop:
- **Author** — generates / modifies code
- **Reviewer** — independent agent with explicit critique role
- **Tech Lead** (optional) — adjudicator on disagreements

Loop priority order (enforce in prompt or trivial nits crowd out real bugs):
1. Correctness
2. Error handling
3. Performance
4. **Security**
5. Maintainability
6. Tests

## Empirical signal: disagreement weight
MindStudio analysis of multi-agent review patterns: when specialized agents (Security / QA / Architect) disagree, the **disagreement itself** is the highest-precision signal. False-positive rate drops sharply when you weight findings by inter-agent agreement (or, conversely, by independent corroboration).

This is why [[Vibecoding - Process Secure Prompt Patterns RCI]] (single-agent self-criticism) gets 77.5% reduction but multi-agent gets higher — independence is doing the work.

## Empirical signal: AI vs human review (CoderRabbit, 470 PRs)
- AI-authored PRs ship **10.83 issues**
- Human PRs ship **6.45 issues**
- AI PRs have **~1.4-1.7× more critical/major findings**
- Classic human review catches ~60% of defects on average

Implication: **neither alone is enough.** AI review + human review + deterministic SAST stacked beats any single layer.

## UX matters
GitHub Actions case study (arXiv 2508.18771): bulk auto-comments on every line are ignored. **Manual-trigger, hunk-level, code-snippet-bearing review comments** are the ones developers actually act on. Always-on commenters get muted within a week.

## Open implementations
- **claude-devils-advocate** (Richie Thomas) — slash command for Claude Code that runs the adversarial loop
- **Endor Labs multi-agent design-flaw detector** — research whitepaper + tooling
- **Anthropic Code Review** (March 2026) — installs as default GitHub PR commenter

## Org-policy implication
The economically rational governance pattern:
1. AI generates code
2. AI reviewer flags suspicious diffs
3. Deterministic SAST runs on the diff
4. Human reviews diffs the AI/SAST flag with confidence
5. Auto-merge only the diffs all three layers agree on

This is more conservative than current vibe-coded shipping, but ships orders of magnitude more code than human-only review.

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Process Secure Prompt Patterns RCI]]
- [[Vibecoding - Tooling SAST and Scanners for AI Code]]

## Sources
- [claude-devils-advocate (Richie Thomas)](https://github.com/richiethomas/claude-devils-advocate)
- [Endor Labs multi-agent review whitepaper](https://www.endorlabs.com/learn/ai-security-code-review-a-multi-agent-approach-for-detecting-security-design-flaws-at-scale)
- [MindStudio multi-agent review](https://www.mindstudio.ai/blog/automated-code-review-multiple-ai-agents)
- [CoderRabbit AI vs human report](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)
- [Human vs AI code defects (arXiv)](https://arxiv.org/abs/2508.21634)
- [AI code review GitHub Actions study](https://arxiv.org/html/2508.18771v1)
- [Anthropic Code Review launch](https://techcrunch.com/2026/03/09/anthropic-launches-code-review-tool-to-check-flood-of-ai-generated-code/)
- [The Register: AI code bugs need attention](https://www.theregister.com/2025/12/17/ai_code_bugs/)