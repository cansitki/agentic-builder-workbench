# Workbench source and provenance

This repository ships **Workbench 3.1.0**, plugin ID `workbench`, a portable derivative
of [Can Workbench 2.2.0](https://github.com/cansitki/can-workbench/tree/e09d8a0b8e2af60405aa05b4477850f88f8dd995).
The upstream author is Can Sitki. Existing third-party credits, including Vin Verma
and the terminal bundle's MIT attribution, are retained. See the repository license
and build header. Personal instructions, settings, credentials and upstream Git
history are not included.

## Changes from upstream

- Product name, plugin ID, classes, logs, docs, installers and secure-input channel
  use Workbench/workbench. The matching secenv runtime is 0.4.0.
- Coder username starts empty. No account or workspace is injected; explicit user
  settings are preserved on reload.
- Remote upload directories are configured per workspace. An unmapped or removed
  terminal target never uploads to a guessed remote workspace.
- Relative explorer paths resolve against the actual remote login home.
- Secure Input has its own settings page, starts disabled and requires a unique
  workspace identifier. Missing targets never redirect credential requests.
- Listener settings cannot change during pending requests. Events from replaced
  listeners are ignored.
- The legacy SSH private-key paste form is removed. Use existing OS-managed SSH
  configuration or key-file paths. Agent intake remains exclusively secenv ask.
- Background workspaces can be explicitly selected for credential setup while remaining hidden from ordinary terminal views.
- System tmux scope is `@workbench_scope=system`; `sys-*` sessions are also hidden.
- Manual screen capture explains its macOS dependency on other platforms.

The original release hashes no longer describe this fork. `source-lock.json`
records upstream provenance and hashes of this release. The installer verifies
source inventory and asset hashes. Privacy checks cover every source file with
no home-path exemption.

## Build and verify

```bash
python3 scripts/verify-workbench-source.py
python3 integrations/workbench/source/build.py --check
node integrations/workbench/source/scripts/verify-portable-defaults.js
node integrations/workbench/source/scripts/verify-secure-input.js
bash scripts/verify-all.sh
```

Edit module/vendor source and run `python3 build.py` in `source/`. Shared imports
belong in `HEADER`. Never edit generated `main.js`. Review changes, regenerate
source-lock and installer hashes, and run release checks.

Source checks and simulated tests do not certify a recipient's desktop or remote
accounts. Use [MIGRATION.md](MIGRATION.md) and the root parity checklist.

## Canonical plugin repository

The original plugin repository now maintains the generic version directly. This
kit includes its pinned source snapshot for offline installation. Runtime source
must be developed upstream and synchronized here, not maintained as a divergent fork.

[Feature guide](https://github.com/cansitki/can-workbench/blob/6a45c1c91ec3a04fc11dbf6fa19dc8a22976e849/GUIDE.ro.md) ·
[Desktop audit and screenshots](https://github.com/cansitki/can-workbench/blob/6a45c1c91ec3a04fc11dbf6fa19dc8a22976e849/AUDIT.md).

The snapshot also includes Codex completion alerts and their optional remote helper.
