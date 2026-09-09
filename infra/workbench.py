#!/usr/bin/env python3
"""Guided infrastructure operations. No cloud or host mutation without --apply."""
from __future__ import annotations
import argparse
import hashlib
import ipaddress
import json
import os
from pathlib import Path
import platform
import re
import secrets
import shlex
import shutil
import stat
import subprocess
import tarfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
CF = 'https://api.cloudflare.com/client/v4'
FIELDS = {'hostname','ssh_target','server_hostname','cloudflare_account_id','cloudflare_account_name',
          'cloudflare_zone_id','cloudflare_zone_name','coder_username','coder_email','display_name',
          'timezone','local_forward_port','api_caller_cidr'}
class SetupError(Exception):
    pass

def private_write(path, data, *, replace=False):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.is_symlink() or (path.exists() and not replace):
        raise SetupError('Refusing existing or symbolic-link output: ' + path.name)
    flags = os.O_WRONLY | os.O_CREAT | (os.O_TRUNC if replace else os.O_EXCL) | os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write(data)
    path.chmod(0o600)

def save_json(path, data, *, replace=False):
    private_write(path, json.dumps(data, indent=2, sort_keys=True)+'\n', replace=replace)

def read_private(path):
    path = Path(path)
    try:fd=os.open(path,os.O_RDONLY|os.O_NOFOLLOW)
    except OSError as error:raise SetupError("Credential file cannot be opened safely") from error
    with os.fdopen(fd,'r') as stream:
        st=os.fstat(stream.fileno())
        if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid() or stat.S_IMODE(st.st_mode) != 0o600:
            raise SetupError('Credential must be an owned regular file with mode 0600: '+path.name)
        if st.st_size > 65536:raise SetupError('Credential file is unexpectedly large')
        return stream.read()

def credential(path, name):
    for line in read_private(path).splitlines():
        key, sep, value = line.partition('=')
        if sep and key == name:
            parts = shlex.split(value)
            if len(parts) == 1 and parts[0]:
                return parts[0]
    raise SetupError('Missing credential variable: '+name)

def validate(config):
    required = FIELDS - {'api_caller_cidr'}
    if set(config) - FIELDS or required - set(config):
        raise SetupError('Configuration has missing or unknown fields; use setup.example.json')
    for key, value in config.items():
        if key != 'local_forward_port' and (not isinstance(value,str) or re.search(r'[\x00-\x1f\x7f]',value)):
            raise SetupError('Invalid configuration field: '+key)
    host = config['hostname']
    dns = r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}'
    if not re.fullmatch(dns,host) or not host.endswith('.'+config['cloudflare_zone_name']):
        raise SetupError('Use a lowercase hostname inside the selected zone')
    for key in ['cloudflare_account_id','cloudflare_zone_id']:
        if not re.fullmatch('[a-f0-9]{32}',config[key]): raise SetupError('Replace '+key+' with the real non-secret ID')
    for key in ['coder_username','server_hostname']:
        if not re.fullmatch('[a-z0-9][a-z0-9-]{0,31}',config[key]): raise SetupError('Invalid '+key)
    if not re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,200}',config['ssh_target']):
        raise SetupError('Use an existing safe SSH alias or user@host')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',config['coder_email']): raise SetupError('Invalid email')
    if not isinstance(config['local_forward_port'],int) or not 1024<=config['local_forward_port']<=65535:
        raise SetupError('Choose an unprivileged local forwarding port')
    ZoneInfo(config['timezone'])
    if config.get('api_caller_cidr'): ipaddress.ip_network(config['api_caller_cidr'])
    return config

def config_for(bundle):
    config = validate(json.loads((bundle/'setup.json').read_text()))
    digest = hashlib.sha256(json.dumps(config,sort_keys=True).encode()).hexdigest()
    if (bundle/'host/plan.sha256').read_text().strip() != digest:
        raise SetupError('Configuration changed after preparation; prepare/review a new bundle')
    return config

