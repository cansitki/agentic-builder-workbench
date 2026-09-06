# Testing and Review

Testing earns confidence in behavior; review searches for mistakes in the change and its assumptions.

## Test by risk

| Surface | Important checks |
|---|---|
| Pure logic | examples, boundaries, properties |
| UI | interaction, viewport, accessibility, loading/error/empty states |
| API | schema, authn, authz, rate limit, idempotency, errors |
| Database | constraints, RLS/tenant isolation, migration, concurrency |
| Files | type/size/content checks, path handling, ownership, authorization |
| Webhooks/jobs | signature, replay, ordering, retries, duplicate delivery |
| Payments | success, failure, refund, dispute, reconciliation |
| Crypto | simulation, invariants, signer policy, reorg/finality, receipt reconciliation |
| Infrastructure | preflight, health, rollback, restore, partial failure |

## Verification order

1. Reproduce baseline or failing behavior.
2. Run the narrowest relevant test while iterating.
3. Add a regression check for the demonstrated failure when useful.
4. Run the surrounding suite, lint/type/build checks.
5. Exercise the real path in the intended environment.
6. Inspect logs and state for hidden errors.
7. Review the final diff independently from the implementation narrative.

## Review questions

- Does the change solve the requested outcome or only the visible symptom?
- What assumptions were introduced?
- Can a different user/tenant access the object?
- What happens on duplicate, timeout, retry, partial failure, stale state, or cancellation?
- Did any secret or personal data enter client code, logs, fixtures, snapshots, or docs?
- Are migrations and old clients compatible?
- Can the system be rolled back without corrupting data?
- Did generated code add an unnecessary dependency or copy a vulnerable pattern?
- Are completion claims supported by actual output?

Do not weaken a check merely to make it green. If the requirement changed, update it explicitly and explain why.
