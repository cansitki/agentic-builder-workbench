#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

bash scripts/audit-publication.sh
bash -n scripts/audit-publication.sh scripts/install-can-workbench.sh scripts/install-secenv.sh scripts/test-bootstrap.sh scripts/test-installers.sh scripts/verify-all.sh
node --check scripts/bootstrap.mjs
node --check scripts/check-adopted-brain.mjs
node --check scripts/check-links.mjs
node --check scripts/check-skills.mjs
node --check scripts/check-brain.mjs
node --check tools/secenv/tests/workbench_encrypt.mjs

python3 -c 'import json, pathlib; json.loads(pathlib.Path("tools/secenv/examples/provider.request.json").read_text()); json.loads(pathlib.Path("templates/security/credential-request.example.json").read_text())'
python3 -c 'import pathlib, tomllib; [tomllib.loads(pathlib.Path(path).read_text()) for path in (".codex/config.toml", "templates/personal/codex.config.example.toml", "tools/secenv/pyproject.toml")]'
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=tools/secenv/src python3 -c 'from pathlib import Path; from secenv_collector.schema import load_request; load_request(Path("tools/secenv/examples/provider.request.json")); load_request(Path("templates/security/credential-request.example.json"))'
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=tools/secenv/src python3 -m unittest discover -s tools/secenv/tests -v
bash scripts/test-bootstrap.sh

git diff --check
printf 'All local verification checks passed.\n'
