/*
 * VM Connect module — runs inside can-workbench.
 *
 * Owns: ribbon separators, screenshot paste upload (terminal view),
 * per-session terminal tinting (via xterm theme API + DOM), manual
 * screenshot upload command.
 *
 * The "Connect to VM" and "Connect to Coder" ribbon buttons that lived
 * here were merged into GSD Control's picker — VM is now a workspace
 * entry with `type: "vm"` in gsd.workspaces.
 */

const { Notice, Menu } = require('obsidian');
const { exec, execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const VIEW_TYPE = 'vin-terminal-view';
const VM_IMG_DIR = '/tmp/vm-screenshots';
const CODER_UPLOAD_DIR = '/home/coder/vm-screenshots';

// SSH connection-multiplexing. First call opens a master socket at
// ControlPath; subsequent calls reuse it and skip the full handshake.
// ControlPersist=1800 keeps the socket warm for 30 min after last use.
const SSH_MUX_ARGS = [
  '-o', 'ControlMaster=auto',
  '-o', 'ControlPath=/tmp/cw-paste-mux-%r@%h:%p',
  '-o', 'ControlPersist=1800',
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'ServerAliveInterval=60',
];

class VMConnectModule {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.pasteHandler = null;
    this.dropHandler = null;
    this.dragOverHandler = null;
    this.separatorElements = [];
    this.tintInterval = null;
    this.mutationObserver = null;
    // Cache of "host:dir" targets we've already ensured exist, so we
    // can skip the mkdir roundtrip on subsequent pastes.
    this._knownRemoteDirs = new Set();
  }

  async load() {
    // Settings come from the parent plugin (namespaced under `vmConnect`)
    this.settings = Object.assign({ separatorCount: 0 }, this.plugin.settings?.vmConnect || {});

    // Note: the "Connect to VM" and "Connect to Coder" ribbon icons used
    // to live here. They've been merged into GSD Control's picker — VM
    // is now a workspace entry with `type: "vm"` in gsd.workspaces,
    // handled by CanWorkbench._openVmSession via a wrapper around
    // gsd.openSpecificSession.

    // Add separator ribbon icons
    this.renderSeparators();

    // Inject separator styles
    this.injectStyles();

    this.plugin.addCommand({
      id: 'vm-connect-send-screenshot',
      name: 'VM Connect: Send screenshot to VM Claude',
      callback: () => this.sendScreenshot()
    });

    // Intercept paste events on terminal views
    this.pasteHandler = this.handlePaste.bind(this);
    document.addEventListener('paste', this.pasteHandler, true);

    // Intercept Finder drag-drop onto terminal views. dragover must
    // preventDefault() or the drop event never fires.
    this.dragOverHandler = this.handleDragOver.bind(this);
    this.dropHandler = this.handleDrop.bind(this);
    document.addEventListener('dragover', this.dragOverHandler, true);
    document.addEventListener('drop', this.dropHandler, true);

    // Inject session background tint styles
    this.injectTintStyles();

    // Watch for active leaf changes to apply per-session tints
    this.plugin.registerEvent(
      this.app.workspace.on('active-leaf-change', () => this.applyTints())
    );

    // Also apply on layout changes (tab switches, new tabs)
    this.plugin.registerEvent(
      this.app.workspace.on('layout-change', () => this.applyTints())
    );

    // React immediately to theme toggle (light <-> dark) without waiting
    // for the periodic re-apply interval.
    this.plugin.registerEvent(
      this.app.workspace.on('css-change', () => this.applyTints())
    );

    // Initial tint application
    this.app.workspace.onLayoutReady(() => this.applyTints());

    // Periodic re-apply to catch session renames/new sessions
    this.tintInterval = setInterval(() => this.applyTints(), 300);

    // MutationObserver: react immediately when DOM changes inside terminal views
    this.setupMutationObserver();
  }

  async saveSettings() {
    if (!this.plugin.settings.vmConnect) this.plugin.settings.vmConnect = {};
    this.plugin.settings.vmConnect = this.settings;
    await this.plugin.saveSettings();
  }

  setupMutationObserver() {
    let pending = null;
    this.mutationObserver = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = null;
        this.applyTints();
      });
    });
    const target = document.querySelector('.workspace') || document.body;
    this.mutationObserver.observe(target, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-session-id', 'data-active'],
      childList: true
    });
  }

  injectTintStyles() {
    const id = 'vm-connect-tint-styles';
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      /* Per-session tinted tabs — inline styles handle colors, this just protects icons */
      .workspace-tab-header[data-vm-tint] .workspace-tab-header-inner-icon,
      .workspace-tab-header[data-vm-tint] .workspace-tab-header-inner-close-button {
        background-color: transparent !important;
      }
    `;
    document.head.appendChild(style);
  }

  /** Hash a string to a hue (0-360). FNV-1a for even distribution. */
  hashHue(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) | 0;
    }
    return Math.abs(h * 137) % 360;
  }

  /** Resolve the tint palette for a given hue based on the active Obsidian theme. */
  _tintPalette(hue, isDark) {
    if (isDark) {
      return {
        sessionBg: `hsl(${hue}, 25%, 8%)`,
        tabBgActive: `hsl(${hue}, 35%, 18%)`,
        tabBgIdle: `hsl(${hue}, 22%, 10%)`,
        strokeActive: `hsl(${hue}, 60%, 40%)`,
        strokeIdle: `hsl(${hue}, 35%, 22%)`,
        textActive: '#b8b8b8',
        textIdle: '#7a7a7a',
      };
    }
    return {
      sessionBg: `hsl(${hue}, 15%, 97%)`,
      tabBgActive: `hsl(${hue}, 35%, 90%)`,
      tabBgIdle: `hsl(${hue}, 18%, 96%)`,
      strokeActive: `hsl(${hue}, 50%, 50%)`,
      strokeIdle: `hsl(${hue}, 30%, 78%)`,
      textActive: '#2a2a2a',
      textIdle: '#7a7a7a',
    };
  }

  /** Color internetvin-terminal's internal session tabs (inside the view, not Obsidian tabs). */
  applyTints() {
    // Tinting disabled — terminal stays vanilla and follows Obsidian's
    // theme directly. To re-enable, remove this early return.
    return;

    // eslint-disable-next-line no-unreachable
    const leaves = this.app.workspace.getLeavesOfType('vin-terminal-view');
    if (leaves.length === 0) return;

    const isDark = document.body.classList.contains('theme-dark');

    for (const leaf of leaves) {
      const view = leaf.view;
      if (!view || !view.containerEl) continue;

      // Tint every session's xterm terminal background via its theme API.
      const sessions = view.sessions || (view.activeSession ? [view.activeSession] : []);
      const activeName = view.activeSession?.name || '';
      for (const session of sessions) {
        if (!session || !session.name) continue;

        const xtermTerm = session.terminal || session.term || session.xterm ||
                          session.termWrap?.terminal || session.termWrap?.term;
        if (!xtermTerm || !xtermTerm.options) continue;

        const hue = this.hashHue(session.name);
        const bgColor = this._tintPalette(hue, isDark).sessionBg;

        const currentBg = xtermTerm.options.theme?.background;
        if (currentBg !== bgColor) {
          try {
            xtermTerm.options.theme = {
              ...(xtermTerm.options.theme || {}),
              background: bgColor
            };
            if (typeof xtermTerm.refresh === 'function') {
              xtermTerm.refresh(0, (xtermTerm.rows || 24) - 1);
            }
          } catch (e) {}
        }

        if (session.containerEl) {
          session.containerEl.setAttribute('data-vm-tint-bg', '1');
          session.containerEl.style.setProperty('background-color', bgColor, 'important');
        }
      }

      if (activeName) {
        const hue = this.hashHue(activeName);
        const bgColor = this._tintPalette(hue, isDark).sessionBg;

        const contentEl = view.contentEl || view.containerEl?.querySelector('.view-content');
        if (contentEl) {
          contentEl.setAttribute('data-vm-tint-bg', '1');
          contentEl.style.setProperty('background-color', bgColor, 'important');
        }

        const xtermEl = view.containerEl?.querySelector('.xterm');
        if (xtermEl) {
          let parent = xtermEl.parentElement;
          while (parent && parent !== view.containerEl) {
            parent.setAttribute('data-vm-tint-bg', '1');
            parent.style.setProperty('background-color', bgColor, 'important');
            parent = parent.parentElement;
          }
        }

        const tabContainers = view.containerEl?.querySelectorAll(
          '.vin-terminal-tabs, .vin-terminal-header, [class*="tab-bar"], [class*="tabs-bar"]'
        );
        tabContainers?.forEach(el => {
          el.setAttribute('data-vm-tint-bg', '1');
          el.style.setProperty('background-color', bgColor, 'important');
        });
      }

      const sessionTabs = view.containerEl.querySelectorAll(
        '.vin-terminal-tab, [class*="session-tab"], [class*="vin-tab"], button[data-session-id], button[data-session-name]'
      );

      const tabCandidates = sessionTabs.length > 0
        ? Array.from(sessionTabs)
        : Array.from(view.containerEl.querySelectorAll('button, [role="tab"]'));

      for (const tabEl of tabCandidates) {
        const label = tabEl.textContent?.trim() || tabEl.getAttribute('aria-label') || '';
        if (!label) continue;
        if (label.length < 2 || label.length > 100) continue;
        if (/^[+×✕✖X]$/.test(label.trim())) continue;

        const hue = this.hashHue(label);
        const palette = this._tintPalette(hue, isDark);
        const strokeColorActive = palette.strokeActive;
        const strokeColorIdle = palette.strokeIdle;
        const tabBgActive = palette.tabBgActive;
        const tabBgIdle = palette.tabBgIdle;

        const isActive = tabEl.classList.contains('is-active') ||
                         tabEl.classList.contains('mod-active') ||
                         tabEl.getAttribute('data-active') === 'true' ||
                         tabEl.classList.contains('active');

        tabEl.setAttribute('data-vm-tint', '1');
        tabEl.style.setProperty('box-sizing', 'border-box', 'important');
        tabEl.style.setProperty('background-color', isActive ? tabBgActive : tabBgIdle, 'important');
        tabEl.style.setProperty('border', `1px solid ${isActive ? strokeColorActive : strokeColorIdle}`, 'important');
        tabEl.style.setProperty('border-radius', '6px', 'important');
        tabEl.style.removeProperty('outline');
        tabEl.style.removeProperty('outline-offset');
        tabEl.style.setProperty('color', isActive ? palette.textActive : palette.textIdle, 'important');
        tabEl.style.setProperty('font-weight', '500', 'important');
        tabEl.style.setProperty(
          'text-shadow',
          isActive ? '0 0 0.65px currentColor, 0 0 0.65px currentColor' : 'none',
          'important'
        );

        tabEl.querySelectorAll('*').forEach(child => {
          if (child.children.length === 0 || child.textContent?.trim() === child.textContent) {
            child.style.setProperty('color', 'inherit', 'important');
            child.style.setProperty('font-weight', 'inherit', 'important');
            child.style.setProperty('text-shadow', 'inherit', 'important');
          }
        });
      }
    }
  }

  resolveUploadTarget(sessionName) {
    if (!sessionName) return null;

    // Look up the session against GSD's workspace list. Sessions opened via
    // the GSD picker are named after `ws.displayName || ws.coderName`, so we
    // can match on either. Coder workspaces use their derived coder SSH host;
    // VM-type workspaces use PEM-authenticated SSH to the raw host.
    const gsdVendor = this.plugin.modules?.gsd;
    const gsdSettings = gsdVendor?.settings || this.app.plugins.getPlugin('gsd-control')?.settings;

    if (!gsdSettings) return null;
    const workspaces = this.plugin._getGsdWorkspaces(gsdSettings);
    if (!workspaces.length) return null;

    // 1. Exact match on workspace displayName or coderName
    let matchedWs = workspaces.find(ws => {
      const name = ws.displayName || ws.coderName;
      return sessionName === name || sessionName === ws.coderName;
    });

    // 2. Match on any PROJECT's displayName or path within a workspace.
    //    This is the common case now — tab names are project labels.
    if (!matchedWs) {
      for (const ws of workspaces) {
        const hit = (ws.projects || []).some(p =>
          p && (p.displayName === sessionName || p.path === sessionName)
        );
        if (hit) { matchedWs = ws; break; }
      }
    }

    // 3. Legacy: session names like "gsd-term-<slug>-<ts>"
    if (!matchedWs && (sessionName.startsWith('GSD:') || sessionName.startsWith('gsd-term-'))) {
      for (const ws of workspaces) {
        for (const proj of (ws.projects || [])) {
          const slug = (proj.path || '').replace(/[^a-zA-Z0-9_.\/-]/g, '_');
          if (slug && (sessionName.includes(slug) || sessionName.includes(proj.path))) {
            matchedWs = ws;
            break;
          }
        }
        if (matchedWs) break;
      }
    }

    // 4. Legacy prefixed tab format: "WorkspaceLabel: projectLabel"
    if (!matchedWs && sessionName.includes(': ')) {
      const [wsPart, projPart] = sessionName.split(': ', 2);
      matchedWs = workspaces.find(ws => {
        const name = ws.displayName || ws.coderName;
        return name === wsPart || ws.coderName === wsPart;
      });
      if (!matchedWs && projPart) {
        for (const ws of workspaces) {
          const hit = (ws.projects || []).some(p =>
            p && (p.displayName === projPart || p.path === projPart)
          );
          if (hit) { matchedWs = ws; break; }
        }
      }
    }

    if (!matchedWs) return null;
    return this._uploadTargetFromWorkspace(matchedWs, gsdSettings);
  }

  /** Build an upload target descriptor from a workspace config. */
  _uploadTargetFromWorkspace(ws, gsdSettings) {
    if (!ws) return null;
    if (ws.type === 'local') {
      // Local pastes have no remote to upload to. Drops fall through to
      // the vendored handler (types the local Mac path). Pastes are
      // handled separately in handlePaste via _isLocalSession().
      return null;
    }
    if (ws.type === 'vm' || ws.type === 'ssh') {
      if (!ws.sshHost) return null;
      return {
        scpHost: ws.sshHost,
        sshArgsArr: ws.pemPath ? ['-i', ws.pemPath] : [],
        pemPath: ws.pemPath || null,
        remoteDir: VM_IMG_DIR,
        label: ws.displayName || ws.coderName
      };
    }
    // Coder workspace
    const coderUser = this.plugin._getGsdCoderUser(gsdSettings);
    if (!coderUser) return null;
    return {
      scpHost: `main.${ws.coderName}.${coderUser}.coder`,
      sshArgsArr: [],
      pemPath: null,
      remoteDir: CODER_UPLOAD_DIR,
      label: `Coder (${ws.coderName})`
    };
  }

  /**
   * Resolve an upload target for an active session object. Prefers the
   * __cwWorkspace marker we stamp onto sessions opened via the picker,
   * so a renamed tab still maps back to its workspace. Falls back to
   * name-based lookup for sessions opened manually.
   */
  resolveUploadTargetForSession(session) {
    if (!session) return null;
    if (session.__cwWorkspace === "__cw_local_tmux__") return null;
    const gsdVendor = this.plugin.modules?.gsd;
    const gsdSettings = gsdVendor?.settings || this.app.plugins.getPlugin('gsd-control')?.settings;

    // Fast path: marker set by the orchestrator when we open the session.
    const workspaces = this.plugin._getGsdWorkspaces(gsdSettings);
    if (session.__cwWorkspace && workspaces.length) {
      const ws = workspaces.find(w => w.coderName === session.__cwWorkspace);
      if (ws) {
        const target = this._uploadTargetFromWorkspace(ws, gsdSettings);
        if (target) return target;
      }
    }
    // Fallback: match by session name.
    const namedTarget = this.resolveUploadTarget(session.name);
    if (namedTarget) return namedTarget;

    // Final fallback for manually-opened terminal tabs. Can's normal
    // Workbench use is remote-first; if a tab is not explicitly marked
    // local and does not match a configured project, send paste uploads
    // to the main remote workspace instead of leaking a Mac /var/folders
    // screenshot path into the terminal.
    if (workspaces.length) {
      const defaultWs = workspaces.find(w => w && w.coderName === 'main' && w.type !== 'local')
        || workspaces.find(w => w && w.type !== 'local');
      const target = this._uploadTargetFromWorkspace(defaultWs, gsdSettings);
      if (target) return target;
    }

    return null;
  }

  /** True if the session is explicitly mapped to a local workspace. */
  _isLocalSession(session) {
    if (!session) return false;
    if (session.__cwWorkspace === "__cw_local_tmux__") return true;
    const gsdVendor = this.plugin.modules?.gsd;
    const gsdSettings = gsdVendor?.settings || this.app.plugins.getPlugin('gsd-control')?.settings;
    const workspaces = this.plugin._getGsdWorkspaces(gsdSettings);
    if (session.__cwWorkspace) {
      const ws = workspaces.find(w => w.coderName === session.__cwWorkspace);
      if (ws && ws.type === 'local') return true;
    }
    const name = session.name || '';
    const ws = workspaces.find(w => {
      const dn = w.displayName || w.coderName;
      return dn && (name === dn || name.startsWith(dn + ': ') || name.startsWith(dn + ' '));
    });
    return !!(ws && ws.type === 'local');
  }

  async handlePaste(e) {
    const termEl = e.target.closest('.vin-terminal-container');
    if (!termEl) return;

    // Find the session whose pane the user actually pasted into — not
    // just leaves[0]. Same fix as handleDrop.
    const pasteSession = this._sessionForElement(termEl);
    if (!pasteSession) return;

    // Resolve target. If the session maps to a local workspace, or maps
    // to nothing at all, save the image to a Mac tmp path and paste that
    // local path into the session. Only sessions mapped to a remote
    // workspace (VM/SSH/Coder) use the SSH upload path.
    const target = this.resolveUploadTargetForSession(pasteSession);
    const isLocal = !target || this._isLocalSession(pasteSession);

    const items = e.clipboardData?.items;
    if (!items) return;

    let imageItem = null;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        imageItem = item;
        break;
      }
    }

    if (!imageItem) return;

    e.preventDefault();
    e.stopPropagation();

    const blob = imageItem.getAsFile();
    if (!blob) return;

    if (isLocal) {
      try {
        const tmpDir = path.join(os.tmpdir(), 'cw-screenshots');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const localFile = path.join(tmpDir, `screenshot-${Date.now()}.png`);
        const buffer = await this._blobToBuffer(blob);
        fs.writeFileSync(localFile, buffer);
        if (pasteSession.process && pasteSession.process.stdin) {
          pasteSession.process.stdin.write(localFile);
          new Notice(`Saved locally: ${localFile}`);
        } else {
          new Notice(`Saved locally: ${localFile} (paste path manually)`);
        }
      } catch (err) {
        const msg = (err && err.message) || String(err);
        console.error('[vm-connect] local paste save failed:', err);
        new Notice(`Local save failed: ${msg}`);
      }
      return;
    }

    const tStart = Date.now();
    let phase = 'init';
    try {
      new Notice(`Uploading screenshot to ${target.label}...`);

      // Read the clipboard blob into a Buffer.
      phase = 'read-blob';
      const tReadStart = Date.now();
      const buffer = await this._blobToBuffer(blob);
      const tRead = Date.now() - tReadStart;

      // Ensure the SSH mux is warm. First paste to a target pays the
      // full handshake cost (~3–5s for Coder); subsequent pastes reuse
      // the background master and are near-instant.
      phase = 'mux-warm';
      const tMuxStart = Date.now();
      await this._ensureSshMux(target);
      const tMux = Date.now() - tMuxStart;

      // Pipe the buffer straight into `ssh host "mkdir && cat > file"`
      // over the pre-warmed mux. One round trip, no scp.
      phase = 'ssh-upload';
      const filename = `screenshot-${Date.now()}.png`;
      const remoteFile = `${target.remoteDir}/${filename}`;
      const tUploadStart = Date.now();
      await this._pipeUploadViaSsh(target, remoteFile, buffer);
      const tUpload = Date.now() - tUploadStart;

      const total = Date.now() - tStart;
      console.log(`[vm-connect] paste upload: ${total}ms total (read ${tRead}ms, mux ${tMux}ms, transfer ${tUpload}ms, ${(buffer.length / 1024).toFixed(0)} KB)`);

      phase = 'paste-path';
      if (pasteSession && pasteSession.process && pasteSession.process.stdin) {
        pasteSession.process.stdin.write(remoteFile);
        new Notice(`Uploaded (${total}ms, ${(buffer.length / 1024).toFixed(0)} KB)`);
        return;
      }
      console.warn('[vm-connect] paste: session.process.stdin missing, cannot paste path');
      new Notice(`Screenshot uploaded: ${remoteFile}`);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      console.error(`[vm-connect] paste upload failed at phase "${phase}":`, err, err && err.stack);
      new Notice(`Upload failed (${phase}): ${msg}`);
    }
  }

  /**
   * Find the terminal session whose DOM subtree contains `termEl`. Walks
   * every terminal leaf (not just leaves[0]) so drops on secondary panes
   * resolve correctly.
   */
  _sessionForElement(termEl) {
    if (!termEl) return null;
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      const view = leaf.view;
      if (!view || !view.containerEl) continue;
      if (view.containerEl.contains(termEl)) {
        return view.activeSession || null;
      }
    }
    return null;
  }

  _activeVmTarget() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length === 0) return null;
    const session = leaves[0].view.activeSession;
    if (!session) return null;
    return this.resolveUploadTargetForSession(session);
  }

  handleDragOver(e) {
    const termEl = e.target.closest && e.target.closest('.vin-terminal-container');
    if (!termEl) return;
    const types = e.dataTransfer && e.dataTransfer.types;
    if (!types || !Array.from(types).includes('Files')) return;
    // Only claim the drag if the session under the cursor has a remote
    // target. Local-type sessions defer to the vendored internetvin
    // handler (typing the local Mac path is correct there).
    const dragSession = this._sessionForElement(termEl);
    if (!dragSession || !this.resolveUploadTargetForSession(dragSession)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
  }

  async handleDrop(e) {
    const termEl = e.target.closest && e.target.closest('.vin-terminal-container');
    if (!termEl) return;
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Resolve the session from the drop element — not leaves[0] — so the
    // path is pasted into the pane the user actually dropped onto.
    const dropSession = this._sessionForElement(termEl);
    const target = dropSession ? this.resolveUploadTargetForSession(dropSession) : null;
    if (!target || !dropSession) return;

    // Beat the vendored internetvin-terminal drop handler (which types
    // the local Mac path, useless on the remote VM). Both are capture-
    // phase, but document is above containerEl so we fire first.
    e.preventDefault();
    e.stopImmediatePropagation();

    const fileList = Array.from(files);
    const label = fileList.length === 1
      ? (fileList[0].name || 'file')
      : `${fileList.length} files`;
    new Notice(`Uploading ${label} to ${target.label}...`);

    const tStart = Date.now();
    let phase = 'init';
    try {
      phase = 'mux-warm';
      await this._ensureSshMux(target);

      const remotePaths = [];
      let totalBytes = 0;
      for (const file of fileList) {
        phase = 'read-file';
        let buffer;
        if (file.path && fs.existsSync(file.path)) {
          buffer = fs.readFileSync(file.path);
        } else {
          buffer = await this._blobToBuffer(file);
        }
        totalBytes += buffer.length;

        const safeName = (file.name || `file-${Date.now()}`)
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `${Date.now()}-${safeName}`;
        const remoteFile = `${target.remoteDir}/${filename}`;

        phase = 'ssh-upload';
        await this._pipeUploadViaSsh(target, remoteFile, buffer);
        remotePaths.push(remoteFile);
      }

      const total = Date.now() - tStart;
      const kb = (totalBytes / 1024).toFixed(0);
      console.log(`[vm-connect] drop upload: ${total}ms, ${fileList.length} file(s), ${kb} KB`);

      phase = 'paste-path';
      if (dropSession && dropSession.process && dropSession.process.stdin) {
        dropSession.process.stdin.write(remotePaths.join(' '));
        new Notice(`Uploaded ${fileList.length} file${fileList.length > 1 ? 's' : ''} (${total}ms, ${kb} KB)`);
        return;
      }
      console.warn('[vm-connect] drop: session.process.stdin missing, cannot paste path', {
        hasSession: !!dropSession,
        hasProcess: !!(dropSession && dropSession.process),
        hasStdin: !!(dropSession && dropSession.process && dropSession.process.stdin),
      });
      new Notice(`Uploaded: ${remotePaths.join(', ')}`);
    } catch (err) {
      const msg = (err && err.message) || String(err);
      console.error(`[vm-connect] drop upload failed at phase "${phase}":`, err, err && err.stack);
      new Notice(`Upload failed (${phase}): ${msg}`);
    }
  }

  /**
   * Pre-warm an SSH master connection for the target. Runs
   * `ssh -M -N -f host` which forks a background master process that
   * handles all subsequent mux clients. Cached per target so we only
   * do the slow initial handshake once per plugin session.
   *
   * -M = master mode, -N = no remote command, -f = fork to background
   * after auth. Non-fatal on failure — the upload will try anyway.
   */
  async _ensureSshMux(target) {
    const muxKey = `${target.scpHost}|${target.pemPath || ''}`;
    if (!this._warmMuxes) this._warmMuxes = new Set();
    if (this._warmMuxes.has(muxKey)) return;

    const args = [
      ...target.sshArgsArr,
      ...SSH_MUX_ARGS,
      '-M', '-N', '-f',
      target.scpHost,
    ];

    await new Promise((resolve) => {
      execFile('ssh', args, { timeout: 30000 }, (err, _stdout, stderr) => {
        if (err) {
          const msg = (stderr && stderr.toString().trim()) || err.message;
          // "already exists" is fine — the master is live from a previous
          // call. Anything else is a warning; we'll still try the upload.
          if (!/already exists/i.test(msg)) {
            console.warn('[vm-connect] mux warm note:', msg);
          }
        }
        this._warmMuxes.add(muxKey);
        resolve();
      });
    });
  }

  /**
   * Convert a Blob/File into a Node Buffer. Tries arrayBuffer() first,
   * falls back to FileReader if the direct path errors.
   */
  async _blobToBuffer(blob) {
    try {
      const ab = await blob.arrayBuffer();
      return Buffer.from(ab);
    } catch (err) {
      console.warn('[vm-connect] blob.arrayBuffer() failed, trying FileReader:', err);
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try { resolve(Buffer.from(reader.result)); }
          catch (e) { reject(e); }
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
        reader.readAsArrayBuffer(blob);
      });
    }
  }

  /**
   * Pipe a buffer to a remote file in one SSH round trip. Uses
   * `mkdir -p && cat > file` on the remote end with the buffer fed
   * into ssh's stdin. Honors the global ControlMaster mux so subsequent
   * pastes skip the full handshake.
   */
  _pipeUploadViaSsh(target, remoteFile, buffer) {
    const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    const remoteCmd = `mkdir -p ${shq(target.remoteDir)} && cat > ${shq(remoteFile)}`;
    const args = [
      ...target.sshArgsArr,
      ...SSH_MUX_ARGS,
      '-T',
      target.scpHost,
      remoteCmd,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn('ssh', args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ssh exited ${code}${stderr ? ': ' + stderr.trim() : ''}`));
      });
      // Write the whole buffer in one shot — Node will handle back-pressure.
      proc.stdin.write(buffer, (err) => {
        if (err) { reject(err); return; }
        proc.stdin.end();
      });
    });
  }

  renderSeparators() {
    const count = Math.max(1, this.settings.separatorCount || 1);
    for (let i = 0; i < count; i++) {
      const idx = i;
      const el = this.plugin.addRibbonIcon('minus', `Separator ${i + 1} — right-click for options`, (evt) => {
        evt.preventDefault();
      });
      el.addClass('vm-connect-separator');
      el.setAttribute('data-sep-index', String(idx));

      el.addEventListener('contextmenu', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        const menu = new Menu();
        menu.addItem((item) => {
          item.setTitle('Add another separator')
            .setIcon('plus')
            .onClick(async () => {
              this.settings.separatorCount = (this.settings.separatorCount || 1) + 1;
              await this.saveSettings();
              new Notice('Separator added — reload Obsidian to see it (Ctrl+R)');
            });
        });
        menu.addItem((item) => {
          item.setTitle('Remove this separator')
            .setIcon('trash')
            .onClick(async () => {
              this.settings.separatorCount = Math.max(0, (this.settings.separatorCount || 1) - 1);
              await this.saveSettings();
              new Notice('Separator removed — reload Obsidian to see it (Ctrl+R)');
            });
        });
        menu.showAtMouseEvent(evt);
      });

      this.separatorElements.push(el);
    }
  }

  injectStyles() {
    const styleId = 'vm-connect-separator-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .side-dock-ribbon-action.vm-connect-separator {
        opacity: 0.3;
        pointer-events: auto;
        cursor: default !important;
        margin: 4px 0;
      }
      .side-dock-ribbon-action.vm-connect-separator:hover {
        opacity: 0.6;
        background: transparent !important;
      }
      .side-dock-ribbon-action.vm-connect-separator svg {
        width: 18px !important;
        height: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }

  async sendScreenshot() {
    // Find the active terminal session and resolve its upload target from
    // GSD workspaces. If no terminal is focused, fall back to the first
    // VM-type workspace in GSD settings. If none is configured, bail out.
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    let target = null;
    if (leaves.length > 0) {
      const active = leaves[0].view.activeSession;
      if (active) target = this.resolveUploadTarget(active.name);
    }
    if (!target) {
      const gsdVendor = this.plugin.modules?.gsd;
      const ws = this.plugin._getGsdWorkspaces(gsdVendor?.settings)
        .find(w => w.type === 'vm' || w.type === 'ssh');
      if (ws && ws.sshHost) {
        target = {
          scpHost: ws.sshHost,
          sshArgsArr: ws.pemPath ? ['-i', ws.pemPath] : [],
          pemPath: ws.pemPath || null,
          remoteDir: VM_IMG_DIR,
          label: ws.displayName || ws.coderName
        };
      }
    }
    if (!target) {
      new Notice('Send screenshot: no VM workspace configured in Settings → Can Workbench');
      return;
    }

    const tmpFile = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);

    try {
      await this.execPromise(`pngpaste "${tmpFile}"`);
    } catch (e) {
      try {
        await this.execPromise(`screencapture -i "${tmpFile}"`);
      } catch (e2) {
        new Notice('No image in clipboard. Copy a screenshot first (Cmd+Shift+Ctrl+4)');
        return;
      }
    }

    if (!fs.existsSync(tmpFile)) {
      new Notice('No screenshot captured');
      return;
    }

    new Notice(`Uploading screenshot to ${target.label}...`);
    const remoteFile = `${target.remoteDir}/${path.basename(tmpFile)}`;

    try {
      // Read tmp file into a buffer, pre-warm the SSH mux, then pipe.
      const buffer = fs.readFileSync(tmpFile);
      await this._ensureSshMux(target);
      await this._pipeUploadViaSsh(target, remoteFile, buffer);
      fs.unlinkSync(tmpFile);

      const leaves2 = this.app.workspace.getLeavesOfType(VIEW_TYPE);
      if (leaves2.length > 0) {
        const session = leaves2[0].view.activeSession;
        if (session && session.process && session.process.stdin) {
          session.process.stdin.write(remoteFile);
          new Notice('Screenshot sent — path pasted in terminal');
          return;
        }
      }

      new Notice(`Screenshot uploaded: ${remoteFile}`);
    } catch (e) {
      new Notice('Failed to upload: ' + e.message);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  }

  execPromise(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }

  /**
   * execFile-based command runner. Array args — no shell quoting, no
   * injection risk, and plays nice with binaries that get confused by
   * double-escaped paths (scp in particular).
   */
  execFileP(cmd, args, timeoutMs) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: timeoutMs || 30000 }, (err, stdout, stderr) => {
        if (err) {
          const msg = (stderr && stderr.toString().trim()) || err.message;
          reject(new Error(msg));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async unload() {
    if (this.pasteHandler) {
      document.removeEventListener('paste', this.pasteHandler, true);
    }
    if (this.dragOverHandler) {
      document.removeEventListener('dragover', this.dragOverHandler, true);
    }
    if (this.dropHandler) {
      document.removeEventListener('drop', this.dropHandler, true);
    }
    if (this.tintInterval) {
      clearInterval(this.tintInterval);
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Tear down any SSH mux masters we started via _ensureSshMux. We
    // don't know the exact ControlPath for each, but we can `-O exit`
    // with the same options we used to create them. Best-effort —
    // ignore any errors (masters may have already expired).
    if (this._warmMuxes) {
      for (const muxKey of this._warmMuxes) {
        const [host, pemPath] = muxKey.split('|');
        const args = [];
        if (pemPath) args.push('-i', pemPath);
        args.push(
          '-o', 'ControlMaster=auto',
          '-o', 'ControlPath=/tmp/cw-paste-mux-%r@%h:%p',
          '-O', 'exit',
          host
        );
        try { execFile('ssh', args, () => {}); } catch (_) {}
      }
      this._warmMuxes.clear();
    }
    const style = document.getElementById('vm-connect-separator-style');
    if (style) style.remove();
    const tintStyle = document.getElementById('vm-connect-tint-styles');
    if (tintStyle) tintStyle.remove();
    // Clear applied tints
    document.querySelectorAll('[data-vm-tint]').forEach(el => {
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('outline');
      el.style.removeProperty('outline-offset');
      el.style.removeProperty('border-radius');
      el.style.removeProperty('background-color');
      el.style.removeProperty('border');
      el.removeAttribute('data-vm-tint');
    });
    document.querySelectorAll('[data-vm-tint-bg]').forEach(el => {
      el.style.removeProperty('background-color');
      el.removeAttribute('data-vm-tint-bg');
    });
  }
}

module.exports = VMConnectModule;
