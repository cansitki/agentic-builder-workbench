#!/usr/bin/env python3
"""Small file-based vault CLI for a headless workspace; not Obsidian's app API."""
import argparse
from datetime import datetime
import fcntl
import json
import os
from pathlib import Path
import tempfile
from zoneinfo import ZoneInfo

def checked(root,relative):
    path=(root/relative).resolve()
    if not path.is_relative_to(root):raise ValueError('Path escapes the configured vault')
    return path

def resolve(root,options,*,new=False):
    if 'path' in options:return checked(root,options['path'])
    name=options.get('file') or options.get('name')
    if not name or '/' in name or '\\' in name:raise ValueError('Use file/name for a note name or path for an exact relative path')
    filename=name if name.endswith('.md') else name+'.md'
    matches=[p for p in root.rglob(filename) if '.obsidian' not in p.parts and p.resolve().is_relative_to(root)]
    if len(matches)>1:raise ValueError('Ambiguous note name; use path')
    if matches:return matches[0]
    if new:return checked(root,filename)
    raise ValueError('Note not found')

def atomic(path,content):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,temp=tempfile.mkstemp(prefix='.workbench-note-',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as stream:stream.write(content)
        os.replace(temp,path)
    finally:
        if os.path.exists(temp):os.unlink(temp)

def run(root,command,options):
    root=root.resolve()
    if not root.is_dir():raise ValueError('Vault directory is unavailable')
    if command.startswith('daily:'):
        settings=root/'.obsidian/daily-notes.json'
        daily=json.loads(settings.read_text()) if settings.exists() else {}
        folder=daily.get('folder','daily notes')
        date=datetime.now(ZoneInfo(os.environ.get('WORKBENCH_TIMEZONE','UTC'))).strftime('%Y-%m-%d')
        path=checked(root,str(Path(folder)/(date+'.md')))
        if command=='daily:path':return str(path.relative_to(root))
        if command=='daily:read':return path.read_text()
        if command!='daily:append':raise ValueError('Unsupported daily command')
    elif command=='search':
        query=options.get('query','').casefold()
        if not query:raise ValueError('search requires query')
        return '\n'.join(str(p.relative_to(root)) for p in sorted(root.rglob('*.md')) if '.obsidian' not in p.parts and p.resolve().is_relative_to(root) and query in p.read_text().casefold())
    else:path=resolve(root,options,new=command=='create')
    if command=='read':return path.read_text()
    if command not in ['create','append','daily:append']:raise ValueError('Unsupported operation; desktop eval/plugin APIs are not available here')
    if 'content' not in options:raise ValueError('A literal content value is required')
    content=options['content'].replace('\\n','\n').replace('\\t','\t')
    if command=='create' and path.exists():raise ValueError('Refusing to overwrite an existing note')
    if command=='append' and not path.exists():raise ValueError('Note not found')
    previous=path.read_text() if path.exists() else ''
    observed=previous
    if command=='create':result=content
    elif command=='daily:append':
        if not previous:previous=f'# {date}\n\n## Links Inbox\n'
        if '## Links Inbox' not in previous:previous=previous.rstrip()+'\n\n## Links Inbox\n'
        before,sep,after=previous.partition('## Links Inbox')
        result=before.rstrip()+'\n\n'+content.strip()+'\n\n'+sep+after
    else:result=previous.rstrip()+'\n\n'+content+'\n'
    if path.exists() and path.read_text()!=observed:raise ValueError('Note changed while editing; read/reconcile again')
    atomic(path,result)
    return 'Updated: '+str(path.relative_to(root))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--vault',type=Path,default=Path(os.environ.get('WORKBENCH_VAULT','/vault')))
    parser.add_argument('command');parser.add_argument('arguments',nargs='*');args=parser.parse_args()
    options={}
    for value in args.arguments:
        key,sep,item=value.partition('=')
        if not sep or key in options:parser.error('Expected unique key=value arguments')
        options[key]=item
    lockdir=Path.home()/'.cache/workbench';lockdir.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd=os.open(lockdir/'vault.lock',os.O_RDWR|os.O_CREAT|os.O_NOFOLLOW,0o600)
    with os.fdopen(fd,'r+') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        try:print(run(args.vault,args.command,options))
        except (ValueError,OSError) as error:parser.exit(1,str(error)+'\n')
if __name__=='__main__':main()
