---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: index-only
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - awesome-claude-skills

**Repo:** https://github.com/ComposioHQ/awesome-claude-skills
**Stars:** 57,021 (yes, fifty-seven thousand)
**Last activity:** Active — pushed 2026-04-28
**License:** Apache-2.0

## What it is
An "awesome list" — a curated index of Claude Skills (the customizable workflow units that run on Claude.ai, Claude Code, and the Claude API). Maintained by ComposioHQ as a content-marketing surface for their connect-apps plugin.

## Activity signal
Very active list, but star count is wildly inflated relative to substance — typical "awesome list" growth pattern. The list itself is just markdown links plus a Composio-branded "connect to 500+ apps" promo at the top.

## Core features
- Categorized index of Claude Skills: Document Processing, Dev & Code Tools, Data & Analysis, Business, Communication, Creative, Productivity, Collaboration, **Security & Systems**, App Automation via Composio.
- Pointers to first-party Anthropic skills (docx, pdf, pptx, xlsx, web-artifacts-builder) and dozens of community skills.
- Hand-picked dev-tooling entries: `aws-skills`, `Chrome Relay` (drives your real Chrome session), `FFUF Web Fuzzing`, `D3.js Visualization`, etc.
- Pushes the Composio `connect-apps-plugin` (Claude can email/Slack/issue across 500+ apps via OAuth).

## How it works mechanically
- Plain markdown list. No code. No tooling. You read it and click through.
- Composio's plugin: `claude --plugin-dir ./connect-apps-plugin` then `/connect-apps:setup` paste API key.

## When to use it
- Looking for a specific skill ("does someone have a Sentry skill?" "AWS CDK skill?") — search this list first before building one.
- Mining for skill-authoring patterns by browsing what others ship.

## When NOT to use it
- Don't treat star count as quality signal. Plenty of half-finished entries.
- Not a security tool itself. The "Security & Systems" subsection is small and should be cross-referenced against [[Vibecoding - Audit Checklist]] before trusting any entry.
- Composio's OAuth-to-500-apps pitch is great UX but expands the [[Vibecoding - Secrets and Env Hygiene]] surface area dramatically — every connected app = another credential set Claude can touch. Threat-model before installing.

## Verdict: **index-only**
Bookmark for skill discovery. Don't pull anything in without auditing the linked repo first. Useful for [[Vibecoding - Tooling armory]] comparisons too.

## Distinctive quotes
> "A curated list of practical Claude Skills for enhancing productivity across Claude.ai, Claude Code, and the Claude API."

> "Want skills that do more than generate text? Claude can send emails, create issues, post to Slack, and take actions across 1000+ apps."

> "FFUF Web Fuzzing — Integrates the ffuf web fuzzer so Claude can run fuzzing tasks and analyze results for vulnerabilities."

## Cross-links
- [[Vibecoding - Tooling armory]]
- [[Vibecoding - Secrets and Env Hygiene]]
- [[Vibecoding - MCP Ecosystem Vulnerabilities]]
