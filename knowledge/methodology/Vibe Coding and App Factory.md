# Vibe Coding and App Factory

Vibe coding uses an AI coding agent to compress the distance between an idea and a working product. An app factory turns that speed into a repeatable portfolio process rather than a stream of disposable demos.

## The evolution

The useful form is not “prompt until it looks right.” It is structured AI-first development:

```text
problem evidence
  → bounded product brief
  → thin vertical slice
  → real-user validation
  → security/reliability gates
  → reusable platform learning
  → continue, change, or kill
```

Agents make implementation and iteration cheaper. They do not remove product judgment, security, distribution, legal constraints, or the need to verify behavior.

## App factory layers

- **Idea intake:** problem, user, urgency, current workaround, distribution route.
- **Validation:** interviews, source research, landing/demo, willingness-to-pay evidence.
- **Spec:** outcome, non-goals, acceptance criteria, risky assumptions, first slice.
- **Build:** small project repo, local `AGENTS.md`, canonical commands, tests, handoff.
- **Shared platform:** only components proven reusable across multiple products.
- **Release:** auth/data/payment/file/abuse review proportional to risk.
- **Learning:** metrics and customer evidence feed the project hub and portfolio decisions.
- **Kill/continue gate:** explicit evidence threshold prevents endless polishing.

## What to standardize

- Project/plan/decision/threat-model/runbook templates.
- Authentication and authorization patterns that have been reviewed.
- Observability, error handling, backup, and deployment gates.
- Secure credential intake.
- CI and release evidence.
- A small design system when products genuinely share one.

Do not standardize unproven product logic or force every app into a large internal framework.

## Portfolio discipline

Each experiment needs:

- one owner;
- a time/cost ceiling;
- one riskiest assumption;
- a measurable validation event;
- explicit continuation and kill criteria;
- a path for promoting reusable learning without copying private customer data.

## Main risks

- Fast happy-path code hides authz, RLS, refund, replay, file, and concurrency bugs.
- Shared boilerplate replicates one vulnerability across every app.
- Many simultaneous projects destroy context and verification quality.
- Tool/provider churn creates stale setup assumptions.
- Building becomes an avoidance mechanism for customer evidence and distribution.
- Agent output appears complete before operations, support, privacy, and recovery exist.

Use [[Verification-First Vibe Coding]], the security library, and one coherent project outcome at a time.
