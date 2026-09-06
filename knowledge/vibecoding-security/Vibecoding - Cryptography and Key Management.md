---
tags: [security, vibecoding, cryptography, kms, jwt]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Cryptography and Key Management

The category most often vibecoded into a corner: hand-rolled crypto, MD5/SHA1 for passwords, JWT validated by `decode()` not `verify()`, secrets stored at-rest in plaintext. The OWASP `A02:2021 — Cryptographic Failures` slot exists for exactly this.

## What goes wrong

- **Hand-rolled primitives.** AI-generated code happily writes its own AES mode, padding, IV reuse, MAC-then-encrypt. Every one of these has a published break.
- **Wrong primitives.** MD5/SHA1 for password hashing instead of argon2id/bcrypt/scrypt. SHA256 raw instead of HMAC for signed tokens.
- **JWT pitfalls.** Accepting `alg: none`. Accepting `alg: HS256` when you issue `RS256` (key confusion). `decode()` instead of `verify()`. No `aud`/`iss`/`exp` checks. No revocation list.
- **Static IVs / nonces.** Reused across messages → CTR/GCM key recovery.
- **At-rest plaintext.** Tokens, refresh tokens, OAuth credentials sitting in DB columns unencrypted. The "if the DB leaks, every credential leaks" failure mode.
- **No key rotation.** Same JWT signing key for two years; can't rotate without invalidating every session because there's no `kid` header.
- **Secrets in env vars only.** No KMS, no HSM, no envelope encryption. Compromise of one process = compromise of every key.

## What to actually do

- **Passwords:** argon2id (preferred) or bcrypt with cost ≥ 12.
- **Symmetric:** AES-256-GCM with a fresh 96-bit nonce per message; libsodium `secretbox` if you can.
- **Asymmetric:** RSA-OAEP-2048+ or X25519 / Ed25519. Never raw RSA, never PKCS#1 v1.5 for new code.
- **Signed tokens:** prefer paseto v4 over JWT. If JWT, pin one alg in your verify call: `jwt.verify(token, key, { algorithms: ['EdDSA'] })`.
- **At-rest:** envelope encryption — DEK per row encrypted with KEK in KMS (AWS/GCP/Azure KMS, Vault, Cloudflare Secrets). Rotate KEK without re-encrypting every row.
- **Key lifecycle:** documented rotation cadence, `kid` header on every signed artifact, dual-key window during rotation.

## Quick checks

- `grep -rE 'crypto\.createHash\(.(md5|sha1).' src/` → 0
- `grep -rE 'jwt\.decode\(|alg.*none' src/` → 0
- `grep -rE 'createCipheriv\(.aes-256-(ecb|cbc).' src/` → 0 (ECB, CBC-without-MAC)
- `grep -rE 'Math\.random|Date\.now\(\)' near token/key/iv/nonce contexts → 0
- Every long-lived secret is in KMS, not in `.env`
- Backup files / logs / Sentry events do not contain decrypted secrets

## Related

- [[Vibecoding - Math.random for Security IDs]]
- [[Vibecoding - Secrets in Client Bundle]]
- [[Vibecoding - OWASP Top 10 Mapping]]
- [[Vibecoding - Things to Check on Your Code]]
