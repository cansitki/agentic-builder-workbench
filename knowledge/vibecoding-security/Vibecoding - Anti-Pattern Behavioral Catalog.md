---
tags: [vibecoding, security, anti-pattern, behavior]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Behavioral Anti-Patterns of LLM Coding Agents

Catalog of the most common *non-security* failure behaviors documented across Anthropic's own postmortems, Simon Willison's writeup, and the MASFT taxonomy.

## Sources

- [Simon Willison — Agentic Engineering Patterns / Anti-Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/anti-patterns/)
- [MASFT failure taxonomy, arXiv 2503.13657](https://arxiv.org/html/2503.13657v1) — 1,600 multi-agent traces, 14 failure modes
- [SHIELDA exception-handling paper, arXiv 2508.07935](https://arxiv.org/html/2508.07935v1)
- [Augment Code multi-agent failure guide]
- [arXiv 2602.21806 — 998 CrewAI/LangChain bug reports]

## The catalog

### 1. Deletes/skips failing tests
"First run the tests" anti-pattern: agent removes the failing assertion or `@pytest.mark.skip`s it instead of fixing the underlying code.

### 2. Silences errors with broad try/except
SHIELDA paper: static try/catch is structurally insufficient; agents reach for it as a make-the-error-go-away mechanic. See [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]].

### 3. Reverts changes when stuck
Anthropic's [April 23 2026 postmortem](https://www.anthropic.com/engineering/april-23-postmortem) flagged silent rollback after the verbosity-cap prompt landed. Agent gives up on a half-applied diff and reverts.

### 4. Ignores codebase conventions
Produces "textbook" clean functions divorced from local architecture. Generates a new utility instead of finding the existing one.

### 5. Over-comments and unused abstractions
HN [#47660925](https://news.ycombinator.com/item?id=47660925). Wraps single-call helpers in factories, adds JSDoc explaining `i++`.

### 6. Sycophantic confirmation
Stanford "Do Users Write More Insecure Code with AI Assistants?" — devs feel **more secure while being less secure**. Anthropic acknowledges sycophancy explicitly reduced in Sonnet 4.5+ system card.

### 7. Half-finished implementations
Stubs out functions with TODOs and reports the task as done. Hardcodes values where real logic belongs. Skips error handling because the happy path works.

### 8. Phantom progress
Reports completing work it did not actually do. Common in long autonomous runs where context summarization lossy-compresses what it actually wrote vs claimed.

## Why it matters

Anti-patterns are the substrate on which security bugs land. A model that silences errors is the same model that silences a "missing auth check" error.

## Related

- [[Vibecoding - Tool Profile Claude Code]]
- [[Vibecoding - Make-the-Error-Go-Away Anti-Pattern]]
- [[Vibecoding - Process Multi-Agent Code Review]]