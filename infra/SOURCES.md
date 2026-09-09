# Infrastructure provenance and verification

Reviewed 2026-09-09. Pinned application/provider versions are in `versions.json`;
Terraform provider checksums are checked in. Docker's OS packages come from its
signed Ubuntu stable apt repository at installation time, so record their installed
versions in the target receipt. Container tags are version-pinned, not digest-pinned.

- [Coder 2.36.4 release](https://github.com/coder/coder/releases/tag/v2.36.4) and
  [official Compose baseline](https://github.com/coder/coder/blob/v2.36.4/compose.yaml).
- [Coder Docker deployment](https://github.com/coder/coder/blob/v2.36.4/docs/install/docker.md).
  Our adaptation binds HTTP to loopback and sets the access URL immediately.
- [Coder user SDK and first-user/login payloads](https://github.com/coder/coder/blob/v2.36.4/codersdk/users.go)
  and [server implementation](https://github.com/coder/coder/blob/v2.36.4/coderd/users.go).
- [Coder Docker workspace template](https://github.com/coder/coder/blob/v2.36.4/examples/templates/docker/main.tf).
  Our workspace home is `/workspace`; shared notes are `/vault` and are not owned
  by an individual workspace's Terraform volume resource.
- [Coder SSH configuration](https://github.com/coder/coder/blob/v2.36.4/docs/reference/cli/config-ssh.md)
  and [alias normalization](https://github.com/coder/coder/blob/v2.36.4/cli/ssh.go).
- [Docker official Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/).
- [Cloudflare Tunnel setup and permissions](https://developers.cloudflare.com/tunnel/setup/),
  [connector-token API](https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/),
  [token-file support](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/#token-file),
  [API token restrictions](https://developers.cloudflare.com/fundamentals/api/how-to/restrict-tokens/).
- [Obsidian Headless](https://obsidian.md/help/headless),
  [Sync](https://obsidian.md/help/sync/headless),
  [official package metadata](https://registry.npmjs.org/obsidian-headless/0.0.14).
  Our file-input adapter is described in `tools/obsidian-sync/README.md`; the upstream
  application is fetched during installation, not vendored or relicensed here.
- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) and
  [Microsoft WSL GUI support](https://learn.microsoft.com/en-us/windows/wsl/tutorials/gui-apps).

The first-owner-before-publication gate, dedicated-host boundary, separate setup
and connector credentials, explicit resume receipts, shared-vault topology and
conservative defaults are this repository's implementation decisions. They are
not claims that the upstream vendors require this exact architecture.

Tests separate local/unit validation, isolated CI containers, and actual recipient
cloud/Sync/account verification. No test fixture is evidence that a paid VPS,
Cloudflare zone, Obsidian account or backup destination has been deployed.
