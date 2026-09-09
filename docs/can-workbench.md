# Can Workbench

Can Workbench turns Obsidian Desktop into the operator surface for this system. It is desktop-only and combines knowledge, remote workspaces, terminal sessions, project navigation, files, diagrams, and secure credential requests.

## Included surfaces

- Local, Coder, and direct SSH connections.
- Embedded persistent terminal/tmux sessions.
- User-visible vs system-scoped session filtering.
- Workspace/project views and file operations.
- Countdown/status utilities.
- Excalidraw live-text support.
- Native encrypted secure-input modal.

The private repository installs the verified public [v2.2.0 release](https://github.com/cansitki/can-workbench/releases/tag/v2.2.0), source commit `e09d8a0b8e2af60405aa05b4477850f88f8dd995`, by pinned SHA-256 from the included source snapshot (see `integrations/can-workbench/SOURCE.md`); it never copies local `data.json`, workspace names, connection routes, tokens, PEM files, or settings.

## Source/build rule

`main.js` is generated. In Can Workbench development, edit `modules/*.js` and the declared vendor sources, then run `python3 build.py`. Shared top-level imports belong in the build header. Never patch the generated bundle as the canonical source.

## Session behavior

- Project sessions are visible and named location/project first.
- Watchers, tunnels, collectors, and other system sessions are marked `sys-*` or with system scope metadata.
- Manual categories set by the operator take precedence over automatic categorization.
- Hidden terminal panes should continue receiving data without expensive hidden-layout rendering.
- Durable services move out of tmux into a service manager.

## Secure input

The plugin maintains one listener for the explicitly selected workspace. A `secenv ask` request opens a modal showing origin, workspace, field help, variable names, and destination paths. Values are encrypted with WebCrypto before transport; cancel/dismiss sends no secret and ends the request.

See `integrations/can-workbench/README.md` for installation and verification.

## Configuration boundary

Every adopter supplies their own:

- vault path;
- Coder user/workspace or SSH/local target;
- terminal categories;
- project paths;
- secure-input workspace;
- local secret references.

Do not copy another operator's plugin data file.
