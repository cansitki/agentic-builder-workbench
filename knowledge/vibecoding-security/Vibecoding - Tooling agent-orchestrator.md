---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: pull-in
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - agent-orchestrator

**Repo:** https://github.com/ComposioHQ/agent-orchestrator (npm: `@aoagents/ao`)
**Stars:** 6,625
**Last activity:** Very active — pushed 2026-04-29 (today). 3,288 test cases, 61 PRs merged.
**License:** MIT

## What it is
An orchestration layer that spawns parallel coding agents in isolated git worktrees, routes CI failures and review comments back to the relevant agent, and surfaces everything in a single dashboard. Agent-agnostic (Claude Code / Codex / Aider / Cursor / opencode), runtime-agnostic (tmux / Docker / process), tracker-agnostic (GitHub / Linear / GitLab).

## Activity signal
Top-tier. Heavy commits, big test suite, plugin architecture, Discord, npm-published, schema validation. This is the "serious" parallel-agents play.

## Core features
- `ao start` clones a repo, generates `agent-orchestrator.yaml`, opens dashboard at `localhost:3000`, launches an orchestrator agent.
- Each issue → its own git worktree → its own branch → its own PR. Full isolation.
- **Reaction engine**: `ci-failed` auto-routes logs to the agent for self-fix; `changes-requested` auto-routes review comments; `approved-and-green` notifies you to merge (or auto-merges if you flip the flag).
- 7-slot plugin architecture: Runtime, Agent, Workspace, Tracker, SCM, Notifier, Terminal. All TypeScript interfaces in `packages/core/src/types.ts`.
- macOS `caffeinate` integration to keep your laptop awake for remote dashboard access (e.g. via Tailscale from your phone).
- Notifier plugins: desktop, slack, discord, composio, webhook, openclaw.

## How it works mechanically
- Node.js 20+ CLI distributed via npm.
- Each agent gets its own git worktree (file-system isolation, no branch checkout dance).
- Default runtime is `tmux` — agents run in detached tmux sessions you can `attach` to. Alternative: `docker`.
- Config in `agent-orchestrator.yaml` with `$schema` URL for editor autocomplete.
- The orchestrator agent itself uses the `ao` CLI internally — you don't manually invoke worker spawn commands.

## When to use it
- Multiple issues / a backlog you'd otherwise sequentially work through with one Claude Code session. `ao start`, walk away, review PRs.
- Want auto-fix-on-CI-failure as a workflow primitive.
- Want a uniform dashboard across multiple repos / projects.
- Pairs naturally with [[Vibecoding - CI CD and Container Security]] (the agents push to your real CI; harden it first) and [[Vibecoding - Debugging and Bug Triage Workflow]].

## When NOT to use it
- For one-off changes, this is overkill — just open Claude Code.
- The "agent auto-fixes CI" loop is a **trust boundary expansion** — agents now write code that triggers CI that triggers agents. Make sure your branch protection / required reviewers on `main` is solid before turning auto-merge on. See [[Vibecoding - No Authorization on Endpoints]] mindset applied to CI.
- Plugin attack surface: a malicious notifier plugin could exfiltrate code/keys. Vet plugins.
- macOS-first ergonomics (caffeinate, iterm2 default). Linux works but you lose the sleep-prevention.

## Verdict: **pull-in**
This is the orchestration primitive worth investing in. Start with one repo, manual-merge gate, no auto-merge. Once the loop feels safe, enable `auto-merge` on `approved-and-green` only for repos with strong [[Vibecoding - CI CD and Container Security]] gates.

## Distinctive quotes
> "Spawn parallel AI coding agents, each in its own git worktree. Agents autonomously fix CI failures, address review comments, and open PRs — you supervise from one dashboard."

> "Running one AI agent in a terminal is easy. Running 30 across different issues, branches, and PRs is a coordination problem."

> "Seven plugin slots. Lifecycle stays in core."

## Cross-links
- [[Vibecoding - CI CD and Container Security]]
- [[Vibecoding - Debugging and Bug Triage Workflow]]
- [[Vibecoding - No Authorization on Endpoints]]
- [[Vibecoding - Tooling claude-octopus]]
