# Agent installation runbook

The user gives Codex this repository to **build the environment**, not merely to
summarize documentation. Execute the stages below, adapting non-secret choices
and OS setup. Record evidence in the installation's private project directory.
Use the existing `workbench-bootstrap` skill. Start with `GET-STARTED.ro.md` for
what the novice sees. Sources and pinned versions are in `infra/SOURCES.md` and
`infra/versions.json`.

## 0. Detect and explain

Run `python3 infra/workbench.py doctor` when Python is available. Otherwise detect
the OS with native shell commands and install the missing local prerequisites
from official packages. Do not ask the novice to choose between implementation
frameworks. Ask in small batches:

1. Is this a fresh setup or is there an existing Obsidian vault/server to preserve?
2. Which dedicated Ubuntu 24.04 VPS and SSH alias will be used, and what budget
   has the user approved? If none exists, guide provider-native purchase/account
   creation; do not purchase automatically.
3. Which owned domain/Cloudflare account and desired Coder hostname will be used?

Use their own username/email. `ops-main` and `system` are the proposed workspace
names, not pre-existing accounts. Prefer at least 4 vCPU / 8 GB RAM / 80 GB disk
for a small personal server with two workspaces; this is a sizing assumption,
not a vendor guarantee or authorization to spend.

### PC platforms

- macOS: Obsidian Desktop, Git, Node 22+, Python 3.11+, Bash, ripgrep, SSH; use the
  official app download and established package manager after checking provenance.
- Linux desktop: the same tools; install Obsidian from its official Linux package.
- Windows: the supported route for the included POSIX terminal helper is Ubuntu
  24.04 under WSL2 plus WSLg. Run both the bootstrap tools and Linux Obsidian in
  that environment. Enable/install WSL through Microsoft's official instructions;
  a reboot or OS privilege prompt may require the user. Native Windows Obsidian
  with this POSIX terminal helper is not a tested substitute. If WSLg is unavailable,
  stop and choose a supported GUI environment with the user.

Codex and GitHub access must already work or be established through the respective
provider-native login flows. The repo is private: the recipient needs access.
Never ask for a token in chat or a terminal prompt.

## 1. Build the local trust path first

This step breaks the credential bootstrap dependency. No Cloudflare/Coder secret
is needed to install local files.

1. Create a new vault using `scripts/bootstrap.mjs vault <path>` after dry-run, or
   merge an existing vault without replacing notes. Open it once in Obsidian.
2. Quit Obsidian before plugin/config changes. Install Workbench with
   `bash scripts/install-workbench.sh <vault>`; use MIGRATION.md for existing plugins.
3. Install secenv locally: `bash scripts/install-secenv.sh`. Ensure its executable
   is on the environment PATH and `secenv doctor` succeeds.
4. Configure the local connection and enable the plugin:
   `python3 scripts/configure-workbench.py <vault> --phase local --app-closed`.
5. Open Obsidian. Verify the Workbench listener is listening on `local-bootstrap`.
6. Run the dummy request from `integrations/workbench/README.md`; verify the native
   modal, destination mode and cancellation. No real provider token is used yet.
7. Verify Obsidian Core **Workspaces** is enabled (saved UI layouts), alongside
   Workbench’s own Workspace module (projects/terminals). The configuration helper
   enables Workspaces and Daily notes when the native core settings file exists;
   if absent, enable them through the app instead of writing a partial defaults file.
   Set Daily notes to the chosen folder and enable the official Obsidian CLI if
   available. Verify actual note read/write, rather than assuming the binary exists.

## 2. Prepare a concrete installation plan

Inspect the target read-only via SSH: hostname, OS, CPU/RAM/disk, sudo availability,
Docker/containers, listening ports and existing services. This bootstrap is for a
**dedicated fresh VPS**. It refuses unmanaged existing containers/directories.
Coder's Docker-socket access can control the host; don't place it blindly beside
unrelated production services. Use SSH key access and `sudo -n`; do not trigger a
password prompt inside the agent.

