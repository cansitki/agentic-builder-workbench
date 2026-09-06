# Spec-Driven Agentic Development

Agentic development becomes reliable when work is organized around observable outcomes rather than a long stream of prompts.

## Hierarchy

```text
Outcome
└── Vertical slice
    └── Context-sized task
        └── Verification evidence
```

- An outcome is valuable and shippable.
- A vertical slice crosses the necessary layers to demonstrate one real capability.
- A task fits one coherent context and has a clear stop condition.
- Evidence shows whether the task actually worked.

## State files

- `PROJECT.md` keeps intent and boundaries.
- `PLANS.md` keeps live execution state.
- `HANDOFF.md` lets a new session resume without a transcript.
- Git keeps the exact implementation history.
- Tests and receipts keep evidence.

Plans should be reassessed after each slice because implementation reveals wrong assumptions. Replanning is a feature when it is driven by evidence.
