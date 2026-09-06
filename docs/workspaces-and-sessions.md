# Workspaces and Sessions

The goal is to distinguish work a human may attach to from runtime plumbing an agent should clean up.

## Two-surface default

Use two long-lived surfaces when remote workspaces are helpful:

- **Work workspace:** vault, repositories, interactive terminals, project sessions, and agent work.
- **System workspace:** temporary collectors, watchers, tunnels, smoke servers, scheduled runners, and runtime diagnostics.

Do not create a new workspace for every role. Add one only when isolation, permissions, resources, or lifecycle genuinely require it.

Durable services that must survive workspace rebuilds belong under a service manager, managed platform, or orchestrator.

## Session naming

Name interactive project sessions by location first:

```text
<project>
<project>-<purpose>
```

Examples: `payments`, `payments-migration`, `site-audit`.

Name agent/system sessions with a visible marker such as `sys-`. If the terminal multiplexer supports metadata, mark the scope explicitly so normal project views can hide system sessions.

## Ownership

- A user-visible session is one the human may reasonably attach to.
- A system session is temporary operational machinery.
- A scheduled/durable service has an owner, restart policy, logs, health check, and shutdown path.
- Never leave duplicate consumers, pollers, or schedulers running after a migration.

## Background process checklist

- Exact purpose and owner.
- Working directory and source version.
- Environment and credential source.
- Health check and logs.
- Duplicate-instance protection.
- Stop/cleanup command.
- Expected lifetime.
- Migration path to a durable service if it becomes permanent.

## Session handoff

Before pausing a large task, write a small handoff containing current branch/commit, clean/dirty state, verified results, exact next command/action, blockers, and relevant evidence paths. A new session should not need the full transcript to resume.
