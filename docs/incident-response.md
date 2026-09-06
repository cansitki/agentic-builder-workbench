# Incident Response

Prepare before an incident creates time pressure.

## Lifecycle

```text
detect → assess → contain → preserve evidence → eradicate → recover → verify → learn
```

## First response

- Establish incident owner and timestamped timeline.
- Separate confirmed facts from hypotheses.
- Identify affected environments, users, data, funds, and credentials.
- Contain with the least destructive reversible action available.
- Preserve relevant logs and state without copying secrets into the incident note.
- Meet legal/provider notification obligations through the responsible owner.

## Credential exposure

Do not test an exposed secret by continuing to use it. Revoke/rotate, switch consumers, verify the new credential, and search for other copies without printing them.

## Recovery

- Restore or deploy from a known artifact.
- Verify data integrity and negative paths.
- Watch delayed queues, webhooks, replicas, caches, and scheduled jobs.
- Reconcile external provider state.
- Communicate only verified impact and status.

## Postmortem

Capture trigger, contributing conditions, detection gap, impact, containment, recovery evidence, and specific prevention. Convert mechanical prevention into tests/hooks/monitoring and durable operational lessons into the nearest runbook or guidance file.

Avoid blaming the agent or human as the root cause. Ask why the system allowed plausible output or an unsafe action to bypass verification.
