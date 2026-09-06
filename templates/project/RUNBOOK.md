# [PROJECT NAME] — Runbook

## Service contract

- Owner: [NAME/TEAM]
- Environments: [LIST]
- Source repository: [URL]
- Runtime: [PLATFORM]
- Health check: [COMMAND/URL]
- Logs/metrics: [LOCATION]
- Secret source: [REFERENCE, NEVER VALUE]

## Start and stop

```bash
[START COMMAND]
[STATUS COMMAND]
[STOP COMMAND]
```

## Deploy

```text
Preflight: [CHECKS]
Artifact: [HOW IDENTIFIED]
Command/workflow: [VALUE]
Post-deploy verification: [CHECKS]
```

## Rollback

- Trigger: [CONDITION]
- Last known good artifact: [HOW RESOLVED]
- Steps: [STEPS]
- Data compatibility: [CONSTRAINT]
- Verification: [CHECKS]

## Backup and restore

- Scope: [VALUE]
- Schedule/retention: [VALUE]
- Last restore drill: [DATE/EVIDENCE]
- Restore steps: [LINK]

## Common failures

| Symptom | Evidence to collect | Likely causes | Safe response |
|---|---|---|---|
| [SYMPTOM] | [NON-SECRET DATA] | [CAUSES] | [ACTION] |

## Incident boundaries

- Never paste credentials or private customer payloads into tickets/chat.
- Preserve evidence without logging secrets.
- Record timeline, impact, containment, recovery, and follow-up.
- External communication owner: [VALUE].
