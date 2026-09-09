# Credential Intake

This workbench has one approved credential value-entry path: `secenv ask` through the native Workbench modal. It never exposes the value to the conversation or general terminal history.

## Before requesting a credential

For every field, define all non-secret details first:

- provider/service and owning account, organization, tenant, or project;
- exact variable/credential name and credential type;
- exact operation that will consume it;
- minimum provider scopes/roles using current official names;
- resource restrictions: repository, domain, bucket, database, app, workspace, path, or chain;
- environment and supported host/origin/IP restrictions;
- whether it enables reads, writes, deploys, deletion, spend, user management, admin, production, signing, or value transfer;
- expiry/lifetime and rotation/revocation point;
- owner-only destination reference and exact consumer process.

If the provider's permission model may have changed, verify current official documentation before presenting the request. If granular restriction is impossible, state that limitation and risk.

## Collection boundary

The agent initiates `secenv ask`, keeps it running, and waits for submit, cancel, or expiry. Workbench shows the request metadata and destination before accepting values, encrypts them locally, and returns a ciphertext envelope. The agent must not ask the user to paste the value into:

- chat or prompts;
- shell arguments or `read` prompts;
- tmux scrollback;
- source/config files created through chat;
- notes, screenshots, tickets, email, or messaging apps;
- an agent-created web form.

If `secenv`, Workbench, its listener, or the native modal is unavailable, repair it or stop credential-dependent work. Password managers remain the long-term source, but copying a value from them into any other intake surface is forbidden.

## After collection

- Verify owner and file mode without reading the value.
- Verify expected variable names without printing values.
- Run the minimum non-destructive authentication check.
- Report scopes/target/status, not the secret.
- Remove temporary request/submission artifacts.
- Keep the destination ignored by Git and out of backups unless the backup is designed for secrets.

## Consumption

- Let the intended service/process read the owner-only destination directly.
- If a one-off command must load an env file, source it inside the process invocation without echoing, shell tracing, debug dumps, or command interpolation of values.
- Disable `set -x` and verbose request logging around authenticated operations.
- Do not use `cat`, `env`, `printenv`, debugger inspection, or error reports to prove a value exists.
- Prefer an authentication endpoint that returns identity/scope metadata without exposing the credential.

## Rotation

Record credential name, owner, purpose, created/expiry dates, and rotation trigger—never its value. Rotation is complete only after the new credential works, consumers are switched, the old credential is revoked, and no duplicate active copy remains unintentionally.
