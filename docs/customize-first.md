# Customize First

Answer these before treating the templates as your operating system. Keep non-secret answers in your personal guidance or a private setup note. Secret values never belong here.

## Identity and communication

- What name should the agent use?
- What language should it use by default?
- Do you prefer concise reports, explanations, or voice-first interaction?
- Which decisions may the agent infer, and which always require a question?

## Tools and surfaces

- Which coding agents do you actually use?
- Which operating systems and machines are in scope?
- Is Obsidian your source of truth, or another notes system?
- Where do interactive project sessions run?
- Where do background or durable processes run?

## Repository conventions

- Which package manager, runtime, formatter, linter, and test commands are canonical?
- What branch and review policy applies?
- Which directories contain generated code or vendored files?
- What is the minimum evidence required before saying a change is done?

## Task system

- What is the single general TODO file or service?
- Which task states do you use?
- What is your work-in-progress limit?
- Where do project-specific backlogs live?
- How are blockers and review dates recorded?

## Knowledge system

- Where are daily logs stored?
- Which indexes route agents to durable notes?
- What qualifies for promotion from a daily note into a permanent note?
- Which notes are private, shareable, or public?

## Security and authority

- Which local secret manager or secure intake method is approved?
- Which environments exist: development, staging, production?
- Which actions require exact approval: deploys, messages, payments, transactions, deletion, user management?
- What backup and rollback path exists before destructive changes?
- Who owns incident response and credential rotation?

## Project-specific risk

- Does the project handle money, authentication, personal data, files, webhooks, admin actions, or wallets?
- Which failure cases could create irreversible harm?
- Which checks must be server-side rather than UI-only?
- Which dependencies or external facts must be verified from current official sources?

## Useful optional modules

Choose only what you need now:

- Obsidian vault and daily logging.
- Repository `AGENTS.md` layering.
- Reusable skills.
- Coder/devcontainer workspace.
- tmux for persistent interactive sessions.
- CI security and release checks.
- Telegram bot blueprint.
- Crypto project blueprint.

Start small. Add a layer after it removes a repeated manual loop or prevents a demonstrated failure.