Complete a private copy of `infra/setup.example.json` outside Git. Cloudflare
account/zone IDs are non-secret and can be found in the provider dashboard; help
the user locate them. Choose the owner username/email and timezone. If a stable
API caller IP is available, set `api_caller_cidr`; otherwise explicitly disclose
that restriction is absent in the credential request.

```bash
python3 infra/workbench.py prepare --config /private/setup.json --bundle /private/new-installation
```

`prepare` creates a mode-0700 bundle outside the repo, host config, a generated
DB password, exact credential schemas, a workspace image build context and a
Terraform template. It never modifies cloud resources. Review it and obtain
explicit authorization for the concrete VPS/Tunnel/DNS/Coder resource plan.
A general install request authorizes local preparation; purchases and new external
resources require the target-specific plan to be understood and authorized.

## 3. Credentials and tool versions

Use two separate native requests, after inspecting every generated field:

```bash
secenv ask --schema /private/new-installation/coder-admin.request.json
secenv ask --schema /private/new-installation/cloudflare.request.json
```

Run each until submission/cancel. The Cloudflare request names exact account,
zone, permissions, risk, expiry and owner-only destination. The Coder request
explains first-owner administrator and host-control implications. The user keeps
their password in their own password manager. Do not copy these files to Git.

Install pinned local tools with checksum verification:

```bash
python3 infra/install-tools.py coder
python3 infra/install-tools.py terraform
```

Add the printed tool directory to this setup process's PATH without overwriting
another unrelated Coder installation. Verify the CLI versions. Check the Terraform
lock and version requirements before changing provider versions.

## 4. Deploy the private control plane

```bash
python3 infra/workbench.py deploy-host --bundle /private/new-installation --apply
```

The script transfers only the host bundle through SSH, verifies the expected host,
installs Docker from its official apt repository when missing, starts PostgreSQL
and Coder on loopback, and builds the workspace image. It does not publish a port
on the VPS public interface or send local Cloudflare/admin credentials to it.
Never run unredacted `docker compose config`, dump the process environment, or
print runtime.env.

Open a temporary local SSH forwarding process on the PC:

```bash
ssh -N -o ExitOnForwardFailure=yes -o BatchMode=yes -L 127.0.0.1:17080:127.0.0.1:7080 <ssh-alias>
```

Use the configured port, keep the process handle, and stop it at handoff. No tmux
service is necessary. Wait for HTTP readiness through the forward, then:

```bash
python3 infra/workbench.py coder-init --bundle /private/new-installation --apply
```

The initializer recognizes only Coder's verified first-user response, creates the
owner with the modal-provided password, authenticates, verifies the owner role,
and stores the session mode 0600. An existing instance is never reset.

## 5. Publish Cloudflare Tunnel and DNS

```bash
python3 infra/workbench.py cloudflare --bundle /private/new-installation --apply
python3 infra/workbench.py start-tunnel --bundle /private/new-installation --apply
```

The first command re-verifies the Coder owner live, refuses conflicting DNS/tunnels,
creates a remotely managed tunnel, configures only the chosen hostname plus a 404
fallback, and writes an ownership receipt. Unknown mutations are not retried.
The second transfers only the connector token and starts cloudflared with a token
file. The broad setup API token stays on the PC and should be revoked after setup.

Check the public HTTPS hostname, Coder build-info, login, and authenticated API.
Cloudflare Access is not enabled by default: Coder is the authentication gate.
Adding Access requires separate end-to-end CLI/agent tests. Do not promise wildcard
app domains: this baseline uses one hostname; nested wildcard DNS/TLS is separate.

## 6. Create and verify the workspaces

```bash
python3 infra/workbench.py coder-login --bundle /private/new-installation --apply
python3 infra/workbench.py workspaces --bundle /private/new-installation --apply
python3 infra/workbench.py ssh-config --bundle /private/new-installation --apply
```

Review an existing SSH config before applying its Coder block; preserve unrelated
hosts. The plugin's alias is `main.<workspace>.<username>.coder`. The matching Coder
config uses suffix **coder**, not username.coder. The template's agent is **main**.

