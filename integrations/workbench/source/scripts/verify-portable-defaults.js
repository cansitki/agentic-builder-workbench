#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');

function loadModule(name, extras = {}) {
  const record = { exports: {} };
  const context = vm.createContext({
    module: record, exports: record.exports,
    Plugin: class {}, PluginSettingTab: class {},
    console, Buffer, ...extras,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'modules', name), 'utf8'), context);
  return record.exports;
}

async function main() {
  const Workbench = loadModule('orchestrator.js');
  const plugin = new Workbench();
  plugin.settings = {};
  let saves = 0;
  plugin.saveData = async () => { saves++; };
  await plugin._ensureDefaults();
  assert.equal(plugin.settings.gsd.coderUser, '');
  assert.equal(plugin.settings.gsd.workspaces.length, 0);
  const firstSaveCount = saves;
  await plugin._ensureDefaults();
  assert.equal(saves, firstSaveCount, 'defaults are idempotent');
  plugin.modules = { gsd: { settings: { coderUser: '', vendorDefault: true } } };
  const canonical = plugin.settings.gsd;
  canonical.coderUser = 'a'; await plugin.saveSettings();
  canonical.coderUser = 'ab'; await plugin.saveSettings();
  assert.equal(plugin.settings.gsd, canonical);
  assert.equal(plugin.modules.gsd.settings, canonical);
  assert.equal(plugin.modules.gsd.settings.coderUser, 'ab');
  plugin.settings.gsd.coderUser = 'operator-chosen';
  plugin.settings.gsd.workspaces.push({ coderName: 'chosen-project', uploadDir: '/srv/uploads' });
  await plugin._ensureDefaults();
  assert.equal(plugin._getGsdCoderUser(plugin.settings.gsd), 'operator-chosen');
  assert.equal(plugin.settings.gsd.workspaces.length, 1, 'no extra workspaces injected');

  let spawned = null;
  const spawn = (binary, args) => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      write(data, callback) { spawned.data = data; callback(); },
      end() { queueMicrotask(() => child.emit('close', 0)); },
    };
    spawned = { binary, args };
    return child;
  };
  const VMConnect = loadModule('vm-connect.js', {
    require(name) {
      if (name === 'obsidian') return { Notice: class {}, Menu: class {} };
      if (name === 'child_process') return { spawn, exec: cp.exec, execFile: cp.execFile };
      return require(name);
    },
  });
  const config = {
    coderUser: 'operator-chosen',
    workspaces: [{ type: 'coder', coderName: 'chosen-project', uploadDir: '/srv/uploads' }],
  };
  const transfers = new VMConnect({
    app: { plugins: { getPlugin() { return null; } } },
    modules: { gsd: { settings: config } },
    _getGsdWorkspaces: settings => settings.workspaces,
    _getGsdCoderUser: settings => settings.coderUser,
  });
  const target = transfers.resolveUploadTargetForSession({ __cwWorkspace: 'chosen-project', name: 'renamed' });
  assert.equal(target.scpHost, 'main.chosen-project.operator-chosen.coder');
  assert.equal(target.remoteDir, '/srv/uploads');
  assert.equal(transfers.resolveUploadTargetForSession({ name: 'unmapped' }), null);
  assert.equal(transfers.resolveUploadTargetForSession({ __cwWorkspace: 'removed', name: 'chosen-project' }), null);
  assert.equal(transfers.resolveUploadTargetForSession({ __cwWorkspace: '__cw_local_tmux__' }), null);
  assert.throws(() => transfers._pipeUploadViaSsh({ remoteDir: '' }, '/file', Buffer.from('dummy')),
    /Upload directory/);
  assert.equal(spawned, null, 'invalid directory must not start SSH');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workbench-upload-test-'));
  try {
    const dir = path.join(temp, "operator's uploads $(not-executed)");
    const file = path.join(dir, 'dummy.txt');
    await transfers._pipeUploadViaSsh({ remoteDir: dir, sshArgsArr: [], scpHost: 'fixture' }, file, Buffer.from('dummy-only'));
    assert.equal(spawned.binary, 'ssh');
    assert(spawned.args.includes('StrictHostKeyChecking=accept-new'));
    cp.execFileSync('/bin/sh', ['-c', spawned.args.at(-1)], { input: spawned.data });
    assert.equal(fs.readFileSync(file, 'utf8'), 'dummy-only', 'remote command safely quotes paths');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.id, 'workbench');
  assert.equal(manifest.name, 'Workbench');
  console.log('Portable defaults passed: empty identity, preserved choices, exact targets, no guessed uploads, safe paths.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
