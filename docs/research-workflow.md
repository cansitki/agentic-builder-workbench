# Research Workflow

Research should support a question or decision, not produce a large undirected document.

## Choose the mode

| Request | Best shape |
|---|---|
| “What options exist?” | Broad comparison and taxonomy |
| “Should we do this?” | Decision research with counterarguments and explicit uncertainty |
| “How does this current product/API work?” | Current official documentation first |
| “What happened?” | Timeline from primary evidence, then independent reporting |
| Blocked or dynamic site | Specialized lawful retrieval method with provenance |

## Source order

1. Primary official documentation, filings, repositories, standards, datasets, or direct evidence.
2. High-quality independent analysis.
3. Practitioner/user reports for lived experience and edge cases.
4. Search snippets and unsourced summaries only as leads, never final evidence.

Browse for claims that can change: software behavior, security advisories, prices, laws, schedules, company roles, chain state, and provider permissions. Record the exact verification date.

## Research pipeline

```text
question and decision criteria
          ↓
source plan and freshness requirements
          ↓
parallel bounded collection when useful
          ↓
deduplication and evidence table
          ↓
facts vs inference vs recommendation
          ↓
counterargument / falsification pass
          ↓
atomic notes + index + decision
```

Parallel work is useful for independent providers, jurisdictions, repositories, or evidence types. Give each worker a bounded question and have the main agent synthesize conflicts. Do not spawn agents merely to re-read the same context.

## Evidence table

| Claim | Source | Published | Verified | Confidence | Notes |
|---|---|---|---|---|---|
| [CLAIM] | [PRIMARY LINK] | [DATE] | [DATE] | [HIGH/MED/LOW] | [LIMIT] |

Clearly label inference. State what new evidence would change the conclusion.

## Vault output

- One concept/comparison per atomic note when it will be reused.
- One index note links the research set.
- Project-specific implications link back to the project hub.
- Raw captures stay outside durable notes or in a clearly marked source folder.
- Avoid long copied passages; summarize and cite.

## Link inbox

When a workflow uses a daily link inbox, record an incoming link immediately as unchecked, analyze it, add the saved-note link if substantial, then check it off only when processed. Keep the inbox last in the daily note.
