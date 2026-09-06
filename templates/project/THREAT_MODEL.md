# [PROJECT NAME] — Threat Model

## Scope

- System/version: [VALUE]
- Environment: [DEVELOPMENT/STAGING/PRODUCTION]
- Data and assets: [VALUE]
- External side effects: [VALUE]
- Out of scope: [VALUE]

## Trust boundaries

```text
[USER/EXTERNAL SYSTEM] → [EDGE/API] → [APPLICATION] → [DATA/SIGNER/PROVIDER]
```

## Actors and assets

| Actor | Intended capability | Must never be able to |
|---|---|---|
| [ACTOR] | [ACTION] | [ACTION] |

| Asset | Sensitivity | Owner | Recovery |
|---|---|---|---|
| [ASSET] | [CLASS] | [OWNER] | [METHOD] |

## Abuse cases

| Threat | Entry point | Impact | Existing control | Test | Residual risk |
|---|---|---|---|---|---|
| [THREAT] | [SURFACE] | [IMPACT] | [CONTROL] | [TEST] | [RISK] |

Cover spoofing/authentication, authorization/IDOR, tampering, repudiation/audit, data leakage, denial/abuse, privilege escalation, supply chain, prompt injection/tool misuse, and business-logic failure as applicable.

## High-risk operations

- [PAYMENT/MESSAGE/FILE/ADMIN/TRANSACTION/DEPLOY]
  - Deterministic policy: [VALUE]
  - Approval: [VALUE]
  - Idempotency/replay: [VALUE]
  - Limits: [VALUE]
  - Evidence/receipt: [VALUE]
  - Recovery: [VALUE]

## Review

- Owner: [NAME]
- Last reviewed: [DATE]
- Revisit on: [ARCHITECTURE/PROVIDER/DATA/AUTHORITY CHANGE]