def schemas(config, bundle):
    expires = (datetime.now(timezone.utc)+timedelta(hours=24)).isoformat()
    creds = bundle/'credentials'
    cf_help = (f"Cloudflare API bearer token; account {config['cloudflare_account_name']} ({config['cloudflare_account_id']}); "
        f"production zone {config['cloudflare_zone_name']} ({config['cloudflare_zone_id']}), target {config['hostname']}. "
        "Minimum dashboard permissions: Account / Cloudflare Tunnel / Edit and Zone / DNS / Edit. "
        "Restrict to this account and zone. Creates a tunnel, retrieves connector token, configures ingress and creates DNS. "
        "Permissions include reading, writing and deleting tunnel resources in the account and DNS records throughout the zone; "
        "single-record DNS restriction is unavailable for this token workflow. No billing or user administration. "
        f"Caller IP restriction: {config.get('api_caller_cidr') or 'none configured; installer may use a roaming IP'}. "
        f"Expire at {expires}; revoke after verified setup. Owner-only destination: {creds/'cloudflare.env'}. "
        "Consumer: infra/workbench.py cloudflare only. Connector receives a separate runtime token.")
    admin_help = (f"Initial Coder account password for {config['coder_username']} ({config['coder_email']}) at {config['hostname']}. "
        "Purpose: create the first owner through private SSH forwarding and authenticate setup. Production administrator access "
        "is technically required for initial templates/users; it can control the Coder server, workspaces, deletion, "
        "and Docker-backed host resources. Not a Cloudflare or billing permission. Resource: this dedicated Coder installation only. "
        "Consumed over loopback before publishing DNS; never a public initial-signup page. "
        f"Owner-only destination: {creds/'coder-admin.env'}; consumer: infra/workbench.py coder-init. "
        "Keep the password in your own password manager; remove this bootstrap file after setup and rotate according to your account policy.")
    for key,var,help_text,label in [('cloudflare','CLOUDFLARE_API_TOKEN',cf_help,'Cloudflare scoped setup token'),
                                     ('coder-admin','CODER_ADMIN_PASSWORD',admin_help,'Initial Coder owner password')]:
        body={'id':'workbench-'+key,'title':label,'description':help_text,
              'fields':[{'name':var,'label':label,'type':'password','required':True,'help':help_text}],
              'outputs':[{'type':'env','path':str(creds/(key+'.env')),'mode':'0600','merge':False,'vars':[var]}]}
        save_json(bundle/(key+'.request.json'),body)

def prepare(config_path, output):
    config = validate(json.loads(config_path.read_text()))
    output = output.expanduser().resolve()
    if output.is_relative_to(ROOT) or output.exists():
        raise SetupError('Use a NEW private directory outside the repository')
    output.mkdir(parents=True,mode=0o700)
    host=output/'host';host.mkdir(mode=0o700)
    (host/'secrets').mkdir(mode=0o700)
    digest=hashlib.sha256(json.dumps(config,sort_keys=True).encode()).hexdigest()
    save_json(output/'setup.json',config)
    private_write(host/'plan.sha256',digest+'\n')
    for name in ['compose.yaml','bootstrap.sh']:shutil.copyfile(ROOT/'infra/host'/name,host/name)
    shutil.copyfile(ROOT/'infra/coder/workspace.Dockerfile',host/'workspace.Dockerfile')
    shutil.copytree(ROOT/'infra/coder/template',output/'template',ignore=shutil.ignore_patterns('.terraform','terraform.tfstate*'))
    template=output/'template/main.tf'
    template.write_text(template.read_text().replace('default = "UTC"','default = '+json.dumps(config['timezone'])))
    password=secrets.token_hex(32)
    private_write(host/'runtime.env',f'POSTGRES_PASSWORD={password}\nCODER_PG_CONNECTION_URL=postgres://coder:{password}@database:5432/coder?sslmode=disable\nCODER_ACCESS_URL=https://{config["hostname"]}\nWORKBENCH_TIMEZONE={config["timezone"]}\n')
    private_write(host/'secrets/cloudflared.token','')
    # Only repository files; never copy .git, ignored local data or credential files.
    files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
    for name in files:
        if not name: continue
        source=ROOT/name
        if not source.exists():continue
        if source.is_symlink() or source.suffix in {'.env','.pem','.key','.pyc'}:
            raise SetupError('Unexpected private/symlink source; publication audit required')
        dest=host/'kit'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
    schemas(config,output)
    save_json(output/'progress.json',{'stages':{'prepare':{'status':'prepared'}},'next':'local secure-input verification and target-plan review'})
    return {'status':'prepared','bundle':str(output),'hostname':config['hostname'],'plan_sha256':digest,'next':'review local and host setup, then collect credentials through Workbench only'}

class Client:
    def request(self, method, url, body=None, headers=None):
        data=None if body is None else json.dumps(body).encode()
        req=urllib.request.Request(url,data=data,method=method,headers={'Content-Type':'application/json',**(headers or {})})
        try:
            with urllib.request.urlopen(req,timeout=30) as response:
                raw=response.read(2*1024*1024)
                return response.status,dict(response.headers),json.loads(raw or b'{}')
        except urllib.error.HTTPError as error:
            return error.code,dict(error.headers),{} # Never log remote credential-bearing bodies.
        except (urllib.error.URLError,TimeoutError,OSError,json.JSONDecodeError) as error:
            raise SetupError('Transport failed; mutation may be unknown. Reconcile before retrying.') from error

