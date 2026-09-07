# Personal Layer

- `AGENTS.md`: complete transferable brain, mapped to the full operating system and kept near 21 KiB so it leaves room under Codex's default 32 KiB combined instruction budget.
- `AGENTS.minimal.md`: smaller starting point that preserves the secure credential hard gate.
- `MEMORY.md`: short session-routing index, not a transcript archive.
- `user_profile.md`: collaboration-relevant preferences only.
- `codex.config.example.toml`: conservative personal Codex configuration without credentials or a forced model.

Use the complete brain when the vault/workspace/operations system is actually installed. Use the minimal brain for a local project-only setup. In both cases, replace placeholders and validate the final file with:

```bash
node scripts/check-adopted-brain.mjs /absolute/path/to/AGENTS.md
```

Do not copy another person's filled profile, paths, account names, workspace settings, projects, or authority.
