# Obsidian CLI Safety

This system prefers a supported Obsidian CLI/API for vault operations so note identity, metadata, links, and daily-note settings remain visible to Obsidian.

## Addressing

- `file="Name"` resolves like a wikilink.
- `path="folder/Name.md"` addresses one exact path.
- Quote values containing spaces.
- Use `\n`/`\t` only where the installed CLI documents content escapes.

## Hard overwrite rule

`create ... overwrite` without a valid `content=` value can wipe the target. Never combine overwrite with a shell variable that may be empty and never use it for large content that may be truncated by shell/argument limits.

For an existing note:

1. Read it.
2. Prefer an exact patch for controlled maintenance.
3. Use `append`/`prepend` only with explicit literal content.
4. Re-read the changed section, properties, and outline.

## Safe sequence

```bash
obsidian search query="topic"
obsidian read file="Canonical Note"
obsidian properties file="Canonical Note"
obsidian append file="Canonical Note" content="..."
obsidian outline file="Canonical Note"
```

Create a new note only after search/index checks:

```bash
obsidian create name="Atomic Note" content="..."
obsidian links file="Atomic Note"
obsidian backlinks file="Atomic Note"
```

## Daily notes

- Run `obsidian daily:path` before logging and confirm it resolves inside the configured daily folder.
- Keep entries chronological.
- Keep `## Links Inbox` last; a blind append may violate this, so insert above it when necessary.
- Merge duplicate same-date notes before moving one; never discard content.

## Deletion

Normal delete should go to trash when supported. Permanent delete bypasses recovery and requires exact scope. Resolve the note/path first and report material deletion plus recovery status.

## Verification

After structural vault work, check the relevant combination of files, outline, properties, links, backlinks, unresolved links, task state, and sync status. A successful CLI exit alone does not prove the vault graph is correct.