def api(client, method, url, body=None, headers=None, expected=200):
    code,hdr,data=client.request(method,url,body,headers)
    if code!=expected: raise SetupError(f'Remote operation refused (HTTP {code}); response withheld')
    return data

def coder_url(config):return f'http://127.0.0.1:{config["local_forward_port"]}'

def owner_gate(config,bundle,client):
    token=read_private(bundle/'credentials/coder-session').strip()
    me=api(client,'GET',coder_url(config)+'/api/v2/users/me',headers={'Coder-Session-Token':token})
    if me.get('username')!=config['coder_username']:
        raise SetupError('Authenticated Coder account does not match the reviewed owner')
    roles=me.get('roles',[])
    if not any(role.get('name')=='owner' for role in roles):raise SetupError('Coder owner role was not verified')
    return me

def initialize_owner(bundle,client):
    config=config_for(bundle);base=coder_url(config)
    password=credential(bundle/'credentials/coder-admin.env','CODER_ADMIN_PASSWORD')
    status,headers,_=client.request('GET',base+'/api/v2/users/first')
    if status==404 and any(k.lower()=='x-coder-build-version' and v for k,v in headers.items()):
        marker=bundle/'owner-create.pending'
        private_write(marker,'First-owner creation pending; reconcile if interrupted.\n')
        api(client,'POST',base+'/api/v2/users/first',{'email':config['coder_email'],'username':config['coder_username'],
            'name':config['display_name'],'password':password,'trial':False},expected=201)
        marker.unlink()
    elif status!=200:
        raise SetupError('First-user state is not verified; no creation attempted')
    data=api(client,'POST',base+'/api/v2/users/login',{'email':config['coder_email'],'password':password},expected=201)
    token=data.get('session_token')
    if not isinstance(token,str) or not token:raise SetupError('Login returned no session')
    private_write(bundle/'credentials/coder-session',token+'\n',replace=True)
    me=owner_gate(config,bundle,client)
    owner_id=me.get('id','')
    if not re.fullmatch('[a-f0-9-]{36}',owner_id):raise SetupError('Verified owner has no valid ID')
    template=bundle/'template/main.tf'
    text=template.read_text()
    if 'OWNER_ID_REQUIRED' in text:template.write_text(text.replace('OWNER_ID_REQUIRED',owner_id))
    elif owner_id not in text:raise SetupError('Template is bound to a different owner')
    save_json(bundle/'owner.receipt.json',{'id':owner_id,'username':config['coder_username'],'verified':True},replace=True)
    (bundle/'owner-create.pending').unlink(missing_ok=True)
    return {'status':'owner-verified','next':'Cloudflare setup may now be reviewed/applied'}

