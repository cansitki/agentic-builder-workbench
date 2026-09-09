# Workbench Secure Input

This is the native UI half of the credential-intake path.

## What “directly from Codex” means

Codex runs `secenv ask` in its normal project terminal. The secret is **not** entered into Codex. Workbench receives only the public request metadata and opens a native Obsidian modal on the operator device. After local encryption, only ciphertext travels back. Codex sees waiting/cancelled/expired/installed status, field names, destination paths, and `<set>`/`<empty>` markers.

Official OpenAI documentation describes encrypted secrets for Codex cloud environments, but those secrets are available only to setup scripts and are removed before the agent phase. The local arbitrary-credential modal described here is a custom Workbench integration, not a native Codex chat field: [Codex cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment#environment-variables-and-secrets).

## Components

- `tools/secenv/`: workspace-side broker, encryption key, validation, and owner-only install.
- Workbench 3.0.1, plugin ID `workbench`: native modal, encryption, terminal and workspace UI. Source and provenance: [SOURCE.md](SOURCE.md).
- `.agents/skills/secure-credential-intake/`: agent procedure and fail-closed policy.
- `AGENTS.md` and `templates/personal/AGENTS.md`: non-bypassable rule that rejects every other intake channel.

## Install

On the Mac/Linux machine running Obsidian Desktop:

```bash
bash scripts/install-workbench.sh /absolute/path/to/your-vault
```

In every workspace where Codex may need credentials:

```bash
bash scripts/install-secenv.sh
```

Then:

1. Enable Workbench under Obsidian Community plugins.
2. Configure your own Local, Coder, or SSH workspace in Workbench settings.
3. Open Settings → Workbench → Secure Input, select the exact workspace identifier, then enable the listener.
4. Run `secenv doctor` in that workspace.
5. In Obsidian, run `Workbench: Secure input: Show listener status`; it must report `listening`.
6. Run the dummy modal test below.

## Dummy end-to-end test

The test writes only a dummy value to a disposable owner-only path. Enter an obvious non-secret such as `dummy-only` in the modal.

```bash
secenv ask \
  --schema tools/secenv/examples/provider.request.json \
  --title "Dummy secure-input transport test" \
  --description "Dummy-only end-to-end test. No real provider, account, permission, resource, production system, billing, signing, or value transfer is involved. Destination: the example owner-only env path declared by the schema. Consumer: manual verification only. Delete the dummy output after the test."
```

Verify only:

- the modal shows the expected workspace, requesting folder, field, and destination;
- the command returns `status: installed` and `<set>`, never the dummy value;
- the destination mode is `0600`;
- request, submission, and cancellation directories contain no artifact for the finished request.

Delete the dummy output after verifying it. Do not test the transport with a real credential.

## Hard failure behavior

If `secenv`, Workbench, its listener, or the native modal is unavailable, stop credential-dependent work and repair this path. Do not use chat, a shell prompt, a terminal paste, a browser link, an issue, a note, a screenshot, or a temporary “one-time” exception.

## Limitations

- Desktop Obsidian must be running for the Workbench modal.
- This bridge targets local or persistent Local/Coder/SSH workspaces. It is not wired into ephemeral Codex cloud containers.
- The workspace-side process decrypts the value in memory to install it.
- A coding agent running as the same OS user may be able to read the installed file if its sandbox/permissions allow it. Use resource-scoped credentials and stronger OS/service separation for high-value production access.
- Workbench v3.0.1 is desktop-only. Mobile Obsidian is not a secure-input surface.
- v3.0.1 does not mask `textarea`; the bundled `secenv` rejects secret-looking field names assigned to visible `text/textarea`. Multiline secrets require a future reviewed masked/file-input extension, not a fallback channel.
- The installer is fail-closed and does not overwrite an existing plugin installation.
