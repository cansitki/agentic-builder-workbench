---
tags: [vibecoding, security, research, academic]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Stat — Academic Studies on AI-Generated Code Security

Two foundational peer-reviewed studies anchor the field. The numbers haven't moved.

## Pearce et al., NYU "Asleep at the Keyboard?" (IEEE S&P 2022)
- **89 security-relevant scenarios** mapped to MITRE CWE Top 25
- Languages: Python, C, Verilog
- Generated **1,689 programs** via Copilot (Codex, Aug 2021)
- **39.33% (~40%) of programs vulnerable** — the original benchmark figure
- Top CWEs: 787 (out-of-bounds write), 79 (XSS), 89 (SQLi), 20 (input validation), 416 (use-after-free)

**Follow-up (Asare et al., ACM TOSEM 2025)**: same CWE distribution in 452 real-world Copilot snippets mined from public GitHub. The lab numbers held in production.

## Perry et al., Stanford "Do Users Write More Insecure Code With AI Assistants?" (CCS 2023)
- N = 47 human participants (33 experimental + 14 control, 2:1)
- 5 security-relevant tasks across Python, JavaScript, C
- Codex-davinci-002 backend

**Findings:**
- Experimental group wrote **significantly less secure code in 4 of 5 tasks**
- They were **more likely to believe their code was secure** (overconfidence)
- Trust-tuning prompts and lower trust correlated with better outcomes

This is the first peer-reviewed evidence that AI assistance **causally worsens** human security output. Not a correlation. Not vibes. RCT-style with control group.

## Cross-cutting limitations
- Pre-GPT-4-class models in both papers
- But: Veracode's flat 2024-2026 curve says newer models haven't fixed it (see [[Vibecoding - Stat - Veracode 2025 Report]])
- Model drift in either direction can't move a 4-of-5-task-degradation result much

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]
- [[Vibecoding - Root Causes]]

## Sources
- [Pearce et al. "Asleep at the Keyboard?"](https://arxiv.org/abs/2108.09293)
- [CACM Research Highlight](https://cacm.acm.org/research-highlights/asleep-at-the-keyboard-assessing-the-security-of-github-copilots-code-contributions/)
- [Asare et al. follow-up](https://arxiv.org/html/2310.02059v2)
- [Perry et al. CCS 2023](https://arxiv.org/abs/2211.03622)
- [Stanford EE press release](https://ee.stanford.edu/dan-boneh-and-team-find-relying-ai-more-likely-make-your-code-buggier)