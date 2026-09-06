# Operating Loop

## 1. Capture the outcome

Turn a vague request into four fields:

- **Goal:** the observable result.
- **Context:** the relevant repository, files, references, and current behavior.
- **Constraints:** scope, compatibility, safety, style, time, and authority limits.
- **Done when:** tests or evidence that prove the result.

Example:

```text
Goal: Add password reset to the existing web app.
Context: Auth lives in src/auth; use the current mail adapter.
Constraints: No new provider, no production send, preserve existing sessions.
Done when: unit and integration tests pass, an expired token fails, and the local flow works end to end.
```

## 2. Choose the right work size

A task should fit one coherent reasoning and verification loop. Split when it combines independent outcomes, different risk levels, or unrelated parts of the codebase.

A useful hierarchy is:

```text
Outcome → vertical slice → task → verification
```

Prefer a thin end-to-end slice over many disconnected components. A small working path reveals incorrect assumptions earlier.

## 3. Inspect before editing

The agent should establish:

- current behavior and reproduction steps;
- repository status and unrelated user changes;
- the closest instruction files;
- existing tests and conventions;
- external state that may have changed;
- the exact authority boundary for writes or production actions.

An explanation or diagnosis request is not permission to implement, deploy, message, pay, or transact.

## 4. Plan in proportion to risk

- Tiny and reversible: implement directly.
- Multi-file or ambiguous: write a short plan and surface decisions.
- High-risk or production: define preflight, rollback, verification, and stop conditions before mutation.
- Research: separate source collection, synthesis, and the decision.

Plans describe outcomes and gates, not ceremonial steps.

## 5. Execute a verification loop

```text
observe baseline
      ↓
make smallest coherent change
      ↓
run focused checks
      ↓
review diff and failure paths
      ↓
run broader relevant checks
      ↓
verify real behavior
```

Do not fix a failing test by weakening the test unless the requirement itself changed and that change is explicit.

## 6. Reconcile state

When the work changes a commitment:

- move one task between states instead of copying it;
- record a blocker with its reason and next review trigger;
- mark completion only after verification;
- keep granular tasks in the project backlog and one concrete next action in the canonical list;
- update the daily note with material decisions and evidence.

## 7. Promote durable knowledge

Daily logs are chronological evidence, not the permanent knowledge base. Promote only information likely to matter later:

- an architecture decision;
- a reusable workflow;
- a failure mode and its prevention;
- a project constraint;
- a researched concept with sources.

Connect the new note from an index and from the relevant project hub. Avoid orphan notes and monolithic dumps.

## 8. Improve the system from real friction

- One-off correction → current prompt or plan.
- Repeated repository mistake → nearest `AGENTS.md`.
- Repeated multi-step workflow → skill.
- Mechanically enforceable rule → test, linter, hook, or CI.
- Stale reference → update or archive the source of truth.

Do not add rules for hypothetical mistakes. Let observed friction justify complexity.
