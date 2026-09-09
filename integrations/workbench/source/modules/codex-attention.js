/*
 * Codex Attention module — runs inside Workbench on the operator machine.
 *
 * Codex emits a sanitized completion event on the selected workspace. This
 * module keeps one authenticated SSH stream open to that workspace and turns
 * each event into a native desktop notification. Detection and queueing stay
 * remote; the local module is only a receiver.
 */

const CODEX_ATTENTION_ID_RE = /^[a-f0-9]{64}$/;
const CODEX_ATTENTION_MAX_LINE = 128 * 1024;
const CODEX_ATTENTION_SEEN_LIMIT = 512;
const CODEX_ATTENTION_RECONNECT_DELAYS = [2000, 5000, 10000, 30000];
const CODEX_ATTENTION_SSH_OPTIONS = [
  '-o', 'ControlMaster=auto',
  '-o', 'ControlPath=/tmp/cw-codex-attention-mux-%r@%h:%p',
  '-o', 'ControlPersist=1800',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ServerAliveCountMax=3',
];

function codexAttentionShellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

class CodexAttentionModule {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.settings = null;
    this.listener = null;
    this.listenerBuffer = '';
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.stopping = false;
    this.activeWorkspace = null;
    this.status = 'stopped';
    this.lastError = '';
    this.noticeError = '';
    this.seenIds = new Set();
    this.pendingIds = new Set();
    this.activeNotifications = new Set();
    this.supportedPlatform = os.platform() === 'darwin';
  }

  async load() {
    if (!this.plugin.settings.codexAttention || typeof this.plugin.settings.codexAttention !== 'object') {
      this.plugin.settings.codexAttention = {};
    }
    this.settings = this.plugin.settings.codexAttention;
    let dirty = false;
    if (typeof this.settings.enabled !== 'boolean') {
      this.settings.enabled = true;
      dirty = true;
    }
    if (typeof this.settings.workspace !== 'string') {
      this.settings.workspace = '';
      dirty = true;
    }
    if (!Array.isArray(this.settings.seenEventIds)) {
      this.settings.seenEventIds = [];
      dirty = true;
    }
    const normalizedSeen = [...new Set(this.settings.seenEventIds
      .map((value) => String(value || '').toLowerCase())
      .filter((value) => CODEX_ATTENTION_ID_RE.test(value)))]
      .slice(-CODEX_ATTENTION_SEEN_LIMIT);
    if (JSON.stringify(normalizedSeen) !== JSON.stringify(this.settings.seenEventIds)) {
      this.settings.seenEventIds = normalizedSeen;
      dirty = true;
    }
    this.seenIds = new Set(normalizedSeen);
    if (dirty) await this.plugin.saveSettings();

    this.plugin.addCommand({
      id: 'codex-attention-test-notification',
      name: 'Codex alerts: Test Mac notification',
      callback: () => this.testNotification(),
    });
    this.plugin.addCommand({
      id: 'codex-attention-restart-listener',
      name: 'Codex alerts: Restart VM listener',
      callback: () => this.restart(),
    });
    this.plugin.addCommand({
      id: 'codex-attention-listener-status',
      name: 'Codex alerts: Show listener status',
      callback: () => {
        new Notice(`Codex alerts: ${this.getStatusSummary()}`, 6000);
      },
    });

    if (!this.supportedPlatform) {
      this.status = 'macOS only';
      return;
    }

    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(() => {
        if (!this.stopping && this.settings.enabled) this.start();
      }, 1500);
    });
  }

  _gsdSettings() {
    const gsd = this.plugin.modules && this.plugin.modules.gsd;
    return (gsd && gsd.settings) || this.plugin.settings.gsd || {};
  }

  _workspaceLabel(workspace) {
    return String((workspace && (workspace.displayName || workspace.coderName || workspace.sshHost)) || 'workspace');
  }

  _selectWorkspace() {
    const workspaces = this.plugin._getGsdWorkspaces(this._gsdSettings());
    if (!workspaces.length) return null;
    const configured = this.settings.workspace.trim();
    if (configured) {
      const exact = workspaces.find((workspace) =>
        workspace && (workspace.coderName === configured || workspace.displayName === configured)
      );
      if (exact) return exact;
    }
    return workspaces.find((workspace) => workspace && workspace.coderName === 'ops-main')
      || workspaces.find((workspace) => workspace && workspace.coderName === 'main')
      || workspaces.find((workspace) => workspace && workspace.type !== 'local')
      || workspaces[0];
  }

  _target(workspace) {
    if (!workspace) throw new Error('No Workbench workspace is configured');
    if (workspace.type === 'local' || this.plugin._isCurrentCoderWorkspace(workspace, this._gsdSettings())) {
      return { local: true, label: this._workspaceLabel(workspace) };
    }
    if (workspace.type === 'ssh' || workspace.type === 'vm') {
      if (!workspace.sshHost) throw new Error('SSH host is missing');
      return {
        local: false,
        host: workspace.sshHost,
        pemPath: workspace.pemPath || '',
        coderTransport: false,
        label: this._workspaceLabel(workspace),
      };
    }
    const coderUser = this.plugin._getGsdCoderUser(this._gsdSettings());
    if (!coderUser) throw new Error('Coder username is not configured');
    return {
      local: false,
      host: `main.${workspace.coderName}.${coderUser}.coder`,
      pemPath: '',
      coderTransport: true,
      label: this._workspaceLabel(workspace),
    };
  }

  _localExecutable() {
    const userExecutable = path.join(os.homedir(), '.local', 'bin', 'codex-workbench-notify');
    if (fs.existsSync(userExecutable)) return userExecutable;
    return 'codex-workbench-notify';
  }

  _remoteCommand(args) {
    const commandArgs = args.map(codexAttentionShellQuote).join(' ');
    return [
      'if command -v codex-workbench-notify >/dev/null 2>&1; then',
      `exec codex-workbench-notify ${commandArgs};`,
      'elif [ -x "$HOME/.local/bin/codex-workbench-notify" ]; then',
      `exec "$HOME/.local/bin/codex-workbench-notify" ${commandArgs};`,
      'else echo "codex-workbench-notify is not installed" >&2; exit 127; fi',
    ].join(' ');
  }

  _spawn(target, args, options = {}) {
    if (target.local) return spawn(this._localExecutable(), args, options);
    const sshArgs = [];
    if (target.pemPath) sshArgs.push('-i', target.pemPath);
    sshArgs.push(
      ...CODEX_ATTENTION_SSH_OPTIONS,
      '-o', `StrictHostKeyChecking=${target.coderTransport ? 'no' : 'accept-new'}`,
      '-T', target.host, this._remoteCommand(args)
    );
    return spawn('/usr/bin/ssh', sshArgs, options);
  }

  start() {
    if (!this.supportedPlatform) {
      this.status = 'macOS only';
      return;
    }
    if (this.stopping || !this.settings.enabled || this.listener) return;
    const workspace = this._selectWorkspace();
    if (!workspace) {
      this.status = 'waiting for workspace';
      this._scheduleReconnect();
      return;
    }
    this.activeWorkspace = workspace;
    let target;
    try {
      target = this._target(workspace);
    } catch (error) {
      this._listenerFailed(error);
      return;
    }

    this.status = 'connecting';
    this.listenerBuffer = '';
    const child = this._spawn(target, ['watch', '--poll-interval', '1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.listener = child;
    let stderr = '';

    child.stdout.on('data', (chunk) => this._consumeListenerOutput(chunk));
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8192) stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (this.listener === child) this.listener = null;
      this._listenerFailed(error);
    });
    child.on('close', (code) => {
      if (this.listener === child) this.listener = null;
      if (this.stopping || !this.settings.enabled) return;
      this._listenerFailed(new Error(stderr.trim() || `VM listener exited ${code}`));
    });
  }

  _consumeListenerOutput(chunk) {
    this.listenerBuffer += chunk.toString('utf8');
    while (this.listenerBuffer.includes('\n')) {
      const newline = this.listenerBuffer.indexOf('\n');
      const line = this.listenerBuffer.slice(0, newline);
      this.listenerBuffer = this.listenerBuffer.slice(newline + 1);
      if (line.length > CODEX_ATTENTION_MAX_LINE) {
        const child = this.listener;
        if (child) child.kill();
        this._listenerFailed(new Error('VM listener sent an oversized message'));
        return;
      }
      if (!line.trim()) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch (_) {
        console.warn('[workbench] ignored malformed Codex attention event');
        continue;
      }
      if (message.type === 'ready' || message.type === 'heartbeat') {
        this.status = 'listening';
        this.lastError = '';
        this.noticeError = '';
        this.reconnectAttempt = 0;
      } else if (message.type === 'codex-attention') {
        this._receiveEvent(message.event).catch((error) => {
          console.warn('[workbench] Codex notification failed:', error && error.message);
        });
      }
    }
    if (this.listenerBuffer.length > CODEX_ATTENTION_MAX_LINE) {
      const child = this.listener;
      this.listenerBuffer = '';
      if (child) child.kill();
      this._listenerFailed(new Error('VM listener sent an oversized message'));
    }
  }

  _cleanText(value, limit) {
    return String(value || '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  }

  _normalizeEvent(event) {
    if (!event || typeof event !== 'object') return null;
    const id = String(event.id || '').toLowerCase();
    if (!CODEX_ATTENTION_ID_RE.test(id) || event.type !== 'agent-turn-complete') return null;
    return {
      id,
      type: 'agent-turn-complete',
      created_at: this._cleanText(event.created_at, 64),
      thread_id: this._cleanText(event.thread_id, 256),
      turn_id: this._cleanText(event.turn_id, 256),
      cwd: this._cleanText(event.cwd, 1024),
      tmux_session: this._cleanText(event.tmux_session, 128),
      workspace: this._cleanText(event.workspace, 128),
    };
  }

  async _receiveEvent(rawEvent) {
    const event = this._normalizeEvent(rawEvent);
    if (!event || this.seenIds.has(event.id) || this.pendingIds.has(event.id)) return;
    this.pendingIds.add(event.id);
    try {
      await this._showNativeNotification(event);
      this._rememberEvent(event.id);
    } finally {
      this.pendingIds.delete(event.id);
    }
  }

  _rememberEvent(eventId) {
    if (this.seenIds.has(eventId)) return;
    this.seenIds.add(eventId);
    const recent = [...this.settings.seenEventIds, eventId]
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(-CODEX_ATTENTION_SEEN_LIMIT);
    this.settings.seenEventIds = recent;
    this.seenIds = new Set(recent);
    this.plugin.saveSettings().catch((error) => {
      console.warn('[workbench] could not persist Codex notification dedup state:', error && error.message);
    });
  }

  _notificationLabels(event, isTest = false) {
    if (isTest) {
      return {
        title: 'Codex alert test',
        body: 'Workbench notifications are working.',
      };
    }
    const project = event.cwd ? path.basename(event.cwd) : '';
    const session = event.tmux_session || project || 'session';
    return {
      title: `Codex finished · ${session}`,
      body: project && project !== session
        ? `Waiting for your review in ${project}.`
        : 'This session is waiting for your review.',
    };
  }

  async _showNativeNotification(event, isTest = false) {
    const labels = this._notificationLabels(event, isTest);
    const NotificationApi = window.Notification;
    if (typeof NotificationApi !== 'function') {
      new Notice(`${labels.title}: ${labels.body}`, 8000);
      return;
    }

    let permission = NotificationApi.permission;
    if (permission === 'default' && typeof NotificationApi.requestPermission === 'function') {
      try { permission = await NotificationApi.requestPermission(); } catch (_) {}
    }
    if (permission !== 'granted') {
      new Notice(`${labels.title}: ${labels.body}`, 8000);
      return;
    }

    const notification = new NotificationApi(labels.title, {
      body: labels.body,
      tag: isTest ? `codex-attention-test-${Date.now()}` : `codex-attention-${event.id}`,
      silent: false,
    });
    this.activeNotifications.add(notification);
    while (this.activeNotifications.size > 50) {
      const oldest = this.activeNotifications.values().next().value;
      this.activeNotifications.delete(oldest);
      try { oldest.close(); } catch (_) {}
    }
    const cleanup = () => this.activeNotifications.delete(notification);
    notification.onclose = cleanup;
    notification.onerror = cleanup;
    notification.onclick = () => {
      cleanup();
      this._focusMatchingSession(event);
      try { notification.close(); } catch (_) {}
    };
  }

  _focusMatchingSession(event) {
    try { window.focus(); } catch (_) {}
    const tmuxName = event && event.tmux_session;
    if (!tmuxName) return;
    const workspaceName = String(
      (this.activeWorkspace && this.activeWorkspace.coderName) || event.workspace || ''
    );
    const leaves = this.app.workspace.getLeavesOfType('vin-terminal-view');
    for (const leaf of leaves) {
      const view = leaf && leaf.view;
      const session = (view && Array.isArray(view.sessions) ? view.sessions : []).find((candidate) =>
        candidate
        && (candidate.__cwTmuxName === tmuxName || candidate.name === tmuxName)
        && (!candidate.__cwWorkspace || !workspaceName || candidate.__cwWorkspace === workspaceName)
      );
      if (!session) continue;
      this.app.workspace.revealLeaf(leaf);
      if (typeof view.switchTo === 'function') view.switchTo(session);
      return;
    }
  }

  async testNotification() {
    await this._showNativeNotification({
      id: '0'.repeat(64),
      type: 'agent-turn-complete',
      cwd: '',
      tmux_session: 'test-session',
    }, true);
  }

  _listenerFailed(error) {
    if (this.stopping || !this.settings.enabled) return;
    const message = this._cleanText((error && error.message) || String(error), 300);
    this.status = 'reconnecting';
    this.lastError = message;
    if (message && message !== this.noticeError) {
      this.noticeError = message;
      new Notice(`Codex alert listener unavailable: ${message}`, 7000);
    }
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (this.stopping || this.reconnectTimer || !this.settings.enabled) return;
    const index = Math.min(this.reconnectAttempt, CODEX_ATTENTION_RECONNECT_DELAYS.length - 1);
    const delay = CODEX_ATTENTION_RECONNECT_DELAYS[index];
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, delay);
  }

  _stopListener() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.listener) {
      const child = this.listener;
      this.listener = null;
      child.kill();
    }
  }

  restart() {
    this._stopListener();
    this.activeWorkspace = null;
    this.reconnectAttempt = 0;
    if (!this.supportedPlatform) {
      this.status = 'macOS only';
      return;
    }
    this.status = this.settings.enabled ? 'restarting' : 'disabled';
    if (this.settings.enabled && !this.stopping) {
      window.setTimeout(() => this.start(), 100);
    }
  }

  setEnabled(enabled) {
    this.settings.enabled = Boolean(enabled);
    if (this.settings.enabled) this.restart();
    else {
      this._stopListener();
      this.status = 'disabled';
    }
  }

  getStatusSummary() {
    const label = this.activeWorkspace ? this._workspaceLabel(this.activeWorkspace) : 'auto workspace';
    return `${this.status} · ${label}${this.lastError ? ` · ${this.lastError}` : ''}`;
  }

  async unload() {
    this.stopping = true;
    this._stopListener();
    for (const notification of this.activeNotifications) {
      try { notification.close(); } catch (_) {}
    }
    this.activeNotifications.clear();
    this.pendingIds.clear();
  }
}

module.exports = CodexAttentionModule;
