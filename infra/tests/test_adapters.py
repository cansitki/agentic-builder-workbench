import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[2]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
adapter=module('adapter',ROOT/'tools/obsidian-sync/adapter.py')
vault=module('vault',ROOT/'tools/vault/workbench-vault.py')

class AdapterTests(unittest.TestCase):
    def test_upstream_source_changes_fail_closed(self):
        with self.assertRaises(ValueError):adapter.patch(b'changed upstream')
    def test_login_uses_files_preserves_spaces_and_never_revokes(self):
        code="""
const assert=require('assert');
let calls=0,stored=null,exits=[],logs=[];
class Ye extends Error{constructor(error){super(error);this.error=error;}}
const create=(Ve,Qr,As,read)=>new Function('Ve','Qr','As','Rr','Ye','wbReadSecretFile','console','process','return '+ACTION)(Ve,Qr,As,t=>stored=t,Ye,read,{log:x=>logs.push(x),error:x=>logs.push(x)},{exit:x=>exits.push(x)});
(async()=>{
 let action=create(()=>null,async()=>null,async(e,p,m)=>{calls++;assert.equal(p,'  preserved  ');return{token:'dummy-token'};},file=>file==='password'?'  preserved  ':'');
 await action({email:'test@example.com',passwordFile:'password'});assert.equal(calls,1);assert.equal(stored,'dummy-token');assert(!logs.join().includes('preserved'));assert(!logs.join().includes('dummy-token'));
 calls=0;action=create(()=> 'existing',async()=>({email:'someone-else@example.com'}),async()=>{calls++;},()=>{throw Error('must not read');});
 await action({email:'test@example.com'});assert.equal(calls,0);assert(logs.includes('EXISTING_ACCOUNT_REVIEW_REQUIRED'));
 action=create(()=>null,async()=>null,async()=>{throw new Ye('2FA code is incorrect: raw-private-details');},()=> 'dummy');
 await action({email:'test@example.com',passwordFile:'password'});assert(logs.includes('MFA_REQUIRED'));assert(!logs.join().includes('raw-private-details'));
 console.log('login behavior passed');
})().catch(e=>{console.error(e);process.exit(1)});
""".replace('ACTION',json.dumps(adapter.LOGIN_ACTION))
        subprocess.run(['node','-e',code],check=True,capture_output=True)
    def test_secret_reader_rejects_symlink_and_public_file(self):
        helper=adapter.HELPER.split('const wbAllowed=')[0]
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'secret';p.write_text('  exact bytes  ');p.chmod(0o600)
            link=Path(tmp)/'link';link.symlink_to(p)
            code=helper+"\nconst assert=require('assert');assert.equal(wbReadSecretFile(process.argv[1]),'  exact bytes  ');assert.throws(()=>wbReadSecretFile(process.argv[2]));wbFs.chmodSync(process.argv[1],0o644);assert.throws(()=>wbReadSecretFile(process.argv[1]));"
            subprocess.run(['node','-e',code,str(p),str(link)],check=True,capture_output=True)
    def test_vault_append_preserves_inbox_and_refuses_wipes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'To Do List.md').write_text('# Tasks\n')
            with self.assertRaises(ValueError):vault.run(root,'create',{'name':'To Do List','content':''})
            with self.assertRaises(ValueError):vault.run(root,'append',{'file':'To Do List'})
            vault.run(root,'daily:append',{'content':'## Entry\n- Test'})
            path=root/vault.run(root,'daily:path',{})
            self.assertTrue(path.read_text().rstrip().endswith('## Links Inbox'))
            with self.assertRaises(ValueError):vault.run(root,'read',{'path':'../outside.md'})
            (root/'folder').mkdir();(root/'folder/To Do List.md').write_text('duplicate')
            with self.assertRaises(ValueError):vault.run(root,'read',{'file':'To Do List'})


class PluginConfigurationTests(unittest.TestCase):
    def test_core_workspaces_and_phase_routing_preserve_settings(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);plugin=root/'.obsidian/plugins/workbench';plugin.mkdir(parents=True)
            (plugin/'manifest.json').write_text('{}')
            (plugin/'data.json').write_text('{"custom":"preserved"}')
            core=root/'.obsidian/core-plugins.json';core.write_text('{"workspaces":false,"daily-notes":false,"graph":false}')
            for phase in ['local','remote','sync']:
                command=['python3',str(ROOT/'scripts/configure-workbench.py'),str(root),'--phase',phase,'--app-closed']
                if phase!='local':command+=['--coder-username','fixture-user']
                subprocess.run(command,check=True,capture_output=True)
            data=json.loads((plugin/'data.json').read_text());self.assertEqual(data['custom'],'preserved')
            self.assertEqual(data['secureInput']['workspace'],'system')
            flags=json.loads(core.read_text());self.assertTrue(flags['workspaces']);self.assertTrue(flags['daily-notes']);self.assertFalse(flags['graph'])
            before=(plugin/'data.json').read_text()
            (root/'.obsidian/community-plugins.json').write_text('["can-workbench"]')
            result=subprocess.run(['python3',str(ROOT/'scripts/configure-workbench.py'),str(root),'--phase','local','--app-closed'],capture_output=True)
            self.assertNotEqual(result.returncode,0);self.assertEqual((plugin/'data.json').read_text(),before)

if __name__=='__main__':unittest.main()
