#!/usr/bin/env python3
"""Ephemeral CI-only Coder/image/workspace smoke. Never use a production daemon."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('wb',ROOT/'infra/workbench.py');w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
def run(command,env=None):
    result=subprocess.run(command,env=env,stdin=subprocess.DEVNULL,capture_output=True,text=True)
    if result.returncode:raise RuntimeError('Command failed: '+' '.join(command[:3])+'; output withheld to protect runtime credentials')
    return result.stdout

def main():
    if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('WORKBENCH_ISOLATED_DOCKER')!='yes':
        raise SystemExit('This destructive-cleanup smoke requires an isolated CI Docker daemon.')
    version=json.loads((ROOT/'infra/versions.json').read_text())['coder']
    run(['docker','build','-t','workbench-workspace:2026-09-09','-f',str(ROOT/'infra/coder/workspace.Dockerfile'),str(ROOT)])
    run(['docker','run','--rm','--entrypoint','bash','workbench-workspace:2026-09-09','-lc',
         "git --version && node --version && python3 --version && tmux -V && codex --version && secenv init && secenv doctor && test -w /workspace && test -w /vault && node /opt/workbench-sync/node_modules/obsidian-headless/cli-safe.cjs login --help"])
    with tempfile.TemporaryDirectory(prefix='workbench-stack-smoke-') as temp:
        base=Path(temp);cfg=json.loads((ROOT/'infra/setup.example.json').read_text())
        cfg.update(cloudflare_account_id='a'*32,cloudflare_zone_id='b'*32,coder_username='ci-owner',coder_email='fixture@example.com',local_forward_port=7080)
        config=base/'config.json';config.write_text(json.dumps(cfg));bundle=base/'bundle';w.prepare(config,bundle)
        runtime=bundle/'host/runtime.env'
        runtime.write_text(runtime.read_text().replace('https://coder.example.com','http://coder:7080')+f'DOCKER_GID={Path("/var/run/docker.sock").stat().st_gid}\n')
        runtime.chmod(0o600)
        w.private_write(bundle/'credentials/coder-admin.env',"CODER_ADMIN_PASSWORD='fixture-password-for-isolated-CI-only'\n")
        compose=['docker','compose','-p','workbench-ci','--project-directory',str(bundle/'host'),'--env-file',str(runtime),'-f',str(bundle/'host/compose.yaml')]
        created=[];env=None
        try:
            run(compose+['config','--quiet']);run(compose+['up','-d','database','coder'])
            client=w.Client()
            for _ in range(90):
                try:
                    code,_,_=client.request('GET','http://127.0.0.1:7080/api/v2/buildinfo')
                    if code==200:break
                except w.SetupError:pass
                time.sleep(2)
            else:raise RuntimeError('Coder did not become healthy')
            w.initialize_owner(bundle,client)
            token=w.read_private(bundle/'credentials/coder-session').strip()
            env=os.environ.copy();env.update(CODER_URL='http://127.0.0.1:7080',CODER_SESSION_TOKEN=token)
            binary=base/'coder'
            container=run(compose+['ps','-q','coder']).strip()
            run(['docker','cp',container+':/opt/coder',str(binary)]);binary.chmod(0o700)
            cli=[str(binary)]
            run(cli+['templates','push','workbench','--directory',str(bundle/'template'),'--yes'],env)
            for name in ['ops-main','system']:
                created.append(name);run(cli+['create',name,'--template','workbench','--use-parameter-defaults','--yes'],env)
                run(cli+['ssh',name,'--','tmux','-V'],env)
            run(cli+['ssh','ops-main','--','sh','-c',"printf persisted > /workspace/smoke-marker; printf shared > /vault/smoke-shared"],env)
            assert run(cli+['ssh','system','--','cat','/vault/smoke-shared'],env).strip()=='shared'
            run(cli+['stop','ops-main','--yes'],env);run(cli+['start','ops-main','--yes'],env)
            assert run(cli+['ssh','ops-main','--','cat','/workspace/smoke-marker'],env).strip()=='persisted'
            print(json.dumps({'status':'pass','coder':version,'workspaces':created,'ssh':True,'shared_vault':True,'stop_start_persistence':True,'cloudflare_live':False,'sync_account_live':False}))
        finally:
            if env:
                for name in reversed(created):
                    try:run([str(base/'coder'),'delete',name,'--yes'],env)
                    except RuntimeError:pass
            run(compose+['down','--volumes'])
            # Only volumes created by this isolated test under these exact names.
            for name in ['workbench-vault','workbench-sync-config']:
                subprocess.run(['docker','volume','rm',name],capture_output=True)
if __name__=='__main__':main()
