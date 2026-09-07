# Full Installation Sequence

Use this order. It keeps the system useful before granting it credentials or external authority.

## 1. Clone and inspect

```bash
git clone https://github.com/cansitki/agentic-builder-workbench.git
cd agentic-builder-workbench
```

Read `TOUR.md`, `CAPABILITIES.md`, `ONBOARDING.md`, and `docs/completeness-matrix.md`.

## 2. Prepare the local validation environment

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --disable-pip-version-check cryptography==50.0.1
bash scripts/verify-all.sh
```

No provider credential is needed for repository validation.

For the networked installer test (pinned GitHub release download plus isolated secenv installation):

```bash
bash scripts/test-installers.sh
```

## 3. Run guided onboarding

Open Codex from the repository root and say:

```text
Use $workbench-onboarding. Read TOUR.md and interview me before changing anything. Do not ask for a credential.
```

Decide OS/devices, Obsidian/vault location, local vs remote workspace, coding agents, task/memory model, typical projects, authority boundaries, and which optional modules are actually needed.

## 4. Create the personal brain

Use the complete brain by default:

```bash
node scripts/bootstrap.mjs personal /path/to/private/brain --dry-run
node scripts/bootstrap.mjs personal /path/to/private/brain
```

Replace every bracketed placeholder. For Codex global guidance, place the reviewed canonical `AGENTS.md` under the configured Codex home (normally `~/.codex/AGENTS.md`) or another directory whose instruction scope you intentionally use. Codex instruction discovery details: [official AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

After customization:

```bash
node scripts/check-adopted-brain.mjs /absolute/path/to/AGENTS.md
```

If copies are required across environments, declare one canonical file and verify synchronization byte-for-byte.

## 5. Create or merge the vault

For a new vault or an empty staging directory:

```bash
node scripts/bootstrap.mjs vault /path/to/vault --dry-run
node scripts/bootstrap.mjs vault /path/to/vault
```

For an existing vault, do not copy blindly. Search/merge canonical TODO, daily-folder, and index conventions through a reviewed plan. Back up and restore-test before bulk changes.

## 6. Install Can Workbench on the operator device

```bash
bash scripts/install-can-workbench.sh /absolute/path/to/ObsidianVault
```

The installer downloads public Can Workbench v2.2.0 assets and accepts them only when all pinned SHA-256 values match. It refuses an existing plugin directory.

Enable the plugin in Obsidian, then configure only your own Local/Coder/SSH connection and explicit secure-input workspace.

## 7. Install secenv in every credential-consuming workspace

```bash
bash scripts/install-secenv.sh
secenv doctor
```

Can Workbench and `secenv` must point to the same workspace/user. Restart the Workbench secure-input listener and verify it reports `listening`.

## 8. Test secure input using dummy data

Follow `integrations/can-workbench/README.md`. Use an obvious dummy value, confirm ciphertext-only/redacted output and mode `0600`, then delete the dummy destination. Do not use a real token to test transport.

If any part fails, stop credential-dependent setup. There is no chat, terminal, screenshot, issue, note, or browser fallback.

## 9. Bootstrap the first project

```bash
node scripts/bootstrap.mjs project /path/to/project --dry-run
node scripts/bootstrap.mjs project /path/to/project
```

Complete `PROJECT.md`, `PLANS.md`, project `AGENTS.md`, threat model, runbook, and canonical commands. Start with a thin local/development slice before connecting production.

## 10. Verify the complete instruction path

Ask Codex to summarize which instruction files and skills are active. Confirm it states:

- memory and canonical TODO startup order;
- current project commands and definition of done;
- `secenv ask` as the only secret intake path;
- no external mutation beyond exact authorization;
- task/daily/project reconciliation after significant work.

## 11. Add backup and recovery

Back up the private vault/brain, repositories, workspace state, and required control-plane configuration through an encrypted system. Perform an isolated restore drill before calling backup complete.

## 12. Add optional modules gradually

Only after the manual workflow is stable, add Coder/tmux, connectors/MCP, hooks, scheduled tasks, durable services, Telegram/crypto modules, or broader production authority. Each addition gets a scope, owner, permissions, verification, stop condition, and rollback.
