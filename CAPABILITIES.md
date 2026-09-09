# What This Workbench Can Do

Open Codex in this repository and ask about any section below. The system should explain the pattern, show the relevant files, interview you for non-secret configuration, and help adapt it to your own environment.

## Personal agent brain

- Build a complete or minimal personal `AGENTS.md`.
- Encode communication style, operating surfaces, authority, safety, and definition of done.
- Keep one canonical brain synchronized across environments.
- Separate user profile, memory routing, project facts, and live state.

Ask: `Use $workbench-onboarding and help me create my personal agent brain.`

## Tasks and project state

- Create one canonical TODO with WIP limits and explicit state movement.
- Connect project backlogs without creating competing general lists.
- Capture commitments, blockers, review triggers, next actions, and verified completions.
- Generate project hubs, plans, handoffs, runbooks, incidents, and threat models.

Ask: `Show me how the canonical TODO and project backlog work together.`

## Obsidian operational memory

- Set up Vault Index, daily notes, links inbox, weekly reviews, research indexes, and decisions.
- Route agents through indexes instead of loading an entire vault.
- Promote durable knowledge from chronological logs.
- Apply safe CLI and patch rules that avoid accidental overwrite.

Ask: `Help me install the vault template without overwriting my existing notes.`

## Workbench operator surface

- Use Obsidian as the front door for vault context, project terminals, remote workspaces, files, session categories, diagrams, and secure input.
- Connect Local, Coder, or direct SSH targets without copying another operator's settings.
- Keep human-visible project tmux separate from hidden system/runtime sessions.
- Install only the pinned release or reproducibly build from reviewed module sources.

Ask: `Tour Workbench and design my Local/Coder/SSH connection layout without installing it yet.`

## Building and fixing software

- Turn a fuzzy idea into a bounded outcome and first vertical slice.
- Distinguish answer, audit, diagnosis, implementation, deployment, and monitoring authority.
- Preserve dirty worktrees and unrelated user changes.
- Require tests, real behavior, negative paths, and evidence before completion.

Ask: `Use $project-kickoff to turn my idea into PROJECT.md and PLANS.md.`

## Secure credential intake

- Install a workspace-side `secenv` runtime.
- Install a verified Workbench release into Obsidian.
- Trigger a native encrypted modal from a Codex task.
- Require field-by-field provider, permission, resource, environment, risk, lifetime, destination, and consumer information.
- Install owner-only files without printing secrets and without chat/browser/terminal fallback.

Ask: `Audit whether my secure credential intake is ready. Do not ask me for a secret.`

## Research

- Choose comparison, decision, documentation, incident, or blocked-site research shape.
- Use current primary sources for changing/high-stakes facts.
- Split independent research cleanly and synthesize conflicts.
- Create atomic, cited notes and an index.

Ask: `Design a research plan for this decision and tell me what sources would count as proof.`

## Agent, skill, hook, connector, and automation routing

- Decide whether behavior belongs in a prompt, `AGENTS.md`, skill, hook/CI, MCP connector, scheduled task, or durable service.
- Package repeatable workflows as repo-local skills.
- Review connector capabilities, data, credentials, and action boundaries.
- Turn stable manual work into idempotent scheduled automation.

Ask: `I repeat this workflow every week. Should it become a skill, hook, or scheduled task?`

## Workspaces and sessions

- Separate interactive project work, temporary runtime processes, and durable services.
- Use clear tmux naming/scope and resumable handoffs.
- Avoid duplicate pollers/consumers during migration.
- Build a non-secret environment inventory.

Ask: `Map my local/VPS/Coder environment into work, system, and durable-service layers.`

## Backup, restore, and migration

- Define backup scope, encryption ownership, retention, and recovery objectives.
- Test isolated restore instead of trusting backup completion.
- Build a state-transfer manifest and cutover/rollback gate.
- Keep mail, payments, signing, and other production systems as separate gates.

Ask: `Create a restore drill and cutover checklist for my service.`

## Web apps

- Structure transport, application, domain, persistence, and external adapters.
- Build thin end-to-end slices.
- Review authn/authz, RLS/tenant isolation, files, webhooks, payments, rate limits, and logging.

Ask: `Review my web-app architecture against the blueprint and security library.`

## Telegram bots

- Separate Telegram transport from domain behavior.
- Model identity, permissions, commands, queues, outbox, jobs, and receipts.
- Enforce update deduplication, idempotency, rate limits, restart recovery, and safe formatting.
- Keep AI-generated text away from direct privileged execution.

Ask: `Help me design a Telegram bot state machine without writing production code yet.`

## Crypto projects

- Separate read, decision, execution, signing, and audit planes.
- Create immutable transaction intents and simulation gates.
- Model key/wallet separation, allowances, nonce/reorg/finality, and reconciliation.
- Build contract test/invariant and emergency-stop plans.

Ask: `Threat-model this crypto project while keeping the agent read-only.`

## External actions

- Freeze recipients/targets, payloads, attachments, permission/amount, authorization, and expected receipts.
- Detect duplicates and ambiguous submissions.
- Encode narrow standing delegations with fail-closed limits.
- Keep drafting separate from sending/deploying/transacting.

Ask: `Prepare an immutable action manifest, but do not execute it.`

## Incidents and security reviews

- Detect, assess, contain, preserve evidence, recover, verify, and learn.
- Run the 32-section vibe-coding checklist and atomic deep dives.
- Convert demonstrated failures into tests, hooks, runbooks, or guidance.
- Scan publication changes for secrets and private/source-specific material.

Ask: `Use $secure-release to tell me whether this build is actually ready.`

## Visual notes

- Choose an appropriate table, flow, tree, timeline, or wireframe.
- Create measured Excalidraw layouts with bounds/overlap checks.
- Require actual rendered inspection before calling a diagram complete.

Ask: `Turn this architecture into the smallest useful diagram.`

## Boundaries

This repository does not grant authority to deploy, send, delete, pay, sign, trade, invite, or change production state. It never accepts secrets in conversation. It contains no private source-system history or operational credentials.
