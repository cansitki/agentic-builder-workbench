---
tags: [vibecoding, security, agents, defense, architecture]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Defense Pattern — Dual-LLM and CaMeL

**The only architectural defense against prompt injection that has theoretical backing. Detection-based defenses (classifiers, output filters) are bypassable. Architectural defenses are not.**

## Dual-LLM (Simon Willison, 2023)
Two LLMs, two roles:

**Privileged LLM** — has tools, but **never sees untrusted text**.
**Quarantined LLM** — processes untrusted text, but **has no tools**, returns only opaque variables (`$VAR1`, `$VAR2`).

Privileged LLM operates on variable references; it never receives the underlying string content. The injection has nowhere to escape to.

## CaMeL (DeepMind, "Defeating Prompt Injections by Design", 2025)
Formalised dual-LLM. The key insight: **provenance tagging at the type-system level**.

How it works:
1. Privileged LLM emits a program in a **restricted Python DSL**
2. Runtime builds a **data-flow graph** tagging each value's origin and capabilities
3. At every tool call, runtime checks info-flow rules:
   - "This argument came from untrusted source X"
   - "This tool requires arguments from trusted source Y"
   - **Reject the call** if provenance doesn't match capability requirements

This is the first credible **architectural** defense — not a classifier hoping to detect injection, but a type system that makes injection structurally unable to influence privileged actions.

## Layered defense (defense-in-depth)
Treat all of these as layers, not single solutions:

| Layer | Tool/Pattern | Coverage |
|---|---|---|
| Input filter | Lakera Guard, NeMo Guardrails | Easy injections |
| Output filter | Strip auto-fetched URLs/images, structured output schemas | EchoLeak-class |
| Architecture | Dual-LLM / CaMeL | Indirect injection |
| Authorization | Per-task token minting (Oso) | Confused deputy |
| Approval | Human-in-loop for irreversible actions | Tool abuse |

Classifier-based detection is bypassable (XPIA was bypassed by EchoLeak — see [[Vibecoding - Indirect Prompt Injection EchoLeak]]).

## Practical adoption
CaMeL is research-grade as of April 2026 — no production runtime ships it directly. Closest production approximations:
- **Structured outputs** (OpenAI, Anthropic) — enforce JSON schema on every tool call
- **Tool-call allowlists** in agent frameworks (LangChain, Pydantic AI)
- **No-tool quarantine** for any LLM call that processes untrusted content (do summarization with a plain text-out LLM, then have a privileged LLM operate only on the summary's metadata)

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
- [[Vibecoding - Tool-Use Confused Deputy]]

## Sources
- [Simon Willison: Design Patterns for Securing LLM Agents](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)
- [Simon Willison: CaMeL writeup](https://simonw.substack.com/p/camel-offers-a-promising-new-direction)
- [DeepMind CaMeL coverage (InfoQ)](https://www.infoq.com/news/2025/04/deepmind-camel-promt-injection/)
- [NeMo Guardrails repo](https://github.com/NVIDIA-NeMo/Guardrails)
- [Bedrock vs NeMo vs Lakera comparison](https://www.aisecurityinpractice.com/defend-and-harden/guardrails-engineering/)