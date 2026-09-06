# Canonical Task System

The task list exists to make commitments visible and state unambiguous. It is not permission for the agent to start every item it can see.

## One general list

Use one canonical general TODO. Project-specific backlogs are allowed, but each active project has one outcome and one next action linked from the general list.

Recommended states:

- **Inbox / Parking lot:** new or unclear captures.
- **In Progress:** active work, with a small WIP limit.
- **Next:** deliberately ordered near-term commitments.
- **Blocked / Waiting:** cannot progress until a dependency changes.
- **Later:** valid but not near-term.
- **Completed recently:** verified outcomes with dates/evidence.

## State rules

- Move one item; never copy it between states.
- Do not invent priority or deadlines.
- Do not reorder commitments without an explicit decision or clear current-work evidence.
- Record new commitments in the same interaction in which they are made, unless the user says not to.
- A blocker includes reason, dependency/person, and review trigger.
- Completion includes a date and observable evidence.
- Never silently delete an unfinished commitment.

## Project shape

```text
General TODO
└── Outcome: launch the account recovery flow
    ├── Next action: test token-expiry behavior
    └── Source: [[Account Recovery Project]]

Project backlog
├── UI form
├── token issue/consume path
├── mail adapter
├── abuse/rate-limit tests
└── release and recovery checks
```

The general list stays readable; the project hub preserves the real work.

## Main quest and WIP

Keep the first in-progress item as the main quest. A WIP limit of two is a strong default: one main outcome and one explicitly allowed secondary stream. New urgent work displaces or pauses an existing item; it does not silently expand WIP.

## Reconciliation

Before declaring project work complete:

1. Verify the result.
2. Update the project backlog/evidence.
3. Move the matching general task once.
4. Set the next action or completion date.
5. Update the task note's `updated` property.
6. Log the significant event in the daily note.