def cloudflare(bundle,client):
    config=config_for(bundle);owner_gate(config,bundle,client) # A live gate, not a stale checkbox.
    token=credential(bundle/'credentials/cloudflare.env','CLOUDFLARE_API_TOKEN')
    headers={'Authorization':'Bearer '+token};account=config['cloudflare_account_id'];zone=config['cloudflare_zone_id']
    receipt=bundle/'cloudflare.receipt.json'
    state=json.loads(receipt.read_text()) if receipt.exists() else {}
    if state.get('pending'):raise SetupError('Cloudflare mutation is pending/unknown; reconcile without automatic retry')
    def cf(method,path,body=None):
        result=api(client,method,CF+path,body,headers)
        if result.get('success') is not True:raise SetupError('Cloudflare did not confirm success')
        return result.get('result')
    def mutation(operation,path,body,method='POST'):
        state['pending']=operation;save_json(receipt,state,replace=True)
        result=cf(method,path,body)
        state['pending']=None
        return result
    name='workbench-'+config['hostname'].replace('.','-')
    initial_records=cf('GET',f'/zones/{zone}/dns_records?name='+urllib.parse.quote(config['hostname']))
    if initial_records and not state.get('tunnel_id'):
        raise SetupError('Hostname already has DNS; no tunnel or record will be created')
    if not state.get('tunnel_id'):
        existing=cf('GET',f'/accounts/{account}/cfd_tunnel?is_deleted=false&name='+urllib.parse.quote(name))
        if existing:raise SetupError('Matching tunnel exists without an ownership receipt; reconcile first')
        result=mutation('create-tunnel',f'/accounts/{account}/cfd_tunnel',{'name':name,'config_src':'cloudflare'})
        if not isinstance(result,dict) or not re.fullmatch('[a-f0-9-]{36}',result.get('id','')):
            raise SetupError('Invalid tunnel creation receipt; reconcile')
        state['tunnel_id']=result['id'];save_json(receipt,state,replace=True)
    tunnel=state['tunnel_id'];target=tunnel+'.cfargotunnel.com'
    tunnel_token=cf('GET',f'/accounts/{account}/cfd_tunnel/{tunnel}/token')
    if not isinstance(tunnel_token,str) or not tunnel_token:raise SetupError('No tunnel connector token received')
    private_write(bundle/'host/secrets/cloudflared.token',tunnel_token,replace=True)
    if not state.get('ingress'):
        body={'config':{'ingress':[{'hostname':config['hostname'],'service':'http://coder:7080'},{'service':'http_status:404'}]}}
        mutation('configure-ingress',f'/accounts/{account}/cfd_tunnel/{tunnel}/configurations',body,'PUT')
        state['ingress']=True;save_json(receipt,state,replace=True)
    records=cf('GET',f'/zones/{zone}/dns_records?name='+urllib.parse.quote(config['hostname']))
    if records:
        if len(records)!=1 or records[0].get('type')!='CNAME' or records[0].get('content')!=target or records[0].get('proxied') is not True:
            raise SetupError('Conflicting DNS record; it will not be overwritten')
        state['dns_id']=records[0]['id']
    elif not state.get('dns_id'):
        result=mutation('create-dns',f'/zones/{zone}/dns_records',{'type':'CNAME','name':config['hostname'],'content':target,'proxied':True})
        state['dns_id']=result['id']
    else:raise SetupError('Previously created DNS disappeared; inspect before recreating')
    save_json(receipt,state,replace=True)
    return {'status':'tunnel-configured','tunnel_id':tunnel,'next':'transfer connector token and start the public profile; then verify HTTPS'}

def deploy_host(bundle):
    config=config_for(bundle);target=config['ssh_target']
    stage='.local/share/workbench-install/'+(bundle/'host/plan.sha256').read_text().strip()[:16]
    remote=f'umask 077; mkdir -p "$HOME/{stage}" && tar -xf - -C "$HOME/{stage}"'
    with tempfile_archive(bundle/'host') as archive:
        subprocess.run(['ssh','-o','BatchMode=yes',target,remote],stdin=archive,check=True)
    command=f'sudo -n bash "$HOME/{stage}/bootstrap.sh" '+shlex.quote(config['server_hostname'])
    subprocess.run(['ssh','-o','BatchMode=yes',target,command],check=True)
    return {'status':'host-started','next':f'open SSH forwarding on local port {config["local_forward_port"]}, then coder-init'}

from contextlib import contextmanager
import tempfile
@contextmanager
def tempfile_archive(directory):
    with tempfile.TemporaryFile() as file:
        with tarfile.open(fileobj=file,mode='w') as archive:archive.add(directory,arcname='.')
        file.seek(0);yield file

def start_tunnel(bundle):
    config=config_for(bundle)
    owner_gate(config,bundle,Client())
    receipt=json.loads((bundle/'cloudflare.receipt.json').read_text())
    if receipt.get('pending') or not receipt.get('dns_id'):raise SetupError('Cloudflare configuration is not reconciled yet')
    secret=bundle/'host/secrets/cloudflared.token'
    value=read_private(secret)
    if not value.strip():raise SetupError('Tunnel token has not been installed')
    # Only the runtime connector token reaches the VPS; API/admin credentials stay on the PC.
    command='sudo -n sh -c '+shlex.quote('umask 077; cat > /srv/workbench/secrets/cloudflared.token')
    subprocess.run(['ssh','-o','BatchMode=yes',config['ssh_target'],command],input=value.encode(),check=True)
    command='cd /srv/workbench && sudo -n docker compose --env-file runtime.env --profile public up -d cloudflared'
    subprocess.run(['ssh','-o','BatchMode=yes',config['ssh_target'],command],check=True)
    return {'status':'connector-started','next':'verify HTTPS, then create workspaces'}

