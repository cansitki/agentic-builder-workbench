---
name: secure-credential-intake
description: Collect and install API tokens, passwords, private keys, client secrets, recovery material, or other secret values through secenv and the native Workbench modal. Use whenever work requires a new/replacement credential or a user offers to provide one.
---

# Secure Credential Intake

This is a non-bypassable intake gate. The only approved value-entry surface is `secenv ask` through the native Workbench modal.

1. Do not request, accept, use, repeat, or transform a secret sent through chat, a prompt, terminal input/scrollback, command arguments, source/config edits, a note, screenshot, issue, email, messaging app, or browser form. If a user sends one there, treat it as exposed, stop the dependent work, and require revocation/rotation.
2. Check whether an existing approved credential reference already covers the operation. Verify only its owner/mode, expected variable names, documented scopes/resources, and a minimal non-destructive authentication result. Never print or log its value.
3. Before opening a modal, determine for each field: provider and owning account/org/project/tenant; exact variable name and credential type; exact consuming operation; current minimum provider scopes/roles; exact resource restrictions; environment and host/origin/IP restrictions; read/write/deploy/delete/billing/user/admin/production/signing/value-transfer capability; lifetime and revocation point; exact owner-only destination; and consumer process. Consult current official provider documentation when permission names may have changed.
4. Encode those non-secret details in a reviewed schema with field-specific `help`, or in `--title`, `--description`, and one `--field-help` per field. Generic requests such as “API token”, “admin key”, or “whatever works” are invalid. Use least privilege; separate development and production; do not bundle unrelated workflows.
   - Secret-looking variables must use masked password inputs. Workbench v3.0.0 textarea is visible; if a multiline secret cannot be collected through a masked field, stop until a reviewed masked multiline/file-input extension is installed.
5. Run `secenv doctor`. Confirm the expected workspace, requesting folder, destination paths, and variable names will appear in the modal. If `secenv`, Workbench, its listener, or the native modal is unavailable, stop credential-dependent work and repair that path. There is no chat, terminal, link, browser, or later fallback.
6. Run `secenv ask --schema <reviewed-schema.json>` and keep it running until submit, cancel, or expiry. Do not ask the user to type the value anywhere else. A cancelled or expired request authorizes nothing.
7. Accept only redacted CLI output: request/status, field names, paths, modes, and `<set>`/`<empty>`. Never inspect encrypted artifacts or invoke library internals to reveal plaintext.
8. After installation, verify destination ownership/mode, expected variable names without values, and the smallest non-destructive authentication check. Report status and scope without values. Ensure request/submission/cancellation artifacts for the finished request are gone.

Secure collection does not authorize the operation that consumes the credential. Deployments, sends, deletion, billing, account changes, signing, transactions, or production access still require their own exact authorization.

Implementation and threat model: `tools/secenv/README.md`, `integrations/workbench/README.md`, and `docs/credential-intake.md`.
