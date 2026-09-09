# Install or migrate to Workbench

## New vault

Run `bash scripts/install-workbench.sh /absolute/path/to/vault` from the repo root,
then enable **Workbench** in Obsidian Community plugins. Install the included
secenv 0.4.0 in each credential-consuming workspace. Both sides use the new
`workbench` channel; the old plugin/runtime pair is not interchangeable.

In Workbench Settings:

1. Remote Connections: add your Local, SSH or Coder connection.
2. For Coder, enter your own Coder username and workspace identifier. These are
   not your display name, GitHub username or Linux login unless actually equal.
3. Add your projects; prefer absolute paths.
4. Set Upload directory to an absolute directory owned by the remote user.
5. Secure Input: select the connection identifier, then enable the listener.
6. Run secenv doctor, inspect listener status and test submit/cancel with dummy data.

## Existing legacy plugin

The old `can-workbench` and new `workbench` plugins share embedded view types.
The installer refuses an existing old or new plugin folder. Do not enable both.

1. Finish or cancel pending credential requests and save terminal work.
2. Back up the old plugin folder/settings privately and verify the backup.
3. Disable the old plugin, close its panes and quit Obsidian.
4. Move its folder outside `.obsidian/plugins/` to the private backup location.
5. Install Workbench and reopen Obsidian. Re-enter your own non-secret settings.
   Do not import another operator's data.json or an injected legacy username.
6. Keep transport keys in SSH configuration/key files; there is no key paste UI.
7. Install matching secenv and perform the target parity tests.

Rebind hotkeys referencing the former plugin ID. For system sessions, use
`@workbench_scope=system` or the independent `sys-*` naming convention.

## Rollback

Disable Workbench and quit Obsidian. Move the new folder aside, restore the
verified old folder/settings and use its matching prior secenv runtime. Do not
delete source settings or reuse pending credential submissions across versions.
This guide does not migrate the source operator's live vault automatically.