def coder_cli(bundle,operation):
    config=config_for(bundle)
    api(Client(),'GET','https://'+config['hostname']+'/api/v2/buildinfo')
    env=os.environ.copy();env['CODER_URL']='https://'+config['hostname']
    env['CODER_SESSION_TOKEN']=read_private(bundle/'credentials/coder-session').strip()
    def run(command):
        result=subprocess.run(command,env=env,stdin=subprocess.DEVNULL,capture_output=True,text=True)
        if result.returncode:raise SetupError('Coder CLI operation failed; reconcile redacted state before retrying')
    if operation=='login':
        run(['coder','login',env['CODER_URL'],'--use-token-as-session'])
    elif operation=='ssh-config':
        run(['coder','config-ssh','--hostname-suffix','coder','--ssh-host-prefix','','--yes'])
    else:
        headers={'Coder-Session-Token':env['CODER_SESSION_TOKEN']}
        me=api(Client(),'GET',env['CODER_URL']+'/api/v2/users/me',headers=headers)
        if me.get('username')!=config['coder_username']:raise SetupError('Unexpected Coder account')
        receipt=bundle/'workspaces.receipt.json'
        state=json.loads(receipt.read_text()) if receipt.exists() else {}
        if state.get('pending')=='template':raise SetupError('Template push is unknown; reconcile before retrying')
        if not state.get('template'):
            organizations=me.get('organization_ids',[])
            if len(organizations)!=1:raise SetupError('Select/review the Coder organization before publishing a template')
            templates=api(Client(),'GET',env['CODER_URL']+'/api/v2/organizations/'+organizations[0]+'/templates',headers=headers)
            if any(t.get('name')=='workbench' for t in templates):
                raise SetupError('Template already exists without setup receipt; review before changing it')
            state['pending']='template';save_json(receipt,state,replace=True)
            run(['coder','templates','push','workbench','--directory',str(bundle/'template'),'--yes'])
            state.update(template=True,pending=None);save_json(receipt,state,replace=True)
        for name in ['ops-main','system']:
            status,_,existing=Client().request('GET',env['CODER_URL']+'/api/v2/users/'+me['id']+'/workspace/'+name,headers=headers)
            if status==200:
                if existing.get('template_name')!='workbench':raise SetupError('Existing workspace uses a different template')
            elif status==404:
                if state.get('pending')==name:raise SetupError('Workspace creation is unknown; reconcile before retrying')
                state['pending']=name;save_json(receipt,state,replace=True)
                run(['coder','create',name,'--template','workbench','--use-parameter-defaults','--yes'])
            else:raise SetupError('Workspace existence could not be verified')
            if not state.get(name):
                run(['coder','schedule','stop',name,'manual'])
                run(['coder','stop',name,'--yes'])
                run(['coder','start',name,'--yes'])
            state.update({name:True,'pending':None});save_json(receipt,state,replace=True)
    return {'status':operation+'-completed','next':'verify real workspace SSH and persistence; creation alone is not readiness'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',choices=['doctor','prepare','deploy-host','coder-init','cloudflare','start-tunnel','coder-login','workspaces','ssh-config'])
    parser.add_argument('--config',type=Path);parser.add_argument('--bundle',type=Path);parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    if args.operation=='doctor':
        print(json.dumps({'os':platform.system(),'wsl':'microsoft' in platform.release().lower(),
                          'tools':{name:bool(shutil.which(name)) for name in ['git','node','python3','obsidian','secenv','ssh','coder']},
                          'note':'Only local prerequisites checked; credentials and infrastructure are not verified.'},indent=2));return
    if args.operation=='prepare':
        if not args.config or not args.bundle:parser.error('prepare needs --config and --bundle')
        print(json.dumps(prepare(args.config,args.bundle),indent=2));return
    if not args.apply or not args.bundle:parser.error('external actions require --bundle and --apply after target-plan authorization')
    bundle=args.bundle.expanduser().resolve();client=Client()
    actions={'deploy-host':lambda:deploy_host(bundle),'coder-init':lambda:initialize_owner(bundle,client),
             'cloudflare':lambda:cloudflare(bundle,client),'start-tunnel':lambda:start_tunnel(bundle),
             'coder-login':lambda:coder_cli(bundle,'login'),'workspaces':lambda:coder_cli(bundle,'workspaces'),
             'ssh-config':lambda:coder_cli(bundle,'ssh-config')}
    progress_path=bundle/'progress.json'
    progress=json.loads(progress_path.read_text())
    progress.setdefault('stages',{})[args.operation]={'status':'running; reconcile if interrupted'}
    save_json(progress_path,progress,replace=True)
    result=actions[args.operation]()
    progress['stages'][args.operation]=result
    progress['next']=result.get('next','verify target evidence')
    save_json(progress_path,progress,replace=True)
    print(json.dumps(result,indent=2))
if __name__=='__main__':
    try:main()
    except (SetupError,OSError,ValueError,subprocess.CalledProcessError) as error:
        # Do not print subprocess output, HTTP response bodies, or credential values.
        print(json.dumps({'status':'blocked','reason':str(error) if isinstance(error,SetupError) else type(error).__name__}))
        raise SystemExit(1)
