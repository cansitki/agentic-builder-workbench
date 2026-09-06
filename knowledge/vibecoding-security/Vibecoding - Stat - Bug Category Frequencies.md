---
tags: [vibecoding, security, stat, bug-categories]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Bug Category Frequencies in LLM-Generated Code

Ranked bug categories from the [Veracode 2025 GenAI Code Security Report](https://www.veracode.com/resources/analyst-reports/2025-genai-code-security-report/) (100+ LLMs benchmarked), the [Apiiro 4× velocity / 10× vulnerabilities study](https://apiiro.com/blog/4x-velocity-10x-vulnerabilities-ai-coding-assistants-are-shipping-more-risks/), and the [4,241-CWE-instance survey, arXiv 2510.26103](https://arxiv.org/pdf/2510.26103).

## Veracode failure rates (2025)

| Rank | CWE | Category | Failure rate |
|------|-----|----------|--------------|
| 1 | CWE-117 | Log Injection | **88%** |
| 2 | CWE-79 / 80 | XSS | **86%** |
| 3 | — | Hardcoded credentials / weak crypto | recurring |
| 4 | CWE-89 | SQL Injection (string concat) | dominant pattern |

## Apiiro telemetry (Fortune-50, Dec 2024 → June 2025)

- Privilege-escalation paths: **+322%**
- Architectural design flaws: **+153%**
- Monthly findings volume: **1,000 → 10,000+ (10×)**
- AI-assisted devs commit **3-4× faster** during the same window — so vuln-density per commit is rising while velocity rises

## Per-language vulnerability rate (arXiv 2510.26103, n=4,241)

| Language | Vuln rate |
|----------|-----------|
| Python | 16-18% |
| JavaScript | 8.7-9% |
| TypeScript | 2.5-7.1% |

TypeScript wins — likely because the type system catches a class of bugs (null-deref, undefined member access) that would otherwise reach production.

## Memory bugs (C/C++)

[arXiv 2502.01853](https://www.arxiv.org/pdf/2502.01853) and [arXiv 2510.26103](https://arxiv.org/pdf/2510.26103): buffer overflow, integer overflow, use-after-free, null deref dominate in C/C++ generations.

## Systematic blind spots

Only **3 of 20 surveyed LLM-security studies** even cover error-handling — indicating it's a category researchers ignore *and* models neglect. SHIELDA paper ([arXiv 2508.07935](https://arxiv.org/html/2508.07935v1)) shows static try/catch is the dominant agent strategy, which is structurally insufficient.

## Practical takeaway

If you're prioritizing remediation in an LLM-generated codebase: **log injection, XSS, and SQLi first**. They appear most often, are easiest to scan for (semgrep/CodeQL), and have the clearest fixes.

## Related

- [[Vibecoding - Stat - Veracode 2025 Report]]
- [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]]
- [[Vibecoding - Tooling SAST and Scanners for AI Code]]