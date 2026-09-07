# Guided Onboarding

The fastest way to understand this repository is to let the workbench interview you and build a non-secret configuration plan.

## Start the conversation

Open Codex from the repository root and say:

```text
Use $workbench-onboarding. Read TOUR.md, first give me a five-minute tour of the system, then interview me in small batches. Do not install, edit, connect, or request any credential until I approve the proposed setup.
```

## Interview stages

### 1. Surfaces

- Operating system and devices.
- Local vs VPS/Coder/devcontainer.
- Codex/other coding agents.
- Obsidian or filesystem-only knowledge.
- Existing repositories and preferred terminal/IDE.

### 2. Work

- Typical projects and tech stacks.
- What “done” means.
- Build/test/release commands.
- Tasks that repeat and tasks with high blast radius.
- Need for Telegram, crypto, web, research, or infrastructure modules.

### 3. State and memory

- Canonical TODO and WIP limit.
- Daily/weekly rhythm.
- Project hubs and handoffs.
- What belongs in memory and what must remain private.
- Backup and restore ownership.

### 4. Authority and security

- Actions the agent may do locally.
- Actions needing exact approval.
- Development/staging/production boundaries.
- Secret manager and Can Workbench secure-input readiness.
- Messaging, deployment, spending, signing, and deletion limits.

The interview must never ask for a credential value, seed phrase, private endpoint secret, or recovery material.

## Expected output

- A system map for your environment.
- A list of non-secret decisions and remaining questions.
- Recommended minimal modules now vs later.
- A proposed personal `AGENTS.md` built from the full template.
- Project/vault bootstrap plan.
- Secure-input installation and dummy-test plan.
- Verification and rollback for every actual change.

Nothing is installed or connected until you approve the concrete plan.
