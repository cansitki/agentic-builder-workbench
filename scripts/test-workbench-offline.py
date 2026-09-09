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
    return subprocess.run(['bash', str(repo / 'scripts/install-can-workbench.sh'),
                           str(vault)], capture_output=True, text=True)

with tempfile.TemporaryDirectory(prefix='workbench-offline-') as temp:
    base = Path(temp)
    vault = base / 'Vault with spaces'
    (vault / '.obsidian').mkdir(parents=True)
    result = run(ROOT, vault)
    assert result.returncode == 0, result.stderr
    lock = json.loads((ROOT / 'integrations/can-workbench/source-lock.json').read_text())
    plugin = vault / '.obsidian/plugins/can-workbench'
    for name in ['main.js', 'manifest.json', 'styles.css']:
        assert hashlib.sha256((plugin / name).read_bytes()).hexdigest() == lock['files'][name]
    sentinel = plugin / 'operator-setting.txt'
    sentinel.write_text('preserve this local state')
    assert run(ROOT, vault).returncode != 0
    assert sentinel.read_text() == 'preserve this local state'

    clone = base / 'tampered-copy'
    (clone / 'scripts').mkdir(parents=True)
    for name in ['install-can-workbench.sh', 'verify-workbench-source.py']:
        shutil.copy2(ROOT / 'scripts' / name, clone / 'scripts' / name)
    shutil.copytree(ROOT / 'integrations/can-workbench', clone / 'integrations/can-workbench')
    bundle = clone / 'integrations/can-workbench/source/main.js'
    bundle.write_bytes(bundle.read_bytes() + b'\n// unexpected modification\n')
    second = base / 'fresh-vault'
    (second / '.obsidian').mkdir(parents=True)
    assert run(clone, second).returncode != 0
    assert not (second / '.obsidian/plugins/can-workbench').exists()

print('Offline installer passed: exact assets, spaced path, preserve existing state, reject tampered source.')
