#!/usr/bin/env python3
"""Scan paths, allowing only exact reviewed public plugin source bytes."""
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
    if path.is_relative_to(module.SOURCE):
        # The complete byte inventory was checked above, not a blanket vendor exclusion.
        # Ignore only the exact public UI placeholder, never actual key bodies.
        placeholder = '-----BEGIN OPENSSH ' + 'PRIVATE KEY-----\\n...\\n-----END OPENSSH PRIVATE KEY-----'
        if key_pattern.search(text.replace(placeholder, '')):
            failed.append(str(rel))
        continue
    if pattern.search(text) or key_pattern.search(text):
        failed.append(str(rel))
if failed:
    raise SystemExit('Private path check failed in: ' + ', '.join(failed))
print('Private path check passed; exact public source defaults are documented.')
