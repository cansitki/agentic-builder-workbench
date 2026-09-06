# Backups, Migrations, and Cutovers

A backup claim is incomplete until restoration is tested.

## Backup contract

Define:

- exact data and configuration in scope;
- exclusions and why they are recoverable or intentionally omitted;
- encryption and credential ownership;
- schedule and retention;
- immutable or offsite copy;
- success/failure alert owner;
- restore procedure and recovery objectives;
- last successful restore drill.

Do not print backup credentials or include them in diagnostic bundles.

## Restore drill

Restore into an isolated destination. Verify:

- expected file/object/table counts;
- checksums or application-level invariants;
- permissions and ownership;
- service can read the restored state;
- the live source was not modified;
- temporary restored data is handled according to policy.

## State transfer manifest

Before migrating a host, workspace, database, or service, record:

| Component | Source | Destination | Owner | Transfer method | Verification | Rollback |
|---|---|---|---|---|---|---|
| [ITEM] | [SOURCE] | [TARGET] | [OWNER] | [METHOD] | [CHECK] | [PATH] |

Include code, data, secrets by reference, DNS/routes, schedulers, webhooks, service ownership, monitoring, backups, and decommissioning.

## Cutover gate

Do not cut over until:

- source backup succeeds;
- isolated restore drill succeeds;
- destination health and capacity pass;
- credentials exist with correct non-secret metadata;
- one authoritative process will be active after the switch;
- rollback trigger and steps are written;
- time-sensitive external dependencies are verified;
- production communication or traffic changes are explicitly authorized.

After cutover, verify both positive and negative routing, observe long enough to catch delayed jobs, then retire the old path deliberately. Do not destroy the rollback source in the same moment as the cutover.
