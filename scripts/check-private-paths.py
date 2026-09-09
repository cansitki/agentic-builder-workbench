#!/usr/bin/env python3
"""Scan every source and document for private home paths and key material."""
import re
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location('source_check', ROOT / 'scripts/verify-workbench-source.py')
module = module_from_spec(spec)
spec.loader.exec_module(module)
module.verify()
ignored = {'.git', '.venv', 'venv', 'node_modules', 'build', 'dist', '__pycache__'}
pattern = re.compile(r'/(home|Users)/[A-Za-z0-9._-]+/')
failed = []
key_pattern = re.compile(r'-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----')
for path in ROOT.rglob('*'):
    rel = path.relative_to(ROOT)
    if any(part in ignored for part in rel.parts) or not path.is_file():
        continue
    text = path.read_text(errors='replace')
    if pattern.search(text) or key_pattern.search(text):
        failed.append(str(rel))
if failed:
    raise SystemExit('Private path check failed in: ' + ', '.join(failed))
print('Private path and private-key checks passed across all source and documents.')
