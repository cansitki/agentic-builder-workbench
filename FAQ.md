# Frequently Asked Questions

## Is this a copy of another person's vault and projects?

No. It transfers the operating model, templates, generic security knowledge, and selected functional infrastructure. Personal history, client/project data, live configuration, credentials, bots, wallets, and strategies are excluded.

## Why is the full AGENTS.md so detailed?

It encodes the repeated decisions that make the system predictable: where truth lives, what a request authorizes, how tasks move, when to log, what proof completion needs, and where the agent must stop. It remains under 32 KiB and has a smaller alternative.

## Can I paste a token into Codex once and delete the chat later?

No. Deletion does not undo exposure to the chat, transcript, logs, screenshots, or process history. If a value is pasted outside the native modal, treat it as exposed and rotate it.

## Is the secure modal inside Codex?

No. Codex invokes `secenv ask`; Can Workbench in Obsidian is the trusted value-entry UI. Codex receives only redacted state. [Official Codex cloud secrets](https://learn.chatgpt.com/docs/environments/cloud-environment#environment-variables-and-secrets) are a different mechanism and are removed before the agent phase.

## What happens if Can Workbench is closed?

Credential-dependent work stops or waits until request expiry. The system does not fall back to chat, terminal input, or a browser link. Start/repair Workbench and repeat with a fresh request.

## Can the agent read the installed credential file afterward?

Possibly, if the agent runs as the same OS user with a sandbox that permits the destination. The modal secures intake, not a fully compromised runtime. Use least-privilege short-lived credentials, a dedicated service user/sandbox, and a real secret manager for high-value production access.

## Why require so much information before a modal opens?

Entering a credential also approves a capability. The operator must know the account, exact operation, minimum permission, resources, environment, risk, lifetime, destination, and consumer before providing it.

## Does secure intake authorize deployment or a transaction?

No. Credential collection and the action that consumes it are separate approval gates.

## Do I need Obsidian?

The project/task/agent patterns also work as plain Markdown. The current secure-input UI specifically requires desktop Obsidian + Can Workbench. Without it, do not use credential-dependent workflows until you implement and review an equivalent trusted native path.

## Do I need Coder or a VPS?

No. Local mode is enough for many projects. Add Coder/VPS only when persistent Linux state, multi-device access, long builds, or remote runtime separation solves a real problem.

## Should I install every module immediately?

No. Start with brain, project template, canonical TODO, tests, and secure input. Add vault automation, tmux, Coder, MCP, schedulers, Telegram, or crypto modules when a concrete workflow needs them.

## How do I know I customized the brain correctly?

Run `node scripts/check-adopted-brain.mjs /absolute/path/to/AGENTS.md`, then ask Codex to summarize its active instruction sources and authority boundaries.

## Where should I start?

Read `TOUR.md`, then run the `workbench-onboarding` skill. It will explain options and interview you without installing anything or asking for a credential.
