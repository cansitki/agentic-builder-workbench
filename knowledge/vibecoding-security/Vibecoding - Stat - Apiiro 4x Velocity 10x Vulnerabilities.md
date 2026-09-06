---
tags: [vibecoding, security, research, apiiro]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Stat — Apiiro: 4× Velocity, 10× Vulnerabilities

**The empirical bug-shift: AI-using developers ship 3-4× more code per month, generating ~10× more security findings — and the bugs that grew aren't typos, they're authorization flaws.**

## Methodology
- Apiiro Deep Code Analysis (DCA) engine
- Tens of thousands of repos, several thousand developers, Fortune 50 enterprises
- December 2024 → June 2025
- Compared AI-assisted vs unassisted commits

## Key numbers
| Metric | Change |
|---|---|
| Commit velocity | **3-4× higher** |
| New security findings/month | **~1,000 → ~10,000 (10×)** |
| Syntax errors | **−76%** |
| Logic bugs | **−60%** |
| **Privilege-escalation paths (CWE-269/285)** | **+322%** |
| Design-flaw classes (auth bypass, IDOR, missing input validation, broken sessions) | **+153%** |
| Secrets exposure (CWE-798/522) | **+40%** |
| Azure cred leaks specifically | **~2×** |

## The reframe
"AI generates secure code if the developer prompts well" is the wrong framing. AI doesn't make typing mistakes anymore — it makes **architectural and authorization** mistakes. Exactly the ones a junior reviewer cannot catch by reading a diff.

This is why SAST-only audits low-ball AI risk by ~1.5×: SAST sees CWE-79/89 patterns, not [[Vibecoding - No Authorization on Endpoints|missing auth checks]] or [[Vibecoding - SECURITY DEFINER Footguns|privilege boundaries]].

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]
- [[Vibecoding - Root Causes]]

## Sources
- [Apiiro: 4x velocity, 10x vulnerabilities](https://apiiro.com/blog/4x-velocity-10x-vulnerabilities-ai-coding-assistants-are-shipping-more-risks/)
- [The Register on Apiiro findings](https://www.theregister.com/2025/09/05/ai_code_assistants_security_problems/)