# Environment Inventory

Store identifiers only when this document is private and sharing them is necessary. Never include secret values.

| Surface | Purpose | Owner | Access route | Lifecycle | Backup | Health check |
|---|---|---|---|---|---|---|
| [WORKSPACE] | [INTERACTIVE WORK] | [OWNER] | [NON-SECRET ROUTE] | [LONG-LIVED] | [METHOD] | [CHECK] |
| [RUNTIME] | [WATCHERS/JOBS] | [OWNER] | [ROUTE] | [TEMP/DURABLE] | [METHOD] | [CHECK] |

## Boundaries

- Interactive project sessions: [RULE]
- System/background sessions: [RULE]
- Durable services: [SERVICE MANAGER]
- Production access approval: [RULE]
- Secret store references: [NAMES/PATHS WITHOUT VALUES]

## Review

- Last verified: [DATE]
- Stale/legacy components: [LIST]
- Decommission candidates: [LIST]
