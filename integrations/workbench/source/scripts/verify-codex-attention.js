#!/usr/bin/env node
"use strict";

const assert = require("assert");
const { EventEmitter } = require("events");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

function loadModule(notifications, notices, platform = "darwin") {
  const source = fs.readFileSync(path.join(__dirname, "..", "modules", "codex-attention.js"), "utf8");
  const moduleRecord = { exports: {} };
  class FakeNotification {
    static permission = "granted";
    static async requestPermission() { return "granted"; }
    constructor(title, options) {
      this.title = title;
      this.options = options;
      notifications.push(this);
    }
    close() {
      if (this.onclose) this.onclose();
    }
  }
  function Notice(message) { notices.push(String(message)); }
  const windowStub = {
    Notification: FakeNotification,
    setTimeout,
    clearTimeout,
    focus() {},
  };
  const context = vm.createContext({
    module: moduleRecord,
    exports: moduleRecord.exports,
    Notice,
    Buffer,
    console,
    fs,
    os: { ...os, platform: () => platform },
    path,
    spawn() { throw new Error("unexpected real process spawn"); },
    window: windowStub,
  });
  vm.runInContext(source, context, { filename: "codex-attention.js" });
  return moduleRecord.exports;
}

function fakePlugin() {
  const gsdSettings = {
    coderUser: "test-user",
    workspaces: [
      { coderName: "main", displayName: "legacy", type: "coder" },
      { coderName: "ops-main", displayName: "ops-main", type: "coder" },
    ],
  };
  const commands = [];
  const plugin = {
    settings: { codexAttention: {}, gsd: gsdSettings },
    modules: { gsd: { settings: gsdSettings } },
    app: {
      workspace: {
        onLayoutReady() {},
        getLeavesOfType() { return []; },
        revealLeaf() {},
      },
    },
    addCommand(command) { commands.push(command); },
    saveCount: 0,
    async saveSettings() { this.saveCount += 1; },
    _getGsdWorkspaces(settings) { return settings.workspaces || []; },
    _getGsdCoderUser(settings) { return settings.coderUser || ""; },
    _isCurrentCoderWorkspace() { return false; },
  };
  return { plugin, commands };
}

async function main() {
  const notifications = [];
  const notices = [];
  const CodexAttentionModule = loadModule(notifications, notices);
  const { plugin, commands } = fakePlugin();
  const attention = new CodexAttentionModule(plugin);
  await attention.load();

  assert.equal(attention._selectWorkspace().coderName, "ops-main", "ops-main must be the automatic target");
  assert.equal(attention._target(attention._selectWorkspace()).coderTransport, true);
  assert.equal(attention._target({ type: "ssh", sshHost: "example.internal" }).coderTransport, false);
  assert(commands.some((command) => command.id === "codex-attention-test-notification"));
  assert(commands.some((command) => command.id === "codex-attention-restart-listener"));

  const LinuxAttentionModule = loadModule([], [], "linux");
  const { plugin: linuxPlugin } = fakePlugin();
  const linuxAttention = new LinuxAttentionModule(linuxPlugin);
  await linuxAttention.load();
  linuxAttention.start();
  assert.equal(linuxAttention.status, "macOS only", "Linux Obsidian must not open a receiver");
  await linuxAttention.unload();

  const event = {
    id: "a".repeat(64),
    type: "agent-turn-complete",
    created_at: "2026-08-24T10:00:00Z",
    thread_id: "thread-test",
    turn_id: "turn-test",
    cwd: "/workspace/example-project",
    tmux_session: "example-session",
    workspace: "ops-main",
    "last-assistant-message": "sensitive completion text",
  };
  await attention._receiveEvent(event);
  await attention._receiveEvent(event);
  assert.equal(notifications.length, 1, "duplicate events must produce one notification");
  assert.equal(plugin.settings.codexAttention.seenEventIds.length, 1);
  assert(notifications[0].title.includes("example-session"));
  assert(notifications[0].options.body.includes("example-project"));
  assert(!JSON.stringify(notifications[0]).includes("sensitive completion text"));

  assert.equal(attention._normalizeEvent({ ...event, id: "invalid" }), null);
  attention._consumeListenerOutput(Buffer.from(JSON.stringify({ type: "ready", version: 1 }) + "\n"));
  assert.equal(attention.status, "listening");
  attention._consumeListenerOutput(Buffer.from(JSON.stringify({ type: "heartbeat", version: 1 }) + "\n"));
  assert.equal(attention.status, "listening");

  const second = { ...event, id: "b".repeat(64), turn_id: "turn-test-2" };
  attention._consumeListenerOutput(Buffer.from(JSON.stringify({ type: "codex-attention", event: second }) + "\n"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(notifications.length, 2);
  assert.equal(plugin.settings.codexAttention.seenEventIds.length, 2);
  assert.equal(notices.length, 0);

  const wrongLeaf = {
    view: {
      sessions: [{ __cwTmuxName: "example-session", __cwWorkspace: "system" }],
      switchTo() { throw new Error("focused a same-named session in the wrong workspace"); },
    },
  };
  const matchingSession = { __cwTmuxName: "example-session", __cwWorkspace: "ops-main" };
  let revealedLeaf = null;
  let switchedSession = null;
  const matchingLeaf = {
    view: {
      sessions: [matchingSession],
      switchTo(session) { switchedSession = session; },
    },
  };
  plugin.app.workspace.getLeavesOfType = () => [wrongLeaf, matchingLeaf];
  plugin.app.workspace.revealLeaf = (leaf) => { revealedLeaf = leaf; };
  attention.activeWorkspace = attention._selectWorkspace();
  attention._focusMatchingSession(event);
  assert.equal(revealedLeaf, matchingLeaf, "notification click must focus the matching workspace leaf");
  assert.equal(switchedSession, matchingSession);

  const manyLines = Array.from({ length: 800 }, (_, index) => JSON.stringify({
    type: "codex-attention",
    event: { ...event, id: index.toString(16).padStart(64, "0") },
  })).join("\n") + "\n";
  assert(manyLines.length > 128 * 1024, "batch fixture must exceed the per-line cap");
  attention._consumeListenerOutput(Buffer.from(manyLines));
  await new Promise((resolve) => setImmediate(resolve));
  assert.notEqual(attention.status, "reconnecting", "large batches of valid lines must stay connected");

  await attention.unload();
  process.stdout.write("Codex attention module verification passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
