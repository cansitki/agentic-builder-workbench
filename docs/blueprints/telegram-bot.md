# Telegram Bot Blueprint

This is a generic architecture for a bot you own. It contains no imported bot code, tokens, recipients, prompts, or automation from another system.

## Design boundary

Keep Telegram transport separate from domain behavior. A message handler should parse and authenticate the update, then call an application use case. It should not contain the entire product.

```text
Telegram update
      ↓
transport adapter
      ↓
identity + authorization
      ↓
command/event router
      ↓
domain use case
      ↓
database / queue / external adapters
      ↓
outbox → Telegram send → provider receipt
```

## Suggested modules

```text
src/
├── bot/             Telegram client, update parsing, formatting
├── commands/        Thin command adapters
├── domain/          Business rules and state machines
├── application/     Use-case orchestration
├── persistence/     Repositories and migrations
├── integrations/    APIs, chain clients, storage, AI providers
├── jobs/            Scheduled work and queue consumers
├── outbox/          Idempotent outbound messages
├── observability/   Structured logs, metrics, health checks
└── config/          Validated non-secret configuration schema
```

## Minimum controls

- Accept updates only through an authenticated webhook or a single controlled poller.
- Validate Telegram user/chat identity server-side; usernames are not stable identifiers.
- Separate user, moderator, operator, and owner permissions.
- Make every side-effecting command idempotent.
- Store an update ID/deduplication key before expensive or irreversible work.
- Use a durable outbox for important outbound messages.
- Treat an ambiguous send as unknown; do not automatically retry irreversible actions.
- Escape or format user-controlled text safely for the selected parse mode.
- Rate-limit by user, chat, command, and expensive dependency.
- Keep the bot token and provider keys in a secret manager or owner-only file.
- Redact message bodies and personal data from logs unless explicitly required and retained lawfully.

## AI-enabled bot boundary

The model may draft or classify. Deterministic code must enforce:

- tool allowlists;
- user and tenant authorization;
- spending and transaction limits;
- immutable confirmation payloads;
- secret isolation;
- output escaping;
- stop conditions and timeouts.

Do not let model-generated text directly become a shell command, SQL statement, wallet transaction, or privileged API call.

## Operational states

Model long-running actions explicitly:

```text
received → validated → queued → processing → succeeded
                                  ├→ failed_retryable
                                  ├→ failed_terminal
                                  └→ unknown_requires_review
```

Persist transitions and correlate them with Telegram update IDs and provider receipts.

## Verification

- Duplicate update replay produces one effect.
- Unauthorized chat/user cannot call privileged commands.
- Invalid callback data fails closed.
- Dependency timeout does not create duplicate output.
- Restart during work resumes safely.
- Markdown/HTML injection is escaped.
- Logs contain no bot token, secrets, or unnecessary private messages.
- Health check detects a dead poller/webhook consumer.
