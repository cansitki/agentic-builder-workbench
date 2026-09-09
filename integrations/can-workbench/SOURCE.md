# Included Can Workbench source

The `source/` directory contains the runtime, modules, vendor bundles, build script,
PTY helper, and verifiers from public Can Workbench v2.2.0, commit
`e09d8a0b8e2af60405aa05b4477850f88f8dd995`.
Every included byte is recorded in `source-lock.json`. A normal Git clone includes
the plugin; no submodule, release download, or second private repository is needed.
The installer verifies the complete inventory and the original release hashes.

```bash
python3 scripts/verify-workbench-source.py
python3 integrations/can-workbench/source/build.py --check
node integrations/can-workbench/source/scripts/verify-secure-input.js
```

## Provenance and exclusions

Source: [Can Workbench](https://github.com/cansitki/can-workbench/tree/e09d8a0b8e2af60405aa05b4477850f88f8dd995).
The upstream personal `AGENTS.md`, repository README, Git metadata, settings,
and credential files are not imported. Attribution comments in the build header
and vendor bundles are retained. The original repository's private collaboration
terms apply to original additions; third-party bundled components retain their
own terms, including the MIT attribution to Vin Verma in the build header.

## Upstream defaults that need attention

This is the exact release, not a newly certified cross-platform fork. It contains:

- an author-specific fallback for the Coder username in `modules/orchestrator.js`;
- a Linux Coder upload directory default in `modules/vm-connect.js`;
- a Linux home assumption for relative project paths in the GSD vendor bundle;
- historical runtime names and `@nomarh_scope` compatibility metadata;
- source-system fixtures in the upstream verifiers.
- a legacy SSH private-key textarea. Do not use it for credential intake; the
  approved path remains `secenv ask` through the native masked secure-input modal.
  Use an existing locally managed SSH key/path when configuring transport.

Set your own Coder username explicitly through Workbench settings before connecting.
Use absolute project paths. Verify image paste/upload separately on your target;
do not assume a differently named Linux user or local Mac has the release's Coder
upload directory. Any portability patch must change module/vendor source, rebuild
`main.js`, update reviewed hashes, and run regression checks. Do not blindly run
the full upstream live verifier against another person's configured workspaces.

The privacy audit allows these exact public source bytes only after inventory and
hash verification. Secret scans are not disabled. This exception never covers
new settings, personal notes, host routes, credentials, or changed source bytes.

## Development

Edit `modules/*.js` or vendor source and run `python3 build.py` inside `source/`.
Shared imports belong in `HEADER` in `build.py`. Generated `main.js` must never
be hand-edited. A source change intentionally invalidates the lock until reviewed.
