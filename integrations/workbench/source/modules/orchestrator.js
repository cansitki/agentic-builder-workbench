// All 6 modules load together; the secure listener is separately enabled. Settings live
// under named keys and are initialized lazily by each module.
const DEFAULT_SETTINGS = {
  vmConnect: {},
  countdown: {},
  secureInput: {}
};

// __TerminalPluginClass and __GSDPluginClass are declared in the HEADER,
// assigned by their vendor IIFEs above this orchestrator section.

class Workbench extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() || {});
    await this._ensureDefaults();
    this.modules = {};
    this.loadOrder = [];

    // Modules load together; connections and the secure listener need explicit setup.
    await this._loadModule('vmConnect', new VMConnectModule(this));
    await this._loadModule('countdown', new CountdownModule(this));
    await this._loadModule('excalidrawLiveText', new ExcalidrawLiveTextModule(this));

    if (!__TerminalPluginClass) {
      console.error('[workbench] __TerminalPluginClass is null — IIFE did not assign it');
      new Notice('Workbench: Terminal vendor not captured — see console');
    } else {
      await this._loadVendor('terminal', __TerminalPluginClass, 'internetvin-terminal', 'Terminal');
    }
    if (!__GSDPluginClass) {
      console.error('[workbench] __GSDPluginClass is null — IIFE did not assign it');
      new Notice('Workbench: workspace module not captured — see console');
    } else {
      await this._loadVendor('gsd', __GSDPluginClass, 'gsd-control', 'Workspace');
    }

    // Load after Workspace so the secure broker can reuse the normalized
    // Coder/SSH connection settings and open one listener for the selected workspace.
    await this._loadModule('secureInput', new SecureInputModule(this));

    this.addSettingTab(new WorkbenchSettingTab(this.app, this));

    // Augment the GSD file explorer with file operations (context menu +
    // toolbar buttons). Hooks run against existing leaves plus any new ones.
    this._augmentExplorer();

    // Watch for user renames on terminal session tabs and persist them
    // back to the originating project's displayName. 2s cadence — cheap,
    // and the user doesn't need faster feedback.
    this.registerInterval(window.setInterval(() => this._syncSessionRenames(), 2000));

    console.log('[workbench] loaded', this.loadOrder);
  }

  async _ensureDefaults() {
    let dirty = false;
    const gsd = this.settings.gsd = this.settings.gsd || {};
    if (typeof gsd.coderUser !== 'string') {
      gsd.coderUser = '';
      dirty = true;
    }
    if (!Array.isArray(gsd.workspaces)) {
      gsd.workspaces = [];
      dirty = true;
    }
    if (!Array.isArray(gsd.terminalCategories)) {
      gsd.terminalCategories = [];
      dirty = true;
    }
    if (typeof gsd.terminalDefaultCategory !== 'string') {
      gsd.terminalDefaultCategory = '';
      dirty = true;
    }
    if (!gsd.terminalSessionCategories || typeof gsd.terminalSessionCategories !== 'object' || Array.isArray(gsd.terminalSessionCategories)) {
      gsd.terminalSessionCategories = {};
      dirty = true;
    }
    if (!gsd.terminalSessionCategorySources || typeof gsd.terminalSessionCategorySources !== 'object' || Array.isArray(gsd.terminalSessionCategorySources)) {
      gsd.terminalSessionCategorySources = {};
      dirty = true;
    }
    if (dirty) {
      await this.saveData(this.settings);
    }
  }

  _normalizeTerminalCategoryName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  }

  _getTerminalCategories(settings) {
    settings.terminalCategories = Array.isArray(settings.terminalCategories) ? settings.terminalCategories : [];
    const seen = new Set();
    settings.terminalCategories = settings.terminalCategories
      .map(name => this._normalizeTerminalCategoryName(name))
      .filter(name => {
        if (!name || ['all', 'uncategorized', 'unsorted'].includes(name.toLowerCase())) return false;
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return settings.terminalCategories;
  }

  _ensureTerminalCategory(settings, category) {
    const name = this._normalizeTerminalCategoryName(category);
    if (!name || ['all', 'uncategorized', 'unsorted'].includes(name.toLowerCase())) return '';
    const categories = this._getTerminalCategories(settings);
    const existing = categories.find(item => item.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    categories.push(name);
    return name;
  }

  _getTerminalSessionCategoryMap(settings) {
    if (!settings.terminalSessionCategories || typeof settings.terminalSessionCategories !== 'object' || Array.isArray(settings.terminalSessionCategories)) {
      settings.terminalSessionCategories = {};
    }
    return settings.terminalSessionCategories;
  }

  _getTerminalSessionCategorySourceMap(settings) {
    if (!settings.terminalSessionCategorySources || typeof settings.terminalSessionCategorySources !== 'object' || Array.isArray(settings.terminalSessionCategorySources)) {
      settings.terminalSessionCategorySources = {};
    }
    return settings.terminalSessionCategorySources;
  }

  _getTerminalSessionCategoryKey(workspaceName, sessionName) {
    const name = String(sessionName || '').trim();
    if (!name) return '';
    return `${String(workspaceName || '*').trim() || '*'}::${name}`;
  }

  _getKnownTerminalLocationSlugs(settings) {
    const seen = new Set();
    const result = [];
    const add = (value) => {
      const slug = this._slugTmuxNamePart(value, '');
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      result.push(slug);
    };
    for (const ws of this._getGsdWorkspaces(settings)) {
      add(ws && ws.displayName);
      add(ws && ws.coderName);
      for (const project of (ws && ws.projects) || []) {
        add(project && project.displayName);
        add(project && project.path);
      }
    }
    return result.sort((a, b) => b.length - a.length);
  }

  _getAutoTerminalCategory(settings, sessionName) {
    const slug = this._slugTmuxNamePart(String(sessionName || '').replace(/^gsd-term-/, ''), '');
    if (!slug) return '';
    for (const candidate of this._getKnownTerminalLocationSlugs(settings)) {
      if (slug === candidate || slug.startsWith(`${candidate}-`)) {
        return this._ensureTerminalCategory(settings, candidate);
      }
    }
    return this._ensureTerminalCategory(settings, slug.split('-').filter(Boolean)[0] || slug);
  }

  _getStoredTerminalSessionCategory(settings, workspaceName, sessionName, manualOnly = false) {
    const categories = this._getTerminalCategories(settings);
    const map = this._getTerminalSessionCategoryMap(settings);
    const sourceMap = this._getTerminalSessionCategorySourceMap(settings);
    const keys = [
      this._getTerminalSessionCategoryKey(workspaceName, sessionName),
      this._getTerminalSessionCategoryKey('*', sessionName)
    ].filter(Boolean);
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      const source = sourceMap[key] || 'manual';
      if (manualOnly && source !== 'manual') continue;
      const stored = this._normalizeTerminalCategoryName(map[key]);
      return categories.includes(stored) ? stored : '';
    }
    return null;
  }

  _resolveTerminalOpenCategory(settings, workspaceName, sessionName, requestedCategory = '') {
    const categories = this._getTerminalCategories(settings);
    const requested = this._normalizeTerminalCategoryName(requestedCategory);
    if (requested && categories.includes(requested)) return requested;
    const manual = this._getStoredTerminalSessionCategory(settings, workspaceName, sessionName, true);
    if (manual !== null) return manual;
    const auto = this._getAutoTerminalCategory(settings, sessionName);
    if (auto) return auto;
    const stored = this._getStoredTerminalSessionCategory(settings, workspaceName, sessionName, false);
    if (stored !== null) return stored;
    return '';
  }

  _rememberTerminalSessionCategory(settings, workspaceName, sessionName, category, saveFn = null, source = 'auto') {
    const map = this._getTerminalSessionCategoryMap(settings);
    const sourceMap = this._getTerminalSessionCategorySourceMap(settings);
    const key = this._getTerminalSessionCategoryKey(workspaceName, sessionName);
    if (!key) return false;
    const storedSource = sourceMap[key] || (Object.prototype.hasOwnProperty.call(map, key) ? 'manual' : 'auto');
    if (source !== 'manual' && storedSource === 'manual') return false;
    const nextCategory = this._resolveTerminalOpenCategory(settings, workspaceName, sessionName, category);
    if (!nextCategory && !Object.prototype.hasOwnProperty.call(map, key)) return false;
    if (map[key] === nextCategory && sourceMap[key] === (source === 'manual' ? 'manual' : 'auto')) return false;
    map[key] = nextCategory;
    sourceMap[key] = source === 'manual' ? 'manual' : 'auto';
    if (saveFn) saveFn();
    return true;
  }

  _moveRememberedTerminalSessionCategory(settings, workspaceName, oldSessionName, nextSessionName) {
    const map = this._getTerminalSessionCategoryMap(settings);
    const oldKey = this._getTerminalSessionCategoryKey(workspaceName, oldSessionName);
    const nextKey = this._getTerminalSessionCategoryKey(workspaceName, nextSessionName);
    if (!oldKey || !nextKey || oldKey === nextKey || !Object.prototype.hasOwnProperty.call(map, oldKey)) return false;
    const sourceMap = this._getTerminalSessionCategorySourceMap(settings);
    map[nextKey] = map[oldKey];
    delete map[oldKey];
    if (Object.prototype.hasOwnProperty.call(sourceMap, oldKey)) {
      sourceMap[nextKey] = sourceMap[oldKey];
      delete sourceMap[oldKey];
    }
    return true;
  }

  async _loadModule(key, instance) {
    try {
      await instance.load();
      this.modules[key] = instance;
      this.loadOrder.push(key);
    } catch (e) {
      console.error(`[workbench] failed to load module ${key}:`, e);
      new Notice(`Workbench: ${key} failed — see console`);
    }
  }

  async _loadVendor(key, VendorClass, vendorId, displayName) {
    try {
      // Synthetic manifest: preserve our dir so pty-helper.py writes to the
      // plugin root, but use the vendor's id so its commands/settings namespace
      // is distinct.
      const vendorManifest = Object.assign({}, this.manifest, {
        id: vendorId,
        name: displayName
      });

      const instance = new VendorClass(this.app, vendorManifest);

      // Intercept loadData/saveData so vendor settings live under a nested
      // key in workbench's data.json — avoids clobbering the main plugin's
      // data and keeps everything in one file.
      const parent = this;
      instance.loadData = async function () {
        return Object.assign({}, parent.settings[key] || {});
      };
      instance.saveData = async function (data) {
        parent.settings[key] = data;
        await parent.saveData(parent.settings);
      };

      // Suppress the vendor plugin's own settings tab. Everything is
      // managed from the single "Workbench" tab. Without this, GSD
      // would register a "Workbench" tab (with the wrong workspace
      // fields for VM entries) and the user would have two places to
      // edit the same data.
      instance.addSettingTab = function () { /* suppressed */ };

      // Go through Component.load() — it sets the internal _loaded flag
      // required so that Component.unload() will later iterate the cleanup
      // callbacks (which include the auto-unregisterView). If we called
      // onload() directly, _loaded would stay false and unload would become
      // a no-op, leaking view type registrations across reloads.
      //
      // Note: Component.load() invokes onload() but doesn't await it. For
      // vendor plugins with async onload, the promise runs in the background.
      // That matches how Obsidian's own plugin manager loads them.
      await instance.load();

      // --- GSD extension: VM-type workspaces ---
      // Wrap openSpecificSession so workspaces with `type: "vm"` in settings
      // open an internetvin-terminal session with PEM-authenticated SSH
      // instead of Coder config. Coder workspaces delegate to the original.
      if (key === 'gsd' && typeof instance.openSpecificSession === 'function') {
        const originalOpen = instance.openSpecificSession.bind(instance);
        const workbench = this;
        instance.openSpecificSession = async function (wsName, sessionName, projectPath, createNew, category = '') {
          const wsList = workbench._getGsdWorkspaces(instance.settings);
          const ws = wsList.find(w => w.coderName === wsName);
          if (ws) {
            // "vm" is a legacy alias for "ssh" — both hit the raw-SSH path.
            if (ws.type === 'vm' || ws.type === 'ssh') {
              return await workbench._openSshSession(ws, projectPath, sessionName, createNew, category);
            }
            if (ws.type === 'local') {
              return await workbench._openLocalSession(ws, projectPath, category, sessionName, createNew);
            }
            if (workbench._isCurrentCoderWorkspace(ws, instance.settings)) {
              return await workbench._openLocalSession(
                Object.assign({}, ws, { type: 'local', useTmux: true }),
                projectPath,
                category,
                sessionName,
                createNew
              );
            }
          }
          // Coder / untyped → delegate to GSD, replacing the generated
          // picker name with a short numbered tmux name for new sessions.
          let effectiveSessionName = sessionName;
          let effectiveCreateNew = createNew;
          if (ws && createNew) {
            const proj = (ws.projects || []).find(p => p && p.path === projectPath);
            const label = (proj && (proj.displayName || proj.path)) || (ws.displayName || ws.coderName);
            const shortName = workbench._locationPrefixedTmuxName(label, sessionName);

            if (shortName) {
              // Explicit "new session" should never attach an old session.
              // Pick the first free name: name, name-1, name-2, ...
              let existing = [];
              try {
                existing = await workbench._listRemoteTmuxSessions(ws);
              } catch (err) {
                console.warn('[workbench] tmux ls failed, defaulting to short name:', err.message);
              }
              effectiveSessionName = workbench._nextTmuxSessionName(shortName, existing);
              effectiveCreateNew = true;
            }
          }

          const beforeSessions = new Set();
          for (const leaf of workbench.app.workspace.getLeavesOfType('vin-terminal-view')) {
            const view = leaf.view;
            for (const sess of view?.sessions || []) beforeSessions.add(sess);
          }
          const proj = ws && (ws.projects || []).find(p => p && p.path === projectPath);
          const fallbackLabel = (proj && (proj.displayName || proj.path)) || (ws && (ws.displayName || ws.coderName)) || wsName;
          const tabLabel = effectiveSessionName || fallbackLabel;
          const targetCategory = workbench._resolveTerminalOpenCategory(instance.settings, wsName, effectiveSessionName, category);

          const result = await originalOpen(wsName, effectiveSessionName, projectPath, effectiveCreateNew, targetCategory);
          workbench._rememberTerminalSessionCategory(instance.settings, wsName, effectiveSessionName, targetCategory, () => instance.saveData(instance.settings));

          // Mark the newly-active session for rename tracking + remember
          // the remote tmux session name so rename sync can issue a
          // `tmux rename-session` on the remote when the tab is renamed.
          const markNewSession = () => {
            const leaves = workbench.app.workspace.getLeavesOfType('vin-terminal-view');
            for (const leaf of leaves) {
              const view = leaf.view;
              if (!view) continue;
              const sessions = view?.sessions || [];
              const newSessions = sessions.filter(sess => sess && !beforeSessions.has(sess));
              const sess =
                newSessions.find(s => s.name === effectiveSessionName) ||
                newSessions.find(s => s === view.activeSession) ||
                newSessions[newSessions.length - 1] ||
                (!view.activeSession?.__cwWorkspace ? view.activeSession : null);
              if (!sess) continue;
              sess.__cwWorkspace = wsName;
              sess.__cwProject = projectPath || '';
              sess.__cwTmuxName = effectiveSessionName;
              sess.category = targetCategory;
              if (tabLabel && sess.name !== tabLabel) {
                sess.name = tabLabel;
              }
              sess.__cwLastKnownName = sess.name;
              if (typeof view.switchTo === 'function') view.switchTo(sess);
              if (typeof view.renderTabs === 'function') view.renderTabs();
              if (typeof view.saveState === 'function') view.saveState();
              return true;
            }
            return false;
          };
          try {
            markNewSession();
            setTimeout(markNewSession, 150);
            setTimeout(markNewSession, 750);
          } catch (e) {
            console.warn('[workbench] failed to mark Coder session:', e);
          }
          return result;
        };
      }

      this.modules[key] = instance;
      this.loadOrder.push(key);
    } catch (e) {
      console.error(`[workbench] failed to load vendor ${key}:`, e);
      console.error(`[workbench] stack:`, e && e.stack);
      new Notice(`Workbench: ${displayName} failed — see console`);
    }
  }

  /**
   * Open an internetvin-terminal session pre-connected to an SSH-type
   * workspace (raw SSH → tmux attach, optional PEM key). Used by the GSD
   * openSpecificSession wrapper above so that SSH/VM workspaces appear
   * as regular entries in GSD's picker tree.
   *
   * The `projectPath` argument comes straight from GSD's picker click:
   * it's the `path` field of a project under the workspace, and we
   * use it as the tmux session name. Falls back to the first project,
   * then to "main".
   */
  async _openSshSession(ws, projectPath, sessionName = '', createNew = false, category = '') {
    const VIEW_TYPE = 'vin-terminal-view';

    // Resolve tmux session name. Clicking the workspace header gives an
    // empty projectPath — default to the first project's path, else "main".
    const explicitSession = (sessionName || '').trim();
    const resolvedPath = (projectPath
      || (!explicitSession && ws.projects && ws.projects[0] && ws.projects[0].path)
      || 'main').trim();
    const project = (ws.projects || []).find(p => p && (p.path === projectPath || p.path === resolvedPath || p.path === explicitSession))
                  || (!explicitSession ? (ws.projects || [])[0] : null)
                  || null;
    const generatedPickerName = createNew && explicitSession && explicitSession.startsWith('gsd-term-');
    const projectLabel = project
      ? (project.displayName || project.path)
      : (projectPath || resolvedPath || 'main');
    const projectLeaf = String(projectLabel).split('/').filter(Boolean).pop() || projectLabel || 'main';
    let tmuxSession = (explicitSession && !generatedPickerName)
      ? explicitSession
      : String(projectLeaf).replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^-+|-+$/g, '') || 'main';
    if (createNew) {
      tmuxSession = this._locationPrefixedTmuxName(projectLeaf, tmuxSession);
      tmuxSession = this._nextTmuxSessionName(tmuxSession, await this._listRemoteTmuxSessions(ws));
    }
    const gsdSettings = (this.modules && this.modules.gsd && this.modules.gsd.settings) || this.settings.gsd || {};
    const targetCategory = this._resolveTerminalOpenCategory(gsdSettings, ws.coderName, tmuxSession, category);
    this._rememberTerminalSessionCategory(gsdSettings, ws.coderName, tmuxSession, targetCategory, () => {
      const gsdInstance = this.modules && this.modules.gsd;
      if (gsdInstance && typeof gsdInstance.saveData === 'function') return gsdInstance.saveData(gsdSettings);
      return this.saveData(this.settings);
    });

    // Project rows are remote directories; plain names remain session-only.
    const projectTarget = project ? project.path : (projectPath || '');
    const looksLikeDirectory = projectTarget && (
      projectTarget.includes('/') ||
      projectTarget.startsWith('~') ||
      projectTarget.startsWith('.') ||
      projectTarget.startsWith('/')
    );
    const cdTarget = looksLikeDirectory
      ? (projectTarget.startsWith('/') || projectTarget.startsWith('~') ? projectTarget : `~/${projectTarget}`)
      : '~';

    if (!ws.sshHost) {
      new Notice(`${ws.displayName || ws.coderName}: SSH host not configured — edit in Settings → Workbench`);
      return;
    }

    // Open the tab immediately. SSH handshake + tmux attach happen inside
    // the PTY shell, so the user sees progress instead of waiting on a
    // blocked UI. `tmux new-session -A` attaches-or-creates in one shot,
    // which removes the pre-flight round-trip entirely. ControlMaster
    // reuses (or warms) a shared socket at the same path vm-connect uses
    // for paste/drop uploads, so the second open is near-instant.
    let leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length === 0) {
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
      leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    }
    if (leaves.length === 0) {
      new Notice('VM: internetvin-terminal not available');
      return;
    }

    const view = leaves[0].view;
    this.app.workspace.revealLeaf(leaves[0]);

    const tabName = tmuxSession;
    const targetSession = typeof view.createSession === 'function'
      ? (view.createSession(tabName, targetCategory) || view.activeSession || null)
      : (view.activeSession || null);

    const markSession = (sess = targetSession || view.activeSession) => {
      if (sess) {
        sess.name = tabName;
        sess.__cwWorkspace = ws.coderName;
        sess.__cwProject   = project ? project.path : (projectPath || tmuxSession);
        sess.__cwTmuxName  = tmuxSession;
        sess.category = targetCategory;
        sess.__cwLastKnownName = sess.name;
        if (typeof view.switchTo === 'function') view.switchTo(sess);
        if (typeof view.renderTabs === 'function') view.renderTabs();
      }
    };
    markSession();

    const pemArg = ws.pemPath ? `-i "${ws.pemPath}"` : '';
    const muxOpts = '-o ControlMaster=auto -o ControlPath=/tmp/cw-paste-mux-%r@%h:%p -o ControlPersist=1800 -o StrictHostKeyChecking=no -o ServerAliveInterval=60';
    const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    const shellPathArg = (p) => {
      if (!p || p === '~') return '$HOME';
      if (p.startsWith('~/')) return '$HOME' + shq(p.slice(1));
      if (p.startsWith('/')) return shq(p);
      return '$HOME/' + shq(p);
    };
    const sshAttach = `ssh -t ${muxOpts} ${pemArg} ${ws.sshHost} "tmux has-session -t ${shq(tmuxSession)} 2>/dev/null || tmux new-session -d -s ${shq(tmuxSession)} -c ${shellPathArg(cdTarget)}; tmux set-window-option -t ${shq(tmuxSession)} window-size latest 2>/dev/null; tmux set-option -t ${shq(tmuxSession)} -w mouse on 2>/dev/null; TERM=xterm-256color tmux attach-session -t ${shq(tmuxSession)}"`;

    // internetvin's createSession spawns the PTY async; give it a tick
    // before writing to stdin.
    setTimeout(() => {
      const session = targetSession || view.activeSession;
      if (session && session.process && session.process.stdin) {
        markSession(session);
        session.process.stdin.write(sshAttach + '\n');
      } else {
        new Notice('VM: could not send command to terminal');
      }
    }, 150);
  }

  _isCurrentCoderWorkspace(ws, gsdSettings = null) {
    if (!ws || (ws.type || 'coder') !== 'coder') return false;
    if (typeof process === 'undefined' || !process.env || process.env.CODER !== 'true') return false;
    const currentWorkspace = (process.env.CODER_WORKSPACE_NAME || '').trim();
    const currentOwner = (process.env.CODER_WORKSPACE_OWNER_NAME || '').trim();
    const configuredOwner = this._getGsdCoderUser(gsdSettings) || this._getGsdCoderUser(this.settings.gsd) || '';
    if (!currentWorkspace || ws.coderName !== currentWorkspace) return false;
    return !configuredOwner || !currentOwner || configuredOwner === currentOwner;
  }

  /**
   * Open a local shell in internetvin-terminal. No SSH, no tmux by default.
   * The `projectPath` arg is the working directory to cd into. Empty → home.
   *
   * We spawn a fresh internetvin-terminal session and send a `cd` command
   * after the PTY is ready. Tmux wrapping is opt-in per workspace.
   */
  async _openLocalSession(ws, projectPath, category = '', sessionName = '', createNew = false) {
    const VIEW_TYPE = 'vin-terminal-view';

    let leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length === 0) {
      const leaf = this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
      leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    }
    if (leaves.length === 0) {
      new Notice('Terminal not available');
      return;
    }

    const view = leaves[0].view;
    this.app.workspace.revealLeaf(leaves[0]);

    const project = (ws.projects || []).find(p => p && p.path === projectPath)
                  || (ws.projects || [])[0]
                  || null;
    const wsLabel   = ws.displayName || ws.coderName || 'Local';
    const projLabel = project ? (project.displayName || project.path) : '';
    const explicitSession = (sessionName || '').trim();
    const generatedPickerName = createNew && explicitSession && explicitSession.startsWith('gsd-term-');
    let tmuxName = (ws.useTmux && explicitSession && !generatedPickerName)
      ? explicitSession
      : (projLabel || 'main').replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/^-+|-+$/g, '') || 'main';
    if (ws.useTmux && createNew) {
      tmuxName = this._locationPrefixedTmuxName(projLabel || wsLabel || 'main', tmuxName);
      tmuxName = this._nextTmuxSessionName(tmuxName, await this._listRemoteTmuxSessions(ws));
    }
    // Short tab name — use the tmux name when tmux is enabled, otherwise project label.
    const tabName   = ws.useTmux ? tmuxName : (projLabel || wsLabel);
    const categorySessionName = ws.useTmux ? tmuxName : tabName;
    const gsdSettings = (this.modules && this.modules.gsd && this.modules.gsd.settings) || this.settings.gsd || {};
    const targetCategory = this._resolveTerminalOpenCategory(gsdSettings, ws.coderName, categorySessionName, category);
    this._rememberTerminalSessionCategory(gsdSettings, ws.coderName, categorySessionName, targetCategory, () => {
      const gsdInstance = this.modules && this.modules.gsd;
      if (gsdInstance && typeof gsdInstance.saveData === 'function') return gsdInstance.saveData(gsdSettings);
      return this.saveData(this.settings);
    });
    const targetSession = typeof view.createSession === 'function'
      ? (view.createSession(tabName, targetCategory) || view.activeSession || null)
      : (view.activeSession || null);

    // Mark this session so the rename watcher can persist user renames
    // back to project.displayName.
    const marked = targetSession || view.activeSession;
    if (marked) {
      marked.name = tabName;
      marked.__cwWorkspace = ws.coderName;
      marked.__cwProject   = project ? project.path : (projectPath || '');
      if (ws.useTmux) marked.__cwTmuxName = tmuxName;
      marked.category = targetCategory;
      marked.__cwLastKnownName = marked.name;
      if (typeof view.switchTo === 'function') view.switchTo(marked);
      if (typeof view.renderTabs === 'function') view.renderTabs();
    }

    // Give internetvin time to spawn the PTY, then send our init commands.
    setTimeout(() => {
      const session = targetSession || view.activeSession;
      if (!session || !session.process || !session.process.stdin) {
        new Notice('Local: could not send command to terminal');
        return;
      }
      session.name = tabName;
      session.category = targetCategory;
      if (typeof view.renderTabs === 'function') view.renderTabs();
      const cdTarget = projectPath || (project && project.path) || '';
      const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
      if (cdTarget) {
        session.process.stdin.write(`cd ${shq(cdTarget)}\n`);
      }
      if (ws.useTmux) {
        session.process.stdin.write(`tmux set-window-option -g window-size latest 2>/dev/null; tmux new-session -A -s ${shq(tmuxName)}\n`);
      }
      new Notice(`Opened ${tabName}`);
    }, 500);
  }

  // =========================================================================
  // Terminal session rename → project.displayName persistence
  // =========================================================================
  //
  // When the user renames a terminal tab (double-click in the internetvin
  // tab bar), we want that name to stick. Next time they open the same
  // project from the picker, it should reuse the custom name.
  //
  // We do this by marking each session with __cwWorkspace/__cwProject on
  // create, then polling for name changes. The __cwLastKnownName guard
  // makes sure we only persist user-driven renames, not initial names or
  // names that match the current settings.

  _syncSessionRenames() {
    try {
      const gsd = this.modules && this.modules.gsd;
      if (!gsd || !gsd.settings) return;

      const leaves = this.app.workspace.getLeavesOfType('vin-terminal-view');
      if (leaves.length === 0) return;

      let dirty = false;
      for (const leaf of leaves) {
        const view = leaf.view;
        if (!view || !view.sessions) continue;
        for (const session of view.sessions) {
          if (!session || !session.__cwWorkspace) continue;

          // First time we see this session, just record its name — don't
          // touch settings. We only persist subsequent changes.
          if (session.__cwLastKnownName === undefined) {
            console.log('[workbench] tracking session for rename:', {
              name: session.name,
              ws: session.__cwWorkspace,
              project: session.__cwProject
            });
            session.__cwLastKnownName = session.name;
            continue;
          }

          if (session.name === session.__cwLastKnownName) continue;

          console.log('[workbench] rename detected:', session.__cwLastKnownName, '→', session.name);

          // Renamed — persist to the originating project.
          const ws = this._getGsdWorkspaces(gsd.settings)
            .find(w => w.coderName === session.__cwWorkspace);
          if (!ws) {
            console.warn('[workbench] rename: workspace not found:', session.__cwWorkspace);
            session.__cwLastKnownName = session.name;
            continue;
          }

          const proj = (ws.projects || [])
            .find(p => p.path === session.__cwProject);
          if (!proj) {
            console.warn('[workbench] rename: project not found:', session.__cwProject, 'in', ws.coderName, '(projects:', (ws.projects || []).map(p => p.path), ')');
            session.__cwLastKnownName = session.name;
            continue;
          }

          console.log('[workbench] persisting rename:', proj.displayName, '→', session.name, '(ws:', ws.coderName, ')');
          proj.displayName = session.name;
          const newName = session.name;
          const oldTmux = session.__cwTmuxName;
          session.__cwLastKnownName = newName;
          dirty = true;

          // Also rename the remote tmux session so the "Running" tab
          // in the picker reflects the new name. Fire-and-forget — if
          // it fails (e.g. the session was killed), we just log.
          if (oldTmux && oldTmux !== newName) {
            const newTmux = newName.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'main';
            if (newTmux !== oldTmux) {
              this._renameRemoteTmux(ws, oldTmux, newTmux)
                .then(() => {
                  if (this._moveRememberedTerminalSessionCategory(gsd.settings, session.__cwWorkspace, oldTmux, newTmux)) {
                    const gsdInstance = this.modules && this.modules.gsd;
                    if (gsdInstance && typeof gsdInstance.saveData === 'function') {
                      gsdInstance.saveData(gsdInstance.settings).catch(err => console.error('[workbench] save tmux category map failed:', err));
                    } else {
                      this.saveData(this.settings).catch(err => console.error('[workbench] save tmux category map failed:', err));
                    }
                  }
                  session.__cwTmuxName = newTmux;
                  console.log('[workbench] remote tmux renamed:', oldTmux, '→', newTmux);
                })
                .catch(err => console.warn('[workbench] remote tmux rename failed:', err.message));
            }
          }
        }
      }

      if (dirty) {
        // Persist through GSD's saveData path — it updates both
        // parent.settings.gsd and workbench's data.json, keeping
        // the shared reference consistent.
        const gsdInstance = this.modules && this.modules.gsd;
        if (gsdInstance && typeof gsdInstance.saveData === 'function') {
          gsdInstance.saveData(gsdInstance.settings)
            .then(() => console.log('[workbench] rename saved'))
            .catch(err => console.error('[workbench] save rename failed:', err));
        } else {
          this.saveData(this.settings)
            .then(() => console.log('[workbench] rename saved (fallback path)'))
            .catch(err => console.error('[workbench] save rename failed:', err));
        }
      }
    } catch (e) {
      console.error('[workbench] _syncSessionRenames error:', e);
    }
  }

  _slugTmuxNamePart(value, fallback = 'main') {
    const raw = String(value || '').split(/[\\/]/).filter(Boolean).pop() || String(value || '');
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || fallback;
  }

  _locationPrefixedTmuxName(location, sessionName = '') {
    const loc = this._slugTmuxNamePart(location, 'main');
    const rawSession = String(sessionName || '').trim();
    const generatedPickerName = rawSession.startsWith('gsd-term-');
    const stem = this._slugTmuxNamePart(generatedPickerName ? '' : rawSession, loc);
    if (stem === loc || stem.startsWith(`${loc}-`)) return stem;
    return `${loc}-${stem}`;
  }

  /**
   * Pick the first available tmux session name using numeric suffixes:
   * name, name-1, name-2, ...
   */
  _nextTmuxSessionName(baseName, existingNames = []) {
    const base = this._slugTmuxNamePart(baseName, 'main')
      .replace(/^-+|-+$/g, '') || 'main';
    const existing = new Set((existingNames || []).map(name => String(name || '').trim()).filter(Boolean));
    if (!existing.has(base)) return base;
    for (let i = 1; i < 10000; i++) {
      const candidate = `${base}-${i}`;
      if (!existing.has(candidate)) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * List tmux session names on a workspace. Returns an array of names,
   * or empty array if tmux is absent / no sessions / any error.
   */
  async _listRemoteTmuxSessions(ws) {
    try {
      const cmd = "tmux ls -F '#{session_name}' 2>/dev/null || true";
      const out = await this._remoteShellExec(ws, cmd);
      return out.split('\n').map(l => l.trim()).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  /**
   * Run a shell command on the given workspace and return stdout.
   * Dispatches based on workspace type, using the same SSH mux as the
   * paste upload for warm connections.
   */
  _remoteShellExec(ws, cmd) {
    if (ws.type === 'local') {
      return new Promise((resolve, reject) => {
        exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout);
        });
      });
    }
    let host, pemPath;
    if (ws.type === 'ssh' || ws.type === 'vm') {
      host = ws.sshHost;
      pemPath = ws.pemPath;
      if (!host) return Promise.reject(new Error('SSH host not set'));
    } else {
      const gsd = this.modules && this.modules.gsd;
      const coderUser = this._getGsdCoderUser(gsd && gsd.settings);
      if (!coderUser) return Promise.reject(new Error('Coder username not set'));
      host = `main.${ws.coderName}.${coderUser}.coder`;
      pemPath = null;
    }
    const args = [];
    if (pemPath) args.push('-i', pemPath);
    args.push(
      '-o', 'ControlMaster=auto',
      '-o', 'ControlPath=/tmp/cw-paste-mux-%r@%h:%p',
      '-o', 'ControlPersist=1800',
      '-o', 'StrictHostKeyChecking=no',
      host,
      cmd
    );
    return new Promise((resolve, reject) => {
      execFile('/usr/bin/ssh', args, { timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          const details = String(stderr || err.message || err).trim();
          reject(new Error(`${details || 'command failed'} [${host}]`));
        }
        else resolve(stdout);
      });
    });
  }

  _isDefaultVisibleGsdWorkspace(ws) {
    if (!ws) return false;
    const name = String(ws.coderName || ws.name || "").trim().toLowerCase();
    const scope = String(ws.scope || "").trim().toLowerCase();
    const type = String(ws.type || "").trim().toLowerCase();
    if (name === "system" || scope === "system" || type === "system") return false;
    if (ws.hidden === true || ws.visible === false || ws.showInWorkbench === false) return false;
    return true;
  }

  _getDefaultVisibleGsdWorkspaces(workspaces) {
    return (workspaces || []).filter((ws) => this._isDefaultVisibleGsdWorkspace(ws));
  }

  _getGsdWorkspaces(gsdSettings = null) {
    const settings = gsdSettings || {};
    const topLevel = settings.workspaces;
    const nested = settings.gsd && settings.gsd.workspaces;
    if (Array.isArray(topLevel) && topLevel.length > 0) return this._getDefaultVisibleGsdWorkspaces(topLevel);
    if (Array.isArray(nested) && nested.length > 0) return this._getDefaultVisibleGsdWorkspaces(nested);
    if (Array.isArray(topLevel)) return this._getDefaultVisibleGsdWorkspaces(topLevel);
    if (Array.isArray(nested)) return this._getDefaultVisibleGsdWorkspaces(nested);
    return [];
  }

  _getGsdCoderUser(gsdSettings = null) {
    const settings = gsdSettings || {};
    return settings.coderUser || (settings.gsd && settings.gsd.coderUser) || '';
  }

  /**
   * Show a modal that lets the user pick an existing tmux session to
   * attach to, or create a new one. Resolves with:
   *   - the chosen session name (string)
   *   - '__new__' to create a new one
   *   - null if cancelled
   */
  _showSessionPicker(sessions, baseName) {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };

      const modal = new Modal(this.app);
      modal.titleEl.setText(`Multiple sessions for "${baseName}"`);
      const body = modal.contentEl;
      body.createEl('p', {
        text: 'Pick a running session to attach to, or create a new one.',
        cls: 'setting-item-description'
      });

      const list = body.createDiv();
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '6px';
      list.style.marginBottom = '14px';

      for (const s of sessions) {
        const btn = list.createEl('button');
        btn.setText(s);
        btn.style.textAlign = 'left';
        btn.style.padding = '10px 14px';
        btn.style.fontFamily = 'var(--font-monospace)';
        btn.style.fontSize = '13px';
        btn.addEventListener('click', () => { done(s); modal.close(); });
      }

      const row = body.createDiv();
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.justifyContent = 'flex-end';
      row.style.marginTop = '8px';

      const cancelBtn = row.createEl('button', { text: 'Cancel' });
      cancelBtn.addEventListener('click', () => { done(null); modal.close(); });

      const newBtn = row.createEl('button', { text: '+ New session' });
      newBtn.addClass('mod-cta');
      newBtn.addEventListener('click', () => { done('__new__'); modal.close(); });

      const origClose = modal.onClose.bind(modal);
      modal.onClose = () => { done(null); if (origClose) origClose(); };

      modal.open();
    });
  }

  /**
   * Rename a tmux session on the given workspace. Runs
   * `tmux rename-session -t <old> <new>` via the shared exec dispatch.
   */
  async _renameRemoteTmux(ws, oldName, newName) {
    const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
    const cmd = `tmux rename-session -t ${shq(oldName)} ${shq(newName)}`;
    await this._remoteShellExec(ws, cmd);
  }

  // =========================================================================
  // File explorer augmentation
  // =========================================================================
  //
  // The vendored GSD explorer view is read-only. We attach file operations
  // (context menu on rows, toolbar buttons for new file / new folder /
  // upload) at runtime by hooking into gsd-explorer-view leaves as they
  // open. Operations dispatch through a tiny executor that knows how to
  // handle Coder, SSH/VM, and Local connections.
  // -------------------------------------------------------------------------

  _augmentExplorer() {
    this._explorerHooked = new WeakSet();

    const hookExisting = () => {
      for (const leaf of this.app.workspace.getLeavesOfType('gsd-explorer-view')) {
        this._hookExplorerView(leaf.view);
      }
    };

    this.app.workspace.onLayoutReady(() => hookExisting());
    this.registerEvent(this.app.workspace.on('layout-change', () => hookExisting()));
  }

  _hookExplorerView(view) {
    if (!view || this._explorerHooked.has(view)) return;
    this._explorerHooked.add(view);

    // --- Prototype patch (once per class) ---
    // Override selectProject / fetchListing / handleFilePreview so SSH and
    // Local connection types work too, not just Coder workspaces.
    const proto = Object.getPrototypeOf(view);
    if (proto && !proto.__cwPatched) {
      proto.__cwPatched = true;
      const workbench = this;
      const origSelectProject  = proto.selectProject;
      const origFetchListing   = proto.fetchListing;
      const origHandleFilePrev = proto.handleFilePreview;

      proto.selectProject = async function (workspaceName, projectPath) {
        const ws = workbench._explorerFindWs(workspaceName);
        if (!ws || (ws.type !== 'ssh' && ws.type !== 'vm' && ws.type !== 'local')) {
          return origSelectProject.call(this, workspaceName, projectPath);
        }
        this.selectedWorkspace = workspaceName;
        this.selectedProject = projectPath;
        if (ws.type === 'local') {
          const target = projectPath || '~';
          this.currentPath = target.startsWith('/') ? target
                           : target.startsWith('~') ? path.join(os.homedir(), target.slice(1).replace(/^\//, ''))
                           : path.join(os.homedir(), target);
        } else {
          // SSH — keep ~ in the path; my ls helper handles tilde expansion
          this.currentPath = projectPath
            ? (projectPath.startsWith('/') ? projectPath : `~/${projectPath}`)
            : '~';
        }
        if (typeof this.closePreview === 'function') this.closePreview();
        this.entries = [];
        this.error = null;
        this.loading = false;
        if (this.leaf && typeof this.leaf.updateHeader === 'function') this.leaf.updateHeader();
        if (typeof this.renderAll === 'function') this.renderAll();
        return this.fetchListing();
      };

      proto.fetchListing = async function () {
        const ws = workbench._explorerFindWs(this.selectedWorkspace);
        if (!ws || (ws.type !== 'ssh' && ws.type !== 'vm' && ws.type !== 'local')) {
          return origFetchListing.call(this);
        }
        if (!this.selectedWorkspace) {
          this.error = 'No connection selected.';
          this.renderDetailPanel(this.getDetailPanel());
          return;
        }
        const fetchId = ++this.fetchId;
        this.loading = true;
        this.error = null;
        this.renderDetailPanel(this.getDetailPanel());
        try {
          const output = await workbench._explorerRawList(ws, this.currentPath);
          if (fetchId !== this.fetchId || !this.mounted) return;
          this.entries = workbench._parseLsOutput(output);
          this.loading = false;
          this.renderDetailPanel(this.getDetailPanel());
        } catch (err) {
          if (fetchId !== this.fetchId || !this.mounted) return;
          this.error = err instanceof Error ? err.message : String(err);
          this.entries = [];
          this.loading = false;
          this.renderDetailPanel(this.getDetailPanel());
        }
      };

      proto.handleFilePreview = async function (entry) {
        const ws = workbench._explorerFindWs(this.selectedWorkspace);
        if (!ws || (ws.type !== 'ssh' && ws.type !== 'vm' && ws.type !== 'local')) {
          return origHandleFilePrev.call(this, entry);
        }
        const fullPath = workbench._joinPath(this.currentPath, entry.name);
        const sizeBytes = parseInt(entry.size, 10);
        const MAX_PREVIEW = 5 * 1024 * 1024; // 5 MB
        if (!isNaN(sizeBytes) && sizeBytes > MAX_PREVIEW) {
          this.previewFileName = entry.name;
          this.previewContent = null;
          this.previewLoading = false;
          this.previewError = `File too large to preview (${entry.size} bytes)`;
          this.previewIsText = false;
          this.previewMimeType = null;
          this.previewFileSize = entry.size;
          this.renderDetailPanel(this.getDetailPanel());
          return;
        }
        this.previewFileName = entry.name;
        this.previewContent = null;
        this.previewLoading = true;
        this.previewError = null;
        this.previewIsText = true;
        this.previewMimeType = null;
        this.previewFileSize = entry.size;
        this.renderDetailPanel(this.getDetailPanel());

        let detectedMime = 'text/plain';
        try {
          const mimeOut = await workbench._explorerExecWs(ws, `file --mime-type -b ${workbench._pathArg(fullPath)}`);
          detectedMime = mimeOut.trim();
        } catch (_) {}
        if (!this.mounted) return;
        const isText = /^text\//i.test(detectedMime) || /json|xml|javascript|ecmascript|sh/.test(detectedMime);
        if (!isText) {
          this.previewContent = null;
          this.previewLoading = false;
          this.previewError = null;
          this.previewIsText = false;
          this.previewMimeType = detectedMime;
          this.renderDetailPanel(this.getDetailPanel());
          return;
        }
        try {
          const content = await workbench._explorerExecWs(ws, `head -c 524288 ${workbench._pathArg(fullPath)}`);
          if (!this.mounted) return;
          this.previewContent = content.length === 0 ? null : content;
          this.previewLoading = false;
          this.previewError = content.length === 0 ? 'Empty file' : null;
          this.previewIsText = true;
          this.previewMimeType = detectedMime;
          this.renderDetailPanel(this.getDetailPanel());
        } catch (err) {
          if (!this.mounted) return;
          this.previewContent = null;
          this.previewLoading = false;
          this.previewError = 'Failed to read file: ' + (err.message || err);
          this.previewIsText = true;
          this.previewMimeType = detectedMime;
          this.renderDetailPanel(this.getDetailPanel());
        }
      };
    }

    // --- Per-instance: toolbar actions + context menu + drag-drop ---
    try {
      view.addAction('file-plus',   'New file',    () => this._explorerNewFile(view));
      view.addAction('folder-plus', 'New folder',  () => this._explorerNewFolder(view));
      view.addAction('upload',      'Upload file', () => this._explorerUpload(view));
    } catch (e) {
      console.error('[workbench] addAction failed:', e);
    }

    const handler = (evt) => {
      const row = evt.target.closest && evt.target.closest('.gsd-explorer-row');
      if (!row) return;
      evt.preventDefault();
      const nameEl = row.querySelector('.gsd-explorer-name-dir, .gsd-explorer-name-file');
      if (!nameEl) return;
      const name = nameEl.textContent.trim();
      const entry = (view.entries || []).find(e => e.name === name);
      if (!entry) return;
      this._showExplorerContextMenu(view, entry, evt);
    };
    view.containerEl.addEventListener('contextmenu', handler);

    // Drag-drop upload onto the explorer area
    const dragOver = (evt) => {
      if (!view.selectedWorkspace) return;
      evt.preventDefault();
      view.containerEl.style.outline = '2px dashed var(--interactive-accent)';
      view.containerEl.style.outlineOffset = '-6px';
    };
    const dragLeave = () => {
      view.containerEl.style.outline = '';
      view.containerEl.style.outlineOffset = '';
    };
    const drop = async (evt) => {
      evt.preventDefault();
      view.containerEl.style.outline = '';
      view.containerEl.style.outlineOffset = '';
      if (!view.selectedWorkspace) return;
      const files = Array.from((evt.dataTransfer && evt.dataTransfer.files) || []);
      if (files.length === 0) return;
      for (const file of files) {
        const localPath = file.path;
        if (!localPath) continue;
        await this._uploadOne(view, localPath, file.name);
      }
      if (typeof view.fetchListing === 'function') view.fetchListing();
    };
    view.containerEl.addEventListener('dragover', dragOver);
    view.containerEl.addEventListener('dragleave', dragLeave);
    view.containerEl.addEventListener('drop', drop);
  }

  _showExplorerContextMenu(view, entry, evt) {
    const menu = new Menu();

    menu.addItem(item => item
      .setTitle('Open')
      .setIcon(entry.isDir ? 'folder-open' : 'file')
      .onClick(() => {
        if (entry.isDir || entry.isSymlink) {
          view.navigateTo(this._joinPath(view.currentPath, entry.name));
        } else if (typeof view.handleFilePreview === 'function') {
          view.handleFilePreview(entry);
        }
      }));

    if (!entry.isDir) {
      menu.addItem(item => item
        .setTitle('Download...')
        .setIcon('download')
        .onClick(() => this._explorerDownload(view, entry)));
    }

    menu.addItem(item => item
      .setTitle('Rename...')
      .setIcon('pencil')
      .onClick(() => this._explorerRename(view, entry)));

    menu.addItem(item => item
      .setTitle('Move to...')
      .setIcon('arrow-right')
      .onClick(() => this._explorerMove(view, entry)));

    menu.addItem(item => item
      .setTitle('Duplicate...')
      .setIcon('copy')
      .onClick(() => this._explorerCopy(view, entry)));

    menu.addItem(item => item
      .setTitle('Delete')
      .setIcon('trash')
      .onClick(() => this._explorerDelete(view, entry)));

    menu.addSeparator();

    menu.addItem(item => item
      .setTitle('Copy path')
      .setIcon('link')
      .onClick(() => {
        const fullPath = this._joinPath(view.currentPath, entry.name);
        navigator.clipboard.writeText(fullPath);
        new Notice('Path copied');
      }));

    menu.showAtMouseEvent(evt);
  }

  // --- Move + Copy (new) ---

  async _explorerMove(view, entry) {
    const currentFullPath = this._joinPath(view.currentPath, entry.name);
    const target = await this._prompt('Move', `Move "${entry.name}" to (absolute or relative path):`, view.currentPath + '/');
    if (!target) return;
    try {
      // If target ends with / or is a directory, append filename
      let dest = target;
      try {
        const probe = await this._explorerExec(view, `test -d ${this._pathArg(dest)} && echo DIR || echo FILE`);
        if (probe.trim() === 'DIR' || dest.endsWith('/')) {
          dest = this._joinPath(dest.replace(/\/+$/, ''), entry.name);
        }
      } catch (_) {}
      await this._explorerExec(view, `mv ${this._pathArg(currentFullPath)} ${this._pathArg(dest)}`);
      new Notice(`Moved to ${dest}`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Move failed: ' + e.message);
    }
  }

  async _explorerCopy(view, entry) {
    const currentFullPath = this._joinPath(view.currentPath, entry.name);
    const defaultTarget = this._joinPath(view.currentPath, entry.name + '-copy');
    const target = await this._prompt('Duplicate', `Copy "${entry.name}" to:`, defaultTarget);
    if (!target) return;
    try {
      const flag = entry.isDir ? '-r' : '';
      await this._explorerExec(view, `cp ${flag} ${this._pathArg(currentFullPath)} ${this._pathArg(target)}`);
      new Notice(`Copied to ${target}`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Copy failed: ' + e.message);
    }
  }

  // --- Ops (run a command on whichever connection this view belongs to) ----

  async _explorerRename(view, entry) {
    const newName = await this._prompt('Rename', `New name for "${entry.name}":`, entry.name);
    if (!newName || newName === entry.name) return;
    const oldPath = this._joinPath(view.currentPath, entry.name);
    const newPath = this._joinPath(view.currentPath, newName);
    try {
      await this._explorerExec(view, `mv ${this._pathArg(oldPath)} ${this._pathArg(newPath)}`);
      new Notice(`Renamed to ${newName}`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Rename failed: ' + e.message);
    }
  }

  async _explorerDelete(view, entry) {
    const ok = await this._confirm('Delete', `Delete "${entry.name}"? This cannot be undone.`, 'Delete');
    if (!ok) return;
    const fullPath = this._joinPath(view.currentPath, entry.name);
    try {
      await this._explorerExec(view, `rm -rf ${this._pathArg(fullPath)}`);
      new Notice(`Deleted ${entry.name}`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Delete failed: ' + e.message);
    }
  }

  async _explorerNewFile(view) {
    if (!view.selectedWorkspace) { new Notice('Select a project first'); return; }
    const name = await this._prompt('New file', 'File name:', 'untitled.md');
    if (!name) return;
    const fullPath = this._joinPath(view.currentPath, name);
    try {
      await this._explorerExec(view, `touch ${this._pathArg(fullPath)}`);
      new Notice(`Created ${name}`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Create failed: ' + e.message);
    }
  }

  async _explorerNewFolder(view) {
    if (!view.selectedWorkspace) { new Notice('Select a project first'); return; }
    const name = await this._prompt('New folder', 'Folder name:', 'new-folder');
    if (!name) return;
    const fullPath = this._joinPath(view.currentPath, name);
    try {
      await this._explorerExec(view, `mkdir -p ${this._pathArg(fullPath)}`);
      new Notice(`Created ${name}/`);
      if (typeof view.fetchListing === 'function') view.fetchListing();
    } catch (e) {
      new Notice('Create failed: ' + e.message);
    }
  }

  async _explorerDownload(view, entry) {
    const ws = this._explorerWorkspaceForView(view);
    if (!ws) { new Notice('Workspace not found'); return; }
    const remotePath = this._joinPath(view.currentPath, entry.name);
    const defaultLocal = path.join(os.homedir(), 'Downloads', entry.name);

    const localPath = await this._pickSaveFile(defaultLocal, `Save ${entry.name}`);
    if (!localPath) return;

    try {
      if (ws.type === 'local') {
        // Local → local: resolve tildes if any
        const expand = (p) => p.replace(/^~/, os.homedir());
        fs.copyFileSync(expand(remotePath), expand(localPath));
      } else {
        const [host, pemArg] = this._explorerHostFor(ws);
        // For scp, strip single-quoting since we pass paths directly
        await new Promise((resolve, reject) => {
          exec(`scp ${pemArg} ${host}:${this._pathArg(remotePath)} "${localPath}"`, { timeout: 300000 }, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve();
          });
        });
      }
      new Notice(`Downloaded to ${localPath}`);
    } catch (e) {
      new Notice('Download failed: ' + e.message);
    }
  }

  async _explorerUpload(view) {
    if (!view.selectedWorkspace) { new Notice('Select a project first'); return; }
    const ws = this._explorerWorkspaceForView(view);
    if (!ws) { new Notice('Workspace not found'); return; }

    // Try Electron's native open dialog first (multi-select), fall back to
    // a hidden <input type=file> if the remote API isn't available.
    const picked = await this._pickOpenFiles('Upload file');
    if (!picked || picked.length === 0) return;

    for (const localPath of picked) {
      const baseName = path.basename(localPath);
      await this._uploadOne(view, localPath, baseName);
    }
    if (typeof view.fetchListing === 'function') view.fetchListing();
  }

  async _uploadOne(view, localPath, baseName) {
    const ws = this._explorerWorkspaceForView(view);
    if (!ws) { new Notice('Workspace not found'); return; }
    const remotePath = this._joinPath(view.currentPath, baseName);
    try {
      if (ws.type === 'local') {
        const expand = (p) => p.replace(/^~/, os.homedir());
        fs.copyFileSync(localPath, expand(remotePath));
      } else {
        const [host, pemArg] = this._explorerHostFor(ws);
        await new Promise((resolve, reject) => {
          exec(`scp ${pemArg} "${localPath}" ${host}:${this._pathArg(remotePath)}`, { timeout: 600000 }, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve();
          });
        });
      }
      new Notice(`Uploaded ${baseName}`);
    } catch (e) {
      new Notice(`Upload of ${baseName} failed: ` + e.message);
    }
  }

  // --- Electron-backed file pickers with fallback ---

  async _pickSaveFile(defaultPath, title) {
    try {
      const { dialog } = require('@electron/remote');
      const result = await dialog.showSaveDialog({
        defaultPath,
        title: title || 'Save file'
      });
      if (result.canceled) return null;
      return result.filePath || null;
    } catch (_) {
      // Fallback: text prompt
      return await this._prompt(title || 'Save file', 'Local path:', defaultPath);
    }
  }

  async _pickOpenFiles(title) {
    try {
      const { dialog } = require('@electron/remote');
      const result = await dialog.showOpenDialog({
        title: title || 'Open file',
        properties: ['openFile', 'multiSelections']
      });
      if (result.canceled) return null;
      return result.filePaths || [];
    } catch (_) {
      // Fallback: hidden file input (single file only)
      return await new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
          const files = Array.from(input.files || []).map(f => f.path).filter(Boolean);
          input.remove();
          resolve(files);
        });
        input.click();
      });
    }
  }

  // --- Dispatch helpers ----------------------------------------------------

  _explorerWorkspaceForView(view) {
    const gsd = this.modules && this.modules.gsd;
    if (!gsd || !gsd.settings || !view.selectedWorkspace) return null;
    return this._getGsdWorkspaces(gsd.settings).find(w => w.coderName === view.selectedWorkspace);
  }

  /** Look up a workspace config by its coderName/id. */
  _explorerFindWs(wsName) {
    const gsd = this.modules && this.modules.gsd;
    if (!gsd || !gsd.settings || !wsName) return null;
    return this._getGsdWorkspaces(gsd.settings).find(w => w.coderName === wsName);
  }

  /** Run `ls -la` against the given path on a workspace. Returns raw stdout. */
  async _explorerRawList(ws, fullPath) {
    const cmd = `ls -la ${this._pathArg(fullPath)}`;
    return this._explorerExecWs(ws, cmd);
  }

  /** Execute a shell command against a specific workspace (any type). */
  _explorerExecWs(ws, cmd) {
    if (ws.type === 'local') {
      return new Promise((resolve, reject) => {
        // Use a shell so ~/ expands
        exec(cmd, { timeout: 30000, shell: '/bin/sh' }, (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout);
        });
      });
    }
    const [host, _pemArg] = this._explorerHostFor(ws);
    const args = [];
    if (ws.pemPath) args.push('-i', ws.pemPath);
    args.push(
      '-o', 'ControlMaster=auto',
      '-o', 'ControlPath=/tmp/cw-mux-%r@%h:%p',
      '-o', 'ControlPersist=600',
      '-o', 'StrictHostKeyChecking=no',
      host,
      cmd
    );
    return new Promise((resolve, reject) => {
      execFile('/usr/bin/ssh', args, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  }

  /**
   * Shell-safe path argument. Tilde (~) at the start is left unquoted so
   * the remote/local shell expands it to $HOME; the rest is single-quoted.
   */
  _pathArg(p) {
    if (typeof p !== 'string') return this._shq(String(p));
    if (p.startsWith('~/')) return '~' + this._shq(p.slice(1));
    if (p === '~')          return '~';
    return this._shq(p);
  }

  /**
   * Parse `ls -la` output into {name, size, date, isDir, isSymlink} entries.
   * Works with both GNU and BSD ls. Skips "total N", ".", and "..".
   */
  _parseLsOutput(output) {
    const entries = [];
    const lines = output.split('\n');
    // drwxr-xr-x[@+]  5 user group  160 Apr 12 10:23 name
    const re = /^([dl\-])[rwxst\-]{9}[@+.]?\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\S+\s+\d+\s+[\d:]+)\s+(.+)$/;
    for (const line of lines) {
      if (!line || /^total\s/.test(line)) continue;
      const m = line.match(re);
      if (!m) continue;
      const typeChar = m[1];
      const size = m[2];
      const date = m[3];
      let name = m[4];
      const isDir = typeChar === 'd';
      const isSymlink = typeChar === 'l';
      if (isSymlink) {
        const arrow = name.indexOf(' -> ');
        if (arrow > 0) name = name.slice(0, arrow);
      }
      if (name === '.' || name === '..') continue;
      entries.push({ name, size, date, isDir, isSymlink });
    }
    // Directories first, then alphabetical
    entries.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
    return entries;
  }

  /** Returns [host, pemArg] — empty pemArg when unused. */
  _explorerHostFor(ws) {
    if (ws.type === 'ssh' || ws.type === 'vm') {
      return [ws.sshHost, ws.pemPath ? `-i "${ws.pemPath}"` : ''];
    }
    // Coder workspace
    const gsd = this.modules && this.modules.gsd;
    const coderUser = this._getGsdCoderUser(gsd && gsd.settings);
    if (!coderUser) throw new Error('Coder username not set (see Workbench settings)');
    return [`main.${ws.coderName}.${coderUser}.coder`, ''];
  }

  /** Run a shell command on the view's workspace, returning stdout. */
  _explorerExec(view, cmd) {
    const ws = this._explorerWorkspaceForView(view);
    if (!ws) return Promise.reject(new Error('Workspace not found'));

    if (ws.type === 'local') {
      return new Promise((resolve, reject) => {
        exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout);
        });
      });
    }

    const [host, pemArg] = this._explorerHostFor(ws);
    const args = [];
    if (ws.pemPath) args.push('-i', ws.pemPath);
    args.push(
      '-o', 'ControlMaster=auto',
      '-o', 'ControlPath=/tmp/cw-mux-%r@%h:%p',
      '-o', 'ControlPersist=600',
      '-o', 'StrictHostKeyChecking=no',
      host,
      cmd
    );
    return new Promise((resolve, reject) => {
      execFile('/usr/bin/ssh', args, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout);
      });
    });
  }

  _joinPath(dir, name) {
    return dir.endsWith('/') ? dir + name : dir + '/' + name;
  }

  /** POSIX single-quote shell escape. */
  _shq(s) {
    return "'" + String(s).replace(/'/g, "'\\''") + "'";
  }

  // --- Obsidian modal helpers ---------------------------------------------

  _prompt(title, message, defaultValue) {
    return new Promise(resolve => {
      let settled = false;
      const modal = new Modal(this.app);
      modal.contentEl.createEl('h3', { text: title });
      modal.contentEl.createEl('p', { text: message, cls: 'setting-item-description' });

      const input = modal.contentEl.createEl('input', { type: 'text' });
      input.value = defaultValue || '';
      input.style.width = '100%';
      input.style.marginBottom = '14px';
      input.style.padding = '6px 10px';

      const row = modal.contentEl.createDiv();
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.justifyContent = 'flex-end';

      const cancel = row.createEl('button', { text: 'Cancel' });
      cancel.addEventListener('click', () => { settled = true; resolve(null); modal.close(); });

      const ok = row.createEl('button', { text: 'OK' });
      ok.addClass('mod-cta');
      ok.addEventListener('click', () => { settled = true; resolve(input.value); modal.close(); });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { settled = true; resolve(input.value); modal.close(); }
        if (e.key === 'Escape') { settled = true; resolve(null); modal.close(); }
      });

      const origClose = modal.onClose.bind(modal);
      modal.onClose = () => { if (!settled) resolve(null); origClose && origClose(); };

      modal.open();
      setTimeout(() => input.focus(), 50);
    });
  }

  _confirm(title, message, confirmLabel) {
    return new Promise(resolve => {
      let settled = false;
      const modal = new Modal(this.app);
      modal.contentEl.createEl('h3', { text: title });
      modal.contentEl.createEl('p', { text: message });

      const row = modal.contentEl.createDiv();
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.justifyContent = 'flex-end';
      row.style.marginTop = '14px';

      const cancel = row.createEl('button', { text: 'Cancel' });
      cancel.addEventListener('click', () => { settled = true; resolve(false); modal.close(); });

      const ok = row.createEl('button', { text: confirmLabel || 'OK' });
      ok.addClass('mod-warning');
      ok.addEventListener('click', () => { settled = true; resolve(true); modal.close(); });

      const origClose = modal.onClose.bind(modal);
      modal.onClose = () => { if (!settled) resolve(false); origClose && origClose(); };

      modal.open();
    });
  }

  async onunload() {
    console.log('[workbench] unloading in reverse order:', [...this.loadOrder].reverse());
    for (const key of [...this.loadOrder].reverse()) {
      const mod = this.modules[key];
      if (!mod) continue;
      try {
        if ((key === 'terminal' || key === 'gsd') && typeof mod.unload === 'function') {
          // Vendor Plugin instances: Component.unload() cascades onunload + cleanup.
          mod.unload();
        } else if (typeof mod.unload === 'function') {
          await mod.unload();
        } else if (typeof mod.onunload === 'function') {
          await mod.onunload();
        }
      } catch (e) {
        console.error(`[workbench] error unloading ${key}:`, e);
      }
    }
    this.modules = {};
    this.loadOrder = [];
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class WorkbenchSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this._currentPage = 'about';
    this._activeContentEl = null;
    this._pendingScrollTop = null;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    // Reset the flex we set last time (PluginSettingTab reuses containerEl).
    containerEl.style.display = 'flex';
    containerEl.style.gap = '0';
    containerEl.style.padding = '0';
    containerEl.style.alignItems = 'stretch';
    containerEl.style.minHeight = '500px';

    const pages = [
      { key: 'about',       title: 'About',               render: (el) => this._renderAbout(el) },
      { key: 'connections', title: 'Remote Connections',  render: (el) => this._renderConnectionsPage(el) },
      { key: 'secure-input', title: 'Secure Input', render: (el) => this._renderSecureInputPage(el) },
      { key: 'gsd',         title: 'Workspace',           render: (el) => this._renderGsdPage(el) },
      { key: 'countdown',   title: 'Countdown Bar',       render: (el) => this._renderCountdownPage(el) },
      { key: 'excalidraw',  title: 'Excalidraw Live Text',render: (el) => this._renderExcalidrawPage(el) },
      { key: 'terminal',    title: 'Terminal',            render: (el) => this._renderTerminalPage(el) },
      { key: 'enhance',     title: 'Terminal Enhancements',render: (el) => this._renderEnhancePage(el) },
      { key: 'credits',     title: 'Credits',             render: (el) => this._renderCreditsPage(el) },
    ];

    // --- Sidebar ---
    const sidebar = containerEl.createDiv();
    sidebar.style.width = '200px';
    sidebar.style.flexShrink = '0';
    sidebar.style.borderRight = '1px solid var(--background-modifier-border)';
    sidebar.style.padding = '16px 0';
    sidebar.style.background = 'var(--background-secondary)';

    const titleEl = sidebar.createDiv();
    titleEl.setText('Workbench');
    titleEl.style.fontSize = '11px';
    titleEl.style.fontWeight = '600';
    titleEl.style.textTransform = 'uppercase';
    titleEl.style.letterSpacing = '0.6px';
    titleEl.style.color = 'var(--text-muted)';
    titleEl.style.padding = '0 16px 10px 16px';

    pages.forEach(p => {
      const item = sidebar.createDiv();
      item.setText(p.title);
      item.style.padding = '8px 16px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '13px';
      item.style.borderLeft = '2px solid transparent';
      if (p.key === this._currentPage) {
        item.style.background = 'var(--background-modifier-hover)';
        item.style.borderLeftColor = 'var(--interactive-accent)';
        item.style.fontWeight = '600';
        item.style.color = 'var(--text-normal)';
      } else {
        item.style.color = 'var(--text-muted)';
      }
      item.addEventListener('mouseenter', () => {
        if (p.key !== this._currentPage) item.style.background = 'var(--background-modifier-hover)';
      });
      item.addEventListener('mouseleave', () => {
        if (p.key !== this._currentPage) item.style.background = '';
      });
      item.addEventListener('click', () => {
        this._currentPage = p.key;
        this.display();
      });
    });

    // --- Content ---
    const content = containerEl.createDiv();
    content.style.flex = '1';
    content.style.padding = '24px 32px';
    content.style.overflowY = 'auto';
    this._activeContentEl = content;

    const selected = pages.find(p => p.key === this._currentPage) || pages[0];
    selected.render(content);
    const restoreScrollTop = this._pendingScrollTop;
    this._pendingScrollTop = null;
    if (typeof restoreScrollTop === 'number') {
      requestAnimationFrame(() => {
        content.scrollTop = restoreScrollTop;
      });
    }
  }

  // =========================================================================
  // Sidebar pages
  // =========================================================================

  _renderAbout(el) {
    el.createEl('h2', { text: 'Workbench' });
    el.createEl('p', {
      text: 'A unified Obsidian plugin that bundles six components: remote connections ' +
            '(Coder / SSH / local), an embedded terminal, a floating countdown widget, ' +
            'Excalidraw live text sync, workspace management, and encrypted credential input.'
    });

    const hr = el.createEl('hr');
    hr.style.margin = '20px 0';
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid var(--background-modifier-border)';

    el.createEl('h3', { text: 'What\'s loaded' });
    const list = el.createEl('ul');
    list.style.marginLeft = '0';
    list.style.paddingLeft = '20px';
    const items = [
      ['Remote Connections', 'Coder workspaces, SSH hosts, local shells — all in one picker.'],
      ['Terminal', 'Embedded multi-session terminal with tab tinting and screenshot paste.'],
      ['Countdown Bar', 'A draggable floating widget showing days/hours until configured dates.'],
      ['Excalidraw Live Text', 'Sync note content into Excalidraw text elements via @from() tags.'],
      ['Workspace Views', 'Project dashboard, status view, and folder scanning for workspace projects.'],
      ['Secure Input', 'A native encrypted credential modal for one explicitly selected workspace.'],
    ];
    for (const [name, desc] of items) {
      const li = list.createEl('li');
      li.style.marginBottom = '8px';
      li.createEl('strong', { text: name });
      li.appendText(' — ' + desc);
    }

    el.createEl('p', {
      cls: 'setting-item-description',
      text: 'Components are loaded together. Connections require your own configuration; Secure Input starts disabled.'
    });
  }

  _renderSecureInputPage(el) {
    el.createEl('h2', { text: 'Secure Input' });
    el.createEl('p', { text: 'Receive credential requests from secenv in one selected workspace. Enter values only in the native request modal; they are encrypted before transport.' });
    const module = this.plugin.modules.secureInput;
    if (!module) {
      el.createEl('p', { text: 'Secure Input could not load. Reload Workbench and inspect its error before providing any credential.' });
      return;
    }
    const apply = async change => {
      try { await module.configure(change); }
      catch (error) { new Notice(error.message); }
      this.display();
    };
    new Setting(el).setName('Enable credential listener')
      .setDesc('Requires an explicitly selected workspace with secenv installed. No automatic fallback.')
      .addToggle(toggle => toggle.setValue(module.settings.enabled)
        .onChange(value => apply({ enabled: value })));
    new Setting(el).setName('Credential workspace')
      .setDesc('Uses the connection identifier. Finish or cancel pending requests before switching.')
      .addDropdown(dropdown => {
        dropdown.addOption('', 'Select a workspace');
        const workspaces = this.plugin._getGsdWorkspaces(module._gsdSettings());
        for (const workspace of workspaces) {
          if (workspace.coderName) dropdown.addOption(workspace.coderName, workspace.displayName || workspace.coderName);
        }
        if (module.settings.workspace && !workspaces.some(w => w.coderName === module.settings.workspace)) {
          dropdown.addOption(module.settings.workspace, 'Unavailable: ' + module.settings.workspace);
        }
        dropdown.setValue(module.settings.workspace).onChange(value => apply({ workspace: value }));
      });
    new Setting(el).setName('Listener status').setDesc(module.status)
      .addButton(button => button.setButtonText('Refresh').onClick(() => this.display()))
      .addButton(button => button.setButtonText('Restart').onClick(() => { module.restart(); this.display(); }));
  }

  _renderConnectionsPage(el) {
    el.createEl('h2', { text: 'Remote Connections' });
    el.createEl('p', {
      text: 'Every remote machine or workspace that appears in the connection picker. ' +
            'Supports three types: Coder workspaces, raw SSH hosts (with or without a PEM key), ' +
            'and your local machine. Each connection has its own sessions.'
    });
    this._renderConnections(el);
  }

  _renderGsdPage(el) {
    el.createEl('h2', { text: 'Workspace' });
    el.createEl('p', {
      text: 'Workbench tracks projects, sessions, and workspace state. ' +
            'It scans folders in your vault (or on a configured workspace) for initialized ' +
            'projects and surfaces them in a dashboard, a status view, and a file explorer.'
    });

    el.createEl('h3', { text: 'Views' });
    const grid = el.createDiv();
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr';
    grid.style.gap = '12px';
    grid.style.marginBottom = '16px';

    const viewCard = (title, desc, viewType, icon) => {
      const card = grid.createDiv();
      card.style.padding = '12px';
      card.style.border = '1px solid var(--background-modifier-border)';
      card.style.borderRadius = '6px';
      card.style.cursor = 'pointer';
      card.addEventListener('mouseenter', () => { card.style.background = 'var(--background-modifier-hover)'; });
      card.addEventListener('mouseleave', () => { card.style.background = ''; });
      card.addEventListener('click', async () => {
        const leaf = this.app.workspace.getLeaf('tab');
        await leaf.setViewState({ type: viewType, active: true });
        this.app.workspace.revealLeaf(leaf);
      });
      const t = card.createEl('div');
      t.setText(title);
      t.style.fontWeight = '600';
      t.style.marginBottom = '4px';
      const d = card.createEl('div');
      d.setText(desc);
      d.style.fontSize = '12px';
      d.style.color = 'var(--text-muted)';
    };

    viewCard('Projects Dashboard', 'Grid of all workspace projects with status, sessions, milestones.', 'gsd-status-view');
    viewCard('File Explorer',      'Browse project files and open workspace state notes.',              'gsd-explorer-view');

    el.createEl('h3', { text: 'File operations' });
    el.createEl('p', {
      cls: 'setting-item-description',
      text: 'The file explorer supports full file operations via a right-click context menu ' +
            'on any row: Open, Download (to local machine), Rename, Delete, Copy path. The header ' +
            'toolbar has New file, New folder, and Upload buttons. Works with Coder, SSH, and Local ' +
            'connection types — operations dispatch to the right protocol automatically.'
    });

    el.createEl('h3', { text: 'Coder username' });
    el.createEl('p', {
      cls: 'setting-item-description',
      text: 'Shared across all Coder-type connections. The SSH host is computed as ' +
            'main.<connection-id>.<coder-username>.coder. Only relevant if you use Coder.'
    });
    const gsd = this.plugin.settings.gsd = this.plugin.settings.gsd || {};
    new Setting(el)
      .setName('Coder username')
      .addText(t => t
        .setPlaceholder('your-coder-username')
        .setValue(gsd.coderUser || '')
        .onChange(async v => { gsd.coderUser = v.trim(); await this.plugin.saveSettings(); }));
  }

  _renderCountdownPage(el) {
    el.createEl('h2', { text: 'Countdown Bar' });
    el.createEl('p', {
      text: 'A floating widget in the top-right corner that counts down to configured dates. ' +
            'Drag the widget to reposition it; click the widget to jump to these settings.'
    });

    el.createEl('h3', { text: 'Usage' });
    const ul = el.createEl('ul');
    ul.createEl('li', { text: 'Add any number of countdowns below. Each shows its name + remaining time.' });
    ul.createEl('li', { text: 'Dates use the YYYY-MM-DD format and roll over at end of day (23:59).' });
    ul.createEl('li', { text: 'Use the "Countdown: Add a new countdown" command palette entry for a quick add.' });

    el.createEl('h3', { text: 'Countdowns' });
    this._renderCountdowns(el);
  }

  _renderExcalidrawPage(el) {
    el.createEl('h2', { text: 'Excalidraw Live Text' });
    el.createEl('p', {
      text: 'Sync Obsidian note content into Excalidraw text elements via special @from() tags. ' +
            'When you refresh, the plugin reads the referenced note and rewrites the element text in-place.'
    });

    el.createEl('h3', { text: 'Usage' });
    const how = el.createEl('ol');
    how.createEl('li', { text: 'Open any Excalidraw drawing.' });
    {
      const li = how.createEl('li');
      li.appendText('Add a text element whose first line is ');
      const code1 = li.createEl('code'); code1.setText('@from(NoteName)');
      li.appendText(' — or ');
      const code2 = li.createEl('code'); code2.setText('@from(NoteName#Heading)');
      li.appendText(' to pull a specific section.');
    }
    how.createEl('li', { text: 'Click the refresh-cw ribbon icon (or run the "Sync all live text connections" command) to populate.' });
    how.createEl('li', { text: 'Click the link ribbon icon to jump from the diagram back to the source note.' });

    el.createEl('h3', { text: 'Commands' });
    const cmds = el.createEl('ul');
    cmds.createEl('li', { text: 'Excalidraw Live Text: Sync all live text connections' });
    cmds.createEl('li', { text: 'Excalidraw Live Text: Insert @from() tag — pick a note to link' });
    cmds.createEl('li', { text: 'Excalidraw Live Text: Show linked notes in current diagram' });
  }

  _renderTerminalPage(el) {
    el.createEl('h2', { text: 'Terminal' });
    el.createEl('p', {
      text: 'An embedded multi-session terminal (powered by internetvin-terminal, MIT). ' +
            'Each session is its own shell; tabs let you switch between them without closing anything.'
    });

    el.createEl('h3', { text: 'Usage' });
    const ul = el.createEl('ul');
    ul.createEl('li', { text: 'Click the terminal ribbon icon to toggle the terminal pane.' });
    ul.createEl('li', { text: 'Use the "+" button inside the terminal view to add new sessions.' });
    ul.createEl('li', { text: 'The connection picker (see Remote Connections) creates a new session pre-configured for the selected target.' });

    el.createEl('h3', { text: 'Commands' });
    const cmds = el.createEl('ul');
    cmds.createEl('li', { text: 'Open Terminal (ribbon + command palette)' });
    cmds.createEl('li', { text: 'Open Terminal in Tab' });
    cmds.createEl('li', { text: 'Toggle Fullscreen Terminal' });
  }

  _renderEnhancePage(el) {
    el.createEl('h2', { text: 'Terminal Enhancements' });
    el.createEl('p', {
      text: 'Quality-of-life features that run on top of the embedded terminal.'
    });

    el.createEl('h3', { text: 'Features' });
    const ul = el.createEl('ul');
    {
      const li = ul.createEl('li');
      li.createEl('strong', { text: 'Per-session tab tinting — ' });
      li.appendText('each session gets a distinct dark background computed from its name, so you can tell sessions apart at a glance.');
    }
    {
      const li = ul.createEl('li');
      li.createEl('strong', { text: 'Screenshot paste upload — ' });
      li.appendText('paste an image into a terminal session and it\'s uploaded to the remote machine via scp, with the remote path pasted into the shell.');
    }
    {
      const li = ul.createEl('li');
      li.createEl('strong', { text: 'Ribbon separators — ' });
      li.appendText('thin divider icons in the ribbon you can right-click to add or remove. Useful for grouping plugin icons visually.');
    }
    {
      const li = ul.createEl('li');
      li.createEl('strong', { text: 'Manual screenshot command — ' });
      li.appendText('palette command that grabs the current clipboard image (or opens the screen picker) and uploads it.');
    }

    el.createEl('h3', { text: 'Commands' });
    const cmds = el.createEl('ul');
    cmds.createEl('li', { text: 'Send screenshot to remote' });
  }

  _renderCreditsPage(el) {
    el.createEl('h2', { text: 'Credits' });

    el.createEl('h3', { text: 'internetvin Terminal' });
    {
      const p = el.createEl('p');
      p.appendText('The embedded terminal is ');
      const b = p.createEl('strong');
      b.setText('internetvin-terminal');
      p.appendText(' by Vin Verma, licensed MIT. The upstream source lives at ');
      const a = p.createEl('a', { text: 'github.com/vinverma', href: 'https://github.com/vinverma' });
      p.appendText('.');
    }

    el.createEl('h3', { text: 'Workbench' });
    el.createEl('p', {
      text: 'The bundled workspace views track projects, milestones, and sessions. ' +
            'The Workbench module has local modifications — the connection picker has been ' +
            'reworked to support SSH and Local connections alongside Coder workspaces.'
    });

    el.createEl('h3', { text: 'License' });
    el.createEl('p', {
      cls: 'setting-item-description',
      text: 'Vendored third-party code keeps its original license. Our own modules (Countdown Bar, ' +
            'Excalidraw Live Text, Terminal Enhancements) are released under MIT.'
    });
  }

  /**
   * Renders the Countdown Bar editor inline in the main settings tab.
   * Mutates plugin.settings.countdown directly — the CountdownModule
   * aliases its `this.settings` to that object, so edits are visible
   * to the running module without a reload (and render() is called
   * after each save to refresh the widget).
   */
  _renderCountdowns(containerEl) {
    const cd = this.plugin.settings.countdown = this.plugin.settings.countdown || {};
    cd.countdowns = cd.countdowns || [];
    if (typeof cd.separator !== 'string') cd.separator = '  •  ';

    const refreshWidget = () => {
      const mod = this.plugin.modules && this.plugin.modules.countdown;
      if (mod && typeof mod.render === 'function') mod.render();
    };
    const saveAll = async () => {
      await this.plugin.saveSettings();
      refreshWidget();
    };

    new Setting(containerEl)
      .setName('Separator')
      .setDesc('Text between countdowns.')
      .addText(txt => txt
        .setValue(cd.separator)
        .onChange(async v => { cd.separator = v; await saveAll(); }));

    cd.countdowns.forEach((item, idx) => {
      new Setting(containerEl)
        .setName(`Countdown ${idx + 1}`)
        .addText(txt => txt
          .setPlaceholder('Name')
          .setValue(item.name || '')
          .onChange(async v => { item.name = v; await saveAll(); }))
        .addText(txt => txt
          .setPlaceholder('YYYY-MM-DD')
          .setValue(item.date || '')
          .onChange(async v => { item.date = v; await saveAll(); }))
        .addButton(btn => btn
          .setButtonText('Delete')
          .setWarning()
          .onClick(async () => {
            cd.countdowns.splice(idx, 1);
            await saveAll();
            this.display();
          }));
    });

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText('+ Add countdown')
        .setCta()
        .onClick(async () => {
          cd.countdowns.push({
            name: 'New event',
            date: new Date().toISOString().split('T')[0],
            emoji: ''
          });
          await saveAll();
          this.display();
        }));
  }

  /**
   * Unified editor for ALL remote connections in gsd.workspaces.
   *
   * Each entry is a workspace — either a Coder workspace (type: "coder",
   * the default for untyped entries) or a raw SSH host (type: "ssh" or
   * "vm", both recognized by the VM wrapper in _loadVendor). The editor
   * renders type-specific fields and a single "+ Add connection" button
   * that shows a menu of connection types.
   */
  _renderConnections(containerEl) {
    const gsd = this.plugin.settings.gsd = this.plugin.settings.gsd || {};
    gsd.workspaces = gsd.workspaces || [];

    const saveAll = async () => { await this.plugin.saveSettings(); };
    const typeOf = (ws) => {
      if (ws.type === 'local') return 'local';
      if (ws.type === 'ssh' || ws.type === 'vm') return 'ssh';
      return 'coder';
    };
    const typeLabel = (t) => t === 'ssh' ? 'SSH' : t === 'local' ? 'Local' : 'Coder';
    const moveItem = async (items, idx, delta) => {
      const next = idx + delta;
      if (next < 0 || next >= items.length) return;
      this._pendingScrollTop = this._activeContentEl ? this._activeContentEl.scrollTop : 0;
      const tmp = items[idx];
      items[idx] = items[next];
      items[next] = tmp;
      await saveAll();
      this.display();
    };
    const dragState = { items: null, fromIdx: -1, scopeEl: null };
    const clearDropMarkers = (scopeEl) => {
      if (!scopeEl) return;
      scopeEl.querySelectorAll('.cw-settings-drop-before, .cw-settings-drop-after').forEach(el => {
        el.removeClass('cw-settings-drop-before');
        el.removeClass('cw-settings-drop-after');
      });
    };
    const moveItemToSlot = async (items, fromIdx, targetSlot) => {
      if (!Array.isArray(items) || fromIdx < 0 || fromIdx >= items.length) return;
      let insertAt = targetSlot;
      if (insertAt > fromIdx) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, items.length - 1));
      if (insertAt === fromIdx) return;
      this._pendingScrollTop = this._activeContentEl ? this._activeContentEl.scrollTop : 0;
      const [item] = items.splice(fromIdx, 1);
      items.splice(insertAt, 0, item);
      await saveAll();
      this.display();
    };
    const addDragHandle = (row, items, idx, scopeEl, label, handleParent = row) => {
      const handle = handleParent.createEl('button', { text: '↕', cls: 'cw-settings-drag-handle' });
      handle.type = 'button';
      handle.title = `Drag to reorder ${label}`;
      handle.setAttribute('aria-label', handle.title);
      handle.draggable = true;
      row.addClass('cw-settings-sortable-row');

      handle.addEventListener('click', evt => {
        evt.preventDefault();
      });
      handle.addEventListener('dragstart', evt => {
        dragState.items = items;
        dragState.fromIdx = idx;
        dragState.scopeEl = scopeEl;
        row.addClass('is-dragging');
        if (evt.dataTransfer) {
          evt.dataTransfer.effectAllowed = 'move';
          evt.dataTransfer.setData('text/plain', String(idx));
        }
      });
      handle.addEventListener('dragend', () => {
        row.removeClass('is-dragging');
        clearDropMarkers(dragState.scopeEl);
        dragState.items = null;
        dragState.fromIdx = -1;
        dragState.scopeEl = null;
      });
      row.addEventListener('dragover', evt => {
        if (dragState.items !== items) return;
        evt.preventDefault();
        clearDropMarkers(scopeEl);
        const rect = row.getBoundingClientRect();
        const after = evt.clientY > rect.top + rect.height / 2;
        row.addClass(after ? 'cw-settings-drop-after' : 'cw-settings-drop-before');
        if (evt.dataTransfer) evt.dataTransfer.dropEffect = 'move';
      });
      row.addEventListener('dragleave', evt => {
        if (typeof Node !== 'undefined' && evt.relatedTarget instanceof Node && row.contains(evt.relatedTarget)) return;
        row.removeClass('cw-settings-drop-before');
        row.removeClass('cw-settings-drop-after');
      });
      row.addEventListener('drop', async evt => {
        if (dragState.items !== items) return;
        evt.preventDefault();
        const fromIdx = dragState.fromIdx;
        const rect = row.getBoundingClientRect();
        const targetSlot = (evt.clientY > rect.top + rect.height / 2) ? idx + 1 : idx;
        clearDropMarkers(scopeEl);
        dragState.items = null;
        dragState.fromIdx = -1;
        dragState.scopeEl = null;
        await moveItemToSlot(items, fromIdx, targetSlot);
      });
      return handle;
    };
    const styleMoveButton = (btn, title, disabled) => {
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.style.width = '28px';
      btn.style.height = '28px';
      btn.style.padding = '0';
      btn.disabled = !!disabled;
      if (disabled) btn.style.opacity = '0.45';
    };
    const ROOT_PROJECT_TOKEN = '__CW_WORKSPACE_ROOT__';
    const projectDiscoveryCmd = [
      '{',
      `printf "${ROOT_PROJECT_TOKEN}\\n";`,
      'find "$HOME/projects" "$HOME/Projects" -mindepth 1 -maxdepth 1 -type d -print 2>/dev/null;',
      'find "$HOME/projects" "$HOME/Projects" -mindepth 2 -maxdepth 4 -type d -name .git -prune -print 2>/dev/null | sed "s|/.git$||";',
      '}',
      '| sed "s|^$HOME/||"',
      "| awk 'length($0) > 0'",
      '| sort -u'
    ].join(' ');
    const sessionDiscoveryCmd = [
      '{',
      "tmux list-sessions -F '#{session_name}' 2>/dev/null || true",
      '}',
      "| awk 'length($0) > 0'",
      '| sort -u'
    ].join(' ');
    const projectDisplayName = (path) => {
      if (!path) return 'main';
      return String(path).split('/').filter(Boolean).pop() || String(path);
    };
    const titleCaseLabel = (value) => String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase());
    const groupProjectDiscoveries = (entries, allEntries) => {
      const names = allEntries.map(entry => entry.nameKey).filter(Boolean);
      const nameCounts = new Map();
      for (const name of names) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      const baseKeys = names
        .filter((name, idx, arr) => arr.indexOf(name) === idx)
        .filter(name => names.filter(candidate => candidate === name || candidate.startsWith(`${name}-`)).length > 1)
        .sort((a, b) => b.length - a.length);
      const groups = [];
      const byKey = new Map();
      const getGroup = (key, label = '', discoveredCount = 1) => {
        const mapKey = key || `__single_${groups.length}`;
        if (!key || !byKey.has(mapKey)) {
          const group = { key: mapKey, label, discoveredCount, entries: [] };
          groups.push(group);
          if (key) byKey.set(mapKey, group);
          return group;
        }
        const group = byKey.get(mapKey);
        group.discoveredCount = Math.max(group.discoveredCount || 1, discoveredCount);
        return group;
      };
      for (const entry of entries) {
        let groupKey = '';
        let discoveredCount = 1;
        if (entry.nameKey && (nameCounts.get(entry.nameKey) || 0) > 1) {
          groupKey = entry.nameKey;
          discoveredCount = nameCounts.get(entry.nameKey) || 1;
        } else {
          groupKey = baseKeys.find(base => entry.nameKey === base || entry.nameKey.startsWith(`${base}-`)) || '';
          if (groupKey) {
            discoveredCount = names.filter(candidate => candidate === groupKey || candidate.startsWith(`${groupKey}-`)).length;
          }
        }
        const group = groupKey ? getGroup(groupKey, titleCaseLabel(groupKey), discoveredCount) : getGroup('');
        group.entries.push(entry);
      }
      return groups;
    };

    new Setting(containerEl)
      .setName('Coder username')
      .setDesc('Required for Coder connections. Used with each workspace ID to compute main.<workspace-id>.<username>.coder.')
      .addText(txt => txt
        .setPlaceholder('your-coder-username')
        .setValue(gsd.coderUser || '')
        .onChange(async v => { gsd.coderUser = v.trim(); await saveAll(); }));

    // --- Workspace rows ---
    const workspaceList = containerEl.createDiv({ cls: 'cw-settings-sortable-list' });
    gsd.workspaces.forEach((ws, wsIdx) => {
      const t = typeOf(ws);

      const wrap = workspaceList.createDiv({ cls: 'setting-item cw-settings-workspace-row' });
      wrap.style.display = 'block';
      wrap.style.paddingTop = '14px';
      wrap.style.paddingBottom = '14px';
      wrap.style.borderBottom = '1px solid var(--background-modifier-border)';

      // Header row: name + type badge
      const header = wrap.createDiv();
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.gap = '10px';
      header.style.marginBottom = '8px';

      const title = header.createDiv({ cls: 'setting-item-name' });
      title.setText(ws.displayName || ws.coderName || '(unnamed)');
      title.style.fontSize = '16px';
      title.style.fontWeight = '600';

      const badge = header.createSpan();
      badge.setText(typeLabel(t));
      badge.style.fontSize = '10px';
      badge.style.textTransform = 'uppercase';
      badge.style.letterSpacing = '0.5px';
      badge.style.padding = '2px 8px';
      badge.style.borderRadius = '10px';
      badge.style.background =
        t === 'ssh'   ? 'hsl(200, 45%, 30%)' :
        t === 'local' ? 'hsl(140, 40%, 28%)' :
                        'hsl(30, 55%, 35%)';
      badge.style.color = 'var(--text-on-accent)';

      const orderControls = header.createDiv();
      orderControls.style.marginLeft = 'auto';
      orderControls.style.display = 'flex';
      orderControls.style.gap = '4px';
      addDragHandle(wrap, gsd.workspaces, wsIdx, workspaceList, 'connection', orderControls);
      const wsUpBtn = orderControls.createEl('button', { text: '↑' });
      styleMoveButton(wsUpBtn, 'Move connection up', wsIdx === 0);
      wsUpBtn.addEventListener('click', () => moveItem(gsd.workspaces, wsIdx, -1));
      const wsDownBtn = orderControls.createEl('button', { text: '↓' });
      styleMoveButton(wsDownBtn, 'Move connection down', wsIdx === gsd.workspaces.length - 1);
      wsDownBtn.addEventListener('click', () => moveItem(gsd.workspaces, wsIdx, 1));

      // --- Common fields ---
      new Setting(wrap)
        .setName('Display name')
        .setDesc('Shown in the workspace picker.')
        .addText(txt => txt
          .setPlaceholder(t === 'ssh' ? 'Remote server' : 'My workspace')
          .setValue(ws.displayName || '')
          .onChange(async v => {
            ws.displayName = v.trim();
            title.setText(v.trim() || ws.coderName || '(unnamed)');
            await saveAll();
          }));

      new Setting(wrap)
        .setName(
          t === 'coder' ? 'Coder workspace ID' :
                          'Identifier'
        )
        .setDesc(t === 'ssh'
          ? 'Internal id for the picker. Keep it short and unique.'
          : t === 'local'
          ? 'Internal id for the picker. Keep it short and unique.'
          : 'Workspace slug from Coder. Used with the username above to compute main.<workspace-id>.<username>.coder.')
        .addText(txt => txt
          .setPlaceholder(
            t === 'ssh'   ? 'vm1' :
            t === 'local' ? 'local' :
                            'my-workspace'
          )
          .setValue(ws.coderName || '')
          .onChange(async v => {
            ws.coderName = v.trim();
            if (!ws.displayName) title.setText(ws.coderName || '(unnamed)');
            await saveAll();
          }));

      if (t !== 'local') {
        new Setting(wrap)
          .setName('Upload directory')
          .setDesc('Absolute directory on this remote workspace for pasted images and dropped files. Configure before uploading; no user path is assumed.')
          .addText(txt => txt
            .setPlaceholder('/absolute/path/to/uploads')
            .setValue(ws.uploadDir || '')
            .onChange(async v => {
              const value = v.trim();
              if (value && (!value.startsWith('/') || /[\x00-\x1f\x7f]/.test(value))) {
                new Notice('Use an absolute remote directory without control characters.');
                return;
              }
              ws.uploadDir = value;
              await saveAll();
            }));
      }

      // --- Type-specific fields ---
      if (t === 'ssh') {
        new Setting(wrap)
          .setName('SSH host')
          .setDesc('user@host — full SSH target.')
          .addText(txt => txt
            .setPlaceholder('user@host.example.com')
            .setValue(ws.sshHost || '')
            .onChange(async v => { ws.sshHost = v.trim(); await saveAll(); }));

        new Setting(wrap)
          .setName('PEM key path')
          .setDesc('Absolute path to the SSH private key. Leave empty if ~/.ssh/config handles auth.')
          .addText(txt => txt
            .setPlaceholder('/absolute/path/to/key.pem')
            .setValue(ws.pemPath || '')
            .onChange(async v => { ws.pemPath = v.trim(); await saveAll(); }));
      } else if (t === 'local') {
        new Setting(wrap)
          .setName('Shell')
          .setDesc('Optional — defaults to your login shell. Example: /bin/zsh')
          .addText(txt => txt
            .setPlaceholder('(system default)')
            .setValue(ws.shell || '')
            .onChange(async v => { ws.shell = v.trim(); await saveAll(); }));

        new Setting(wrap)
          .setName('Use tmux')
          .setDesc('Wrap local sessions in tmux so they persist across terminal tab closes.')
          .addToggle(tg => tg
            .setValue(!!ws.useTmux)
            .onChange(async v => { ws.useTmux = v; await saveAll(); }));
      } else {
        // Coder type
        const coderUser = gsd.coderUser || '';
        const previewHost = ws.coderName && coderUser
          ? `main.${ws.coderName}.${coderUser}.coder`
          : 'main.<workspace-id>.<username>.coder';
        new Setting(wrap)
          .setName('SSH host (computed)')
          .setDesc(previewHost + (coderUser ? '' : '  (set Coder username above)'));
      }

      // --- Sessions / projects for this workspace ---
      const sessionsLabel = wrap.createDiv({ cls: 'setting-item-name' });
      sessionsLabel.setText(
        t === 'local' ? 'Sessions' : 'Projects'
      );
      sessionsLabel.style.marginTop = '12px';

      const sessionsDesc = wrap.createDiv({ cls: 'setting-item-description' });
      sessionsDesc.setText(
        t === 'ssh'   ? 'Each row is a remote project directory. Opening one attaches or creates a tmux session named from the project.' :
        t === 'local' ? 'Each row opens a local shell. The label shows in the picker; the path is the working directory (relative or absolute, empty = home).' :
                        'Each row is a project directory (cd target) that appears as a leaf under this Coder workspace.'
      );
      sessionsDesc.style.marginBottom = '6px';

      ws.projects = ws.projects || [];
      const pathPlaceholder =
        t === 'ssh'   ? 'project path (e.g. projects/foo)' :
        t === 'local' ? 'working directory (e.g. ~/projects/foo)' :
                        'project path (e.g. my-app)';

      const projectList = wrap.createDiv({ cls: 'cw-settings-sortable-list' });
      ws.projects.forEach((proj, pIdx) => {
        if (proj && proj.type === 'separator') {
          const sepRow = projectList.createDiv({ cls: 'cw-settings-separator-row' });
          sepRow.style.display = 'flex';
          sepRow.style.gap = '8px';
          sepRow.style.alignItems = 'center';
          sepRow.style.margin = '12px 0 8px';
          addDragHandle(sepRow, ws.projects, pIdx, projectList, 'separator');

          const sepLabel = sepRow.createDiv();
          sepLabel.setText('Separator');
          sepLabel.style.fontSize = '10px';
          sepLabel.style.fontWeight = '700';
          sepLabel.style.letterSpacing = '0.08em';
          sepLabel.style.textTransform = 'uppercase';
          sepLabel.style.color = 'var(--text-faint)';
          sepLabel.style.minWidth = '74px';

          const labelInput = sepRow.createEl('input', { type: 'text' });
          labelInput.placeholder = 'Group label';
          labelInput.value = proj.label || proj.displayName || '';
          labelInput.style.flex = '1';
          labelInput.addEventListener('change', async () => {
            const value = labelInput.value.trim();
            proj.label = value;
            proj.displayName = value;
            await saveAll();
          });

          const line = sepRow.createDiv();
          line.style.height = '1px';
          line.style.background = 'var(--background-modifier-border)';
          line.style.flex = '1';

          const rowUpBtn = sepRow.createEl('button', { text: '↑' });
          styleMoveButton(rowUpBtn, 'Move separator up', pIdx === 0);
          rowUpBtn.addEventListener('click', () => moveItem(ws.projects, pIdx, -1));

          const rowDownBtn = sepRow.createEl('button', { text: '↓' });
          styleMoveButton(rowDownBtn, 'Move separator down', pIdx === ws.projects.length - 1);
          rowDownBtn.addEventListener('click', () => moveItem(ws.projects, pIdx, 1));

          const delBtn = sepRow.createEl('button', { text: '×' });
          delBtn.style.width = '28px';
          delBtn.title = 'Remove this separator';
          delBtn.addEventListener('click', async () => {
            ws.projects.splice(pIdx, 1);
            await saveAll();
            this.display();
          });
          return;
        }

        const projRow = projectList.createDiv({ cls: 'cw-settings-project-row' });
        projRow.style.display = 'flex';
        projRow.style.gap = '8px';
        projRow.style.alignItems = 'center';
        projRow.style.marginBottom = '6px';
        addDragHandle(projRow, ws.projects, pIdx, projectList, 'project');

        const labelInput = projRow.createEl('input', { type: 'text' });
        labelInput.placeholder = 'Label (shown in picker)';
        labelInput.value = proj.displayName || '';
        labelInput.style.flex = '1';
        labelInput.addEventListener('change', async () => {
          proj.displayName = labelInput.value.trim();
          await saveAll();
        });

        const pathInput = projRow.createEl('input', { type: 'text' });
        pathInput.placeholder = pathPlaceholder;
        pathInput.value = proj.path || '';
        pathInput.style.flex = '1';
        pathInput.addEventListener('change', async () => {
          proj.path = pathInput.value.trim();
          await saveAll();
        });

        const rowUpBtn = projRow.createEl('button', { text: '↑' });
        styleMoveButton(rowUpBtn, 'Move row up', pIdx === 0);
        rowUpBtn.addEventListener('click', () => moveItem(ws.projects, pIdx, -1));

        const rowDownBtn = projRow.createEl('button', { text: '↓' });
        styleMoveButton(rowDownBtn, 'Move row down', pIdx === ws.projects.length - 1);
        rowDownBtn.addEventListener('click', () => moveItem(ws.projects, pIdx, 1));

        const sepBtn = projRow.createEl('button', { text: '─' });
        sepBtn.style.width = '28px';
        sepBtn.title = 'Insert separator below';
        sepBtn.addEventListener('click', async () => {
          ws.projects.splice(pIdx + 1, 0, { type: 'separator', label: 'Group', displayName: 'Group' });
          this._pendingScrollTop = this._activeContentEl ? this._activeContentEl.scrollTop : 0;
          await saveAll();
          this.display();
        });

        const delBtn = projRow.createEl('button', { text: '×' });
        delBtn.style.width = '28px';
        delBtn.title = 'Remove this row';
        delBtn.addEventListener('click', async () => {
          ws.projects.splice(pIdx, 1);
          await saveAll();
          this.display();
        });
      });

      // --- Test Connection / Find Projects ---
      const validateConnection = () => {
        if (t === 'local') return true;
        if (t === 'coder') {
          const cu = (gsd.coderUser || '').trim();
          if (!cu || !ws.coderName) {
            new Notice('Set Coder username and Coder workspace ID first.');
            return false;
          }
        } else {
          if (!ws.sshHost) {
            new Notice('Set SSH host first.');
            return false;
          }
        }
        return true;
      };

      const toolsSetting = new Setting(wrap);
      if (t !== 'local') {
        toolsSetting
          .addButton(btn => btn
            .setButtonText('Test Connection')
            .onClick(async () => {
              if (!validateConnection()) return;
              new Notice('Testing connection...');
              try {
                const out = await this.plugin._remoteShellExec(ws, 'echo ok');
                if (String(out).trim() === 'ok') {
                  new Notice('\u2705 Connected');
                } else {
                  new Notice('\u26A0\uFE0F Unexpected response: ' + String(out).trim(), 6000);
                }
              } catch (err) {
                const msg = err && err.message ? err.message : String(err);
                new Notice('\u274C Connection failed: ' + msg, 8000);
              }
            }));
      }
      toolsSetting
        .addButton(btn => btn
          .setButtonText('Find Projects')
          .onClick(async () => {
            if (!validateConnection()) return;
            new Notice('Scanning for projects...');
            try {
              const output = await this.plugin._remoteShellExec(ws, projectDiscoveryCmd);
              if (!output || !output.trim()) {
                new Notice('No projects found.');
                return;
              }
              ws.projects = ws.projects || [];
              let changedExisting = false;
              const rootProject = ws.projects.find(p => p && p.type !== 'separator' && (p.path || '') === '');
              if (rootProject && !rootProject.displayName) {
                rootProject.displayName = 'main';
                changedExisting = true;
              }
              const discovered = output.split('\n')
                .map(l => l.trim())
                .filter(Boolean)
                .map(raw => {
                  if (raw === ROOT_PROJECT_TOKEN) {
                    return t === 'local'
                      ? { path: '~', displayName: 'home' }
                      : { path: '', displayName: 'main' };
                  }
                  const path = t === 'local' && !raw.startsWith('/') && !raw.startsWith('~') ? `~/${raw}` : raw;
                  return { path, displayName: projectDisplayName(path) };
                })
                .filter(entry => entry.path || t !== 'local')
                .map(entry => ({
                  ...entry,
                  nameKey: String(entry.displayName || projectDisplayName(entry.path)).toLowerCase()
                }));
              const deduped = [];
              const discoveredPaths = new Set();
              for (const entry of discovered) {
                if (discoveredPaths.has(entry.path)) continue;
                discoveredPaths.add(entry.path);
                deduped.push(entry);
              }
              const alreadyConfigured = new Set((ws.projects || [])
                .filter(p => p && p.type !== 'separator')
                .map(p => p.path || ''));
              const toAdd = deduped.filter(entry => !alreadyConfigured.has(entry.path));
              if (toAdd.length === 0) {
                if (changedExisting) {
                  await saveAll();
                  new Notice('Updated main project label.');
                  this.display();
                  return;
                }
                new Notice('All discovered projects are already added.');
                return;
              }
              const existingSeparators = new Set((ws.projects || [])
                .filter(p => p && p.type === 'separator')
                .map(p => String(p.label || p.displayName || '').trim().toLowerCase())
                .filter(Boolean));
              const groups = groupProjectDiscoveries(toAdd, deduped);
              for (const group of groups) {
                if (group.label && group.discoveredCount > 1 && !existingSeparators.has(group.label.toLowerCase())) {
                  ws.projects.push({ type: 'separator', label: group.label, displayName: group.label });
                  existingSeparators.add(group.label.toLowerCase());
                }
                for (const entry of group.entries) {
                  ws.projects.push({ path: entry.path, displayName: entry.displayName });
                }
              }
              await saveAll();
              new Notice(`\u2705 Added ${toAdd.length} project(s).`);
              this.display();
            } catch (err) {
              const msg = err && err.message ? err.message : String(err);
              new Notice('\u274C Discovery failed: ' + msg, 8000);
            }
          }));

      const addLabel =
        t !== 'local' ? '+ Add project' :
                        '+ Add session';

      new Setting(wrap)
        .addButton(btn => btn
          .setButtonText(addLabel)
          .onClick(async () => {
            ws.projects.push(
              t === 'ssh'   ? { path: 'projects/example', displayName: 'example' } :
              t === 'local' ? { path: '~', displayName: 'home' } :
                              { path: '', displayName: '' }
            );
            await saveAll();
            this.display();
          }))
        .addButton(btn => btn
          .setButtonText('+ Add separator')
          .onClick(async () => {
            ws.projects.push({ type: 'separator', label: 'Group', displayName: 'Group' });
            await saveAll();
            this.display();
          }))
        .addButton(btn => btn
          .setButtonText('Delete connection')
          .setWarning()
          .onClick(async () => {
            const realIdx = gsd.workspaces.indexOf(ws);
            if (realIdx >= 0) gsd.workspaces.splice(realIdx, 1);
            await saveAll();
            this.display();
          }));
    });

    // --- Unified "+ Add connection" button with a type menu ---
    const addRow = containerEl.createDiv();
    addRow.style.marginTop = '16px';
    addRow.style.display = 'flex';
    addRow.style.justifyContent = 'flex-end';

    const addBtn = addRow.createEl('button', { text: '+ Add connection' });
    addBtn.addClass('mod-cta');

    addBtn.addEventListener('click', (evt) => {
      const menu = new Menu();

      menu.addItem(item => item
        .setTitle('Coder workspace')
        .setIcon('server')
        .onClick(async () => {
          const nextId = 'coder' + (gsd.workspaces.filter(w => typeOf(w) === 'coder').length + 1);
          gsd.workspaces.push({
            coderName: nextId,
            displayName: 'New Coder workspace',
            type: 'coder',
            projects: [{ path: '', displayName: 'main' }]
          });
          await saveAll();
          this.display();
        }));

      menu.addItem(item => item
        .setTitle('SSH connection (PEM key)')
        .setIcon('key')
        .onClick(async () => {
          const nextId = 'ssh' + (gsd.workspaces.filter(w => typeOf(w) === 'ssh').length + 1);
          gsd.workspaces.push({
            coderName: nextId,
            displayName: 'New SSH connection',
            type: 'ssh',
            sshHost: '',
            pemPath: '',
            projects: [{ path: 'main', displayName: 'main' }]
          });
          await saveAll();
          this.display();
        }));

      menu.addItem(item => item
        .setTitle('SSH connection (~/.ssh/config)')
        .setIcon('globe')
        .onClick(async () => {
          const nextId = 'ssh' + (gsd.workspaces.filter(w => typeOf(w) === 'ssh').length + 1);
          gsd.workspaces.push({
            coderName: nextId,
            displayName: 'New SSH host',
            type: 'ssh',
            sshHost: '',
            pemPath: '',  // empty → rely on ~/.ssh/config
            projects: [{ path: 'main', displayName: 'main' }]
          });
          await saveAll();
          this.display();
        }));

      menu.addItem(item => item
        .setTitle('Local machine')
        .setIcon('monitor')
        .onClick(async () => {
          const nextId = 'local' + (gsd.workspaces.filter(w => typeOf(w) === 'local').length + 1);
          gsd.workspaces.push({
            coderName: nextId,
            displayName: 'Local',
            type: 'local',
            shell: '',
            useTmux: false,
            projects: [{ path: '~', displayName: 'home' }]
          });
          await saveAll();
          this.display();
        }));

      menu.showAtMouseEvent(evt);
    });
  }
}

module.exports = Workbench;
