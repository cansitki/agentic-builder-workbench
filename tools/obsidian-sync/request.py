#!/usr/bin/env python3
"""Generate informed native-input schemas for this user's Obsidian Sync account."""
import argparse
import json
from pathlib import Path
import os
import re

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--email',required=True)
    parser.add_argument('--vault-id',required=True)
    parser.add_argument('--directory',type=Path,required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',args.email) or not re.fullmatch('[A-Za-z0-9_-]+',args.vault_id):raise SystemExit('Use the account email and exact remote vault ID')
    root=args.directory.expanduser().resolve();root.mkdir(mode=0o700,parents=True,exist_ok=True)
    fields=[('login','OBSIDIAN_ACCOUNT_PASSWORD','Account password','password',
      'Authenticates this Obsidian account for the remote Sync client. Account passwords have no granular scopes or per-vault/IP restriction: they can authorize account and subscription operations supported by the provider. The adapter uses authentication and Sync only. Remove the bootstrap file after successful authentication; keep recovery in your own password manager.'),
      ('vault','OBSIDIAN_VAULT_PASSWORD','Encrypted vault password','vault-password',
      'Decrypts and validates only the selected encrypted remote vault. Enables reading and writing its notes and attachments through Sync, including propagation of changes and deletions. It does not grant billing or account administration. No provider IP restriction applies. Remove this raw file after validation; the derived encryption key remains owner-only for continuous sync.'),
      ('mfa','OBSIDIAN_MFA_CODE','Fresh one-time authentication code','mfa-code',
      'Completes the current authentication challenge for this account only. Consume immediately; expiry is controlled by the provider challenge. Request only after MFA_REQUIRED, and delete the file after use. This is not a reusable account password or an independent billing/admin permission.')]
    for key,name,label,filename,purpose in fields:
      destination=root/filename
      help_text=f'Provider: Obsidian Sync; owner account {args.email}; remote vault {args.vault_id}; environment production/personal knowledge. Credential: {name}, {label}. {purpose} Exact owner-only destination: {destination}. Consumer: the hash-pinned Workbench Obsidian file-input adapter, running as this workspace user.'
      body={'id':'workbench-obsidian-'+key,'title':'Obsidian Sync — '+label,'description':help_text,
            'fields':[{'name':name,'label':label,'type':'password','required':True,'help':help_text}],
            'outputs':[{'type':'file','path':str(destination),'field':name,'mode':'0600','newline':False}]}
      path=root/(key+'.request.json')
      fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_NOFOLLOW,0o600)
      with os.fdopen(fd,'w') as stream:json.dump(body,stream,indent=2);stream.write('\n')
    print(json.dumps({'status':'schemas-created','directory':str(root),'next':'Review fields, then use secenv ask for login/vault; MFA only if challenged.'}))
if __name__=='__main__':main()
