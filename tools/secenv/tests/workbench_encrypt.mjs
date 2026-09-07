#!/usr/bin/env node

import { webcrypto } from "node:crypto";

function b64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

let input = "";
for await (const chunk of process.stdin) input += chunk;
const { request, values, submitted_at: submittedAt } = JSON.parse(input);
const encoder = new TextEncoder();
const payload = JSON.stringify({
  request_id: request.id,
  submitted_at: submittedAt,
  values,
});

const aesKey = await webcrypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt"],
);
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const ciphertext = await webcrypto.subtle.encrypt(
  { name: "AES-GCM", iv, additionalData: encoder.encode(request.id) },
  aesKey,
  encoder.encode(payload),
);
const rsaKey = await webcrypto.subtle.importKey(
  "jwk",
  request.public_jwk,
  { name: "RSA-OAEP", hash: "SHA-256" },
  false,
  ["wrapKey"],
);
const wrappedKey = await webcrypto.subtle.wrapKey("raw", aesKey, rsaKey, { name: "RSA-OAEP" });

process.stdout.write(JSON.stringify({
  version: 1,
  request_id: request.id,
  alg: "RSA-OAEP-256+A256GCM",
  wrapped_key: b64url(wrappedKey),
  iv: b64url(iv),
  ciphertext: b64url(ciphertext),
}));
