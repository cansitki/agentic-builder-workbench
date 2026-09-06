# Credential Intake

The safest agent workflow never exposes the secret value to the conversation or general terminal history.

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

Use an OS-native secure prompt, password manager, hardware device, or local secure intake utility that writes directly to the intended owner-only destination. The agent may initiate and wait for that mechanism but must not ask the user to paste the value into:

- chat or prompts;
- shell arguments or `read` prompts;
- tmux scrollback;
- source/config files created through chat;
- notes, screenshots, tickets, email, or messaging apps;
- an agent-created web form.

If the approved path is unavailable, repair it or stop credential-dependent work.

## After collection

- Verify owner and file mode without reading the value.
- Verify expected variable names without printing values.
- Run the minimum non-destructive authentication check.
- Report scopes/target/status, not the secret.
- Remove temporary request/submission artifacts.
- Keep the destination ignored by Git and out of backups unless the backup is designed for secrets.

## Rotation

Record credential name, owner, purpose, created/expiry dates, and rotation trigger—never its value. Rotation is complete only after the new credential works, consumers are switched, the old credential is revoked, and no duplicate active copy remains unintentionally.
