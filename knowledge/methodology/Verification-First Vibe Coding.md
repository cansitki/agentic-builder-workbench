# Verification-First Vibe Coding

Vibe coding is valuable for speed and exploration. The risk is accepting output because it looks coherent.

## Working rule

Use agents aggressively for drafts, scaffolding, refactors, tests, and exploration. Increase deterministic checks and human review as the blast radius grows.

## Trust gradient

| Change | Minimum confidence path |
|---|---|
| Copy/style | Render and inspect at target sizes |
| Pure function | Unit tests and edge cases |
| Database change | Migration test, constraints, rollback |
| Authentication/authorization | Cross-user negative tests |
| Webhook/message | Signature, replay, idempotency, receipt |
| Payment/wallet | Simulation, limits, immutable approval, reconciliation |
| Infrastructure | Preflight, backup/restore, health, rollback |

## Anti-patterns

- Changing requirements to make the error disappear.
- Disabling authorization or validation to unblock a demo.
- Making a required secret optional so a build passes.
- Trusting UI restrictions as security.
- Testing only the happy path.
- Claiming production success from a local build.
- Re-running an ambiguous external action.

Fast iteration and rigorous verification are complementary: speed finds the shape; evidence earns trust.
