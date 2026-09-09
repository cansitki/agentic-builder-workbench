#!/usr/bin/env python3
"""Verify the exact reviewed source snapshot before trusting/installing it."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'integrations/workbench/source'
LOCK = json.loads((SOURCE.parent / 'source-lock.json').read_text())

def verify():
    actual = {str(p.relative_to(SOURCE)) for p in SOURCE.rglob('*') if p.is_file()}
    expected = set(LOCK['files'])
    if actual != expected:
        raise SystemExit('Workbench source file inventory mismatch')
    for name, digest in LOCK['files'].items():
        path = SOURCE / name
        if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise SystemExit(f'Workbench source hash mismatch: {name}')
    print(f'Workbench source verified: {len(expected)} files, {LOCK["version"]}')

if __name__ == '__main__':
    verify()
