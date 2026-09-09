#!/usr/bin/env python3
"""Configure the included plugin in a closed vault, preserving unrelated settings."""
import argparse
import json
from pathlib import Path
import os
import tempfile

def write(path,data):
    if path.is_symlink():raise SystemExit('Refusing a symlink settings file')
    fd,tmp=tempfile.mkstemp(prefix='.workbench-config-',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as stream:json.dump(data,stream,indent=2);stream.write('\n')
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('vault',type=Path)
    parser.add_argument('--phase',choices=['local','remote','sync'],required=True)
    parser.add_argument('--coder-username')
    parser.add_argument('--app-closed',action='store_true',required=True)
    args=parser.parse_args();vault=args.vault.expanduser().resolve()
    directory=vault/'.obsidian/plugins/workbench'
    if not (directory/'manifest.json').is_file():raise SystemExit('Install Workbench first')
    file=directory/'data.json'
    if file.is_symlink():raise SystemExit('Refusing symlink settings')
    settings=json.loads(file.read_text()) if file.exists() else {}
    gsd=settings.setdefault('gsd',{});workspaces=gsd.setdefault('workspaces',[])
    if args.phase=='local':
        additions=[{'coderName':'local-bootstrap','displayName':'This computer','type':'local','projects':[]}]
        selected='local-bootstrap'
    else:
        if not args.coder_username:raise SystemExit('Remote setup needs your verified Coder username')
        if gsd.get('coderUser') not in [None,'',args.coder_username]:raise SystemExit('Different existing Coder user; review before changing')
        gsd['coderUser']=args.coder_username
        additions=[{'coderName':'ops-main','displayName':'Work','type':'coder','uploadDir':'/workspace/uploads',
                    'projects':[{'displayName':'Projects','path':'/workspace/projects'}]},
                   {'coderName':'system','displayName':'System','type':'coder','hidden':True,'projects':[]}]
        selected='system' if args.phase=='sync' else 'ops-main'
    for item in additions:
        matches=[w for w in workspaces if w.get('coderName')==item['coderName']]
        if len(matches)>1 or (matches and matches[0].get('type')!=item['type']):raise SystemExit('Conflicting existing workspace entry')
        if not matches:workspaces.append(item)
    settings['secureInput']={'enabled':True,'workspace':selected}
    community=vault/'.obsidian/community-plugins.json'
    plugins=json.loads(community.read_text()) if community.exists() else []
    if 'can-workbench' in plugins:raise SystemExit('Disable/migrate legacy plugin before enabling Workbench')
    if 'workbench' not in plugins:plugins.append('workbench')
    write(file,settings)
    write(community,plugins)
    print(json.dumps({'status':'configured','phase':args.phase,'secure_input_workspace':selected,'next':'open Obsidian and verify listener with dummy data'}))
if __name__=='__main__':main()
