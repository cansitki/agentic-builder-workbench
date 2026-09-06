---
tags: [vibecoding, security, research, veracode]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Stat — Veracode 2025 GenAI Code Security Report

**Headline: 45% of AI-generated code samples failed security tests, flat year-over-year despite syntactic accuracy rising sharply.**

## Methodology
- 80 code-completion tasks crafted from MITRE CWE definitions
- Each task had a known secure resolution path AND an insecure one
- Fed to 100+ LLMs across vendors / sizes / release dates
- Languages: Java, JavaScript, Python, C#
- Outputs scanned with Veracode Static Analysis

## Key numbers
- **45%** overall fail rate (introduces an OWASP Top 10 flaw)
- **CWE-80 (XSS)**: 86% failure
- **CWE-117 (Log injection)**: 88% failure
- **CWE-89 (SQLi)** + **CWE-327 (weak crypto)**: majority failure
- **By language**: Java 72%, C# 45%, JavaScript 43%, Python 38%

## Why it matters
Pass rate is **flat across multiple test cycles 2024 → early 2026**. Models got better at writing code that compiles. They did not get better at writing code that resists abuse. The defect class is structural, not training-volume-fixable.

## Limitations
- Synthetic completion tasks (no real-repo context)
- Only 4 CWE families
- SAST blind to runtime/auth/business-logic flaws — likely undercounts AI risk for design flaws
- Secure path always existed in training data (so this is a best-case measurement)

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Stat - Apiiro 4x Velocity 10x Vulnerabilities]]
- [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]]

## Sources
- [Veracode 2025 GenAI Report blog](https://www.veracode.com/blog/genai-code-security-report/)
- [Veracode 2025 GenAI Report PDF](https://www.veracode.com/wp-content/uploads/2025_GenAI_Code_Security_Report_Final.pdf)
- [Veracode October 2025 update](https://www.veracode.com/blog/ai-code-security-october-update/)
- [Help Net: 45% of AI code insecure](https://www.helpnetsecurity.com/2025/08/07/create-ai-code-security-risks/)