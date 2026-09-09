#!/usr/bin/env python3
"""Optional native Obsidian form test; no live settings or connections changed."""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def evaluate(code):
    result = subprocess.run(['obsidian', 'eval', 'code=' + code],
                            capture_output=True, text=True, timeout=30, check=True)
    if 'Error:' in result.stdout or result.stderr.strip():
        raise RuntimeError(result.stdout.strip() or result.stderr.strip())
    return result.stdout.partition('=>')[2].strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('vault', type=Path)
    args = parser.parse_args()
    vault = args.vault.resolve()
    active = json.loads(evaluate('JSON.stringify(app.vault.adapter.getBasePath())'))
    if Path(active).resolve() != vault:
        raise SystemExit('The CLI active vault is different from the requested test vault.')
    if evaluate('JSON.stringify(Boolean(window.__workbenchUiTestApi))') != 'false':
        raise SystemExit('Another Workbench UI test is active.')
    plugins = vault / '.obsidian/plugins'
    if not plugins.is_dir():
        raise SystemExit('Expected an existing Obsidian plugins directory.')
    fixture = Path(tempfile.mkdtemp(prefix='workbench-ui-fixture-', dir=plugins))
    identifier = json.dumps(fixture.name)
    try:
        (fixture / 'manifest.json').write_text(json.dumps({
            'id': fixture.name, 'name': 'Workbench UI fixture', 'version': '0.0.0',
            'minAppVersion': '1.0.0', 'isDesktopOnly': True,
            'description': 'Temporary detached-form verification', 'author': 'Test fixture',
        }))
        (fixture / 'main.js').write_text(
            'const api=require("obsidian"); module.exports=class extends api.Plugin {'
            'onload(){window.__workbenchUiTestApi=api;}'
            'onunload(){delete window.__workbenchUiTestApi;}};')
        source = str(ROOT / 'integrations/workbench/source/modules') + '/'
        body = (ROOT / 'scripts/obsidian-ui-smoke.js').read_text().replace(
            'WORKBENCH_TEST_SOURCE', json.dumps(source))
        code = ('(async()=>{await app.plugins.loadManifests();try{'
                f'await app.plugins.loadPlugin({identifier}); return await eval({json.dumps(body)});'
                '}finally{'
                f'await app.plugins.unloadPlugin({identifier});delete app.plugins.manifests[{identifier}];'
                '}})()')
        report = json.loads(evaluate(code))
        if report.get('status') != 'pass':
            raise SystemExit('Native UI test did not pass.')
        print(json.dumps(report))
    finally:
        try:
            evaluate(f'(async()=>{{await app.plugins.unloadPlugin({identifier});delete app.plugins.manifests[{identifier}];return "cleaned";}})()')
        finally:
            shutil.rmtree(fixture)

if __name__ == '__main__':
    main()
