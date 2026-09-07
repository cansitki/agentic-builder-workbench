# Ten-Minute System Tour

This is how the pieces behave as one operating system.

## 1. You speak naturally

You can start with an imperfect request: an idea, bug, link, decision, or operational problem. The agent does not require a perfect prompt. It converts the request into goal, relevant context, constraints, and observable completion criteria.

If the request is still materially ambiguous, the agent interviews you. If a reasonable reversible assumption stays inside scope, it proceeds and labels the assumption.

## 2. The agent boots into your context

Before substantive work, it reads:

1. memory routing and user profile;
2. the full personal `AGENTS.md`;
3. the canonical TODO for priority awareness;
4. the current project's local `AGENTS.md`, `PROJECT.md`, and `PLANS.md`;
5. only the indexed vault notes needed for the task;
6. live repository and external state.

The newest explicit request wins. Memory helps navigation but cannot prove current state or broaden authority.

## 3. It classifies the request

- “Explain/review” → inspect and report.
- “Diagnose” → find and explain the cause.
- “Build/fix” → implement and verify.
- “Deploy/send/invite/pay/transact” → exact external target/payload gate.
- “Monitor/wait” → durable cadence, stop condition, and alert path.

This prevents a review from quietly turning into a production change.

## 4. It updates the task system

A new commitment enters one canonical TODO, not a second list. Active work respects WIP. A large project keeps details in its project hub/backlog while the general list keeps the outcome and one next action.

Blocked work records reason, dependency, and review trigger. Completion requires evidence.

## 5. It plans only as much as needed

Small reversible changes can proceed directly. Complex or high-risk work gets a plan with boundaries, failure paths, backup/rollback, and verification.

The first implementation target is a thin end-to-end slice that tests the riskiest important assumption.

## 6. A needed credential never enters chat

The agent first determines provider/account, exact type/name, current minimum permission, resource/environment restrictions, capabilities, lifetime, destination, and consumer.

Then it runs:

```text
secenv doctor
secenv ask --schema reviewed-request.json
```

Can Workbench opens a native Obsidian modal showing the origin and declared destinations. You enter the value there. It is encrypted locally, transported as ciphertext, installed `0600`, and the agent receives only redacted status.

If the route is unavailable, work stops. There is no chat, terminal, screenshot, or browser-link fallback. Secure collection still does not authorize the later deployment/transaction.

## 7. Work happens in the correct surface

- Repositories, vault, interactive Codex, and human-attachable tmux sessions live in the work surface.
- Watchers, smoke servers, tunnels, and temporary collectors live in a system/runtime surface and are clearly marked.
- Processes that must survive sessions/reboots become durable services with health, logs, and ownership.

The agent preserves unrelated dirty work and uses worktrees when independent live changes need isolation.

## 8. Code is treated as a hypothesis

The agent inspects the baseline, changes the smallest coherent slice, runs focused tests, exercises negative paths, runs broader checks, reviews the diff, and verifies real behavior.

Sensitive paths add authn/authz, tenant isolation, replay/idempotency, secret, payment/wallet, migration, and rollback checks as applicable.

“Looks right” is not evidence.

## 9. External actions are frozen and verified

Before a send, deploy, permission change, payment, signing, or transaction, the system freezes the exact target, environment, payload/artifact, attachments, limits, authorization, retry policy, and expected receipt.

Ambiguous submission becomes `unknown`; it is never automatically repeated. Success is recorded only after provider receipt or observable post-state.

## 10. The system remembers the result

After meaningful work:

- project plan/evidence is updated;
- the canonical TODO moves once;
- the daily note records facts, decisions, evidence, and next action;
- durable lessons become atomic notes linked from an index/project hub;
- a handoff records exact resumable state when needed.

The vault is not a transcript dump. It keeps the information that makes the next session better.

## 11. Repeated friction improves the operating system

- One-off correction → current prompt/plan.
- Repeated repository mistake → nearest `AGENTS.md`.
- Repeated procedure → skill.
- Mechanical invariant → test/hook/CI.
- Stable recurring procedure → scheduled automation.

Rules grow from demonstrated friction, not hypothetical complexity.

## A complete example

You say: “I want a Telegram bot for a crypto community.”

The system can:

1. interview you about the actual user outcome and non-goals;
2. create `PROJECT.md`, `PLANS.md`, and a threat model;
3. separate Telegram transport, domain state, jobs, outbox, chain reads, signing, and audit;
4. keep the agent read-only until transaction authority is explicit;
5. research current provider/chain behavior from primary sources;
6. request a bot token only through the informed encrypted modal;
7. build a thin local/testnet slice;
8. test duplicate updates, unauthorized commands, restarts, rate limits, and receipt handling;
9. prepare—but not perform—deployment or signing unless exactly authorized;
10. update tasks, daily log, project evidence, runbook, and durable lessons.

No source-system bot code, wallet, strategy, account, or message history is needed for this workflow.

## Ask the system

- `Use $workbench-onboarding and explain which modules I actually need.`
- `Show me the full brain and help replace its placeholders.`
- `Map my laptop/VPS into work, runtime, and durable-service surfaces.`
- `Audit secure credential intake without asking me for a secret.`
- `Use $project-kickoff on my first idea.`
- `What could this system automate safely for me?`
