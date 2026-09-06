# Git and File Safety

## Dirty worktrees

Assume existing changes belong to the user unless proven otherwise.

- Inspect `git status` before editing.
- Read overlapping diffs before changing the same file.
- Preserve unrelated modifications and untracked files.
- Stage files intentionally; do not use broad staging when the tree contains unrelated work.
- Do not reset, checkout, clean, rebase, or delete user work without explicit scope.

Use a separate worktree when two live tasks need independent branches or when an experiment could disturb the current state.

## Editing

- Read the target before writing.
- Prefer patch-style changes that expose an exact diff.
- Avoid whole-file overwrite for large or stateful documents unless the full intended content is known and verified.
- Generated and vendored files are changed through their source/build process.
- Preserve encoding, line endings, permissions, and executable bits.
- After a bulk rewrite, inspect representative files and run structural checks.

## Destructive operations

Before deletion or overwrite:

1. Resolve the exact target without broad globs or unresolved variables.
2. Confirm it is within the requested scope.
3. Determine whether it is material and whether recovery exists.
4. Prefer moving to trash or a reversible archive.
5. Verify what remains afterward.
6. Report material deletions and recovery options.

Never aim recursive destructive commands at a home directory, repository root, workspace root, or filesystem root.

## Commits

- One coherent outcome per commit.
- Commit messages explain the behavioral or structural change.
- Tests/docs belong with the change they verify/explain when that keeps the commit coherent.
- Review the staged diff and secret scan before committing.
- A push or pull request is an external mutation; perform it only when the task includes it.
