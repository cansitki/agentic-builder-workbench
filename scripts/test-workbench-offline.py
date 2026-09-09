#!/usr/bin/env python3
"""Exercise offline install, no-overwrite, and tamper detection in isolation."""
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(repo, vault):
    return subprocess.run(['bash', str(repo / 'scripts/install-workbench.sh'),
                           str(vault)], capture_output=True, text=True)

with tempfile.TemporaryDirectory(prefix='workbench-offline-') as temp:
    base = Path(temp)
    vault = base / 'Vault with spaces'
    (vault / '.obsidian').mkdir(parents=True)
    result = run(ROOT, vault)
    assert result.returncode == 0, result.stderr
    lock = json.loads((ROOT / 'integrations/workbench/source-lock.json').read_text())
    plugin = vault / '.obsidian/plugins/workbench'
    for name in ['main.js', 'manifest.json', 'styles.css']:
        assert hashlib.sha256((plugin / name).read_bytes()).hexdigest() == lock['files'][name]
    sentinel = plugin / 'operator-setting.txt'
    sentinel.write_text('preserve this local state')
    assert run(ROOT, vault).returncode != 0
    assert sentinel.read_text() == 'preserve this local state'

    clone = base / 'tampered-copy'
    (clone / 'scripts').mkdir(parents=True)
    for name in ['install-workbench.sh', 'verify-workbench-source.py']:
        shutil.copy2(ROOT / 'scripts' / name, clone / 'scripts' / name)
    shutil.copytree(ROOT / 'integrations/workbench', clone / 'integrations/workbench')
    bundle = clone / 'integrations/workbench/source/main.js'
    bundle.write_bytes(bundle.read_bytes() + b'\n// unexpected modification\n')
    second = base / 'fresh-vault'
    (second / '.obsidian').mkdir(parents=True)
    assert run(clone, second).returncode != 0
    assert not (second / '.obsidian/plugins/workbench').exists()

    legacy_vault = base / 'legacy-vault'
    legacy = legacy_vault / '.obsidian/plugins/can-workbench'
    legacy.mkdir(parents=True)
    (legacy / 'data.json').write_text('{"fixture":"preserve"}')
    assert run(ROOT, legacy_vault).returncode != 0
    assert (legacy / 'data.json').read_text() == '{"fixture":"preserve"}'
    assert not (legacy.parent / 'workbench').exists()

print('Offline installer passed: exact assets, spaced path, preserve existing and legacy state, reject tampered source.')
