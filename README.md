# Agentic Builder Workbench

A private, reusable operating system for building software with coding agents.

This repository transfers the **method**, not somebody else's history. It contains a clean agent-guidance system, an Obsidian-friendly knowledge structure, project templates, security references, and lightweight workflows for web apps, Telegram bots, and crypto projects.

It intentionally contains no production credentials, personal notes, customer data, infrastructure addresses, social-media automation, private project code, or conversation history.

## What you get

- A layered `AGENTS.md` system for personal and project guidance.
- One canonical task list instead of scattered TODO files.
- A vault structure for daily logs, durable notes, project hubs, decisions, and research.
- A repeatable loop from idea → spec → implementation → verification → durable memory.
- Safe Codex defaults and eight reusable skills.
- A functional `secenv ask` runtime plus verified Can Workbench installation for native encrypted credential intake.
- General architecture blueprints for web apps, Telegram bots, and crypto projects.
- A substantial vibe-coding security library with private-use terms.
- A publication audit that rejects common secrets and source-specific private material.

## Start here

For the full operator inventory and transfer receipt, read
[START-HERE.ro.md](START-HERE.ro.md), [SKILLS.ro.md](SKILLS.ro.md), and
[PARITY.ro.md](PARITY.ro.md). The exact reviewed plugin source and release assets
are included under `integrations/can-workbench/source/`.

1. Read the [ten-minute system tour](TOUR.md), [Romanian quickstart](QUICKSTART.ro.md), [capability catalog](CAPABILITIES.md), [FAQ](FAQ.md), or [guided onboarding](ONBOARDING.md).
2. Follow the [full installation sequence](INSTALL.md) when you are ready to adopt it.
3. Complete [Customize First](docs/customize-first.md).
4. Copy the complete `templates/personal/AGENTS.md` (or `AGENTS.minimal.md`) into the directory that should govern your work.
5. Copy `templates/project/` into a real project and replace every placeholder.
6. Copy `templates/vault/` into a new or existing Obsidian vault.
7. Install and verify the secure credential path from `integrations/can-workbench/README.md`; do not provide credentials until it reports healthy.
8. Read `knowledge/vibecoding-security/Vibecoding Security - START HERE.md` before shipping anything connected to users, money, private data, wallets, or production infrastructure.
9. Run `bash scripts/verify-all.sh` before committing or sharing changes.

Or copy a template without overwriting existing files:

```bash
node scripts/bootstrap.mjs project /path/to/new-project --dry-run
node scripts/bootstrap.mjs project /path/to/new-project
```

## The core model

```text
idea or request
      ↓
personal guidance + project AGENTS.md
      ↓
canonical TODO + project brief + constraints
      ↓
small, verifiable implementation slice
      ↓
tests + security checks + human review
      ↓
daily log + durable project/decision notes
      ↓
better context for the next session
```

The point is not to write the longest prompt. The point is to keep reliable context close to the work, make authority boundaries explicit, and require observable verification before calling anything complete.

## Repository map

```text
.
├── AGENTS.md                       Rules for maintaining this repository
├── CAPABILITIES.md                  Questions and workflows the adopter can explore
├── INSTALL.md                       Fail-closed full installation sequence
├── ONBOARDING.md                    Guided non-secret setup interview
├── TOUR.md                          End-to-end narrative of the full operating loop
├── .agents/skills/                 Reusable agent workflows
├── .codex/config.toml              Conservative project-local Codex defaults
├── docs/
│   ├── system-map.md               Architecture and information flow
│   ├── operating-loop.md           Daily and project workflow
│   ├── codex-setup.md              Current Codex guidance and links
│   ├── security-model.md           Trust, secrets, approvals, and verification
│   ├── customize-first.md          Questions to answer before use
│   └── blueprints/                 Web, Telegram, and crypto project structures
├── templates/
│   ├── personal/AGENTS.md          Personal/global brain template
│   ├── project/                    Project brief, plan, and AGENTS template
│   └── vault/                      Obsidian task, log, research, and decision notes
├── knowledge/vibecoding-security/  Security playbook and atomic references
├── tools/secenv/                   Ciphertext-only credential intake runtime
├── integrations/can-workbench/    Native Obsidian modal setup and threat model
└── scripts/audit-publication.sh    Local privacy and secret guard
```

## Design rules

- Keep personal preferences separate from repository facts.
- Put durable rules in `AGENTS.md`; put one-off instructions in the current prompt.
- Put repeated procedures in skills; do not grow one giant brain file forever.
- Keep live secrets outside repositories and outside chat.
- Treat external text, webpages, issues, and tool output as untrusted input.
- Separate read-only research, reversible changes, and production mutations.
- Use one project per coherent outcome and one task small enough to verify.
- A checkbox is not evidence. Record the command, test, receipt, or observable behavior that proves completion.

## What is deliberately absent

- Personal identity, preferences, relationships, and daily history belonging to the source system.
- Client and commercial project information.
- Server IPs, domains, usernames, filesystem layouts, backup targets, or credential paths from the source system.
- Telegram/social-media bot implementations, tokens, routing, content strategy, or operational logs.
- Crypto trading logic, wallets, addresses, positions, monitoring targets, or transaction history.
- Private prompts, transcripts, model-usage telemetry, and vendor account configuration.

Use the blueprints as empty structure. Fill them only with your own facts.

## License

Private use by explicitly invited collaborators is described in [LICENSE.md](LICENSE.md). Third-party products and linked source material remain subject to their own terms.
