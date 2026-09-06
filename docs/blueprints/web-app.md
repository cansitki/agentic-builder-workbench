# Web App Blueprint

Use this as a design checklist, not a prescribed framework.

## Repository shape

```text
app/
├── src/
│   ├── presentation/    UI and transport adapters
│   ├── application/     Use cases and orchestration
│   ├── domain/          Business rules without framework dependencies
│   ├── infrastructure/  Database, queues, email, payments, storage
│   └── shared/          Small cross-cutting utilities
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── decisions/
│   ├── threat-model.md
│   └── runbook.md
├── AGENTS.md
├── PROJECT.md
└── PLANS.md
```

Match the repository's existing conventions before introducing new layers. A small app may need only three directories; the dependency boundaries matter more than folder count.

## Request path

```text
request
  → authentication
  → input validation
  → authorization on the target object
  → domain operation
  → transaction/idempotency boundary
  → response encoding
  → structured audit event
```

Never rely on a hidden button, client route, or layout redirect as authorization.

## First vertical slice

Choose one real user outcome and implement it end to end:

- UI/transport;
- use case;
- persistence;
- authorization;
- failure state;
- automated check;
- local observable demo.

Avoid building every database table and component before the first working path.

## Release gate

- Fresh install/build works from documented commands.
- Unit and integration checks pass.
- One real end-to-end path passes.
- Cross-user/tenant access is denied.
- Secrets are server-only and absent from bundles/logs.
- Rate limits, retries, and idempotency match the risk.
- Database migrations have forward and recovery procedures.
- Monitoring can distinguish user error, dependency failure, and application failure.
- Rollback is documented and has been rehearsed for high-risk changes.
