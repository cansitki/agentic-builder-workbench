# secenv Threat Model

## Goal

Prevent an operator from pasting credentials into agent-visible communication and terminal surfaces while still installing an explicitly scoped value into a declared owner-only destination.

## Protected assets

- Credential plaintext during entry and transport.
- Collector private key.
- Encrypted pending submissions.
- Installed owner-only secret file.
- Accuracy of request metadata and destination shown to the operator.

## Trust boundaries

```text
agent/workspace request metadata
  → authenticated Local/Coder/SSH Workbench listener
  → Obsidian renderer/native modal
  → WebCrypto ciphertext envelope
  → workspace broker/decrypt/install process
  → owner-only destination
```

## Assumptions

- The operator device, Obsidian installation, pinned Workbench code, workspace OS account, and SSH/Coder transport are trusted enough for the requested credential.
- The workspace public key belongs to the intended workspace shown in the modal.
- Filesystem permissions are meaningful on the target OS/filesystem.
- The user verifies provider/account, permissions, resources, environment, destination, and consumer before submission.

## Threats and controls

| Threat | Control | Residual risk |
|---|---|---|
| Secret pasted into chat/prompt | Hard-gate AGENTS + secure intake skill; no value-taking CLI arguments | User/agent can still violate policy outside this tool |
| Secret shown in a visible text area | Secret-looking variable names are restricted to masked password fields | Pinned v3.0.0 cannot safely collect a multiline secret that needs a textarea; workflow must stop |
| Secret exposed in terminal | `ask` has no plaintext prompt; broker takes ciphertext only; CLI prints redacted state | Installed consumer or same-user process may read destination |
| Browser/bearer-link leak | No server, collect, public URL, or browser command is shipped | Workbench/Obsidian must be available |
| Overbroad credential request | Required detailed description and per-field help; modal shows origin and destinations | Metadata can be dishonest; operator must review and provider should enforce scope |
| MITM/route confusion | Local process or authenticated Coder/SSH transport; direct SSH refuses changed host keys; modal shows workspace | Compromised endpoint or transport configuration remains dangerous |
| Submission replay/duplicate | Unique random request ID, expiry, associated-data binding, exclusive submission create | Same compromised account can create a fresh malicious request |
| Ciphertext tampering | AES-256-GCM authentication; RSA-OAEP-SHA256 key wrap; request ID as additional data | Compromised renderer/workspace can access plaintext at its endpoint |
| Artifact disclosure | Requests/submissions/key directories `0700`; files `0600`; key/submission reads use no-follow, regular-file, owner, mode, and size checks; artifacts are removed on terminal states; listener purges expired crash residue | Crash/power loss can leave encrypted/request metadata until expiry |
| Key replacement with pending request | Rotation refused while request/submission artifacts exist | Manual filesystem changes outside CLI can still break pending requests |
| Output redirection/symlink | Absolute/~ paths, exact `0600`, duplicate-path rejection, symlink/non-regular rejection, atomic replace | Trusted parent-directory owner can race or later replace files |
| Existing env corruption | Requested variables merged once; unrelated lines preserved; owner-only backup; atomic replace | Consumer semantics may differ; authentication check still required |
| Supply-chain replacement of UI | Installer pins release and SHA-256 for all plugin assets | Upgrading requires a new review and new pinned hashes |
| Secret in process memory | Values encrypted in renderer, decrypted only for install, maps cleared best-effort | JavaScript/Python runtimes cannot guarantee immediate memory zeroization |

## Out of scope

- Protecting secrets from a compromised operator OS, Obsidian renderer, workspace account, kernel, or root user.
- Preventing an authorized same-user agent from reading a destination its sandbox permits.
- Long-term rotation, lease, revocation, audit, or dynamic delivery provided by a full secrets manager.
- Authorizing the deploy, send, signing, payment, transaction, or production operation that later consumes the credential.

Use short-lived least-privilege credentials and stronger OS/service separation for material production access.
