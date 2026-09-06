# Automation and Integrations

Choose the surface by what must persist and what authority it needs.

| Surface | Use for | Avoid using it for |
|---|---|---|
| Prompt/thread | One-off task and temporary constraints | Durable team rules |
| `AGENTS.md` | Stable repository expectations | Long conditional procedures |
| Skill | Repeatable method with a recognizable trigger | Scheduling or storing secrets |
| Hook/CI | Mechanically enforceable checks | Nuanced product decisions |
| MCP/app connector | Live external context and controlled actions | Static documentation already in repo |
| Scheduled task | Stable recurring workflow | A process that still needs frequent steering |
| Service/worker | Durable runtime behavior | Ad hoc interactive work |

## Integration review

Before connecting an external service, document:

- provider and owning account/project;
- data read and retained;
- actions exposed;
- authentication flow and credential scopes;
- environments/resources reachable;
- rate, spend, deletion, admin, and production capability;
- audit logs and revocation;
- failure behavior and timeout;
- prompt-injection/untrusted-content boundary;
- human approval points.

Install one integration because it removes a demonstrated manual loop. Do not connect every available app preemptively.

## Scheduled workflow gate

Automate only after the manual version is predictable. A scheduled job needs:

- clear input and output;
- idempotency/deduplication;
- lock or single-run protection;
- bounded time, spend, and retries;
- non-secret logs and health signal;
- failure alert owner;
- stop/disable command;
- state and handoff path;
- explicit authority for external mutations.

The skill defines the method; the schedule defines when it runs.

## Hooks and CI

Use them for checks a machine can decide reliably: formatting, tests, secret patterns, generated-file drift, schema validation, forbidden paths, and policy lints. Keep subjective architecture and product judgment in human/agent review.

Every blocking hook needs a clear failure message and a local reproduction command.
