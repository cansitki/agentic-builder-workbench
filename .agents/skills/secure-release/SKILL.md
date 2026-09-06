---
name: secure-release
description: Review and prepare a software release with evidence-based security, regression, migration, and rollback checks. Use for pre-release audits, release readiness, or an explicitly requested deployment.
---

# Secure Release

Match the depth of review to the release risk. A documentation-only change does not need a payment-system checklist; code handling identity, money, private data, files, messages, or wallets does.

1. Read the nearest `AGENTS.md`, project acceptance criteria, deployment runbook, and relevant security notes under `knowledge/vibecoding-security/`.
2. Resolve the exact commit/diff, target environment, deployment mechanism, current production state, and authority boundary. If the request is only to review or prepare, do not deploy.
3. Preserve unrelated changes. Check the diff for accidental files, generated artifacts, dependency changes, debug code, private data, and secrets.
4. Run the project's canonical format, lint, type, test, build, and security commands that apply. Do not claim omitted or unavailable checks passed.
5. Exercise the real changed path and at least one material negative path. For sensitive systems, verify authentication, object authorization, tenant isolation, validation, rate limits, idempotency/replay, logging redaction, and client/server secret boundaries as applicable.
6. Review migrations, feature flags, compatibility, monitoring, rollback, and backup/restore impact. Establish a recovery path before a destructive or difficult-to-reverse change.
7. For an authorized external release, freeze the target and artifact, execute once, then verify provider status and observable application behavior. An ambiguous result becomes `unknown` and is not automatically retried.
8. Reconcile release documentation and task state only after evidence exists.

Report the artifact reviewed, checks and results, skipped checks with reasons, risks remaining, rollback path, and whether deployment was merely prepared or actually verified.
