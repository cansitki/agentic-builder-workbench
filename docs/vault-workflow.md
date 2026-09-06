# Vault Workflow

The vault is an operational memory, not a dump of every generated word.

## Suggested structure

```text
Vault/
├── AGENTS.md
├── Vault Index.md
├── To Do List.md
├── daily notes/
│   └── YYYY-MM-DD.md
├── projects/
│   └── Project Name.md
├── research/
│   ├── Research Index.md
│   └── Topic.md
└── decisions/
    └── YYYY-MM-DD - Decision.md
```

Keep folders shallow until navigation becomes painful. Links and indexes matter more than a perfect taxonomy.

## Before writing

1. Search for the topic.
2. Read the relevant index and existing note.
3. Append or patch the canonical note when it already exists.
4. Create an atomic note only when the concept is genuinely new.
5. Link the note from an index and from the project that uses it.

## Daily notes

Daily notes record events in local time:

```text
## HH:MM - Topic
- Facts observed
- Decisions made
- Evidence or links
- Next action
```

Keep `## Links Inbox` last. A daily log may mention a decision; the durable decision itself should live in a separate note when it will matter later.

## Canonical tasks

Use one general task list. Recommended states:

- Inbox / Parking lot
- In progress
- Next
- Blocked / waiting
- Later
- Completed recently

Set a small work-in-progress limit. Project checklists may contain granular work, but the general list should hold the outcome, one concrete next action, and a link to the project hub.

## Research notes

Separate:

- source facts with citations;
- your inference;
- the decision or recommendation;
- uncertainty and what would change the conclusion.

For time-sensitive claims, record the verification date. Prefer primary sources for technical behavior, security advisories, laws, prices, and product capabilities.

## Safety

- Do not store secret values in the vault.
- Do not let automation overwrite large notes blindly.
- Prefer patch, append, or prepend operations after reading the target.
- Back up the vault and periodically test restoration.
- Review agent-generated backlinks and task state; a valid Markdown file can still contain a false claim.
