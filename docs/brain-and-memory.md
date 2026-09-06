# Brain and Memory

An agent needs current instructions and retrievable context, not a giant autobiography in every prompt.

## Memory layers

| File/system | Purpose | Update cadence |
|---|---|---|
| Personal `AGENTS.md` | Stable working agreements and safety boundaries | Only when a repeated need is proven |
| `user_profile.md` | Compact user preferences relevant to collaboration | When a durable preference changes |
| `MEMORY.md` | Small routing index to current context | At meaningful session handoff |
| Project `AGENTS.md` | Repository facts, commands, conventions | With the codebase |
| `PROJECT.md` | Outcome, scope, users, acceptance criteria | When product intent changes |
| `PLANS.md` | Live slice, tasks, blockers, evidence | During execution |
| Daily note | Chronological significant events | Same day |
| Durable vault note | A decision, concept, runbook, or postmortem | When knowledge should survive the project/session |

## Startup sequence

Use this order so stale memory cannot overrule current facts:

1. Current user request.
2. Active instruction files from broad to specific.
3. Canonical task list for priority awareness.
4. Current project state and plan.
5. Memory index and only the linked notes needed for this task.
6. Live repository/external state.

Explicit user instructions win. Repository state is evidence; memory is context, not proof.

## Keep `MEMORY.md` small

`MEMORY.md` should answer:

- What was the last active outcome?
- What is verified now?
- What is the exact next action?
- What is blocked and why?
- Which project/daily/decision notes contain the detail?

Do not paste full transcripts or duplicate the vault. A good memory file routes the agent to canonical sources.

## User profile boundary

Keep only preferences that change collaboration, such as language, desired brevity, working hours/timezone, review style, tool comfort, and authority boundaries. Do not collect sensitive biography merely because an agent could remember it.

## Updating memory

- Correct the canonical source first.
- Replace stale state; do not append contradictions forever.
- Link to evidence rather than copying it.
- Distinguish verified facts from assumptions and preferences.
- Never store secret values, recovery material, or raw private communications.
- Periodically remove obsolete routing entries.

## Instruction sync

If the same brain file must exist in multiple active environments, designate one canonical source and synchronize it deterministically. Verify copies byte-for-byte before reporting success. Avoid multiple independently edited versions.
