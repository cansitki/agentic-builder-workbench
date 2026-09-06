# Context Architecture

Context architecture is the practice of structuring information so an agent can find the smallest set of accurate facts needed for a task.

## Principles

- Write stable facts once in a canonical file.
- Separate personal guidance, project rules, live state, and durable knowledge.
- Route through indexes instead of loading the whole knowledge base.
- Put information close to the work it governs.
- Correct stale sources rather than appending contradictions.
- Treat memory as context and live state as evidence.

Better context is not simply more text. It is current, scoped, linked, and explicit about authority and uncertainty.

## Failure modes

- Giant instruction files that crowd out task context.
- Multiple TODO lists with divergent state.
- Project facts stored only in chat history.
- Raw research mixed with decisions.
- Personal or secret data copied into every agent session.
- Rules that describe an old environment as if it were current.

## Practical pattern

```text
small index → project hub → active plan → required atomic notes → live evidence
```
