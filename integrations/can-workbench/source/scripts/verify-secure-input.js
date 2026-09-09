#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { TextDecoder, TextEncoder } = require("util");

function fromB64Url(value) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function loadModule() {
  const source = fs.readFileSync(path.join(__dirname, "..", "modules", "secure-input.js"), "utf8");
  assert(source.includes("this.cancelButton.type = 'button';"), "Cancel must not submit the credential form");
  assert(source.includes("this.submitButton.type = 'submit';"), "Submit button type must be explicit");
  const moduleRecord = { exports: {} };
  class Modal {}
  function Notice() {}
  const windowStub = {
    crypto: crypto.webcrypto,
    setTimeout,
    clearTimeout,
    focus() {},
  };
  const context = vm.createContext({
    module: moduleRecord,
    exports: moduleRecord.exports,
    Modal,
    Notice,
    Buffer,
    URL,
    TextEncoder,
    console,
    crypto: crypto.webcrypto,
    globalThis: { crypto: crypto.webcrypto },
    window: windowStub,
    fs,
    path,
    os,
    spawn() {
      throw new Error("unexpected real process spawn");
    },
  });
  vm.runInContext(source, context, { filename: "secure-input.js" });
  return moduleRecord.exports;
}

function fakePlugin() {
  const gsdSettings = {
    coderUser: "cansitki",
    workspaces: [
      { coderName: "main", displayName: "legacy", type: "coder" },
      { coderName: "ops-main", displayName: "ops-main", type: "coder" },
    ],
  };
  return {
    settings: { secureInput: {}, gsd: gsdSettings },
    modules: { gsd: { settings: gsdSettings } },
    app: { workspace: { onLayoutReady() {} } },
    addCommand() {},
    async saveSettings() {},
    _getGsdWorkspaces(settings) { return settings.workspaces || []; },
    _getGsdCoderUser(settings) { return settings.coderUser || ""; },
    _isCurrentCoderWorkspace() { return false; },
  };
}

async function decryptEnvelope(envelope, privateKey) {
  const aesBytes = await crypto.webcrypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromB64Url(envelope.wrapped_key)
  );
  const aesKey = await crypto.webcrypto.subtle.importKey(
    "raw",
    aesBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const plaintext = await crypto.webcrypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromB64Url(envelope.iv),
      additionalData: new TextEncoder().encode(envelope.request_id),
    },
    aesKey,
    fromB64Url(envelope.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function main() {
  const SecureInputModule = loadModule();
  const plugin = fakePlugin();
  const secureInput = new SecureInputModule(plugin);
  await secureInput.load();

  assert.equal(secureInput._selectWorkspace().coderName, "ops-main", "ops-main must be the automatic target");
  assert.equal(
    secureInput._target(secureInput._selectWorkspace()).coderTransport,
    true,
    "Coder workspace must be marked as authenticated Coder transport"
  );
  assert.equal(
    secureInput._target({ type: "ssh", sshHost: "example.internal" }).coderTransport,
    false,
    "direct SSH must retain changed-host-key protection"
  );

  const keyPair = await crypto.webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
  const publicJwk = await crypto.webcrypto.subtle.exportKey("jwk", keyPair.publicKey);
  publicJwk.alg = "RSA-OAEP-256";
  publicJwk.key_ops = ["encrypt", "wrapKey"];
  const request = {
    id: "dummy-provider-1234567890",
    title: "Dummy provider token",
    fields: [
      { name: "DUMMY_API_TOKEN", label: "Dummy API token", type: "password", required: true },
    ],
    public_jwk: publicJwk,
  };
  assert.equal(secureInput._validRequest(request), true, "valid public request was rejected");
  assert.equal(
    secureInput._validRequest({
      ...request,
      fields: [{ ...request.fields[0], provider_url: "http://insecure.example" }],
    }),
    false,
    "insecure provider URL was accepted"
  );

  const dummySecret = "dummy-value-never-in-command";
  const envelope = await secureInput.encryptValues(request, { DUMMY_API_TOKEN: dummySecret });
  assert.equal(JSON.stringify(envelope).includes(dummySecret), false, "plaintext leaked into encrypted envelope");
  const decrypted = await decryptEnvelope(envelope, keyPair.privateKey);
  assert.equal(decrypted.values.DUMMY_API_TOKEN, dummySecret, "encrypted round trip changed the value");

  let spawnedArgs = null;
  let spawnedInput = null;
  secureInput.activeWorkspace = secureInput._selectWorkspace();
  secureInput._spawn = (_target, args) => {
    spawnedArgs = args.slice();
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      end(value) {
        spawnedInput = Buffer.from(value || "");
        process.nextTick(() => child.emit("close", 0));
      },
    };
    child.kill = () => {};
    return child;
  };
  await secureInput._runBroker(
    ["workbench", "submit", request.id],
    JSON.stringify(envelope)
  );
  assert.equal(spawnedArgs.join(" ").includes(dummySecret), false, "plaintext leaked into process arguments");
  assert.equal(spawnedInput.toString().includes(dummySecret), false, "plaintext leaked into SSH stdin");
  assert.deepEqual(spawnedArgs, ["workbench", "submit", request.id]);

  process.stdout.write("secure input module verification passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
