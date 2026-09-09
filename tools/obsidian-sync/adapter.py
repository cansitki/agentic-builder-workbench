#!/usr/bin/env python3
"""Install a hash-pinned file-input adapter; never vendor the upstream CLI."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import os

VERSION='0.0.14'
SOURCE_SHA='c6307dc72c00bcf6f22093fb3e0eb91fdc417fc9dd05884ff2c36e5a19cd0196'
HELPER='''
const wbFs=require('node:fs');
const wbPath=require('node:path');
function wbReadSecretFile(file, required=true) {
  if (!file) { if (required) throw new Error('SECRET_FILE_REQUIRED'); return ''; }
  if (!wbPath.isAbsolute(file)) throw new Error('ABSOLUTE_SECRET_FILE_REQUIRED');
  const fd=wbFs.openSync(file,wbFs.constants.O_RDONLY|wbFs.constants.O_NOFOLLOW);
  try {
    const info=wbFs.fstatSync(fd);
    if (!info.isFile() || info.uid!==process.getuid() || (info.mode & 0o777)!==0o600 || info.size>16384) throw new Error('UNSAFE_SECRET_FILE');
    const value=wbFs.readFileSync(fd,'utf8');
    if (!value) throw new Error('EMPTY_SECRET_FILE');
    return value;
  } finally {wbFs.closeSync(fd);}
}
const wbAllowed=new Set(['login','sync-setup','sync','sync-config','sync-list-remote','sync-status','--help','--version']);
if (!wbAllowed.has(process.argv[2]) || process.argv.some(a=>/^--(password|mfa)(=|$)/.test(a))) {
  console.error('Use an allowed command and secret-file options only.'); process.exit(2);
}
'''
LOGIN_ACTION='''async s=>{
  try {
    const existing=Ve();
    if(existing){
      const account=await Qr(existing);
      if(account&&s.email&&account.email===s.email){console.log('AUTHENTICATED');return;}
      console.error('EXISTING_ACCOUNT_REVIEW_REQUIRED');process.exit(2);return;
    }
    if(!s.email){console.error('EMAIL_REQUIRED');process.exit(2);return;}
    const password=wbReadSecretFile(s.passwordFile);
    const mfa=wbReadSecretFile(s.mfaFile,false);
    let account;
    try {account=await As(s.email,password,mfa);}
    catch(error){console.error(error instanceof Ye && error.error.includes('2FA code')?'MFA_REQUIRED':'AUTHENTICATION_FAILED');process.exit(2);return;}
    Rr(account.token);console.log('AUTHENTICATED');
  }catch(error){console.error('SECURE_LOGIN_FAILED');process.exit(2);}
}'''

def replace_once(text,old,new):
    if text.count(old)!=1:raise ValueError('Upstream patch boundary changed')
    return text.replace(old,new,1)

def patch(source):
    if hashlib.sha256(source).hexdigest()!=SOURCE_SHA:raise ValueError('Unsupported upstream source hash')
    text=source.decode()
    start=text.index('.command("login")');end=text.index('.command(',start+10)
    login='''.command("login").description("Authenticate from owner-only native-intake files")
.requiredOption("--email <email>","Account email")
.option("--password-file <path>","Owner-only raw password file")
.option("--mfa-file <path>","Owner-only raw one-time code file")
.action('''+LOGIN_ACTION+''');x\n'''
    text=text[:start]+login+text[end:]
    start=text.index('.command("sync-setup")');end=text.index('.command(',start+10)
    block=text[start:end]
    block=replace_once(block,'.option("--password <encryption-password>","End-to-end encryption password (prompted if omitted)")',
                       '.requiredOption("--password-file <path>","Owner-only raw vault encryption password file")')
    block=replace_once(block,'.action(async s=>{try{let e=te()', '.action(async s=>{s.json=true;try{let e=te()')
    block=replace_once(block,'n=s.password,','n=wbReadSecretFile(s.passwordFile),')
    block=replace_once(block,'c.password?n=c.password:!n&&!s.json&&(n=await Ke("End-to-end encryption password: ")),','if(c.password){throw new Error("ENCRYPTED_VAULT_REQUIRED")}')
    block=block.replace('console.error("Failed to validate password.",S)','console.error("VAULT_PASSWORD_VALIDATION_FAILED")')
    block=block.replace('console.error("Setup failed:",e)','console.error("SECURE_SYNC_SETUP_FAILED")')
    text=text[:start]+block+text[end:]
    first,newline,rest=text.partition('\n')
    return (first+newline+HELPER+rest).encode()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory',type=Path,default=Path.home()/'.local/share/workbench/obsidian-sync')
    args=parser.parse_args();directory=args.directory.expanduser().resolve()
    directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    package=directory/'node_modules/obsidian-headless/cli.js'
    for name in ['package.json','package-lock.json']:
        expected=(Path(__file__).parent/name).read_bytes(); destination=directory/name
        if destination.is_symlink() or (destination.exists() and destination.read_bytes()!=expected):raise SystemExit('Different existing dependency lock; review upgrade')
        if not destination.exists():destination.write_bytes(expected)
    if not package.exists():
        subprocess.run(['npm','ci','--prefix',str(directory),'--ignore-scripts','--no-audit','--no-fund'],check=True)
    payload=patch(package.read_bytes()) # Validate source before any dependency code/script executes.
    subprocess.run(['npm','rebuild','--prefix',str(directory),'better-sqlite3'],check=True)
    subprocess.run(['node','-e',"const D=require(process.argv[1]);const db=new D(':memory:');db.close();",str(directory/'node_modules/better-sqlite3')],check=True)
    target=package.parent/'cli-safe.cjs'
    if target.is_symlink():raise SystemExit('Unsafe existing adapter path')
    if target.exists() and target.read_bytes()!=payload:raise SystemExit('Different existing adapter; explicit upgrade review required')
    if not target.exists():
        fd=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o700)
        with os.fdopen(fd,'wb') as stream:stream.write(payload)
    subprocess.run(['node','--check',str(target)],check=True)
    print(json.dumps({'status':'installed','version':VERSION,'entrypoint':str(target),'upstream_sha256':SOURCE_SHA,'patched_sha256':hashlib.sha256(payload).hexdigest()}))
if __name__=='__main__':main()
