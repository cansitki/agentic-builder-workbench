import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('bootstrap',ROOT/'infra/workbench.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)

def config():
    return dict(hostname='coder.example.com',ssh_target='fixture-vps',server_hostname='fixture-vps',
                cloudflare_account_id='a'*32,cloudflare_account_name='Fixture account',
                cloudflare_zone_id='b'*32,cloudflare_zone_name='example.com',coder_username='fixture-user',
                coder_email='fixture@example.com',display_name='Fixture User',timezone='Europe/Bucharest',local_forward_port=17080)

class Fake:
    def __init__(self,*,initialized=False,owner=True,dns=False,unknown=False,first_status=None):
        self.initialized=initialized;self.owner=owner;self.dns=dns;self.unknown=unknown
        self.first_status=first_status;self.calls=[];self.tunnel='11111111-1111-4111-8111-111111111111'
    def request(self,method,url,body=None,headers=None):
        self.calls.append((method,url,body))
        if url.endswith('/users/first'):
            if method=='GET':return (self.first_status or (200 if self.initialized else 404)),({'X-Coder-Build-Version':'2.36.4'} if self.first_status is None else {}),{}
            self.initialized=True;return 201,{},dict(user_id='fixture',organization_id='org')
        if url.endswith('/users/login'):return 201,{},dict(session_token='dummy-session-value')
        if url.endswith('/users/me'):return 200,{},dict(id='11111111-1111-4111-8111-111111111111',username='fixture-user',roles=[{'name':'owner'}] if self.owner else [])
        if '/dns_records' in url:
            if method=='GET':return 200,{},dict(success=True,result=([{'type':'A','content':'192.0.2.1'}] if self.dns else []))
            return 200,{},dict(success=True,result={'id':'dns-id'})
        if method=='GET' and 'cfd_tunnel?' in url:return 200,{},dict(success=True,result=[])
        if url.endswith('/cfd_tunnel'):
            if self.unknown:raise w.SetupError('Transport unknown')
            return 200,{},dict(success=True,result={'id':self.tunnel,'token':'must-not-enter-receipt'})
        if url.endswith('/token'):return 200,{},dict(success=True,result='dummy-connector-value')
        if url.endswith('/configurations'):return 200,{},dict(success=True,result={})
        raise AssertionError((method,url))

class BootstrapTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.base=Path(self.temp.name)
        self.cfg=self.base/'config.json';self.cfg.write_text(json.dumps(config()))
        self.bundle=self.base/'bundle';w.prepare(self.cfg,self.bundle)
        w.private_write(self.bundle/'credentials/coder-admin.env',"CODER_ADMIN_PASSWORD='dummy-test-password'\n")
        w.private_write(self.bundle/'credentials/cloudflare.env',"CLOUDFLARE_API_TOKEN='dummy-cloudflare-value'\n")
    def tearDown(self):self.temp.cleanup()
    def owner(self,fake):return w.initialize_owner(self.bundle,fake)
    def test_prepare_no_secrets_in_manifest_and_no_overwrite(self):
        body=json.loads((self.bundle/'setup.json').read_text())
        self.assertEqual(body,config())
        self.assertEqual((self.bundle/'host/runtime.env').stat().st_mode & 0o777,0o600)
        self.assertFalse((self.bundle/'host/credentials').exists())
        with self.assertRaises(w.SetupError):w.prepare(self.cfg,self.bundle)
    def test_configuration_rejects_injection_and_unknown_secret_fields(self):
        for key,value in [('hostname','https://evil.example/'),('ssh_target','-oProxyCommand=bad'),('coder_username','x;bad'),('password','not-allowed')]:
            c=config();c[key]=value
            with self.assertRaises(w.SetupError):w.validate(c)
    def test_config_change_requires_new_review(self):
        c=config();c['hostname']='other.example.com';(self.bundle/'setup.json').write_text(json.dumps(c))
        with self.assertRaises(w.SetupError):w.config_for(self.bundle)
    def test_first_owner_created_only_from_verified_404(self):
        f=Fake();self.owner(f)
        post=next(body for method,url,body in f.calls if method=='POST' and url.endswith('/users/first'))
        self.assertEqual(post['name'],'Fixture User');self.assertFalse(post['trial'])
        self.assertNotIn('dummy-test-password',(self.bundle/'owner.receipt.json').read_text())
        self.owner(f)
        self.assertEqual(sum(method=='POST' and url.endswith('/users/first') for method,url,_ in f.calls),1)
    def test_unverified_404_and_server_errors_never_create_owner(self):
        for code in [404,502,403]:
            f=Fake(first_status=code)
            with self.assertRaises(w.SetupError):self.owner(f)
            self.assertFalse(any(method=='POST' for method,_,_ in f.calls))
    def test_cloudflare_requires_live_owner_and_rejects_conflicting_dns_first(self):
        self.owner(Fake())
        f=Fake(owner=False)
        with self.assertRaises(w.SetupError):w.cloudflare(self.bundle,f)
        self.assertFalse(any(w.CF in url for _,url,_ in f.calls))
        f=Fake(dns=True)
        with self.assertRaises(w.SetupError):w.cloudflare(self.bundle,f)
        self.assertFalse(any(method in ['POST','PUT'] for method,_,_ in f.calls))
    def test_unknown_tunnel_creation_is_never_automatically_retried(self):
        self.owner(Fake());f=Fake(unknown=True)
        with self.assertRaises(w.SetupError):w.cloudflare(self.bundle,f)
        self.assertEqual(json.loads((self.bundle/'cloudflare.receipt.json').read_text())['pending'],'create-tunnel')
        second=Fake()
        with self.assertRaises(w.SetupError):w.cloudflare(self.bundle,second)
        self.assertFalse(any(method=='POST' for method,_,_ in second.calls))
    def test_cloudflare_separates_connector_from_api_token(self):
        self.owner(Fake());f=Fake();w.cloudflare(self.bundle,f)
        self.assertEqual(w.read_private(self.bundle/'host/secrets/cloudflared.token'),'dummy-connector-value')
        receipt=(self.bundle/'cloudflare.receipt.json').read_text()
        self.assertNotIn('dummy',receipt);self.assertNotIn('must-not-enter-receipt',receipt)
        ingress=next(body for method,url,body in f.calls if method=='PUT')
        self.assertEqual(ingress['config']['ingress'][0]['service'],'http://coder:7080')
    def test_credential_symlink_and_permissions_rejected(self):
        p=self.bundle/'credentials/coder-admin.env';p.chmod(0o644)
        with self.assertRaises(w.SetupError):w.read_private(p)
        p.chmod(0o600);link=self.base/'link';link.symlink_to(p)
        with self.assertRaises(w.SetupError):w.read_private(link)

if __name__=='__main__':unittest.main()
