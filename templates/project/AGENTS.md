# [PROJECT NAME] — Agent Guidance

## Project outcome

Read `PROJECT.md` for the current outcome, users, scope, and non-goals. Read `PLANS.md` for live execution state.

## Repository map

- Application code: `[PATH]`
- Tests: `[PATH]`
- Database/migrations: `[PATH]`
- Documentation/decisions: `[PATH]`
- Generated or vendored files—do not edit directly: `[PATHS OR NONE]`

## Canonical commands

```bash
[INSTALL COMMAND]
[DEV COMMAND]
[FORMAT COMMAND]
[LINT COMMAND]
[TYPECHECK COMMAND]
[UNIT TEST COMMAND]
[INTEGRATION TEST COMMAND]
[E2E COMMAND]
[BUILD COMMAND]
```

Remove commands that do not exist. Do not invent green checks.

## Engineering conventions

- Runtime and package manager: `[VALUES]`.
- Architecture boundary: `[SHORT DESCRIPTION]`.
- Naming/style rules: `[RULES]`.
- Database migration policy: `[RULES]`.
- Dependency policy: `[RULES]`.
- Browser/platform support: `[TARGETS]`.

## Security boundaries

- Authentication provider and trust boundary: `[VALUE]`.
- Authorization model: `[VALUE]`.
- Sensitive data classes: `[VALUE]`.
- External side effects: `[PAYMENTS / EMAIL / MESSAGES / TRANSACTIONS / NONE]`.
- Environments and deployment owner: `[VALUE]`.
- Secrets stay in `[APPROVED SECRET STORE]`; values enter only through `secenv ask` and the native Can Workbench modal. Never request them in chat/terminal, commit, print, or log them. If the secure path is unavailable, stop and repair it.

## Change workflow

1. Reproduce or establish the baseline.
2. Preserve unrelated changes.
3. Implement the smallest coherent slice.
4. Run focused checks, then the broader relevant suite.
5. Review the diff and negative paths.
6. Update documentation and `PLANS.md` when state changed.

## Definition of done

- Acceptance criteria in `PROJECT.md` or the active plan are met.
- `[REQUIRED CHECKS]` pass.
- The real user path and important failure path are verified.
- No secret, personal data, generated junk, or unrelated edit entered the diff.
- Deployment or external mutation is not performed unless explicitly authorized.
