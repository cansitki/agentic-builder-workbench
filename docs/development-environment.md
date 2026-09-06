# Development Environment

Start with the simplest environment that makes state persistent and verification easy.

## Minimum local kit

- Git and a configured remote provider CLI.
- One primary coding agent.
- The project's runtime and one package manager.
- A reproducible install/build/test command.
- A secret manager or OS keychain.
- An editor/terminal and optional Obsidian vault.
- Docker only when the project or dependency isolation needs it.
- tmux only when persistent terminal sessions remove a real problem.

Avoid installing five overlapping agents, package managers, and orchestrators before the first project works.

## Persistent remote workspace

Use Coder, a devcontainer, or a VM when you need the same Linux environment from multiple devices, long builds, stable background tools, or more resources than a laptop. Keep source repositories and the vault on persistent storage and keep environment creation reproducible.

Do not bake live credentials into an image or template. Inject them through an approved secret path after the workspace exists.

## Suggested tool layers

```text
operator surface
  Obsidian + terminal/IDE

agent layer
  Codex or another coding agent + AGENTS.md + skills

development layer
  Git + runtime + package manager + tests + containers

session layer
  tmux/worktrees for resumable independent work

runtime layer
  service manager/orchestrator + logs + health checks
```

## Bootstrap verification

Document and test commands equivalent to:

```bash
git --version
gh auth status
[AGENT] --version
[RUNTIME] --version
[PACKAGE MANAGER] --version
[CONTAINER TOOL] version
[TEST COMMAND]
```

Report versions and authentication state without printing tokens.

## Cross-platform notes

- Prefer repository scripts over shell aliases that exist on one machine.
- Document path and line-ending assumptions.
- Keep platform-specific setup in separate short sections.
- Use an IANA timezone name for logging.
- Test scripts on every supported OS or state the supported environment explicitly.
- When Windows support matters, decide between native Windows, WSL, and a remote Linux workspace rather than mixing commands unpredictably.

## Environment ownership

Track the workspace image/template as code. A good environment change has a reason, version, verification command, and rollback. Do not let a pile of manual bootstrap commands become hidden infrastructure.