For a compound remote command, use one correctly quoted command string or the
configured OpenSSH alias: the pinned `coder ssh` joins its remote arguments with
spaces. Do not pass an unquoted `sh -c` payload as if it preserved argument boundaries.

Verify both workspaces with the real CLI and SSH. In each: Git, Node, Python, Codex,
secenv doctor and tmux must work. Private volume mounts are bound to the verified owner ID before publication.
Preview jobs and other Coder users receive no private vault/auth mounts.
This is not a multi-tenant template. Home is `/workspace`; projects are
`/workspace/projects`. There is no host Docker socket inside workspaces. Write a
dummy marker, stop/start the workspace, and verify it persists. Never delete a
workspace/volume to test persistence: workspace deletion can delete its home volume.
The fresh-install helper sets manual stop schedules and rebuilds each new workspace
so the setting applies. Verify the resulting deadline in Coder; `--stop-after 0h`
is not a substitute in the pinned CLI. Do not restart an unrelated existing working
workspace as part of onboarding.

## 7. Connect Obsidian and personalize context

Quit Obsidian and run:

```bash
python3 scripts/configure-workbench.py <vault> --phase remote --coder-username <verified-username> --app-closed
```

Reopen Obsidian. The work connection targets ops-main, system is hidden, upload
paths are explicit, and secure input targets ops-main. Verify a real terminal,
one dummy upload, reconnect, and a new dummy secure-input request on ops-main.

Complete the personal AGENTS/profile with the user's facts, copy the eight workflow
skills plus bootstrap skill where appropriate, and seed a project with the repo
bootstrap helper. Validate adopted AGENTS. Do not mark unfinished placeholders as
personalized. Explain each piece through COMPONENTS.ro.md.

### Vault placement and synchronization

The local PC vault remains canonical until a verified sharing/sync mechanism is
chosen. During bootstrap, the local Codex session can manage remote code via SSH
while reading its local vault. Do not claim that a Codex process inside ops-main
can already read that PC vault.

For the remote-vault daily workflow, use the included file-input adapter and the
user's own Obsidian Sync subscription. The full procedure is in
`tools/obsidian-sync/README.md`. Configure the user's encrypted remote vault in the
local native app, then temporarily switch Workbench secure input to system:

```bash
python3 scripts/configure-workbench.py <vault> --phase sync --coder-username <verified-username> --app-closed
```

Reopen Obsidian and execute the generated `secenv` requests in system. The adapter
reads password/MFA files privately, without argv/terminal secret input. Verify
one-shot E2EE sync, then start the host's `vault-sync` profile; never run two sync
engines against the shared server vault. Both workspaces see `/vault`, but only
system and the sync service share the runtime auth/config volume.

Return the listener to ops-main. Verify PC → `/vault` and `/vault` → PC with dummy
notes, and read the canonical TODO from ops-main. A headless workspace uses
`workbench-vault` for supported file operations (`read`, `search`, `create`,
`append`, `daily:path`, `daily:read`, `daily:append`); it is not Obsidian's desktop
API and does not implement `eval` or plugin rendering. The local desktop keeps
its real Obsidian CLI. Configure the same daily folder/timezone on both sides.

## 8. Recovery and completion

Record receipts, versions, actual URL, identities, mode/ownership checks and remote
health without values. Keep persistent DB/home volumes and secrets in encrypted
backup and perform an isolated restore. The bootstrap does not create a paid backup
bucket without approval. Keep configuration, source repos and vault recoverable;
Git alone is not a database/vault-state backup.

Stop the temporary SSH forward. Revoke the short-lived Cloudflare setup token,
remove its local intake artifacts and the bootstrap admin-password file once the
user has their own recovery path, and retain only necessary owner-only runtime
credentials. Never delete the last usable login or encryption key automatically.

Use PARITY.ro.md. If a required stage is incomplete, report that precise stage and
next action. A successful unit test or uploaded repo is not a deployed environment.
