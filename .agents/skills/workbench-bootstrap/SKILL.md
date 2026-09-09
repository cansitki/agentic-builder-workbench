---
name: workbench-bootstrap
description: Build the complete personal Workbench environment for a novice, from a PC with Codex to local Obsidian secure input, a dedicated VPS, Coder workspaces, Cloudflare Tunnel, authentication, and verified handoff. Use for full installation/setup requests, not a simple feature tour.
---

# Workbench Bootstrap

Read `AGENT-SETUP.md` and follow its staged runbook. The user should not need to
understand Docker, Terraform, DNS, or shell internals. Explain the next visible
outcome, obtain only the non-secret choices needed at that stage, execute the
available scripts, and show the result before advancing.

- Detect the PC OS and installed tools. Use macOS/Linux; Windows uses Ubuntu WSL2
  with WSLg for this plugin's Linux terminal runtime. Do not pretend native Windows
  Workbench terminals have been verified.
- For a request to build the whole system, complete authorized reversible local
  preparation immediately. Do not repeatedly ask whether to proceed after every file.
- Before external infrastructure actions, freeze the specific VPS, hostname,
  Cloudflare account/zone, resources, permissions, costs and recovery in the plan.
  Obtain the owner's authorization for that concrete plan; reuse it within scope.
- Never buy a server/domain or grant access just because a plan mentions it.
- Establish local Obsidian + Workbench + secenv first. All user-supplied credentials
  then enter only through the native modal with the generated, reviewed schemas.
  Official provider-browser login is for the user directly, never an agent-created
  credential form or a request to paste a value into chat/terminal.
- Keep generated bundles, runtime credentials and installation receipts outside Git.
- Create the Coder owner privately before publishing the Tunnel/DNS. Confirm ownership
  live. Do not treat an arbitrary HTTP 404 as a safe first-user setup state.
- Treat unknown submissions as unknown, reconcile, and never blindly repeat POSTs.
- Preserve existing configs/resources. Stop on conflicts and prepare a migration,
  rather than deleting or overwriting them to make a bootstrap pass.
- Verify real HTTPS, CLI authentication, both workspaces, SSH, terminal, persistence,
  and dummy secure input. Repo tests alone are not proof of a successful installation.
- For remote vault sync, use the hash-pinned file-input adapter and validate both
  directions. Never use upstream secret argv/prompts or invent a successful sync.

Keep the project receipt current and update the user's canonical TODO. Finish with
one starting surface (Obsidian), the working URL, evidence, and unresolved items.
