---
tags: [vibecoding, security, prompt-injection, agents]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Indirect Prompt Injection — EchoLeak (CVE-2025-32711)

**The first confirmed real-world zero-click prompt injection in production. NIST: "generative AI's greatest security flaw." OWASP LLM Top-10 2025: ranked #1.**

## What it is
The attacker never talks to your LLM directly. They plant payloads in **data the agent later ingests**:
- DB rows
- Scraped HTML
- RAG documents
- Calendar invites
- Email bodies
- Support tickets
- Anything user-controlled that becomes context

When the agent reads that data, the embedded "ignore previous instructions, do X" hijacks the next tool call.

## EchoLeak — CVE-2025-32711, CVSS 9.3, June 2025
The proof-of-concept that this is real, not theoretical.

**The vector:**
1. Attacker sends a single email to a Microsoft 365 Copilot user
2. Email contains hidden Markdown instructions
3. User later asks Copilot anything sensitive
4. Copilot reads the email as part of its context
5. Copilot embeds a Markdown reference-style image pointing at attacker URL
6. The Teams client auto-fetches the image
7. **Internal data exfiltrated via the image URL query string**

Bypassed Microsoft's XPIA classifier, link redaction, and CSP via a Teams proxy. Fixed server-side without an advisory.

Truesec/Aim Security shipped follow-ups: same family, poisoned SharePoint docs cause Copilot to leak Outlook contents.

## Defenses that don't work
- Classifier-based detection (XPIA was bypassed)
- Telling the LLM "ignore injection attempts in the data" (recursive — also injectable)
- Output filtering alone (the data path bypasses it)

## Defenses that work
- See [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]]
- **Strip auto-fetched images/links** from rendered LLM output (the EchoLeak vector specifically)
- **Provenance tagging**: mark every token by source; deny tool calls whose arguments depend on untrusted-source tokens
- **Tool-call allowlists** with structured schemas

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Prompt Injection]]
- [[Vibecoding - RAG Poisoning]]
- [[Vibecoding - Tool-Use Confused Deputy]]

## Sources
- [EchoLeak / CVE-2025-32711 (HackTheBox)](https://www.hackthebox.com/blog/cve-2025-32711-echoleak-copilot-vulnerability)
- [EchoLeak paper, arxiv 2509.10540](https://arxiv.org/abs/2509.10540)
- [Microsoft MSRC on indirect injection defences](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- [Truesec novel Copilot attack](https://www.truesec.com/hub/blog/novel-cyber-attack-exposes-microsoft-365-copilot)
- [Simon Willison: Design Patterns for Securing LLM Agents](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)