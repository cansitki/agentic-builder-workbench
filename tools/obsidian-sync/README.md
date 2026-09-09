# Secure Obsidian Sync adapter

The official `obsidian-headless` 0.0.14 CLI accepts account, MFA and encryption
passwords through argv or terminal prompts. This adapter adds raw **owner-only
file inputs** compatible with Workbench native intake and removes those secret
argv/prompt paths from login and sync setup. It accepts only a small command list.

The upstream CLI is fetched through the included npm dependency lock. Its complete
source SHA-256 must match before any dependency build code is run. Source changes
fail closed. The application remains subject to Dynalist's terms; its UNLICENSED
source is not redistributed in this repository. We ship the patch and dependency
metadata only. This is an adapter maintained here, not an official file-input API.

## Behavior

- Only absolute regular non-symlink secret files owned by the current UID with mode
  0600 are accepted, up to 16 KiB. Password whitespace is preserved.
- Login never signs out/revokes an existing account as a side effect. A different
  or invalid existing account requires explicit review.
- Missing/incorrect MFA returns `MFA_REQUIRED`; no terminal prompt or blind retry.
- Setup forces JSON output, requires a password file and refuses a vault that
  relies on a server-supplied password instead of the selected E2EE password.
- Login/setup errors use fixed redacted codes. Original encryption and persistence
  functions remain unchanged.
- Runtime auth tokens and derived encryption keys stay in the headless configuration
  directory, owner-only. Do not print, commit, or sync that directory as vault notes.

## Installation

```bash
python3 tools/obsidian-sync/adapter.py
```

The workspace image installs it at
`/opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs` and verifies the
native SQLite dependency. Use that entrypoint, not the original `ob` command for
credential-dependent operations. Node 22+ is required.

## Guided setup in the system workspace

1. The user creates/selects their encrypted Sync vault in local Obsidian's native
   UI and has an active Sync subscription. Obtain the account email and remote
   vault ID as non-secret input.
2. Temporarily select **system (background)** under Workbench → Secure Input.
   This does not expose system terminal sessions in the normal picker.
3. In system, generate private requests:

```bash
python3 /opt/workbench/tools/obsidian-sync/request.py --email user@example.com --vault-id REMOTE_VAULT_ID --directory /workspace/.config/workbench/sync-intake
secenv ask --schema /workspace/.config/workbench/sync-intake/login.request.json
secenv ask --schema /workspace/.config/workbench/sync-intake/vault.request.json
```

Replace email/ID with the user's non-secret choices. Review each field first.
The modal writes raw files without adding a newline, not env-format files.

```bash
node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs login --email user@example.com --password-file /workspace/.config/workbench/sync-intake/password
```

If MFA is requested, collect only the fresh code via `mfa.request.json`, then rerun
login with `--mfa-file /workspace/.config/workbench/sync-intake/mfa-code`.

```bash
node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs sync-list-remote --json
node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs sync-setup --vault REMOTE_VAULT_ID --path /vault --device-name workbench-server --password-file /workspace/.config/workbench/sync-intake/vault-password --json
node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs sync-config --path /vault --mode bidirectional --file-types image,audio,video,pdf,unsupported --configs core-plugin,core-plugin-data --json
node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs sync --path /vault
```

Verify a dummy note PC → server and server → PC. Keep desktop Workbench connection
settings local: do not blindly enable community-plugin-data sync across machines.
Configure additional categories only when they are appropriate to both devices.

After one-shot sync succeeds, start the `vault-sync` Compose profile on the host.
It uses the shared `/vault` volume and the headless auth/config volume also mounted
in system. It survives workspace stops and host reboots; do not run a second
continuous sync process against the same vault/config.

```bash
cd /srv/workbench
sudo -n docker compose --env-file runtime.env --profile sync up -d vault-sync
```

Return the Workbench credential listener to ops-main. Remove raw bootstrap secret
files after validation, preserving the user's own recovery credentials and the
required owner-only runtime token/derived key.

This flow is not declared operational for a recipient until their own account,
E2EE vault, synchronization round trip and service restart have passed.
