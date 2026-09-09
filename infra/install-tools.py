#!/usr/bin/env python3
"""Install pinned Coder/Terraform user binaries with published checksum checks."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import tarfile
import tempfile
import urllib.request
import zipfile

VERSIONS=json.loads((Path(__file__).parent/'versions.json').read_text())
def fetch(url):
    with urllib.request.urlopen(url,timeout=60) as response:return response.read()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tool',choices=['coder','terraform'])
    parser.add_argument('--directory',type=Path,default=Path.home()/'.local/share/workbench/bin')
    args=parser.parse_args()
    system={'Linux':'linux','Darwin':'darwin'}.get(platform.system())
    arch={'x86_64':'amd64','AMD64':'amd64','aarch64':'arm64','arm64':'arm64'}.get(platform.machine())
    if not system or not arch:raise SystemExit('Use macOS/Linux; on Windows run inside Ubuntu WSL2.')
    version=VERSIONS[args.tool]
    if args.tool=='coder':
        base=f'https://github.com/coder/coder/releases/download/v{version}'
        asset=f'coder_{version}_{system}_{arch}.tar.gz';checks=f'coder_{version}_checksums.txt'
    else:
        base=f'https://releases.hashicorp.com/terraform/{version}'
        asset=f'terraform_{version}_{system}_{arch}.zip';checks=f'terraform_{version}_SHA256SUMS'
    checksums=fetch(base+'/'+checks).decode().splitlines()
    expected=next((line.split()[0] for line in checksums if line.split()[-1].lstrip('*')==asset),None)
    if not expected:raise SystemExit('Published checksum missing')
    payload=fetch(base+'/'+asset)
    if hashlib.sha256(payload).hexdigest()!=expected:raise SystemExit('Download checksum mismatch')
    if args.tool=='coder':
        with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
            member=next(m for m in archive.getmembers() if m.name in ['coder','./coder'] and m.isfile())
            executable=archive.extractfile(member).read()
    else:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:executable=archive.read('terraform')
    directory=args.directory.expanduser().resolve();directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    target=directory/args.tool
    if target.is_symlink():raise SystemExit('Refusing a symbolic-link executable')
    if target.exists():
        if target.read_bytes()!=executable:raise SystemExit('Different existing executable: review upgrade explicitly')
    else:
        fd,temporary=tempfile.mkstemp(prefix=args.tool+'-',dir=directory)
        try:
            with os.fdopen(fd,'wb') as stream:stream.write(executable)
            os.chmod(temporary,0o700)
            os.link(temporary,target) # Never overwrite another executable.
        finally:
            os.unlink(temporary)
    print(json.dumps({'tool':args.tool,'version':version,'executable':str(target),'archive_sha256':expected}))
if __name__=='__main__':main()
