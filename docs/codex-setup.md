# Codex Setup

This repository follows current official Codex guidance as checked on 2026-09-07. Recheck the linked documentation when exact behavior or configuration matters.

## Guidance layers

Codex reads instruction files from broad to specific:

1. Global guidance in the Codex home directory.
2. Repository-root `AGENTS.md`.
3. Nested `AGENTS.md` or `AGENTS.override.md` files down to the current directory.

Guidance nearest the working directory takes precedence. Keep the root file compact and move subsystem rules close to the subsystem. The default combined project-instruction limit is 32 KiB, so large manuals belong in linked docs or skills.

Official reference: [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## What goes where

| Need | Best surface |
|---|---|
| One task's constraints | Current prompt/thread |
| Stable personal preference | Global `AGENTS.md` |
| Repository facts and commands | Repository `AGENTS.md` |
| Subsystem-specific rules | Nested `AGENTS.md` |
| Repeatable procedure | Skill in `.agents/skills/` |
| Live external system | MCP/app connector |
| Mechanical enforcement | Tests, lint, hooks, or CI |
| Stable recurring job | Scheduled task after manual validation |

## Safe project defaults

The included `.codex/config.toml` deliberately omits a model name so it does not freeze the repository to a stale or unavailable model. It uses:

- approval prompts on request;
- workspace-write sandboxing;
- cached web search;
- automatic exclusion of common secret-like environment variables.

Project configuration loads only for repositories you trust. Personal defaults belong in `~/.codex/config.toml`; repository settings belong in `.codex/config.toml`.

Official reference: [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic).

## Prompt contract

A strong task request contains goal, context, constraints, and done criteria. Use Plan mode or ask for an interview when the outcome is still ambiguous. Keep one chat per coherent outcome and fork only when the work actually branches.

Official reference: [Codex best practices](https://learn.chatgpt.com/guides/best-practices).

## Skills

Repository skills live under `.agents/skills/<skill-name>/SKILL.md`. Their descriptions determine when Codex considers them; their full instructions load only after selection. Keep each skill narrow and add scripts or references only when they improve reliability.

This repository includes:

- `project-kickoff` for turning a fuzzy idea into a bounded project brief;
- `secure-release` for evidence-based pre-release review;
- `vault-reconcile` for updating tasks and durable notes after work.

Official reference: [Build skills](https://learn.chatgpt.com/docs/build-skills).

## Verification

From a cloned repository, ask Codex to summarize the active instruction sources. Then run:

```bash
bash scripts/audit-publication.sh
git diff --check
```

Use `/review` or an independent code review for meaningful changes. Generated code is a draft until its behavior, failure cases, and security boundaries have been tested.
