---
tags: [vibecoding, security, tool-profile, copilot]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Copilot's Failure Mode: Confidently Insecure Inline Suggestions

GitHub Copilot's distinguishing pattern is **trained-pattern echo** — it reproduces the most common (and most-vulnerable) Stack Overflow / GitHub patterns verbatim. Because vulnerable patterns are over-represented in the corpus, Copilot produces them at high rates.

## Numbers

- **Pearce et al. (2021, ACM CACM 2025)** — 'Asleep at the Keyboard', [arXiv 2108.09293](https://arxiv.org/abs/2108.09293). 1,689 completions across 89 CWE-Top-25 scenarios; ~40% vulnerable.
- **Fu et al. (TOSEM 2024-25)**, [arXiv 2310.02059](https://arxiv.org/abs/2310.02059). Real-world Copilot usage corpus: **29.5% of Python and 24.2% of JS snippets contained CWE-mapped weaknesses** across 43 distinct CWEs.
- **Copilot Code Review feature** — [arXiv 2509.13650](https://arxiv.org/html/2509.13650v1) shows it preferentially flags style/typo issues and **misses SQLi, XSS, insecure deserialization**.

## Concrete recurring patterns

- String-concatenated SQL queries
-  for password hashing
-  on user input
- Hardcoded credentials echoed from training data
- Missing CSRF tokens on form handlers

## Why it matters

Inline = narrow blast radius per suggestion but **maximum volume**. A 24-29% vuln rate at Copilot's adoption scale ships more vulnerabilities per day than any other class of tool.

## Related

- [[Vibecoding - Stat - Veracode 2025 Report]]
- [[Vibecoding - Stat - Academic Studies Pearce Stanford]]
- [[Vibecoding - Tool Profile Cursor]]
- [[Vibecoding - Tool Profile Claude Code]]



## Note: backtick fix

Two patterns shell-eval'd during note creation. Reading them as: `md5` for password hashing; `pickle.load` on user input.