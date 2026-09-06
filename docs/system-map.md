# System Map

This workbench separates durable context, live state, reusable procedure, and executable work. Mixing those layers is the usual reason an agent setup becomes bloated or unsafe.

## The six layers

| Layer | Holds | Does not hold |
|---|---|---|
| Personal guidance | Communication style, stable preferences, universal safety boundaries | Project architecture, current tasks, credentials |
| Project guidance | Repository layout, commands, conventions, local safety constraints | Personal biography, unrelated work |
| Live state | Canonical TODO, current plan, blockers, next action | Long tutorials or stale history |
| Durable knowledge | Decisions, concepts, research, runbooks, postmortems | Secret values or raw chat dumps |
| Reusable workflows | Skills with a narrow trigger and repeatable method | Every rule for every task |
| Execution evidence | Tests, diffs, receipts, screenshots, deployment identifiers | Unsupported completion claims |

## Source-of-truth map

Every important fact should have one owner.

| Information | Canonical owner |
|---|---|
| Personal working agreement | Personal/global `AGENTS.md` |
| Repository commands and conventions | Repository `AGENTS.md` |
| Subsystem-specific rules | Nested `AGENTS.md` nearest that code |
| General commitments | One vault `To Do List.md` |
| Detailed project backlog | Project hub or project planning files |
| Current implementation plan | `PLANS.md` or an issue/PR |
| Architecture decision | Decision note/ADR |
| Session events | Daily note |
| Repeatable procedure | Skill |
| Secret value | External secret manager or owner-only local file |

Do not copy the same task or fact between multiple sources. Link to the canonical owner and move state instead of duplicating it.

## Context flow

```text
user intent
   │
   ├── personal AGENTS.md ── stable defaults
   ├── project AGENTS.md  ── repository truth
   ├── PROJECT.md         ── outcome and boundaries
   └── PLANS.md / TODO    ── current state
                │
                ▼
         bounded agent task
                │
       inspect → change → verify
                │
                ├── code/test evidence
                ├── task-state reconciliation
                └── daily log / durable note
```

## Workspace separation

Use the smallest environment model that gives clear ownership:

- **Work surface:** repositories, vault, interactive agent sessions, and terminals you may revisit.
- **Runtime surface:** temporary watchers, collectors, tunnels, smoke servers, and scheduled processes.
- **Durable services:** system service manager, managed platform, or container orchestrator—not an interactive terminal session.

If everything runs in one place, preserve the distinction through names, process ownership, logs, and cleanup rules.

## Context budget

Do not preload the whole vault into every task. Use progressive disclosure:

1. A short index routes the agent.
2. The agent reads the project hub.
3. It opens only the notes required for the current decision.
4. Large references stay outside the main instruction file.

Durable guidance should be compact enough to remain accurate. When a rule applies only to one workflow, move it into a skill or a linked runbook.
