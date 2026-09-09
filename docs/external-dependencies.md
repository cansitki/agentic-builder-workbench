# External Dependencies

The repository carries the operating rules, templates, skills, validation scripts, and `secenv` source. These external tools supply the execution surfaces.

## Required for the full workflow

| Tool | Purpose | Verification |
|---|---|---|
| Git | Versioned code/docs and recoverable diffs | `git --version` |
| Codex | Coding-agent runtime | `codex --version` and active instruction summary |
| Python 3.11+ | `secenv` runtime and tests | `python3 --version` |
| Node.js | Template/link helpers and WebCrypto compatibility test | `node --version` |
| Obsidian Desktop | Vault/operator UI | Open intended vault |
| Workbench v3.0.0 | Terminals/workspaces and native secure-input modal | Listener status + pinned asset hashes |
| `secenv` | Ciphertext-only credential request/install | `secenv doctor` |

## Optional

| Tool | Add when |
|---|---|
| GitHub CLI | Repository/invitation/release workflows need it |
| Coder | Persistent remote Linux workspaces or multi-device access are useful |
| tmux | Interactive sessions must survive disconnects |
| Docker/Compose | Reproducible service dependencies or container runtime are needed |
| Service manager/orchestrator | A process must survive sessions/reboots |
| MCP/app connector | Live private context/actions cannot safely live in files |
| Excalidraw plugin | Editable diagrams materially improve understanding |

## Version and trust rule

- Verify current official installation instructions before installing an agent/runtime.
- Pin or lock production dependencies.
- Review permissions and provenance before adding plugins/connectors.
- Keep local settings and secrets outside the repository.
- Record the version and verification date for operationally important tools.
- Upgrading a pinned security component requires a new source/hash review and regression run.

The repository does not include an API key, provider login, workspace token, SSH key, or vault settings file.
