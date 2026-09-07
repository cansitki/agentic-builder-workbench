# agentic-secenv

`secenv` lets a coding agent request a credential without asking the operator to paste it into chat, a prompt, shell input, tmux scrollback, command arguments, a vault note, source control, logs, screenshots, or an agent-created browser form.

Supported target: macOS/Linux or a Linux remote workspace with meaningful POSIX ownership and mode bits. Native Windows has not been validated; use a reviewed WSL/remote-Linux path rather than assuming `0600` semantics.

Can Workbench v2.2.0 masks `password` inputs but not visible `text`/`textarea` inputs. `secenv` rejects secret-looking variable names when they are assigned a visible input type. If a required multiline secret cannot be entered correctly through a masked password field, stop and add/review masked multiline or file-selection support; do not use a visible textarea or another channel.

The only intake command in this distribution is `secenv ask`. It creates an owner-only public request manifest and waits. Can Workbench reads the manifest, shows a native Obsidian modal, encrypts the entered values on the operator device, and sends only a ciphertext envelope to the workspace. `secenv` decrypts in process memory, writes the declared owner-only destinations atomically, removes request/submission artifacts, and prints only redacted state.

There is deliberately no `serve`, `collect`, public-link, browser, terminal prompt, `inspect`, or plaintext-output command.

## Security boundary

Protected intake path:

```text
Codex runs secenv ask
  → public request metadata (0600)
  → Can Workbench native modal
  → AES-256-GCM values + RSA-OAEP-SHA256 wrapped key
  → ciphertext-only SSH/local stdin
  → workspace process-memory decryption
  → atomic 0600 file install
  → redacted status to Codex
```

The tool prevents accidental disclosure during credential collection. It is not a long-term secret manager and cannot protect a secret from a process that already has permission to read its installed destination. Use least privilege, a dedicated OS user or sandbox where appropriate, and a real secret manager for durable production lifecycle management.

The intended consumer should read the installed file directly. Do not validate installation with `cat`, `env`, `printenv`, shell tracing, debugger dumps, or by interpolating the value into a command line. Verify file owner/mode and use a minimal identity/scope endpoint instead.

## Install

From the repository root:

```bash
bash scripts/install-secenv.sh
```

The installer creates a dedicated virtual environment under `~/.local/share/agentic-secenv`, places a `secenv` link in `~/.local/bin`, initializes a 3072-bit RSA key, and verifies only paths/modes/status.

The security dependency is pinned to the version exercised by this repository's install and protocol tests. Upgrade it only through a reviewed change followed by the full verification suite.

## Informed request

Prefer a reviewed schema:

```bash
secenv ask --schema tools/secenv/examples/provider.request.json
```

Dynamic requests require a title, a detailed request description, and one detailed `--field-help` per field:

```bash
secenv ask \
  --title "Example Provider development token for read-only project metadata" \
  --description "Provider/account: Example Provider, personal development account. Operation: read metadata for project demo-project. Environment: development. No writes, deployment, deletion, billing, user management, admin, signing, value transfer, or production access. Destination: owner-only example-provider.env. Consumer: local metadata checker. Revoke after the evaluation." \
  --field "EXAMPLE_API_TOKEN=Example Provider API token" \
  --field-help "EXAMPLE_API_TOKEN=Credential type: resource-scoped API token. Minimum permission: Project Metadata Read. Restrict to project demo-project and development; restrict origin/IP if supported. Enables reads only; no writes, deploys, deletion, billing, users, admin, signing, value transfer, or production. Expire in 24 hours and revoke after the evaluation. Destination is ~/.config/example-provider/example-provider.env; consumer is the local metadata checker." \
  --provider-url "EXAMPLE_API_TOKEN=https://example.com/account/tokens" \
  --env-file ~/.config/example-provider/example-provider.env
```

The example provider is fictional. Replace every non-secret detail with current facts and verify provider permission names from official documentation before opening a real modal.

## Broker commands

Can Workbench uses these internally:

```bash
secenv workbench watch
secenv workbench submit REQUEST_ID
secenv workbench cancel REQUEST_ID
```

`submit` accepts only an encrypted envelope on stdin. These commands never accept plaintext credential values.

## Failure behavior

- Missing or malformed informed metadata: request rejected before a modal opens.
- Can Workbench unavailable: `ask` waits until expiry; there is no fallback.
- Modal cancelled/dismissed: request returns `cancelled`, installs nothing, and cleans artifacts.
- Request expires: installs nothing and cleans artifacts.
- Requesting process crashes: the Workbench listener removes request/submission/cancellation residue when the request reaches expiry.
- Duplicate submission: rejected.
- Decryption/validation/install failure: request and ciphertext are removed; the operation stops.
- Existing destination: backed up owner-only before atomic replacement/merge.
- Symlink or non-regular destination: rejected.
- Key rotation while request/submission artifacts exist: rejected.

## Development

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
python -m unittest discover -s tests -v
```
