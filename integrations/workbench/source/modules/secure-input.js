/*
 * Secure Input module — runs inside workbench.
 *
 * A single persistent broker listener watches the explicitly selected workspace
 * for owner-only credential requests. The modal encrypts values in the
 * Obsidian renderer before an encrypted envelope is streamed through SSH.
 * Plaintext values are never written to terminal input, command arguments,
 * plugin settings, logs, or the vault.
 */

const SECENV_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SECENV_FIELD_RE = /^[A-Z][A-Z0-9_]*$/;
const SECENV_MAX_LINE = 1024 * 1024;
const SECENV_RECONNECT_DELAYS = [2000, 5000, 10000, 30000];
const SECENV_SSH_OPTIONS = [
  '-o', 'ControlMaster=auto',
  '-o', 'ControlPath=/tmp/cw-secenv-mux-%r@%h:%p',
  '-o', 'ControlPersist=1800',
  '-o', 'ServerAliveInterval=30',
  '-o', 'ServerAliveCountMax=3',
];

function secenvShellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function secenvB64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

class SecureInputModal extends Modal {
  constructor(app, module, request, workspaceLabel) {
    super(app);
    this.module = module;
    this.request = request;
    this.workspaceLabel = workspaceLabel;
    this.inputs = new Map();
    this.completed = false;
    this.suppressCancel = false;
    this.busy = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('cw-secure-input-modal');

    const eyebrow = contentEl.createDiv({ cls: 'cw-secure-input-eyebrow' });
    eyebrow.setText('Secure input · encrypted on this Mac');
    contentEl.createEl('h2', { text: this.request.title || 'Credential request' });
    contentEl.createEl('p', {
      cls: 'cw-secure-input-description',
      text: this.request.description || 'An agent requested one or more credentials.'
    });

    const origin = contentEl.createDiv({ cls: 'cw-secure-input-origin' });
    origin.createSpan({ text: `Destination: ${this.workspaceLabel}` });
    if (this.request.requested_cwd) {
      origin.createSpan({ text: `Requested from: ${this.request.requested_cwd}` });
    }
    for (const target of this.request.install_targets || []) {
      const fieldNames = Array.isArray(target.fields) ? target.fields.filter(Boolean).join(', ') : '';
      origin.createSpan({
        text: `Will write: ${target.path}${fieldNames ? ` · ${fieldNames}` : ''}`
      });
    }
    origin.createSpan({ text: 'The agent receives status only — never these values.' });

    const form = contentEl.createEl('form', { cls: 'cw-secure-input-form' });
    for (const field of this.request.fields) {
      const wrap = form.createDiv({ cls: 'cw-secure-input-field' });
      const label = wrap.createEl('label');
      label.setText(`${field.label || field.name}${field.required === false ? ' (optional)' : ''}`);

      if (field.provider_url) {
        const provider = wrap.createEl('a', {
          cls: 'cw-secure-input-provider',
          text: field.provider_label || 'Open provider',
          href: field.provider_url,
        });
        provider.target = '_blank';
        provider.rel = 'noreferrer noopener';
      }

      const input = field.type === 'textarea'
        ? wrap.createEl('textarea')
        : wrap.createEl('input', { type: field.type === 'text' ? 'text' : 'password' });
      input.name = field.name;
      input.required = field.required !== false;
      input.autocomplete = field.type === 'password' ? 'new-password' : 'off';
      input.spellcheck = false;
      input.dataset.secureInput = 'true';
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.default && field.type !== 'password') input.value = field.default;
      label.htmlFor = `cw-secenv-${this.request.id}-${field.name}`;
      input.id = label.htmlFor;
      this.inputs.set(field.name, input);

      if (field.help) {
        wrap.createDiv({ cls: 'cw-secure-input-help', text: field.help });
      }
    }

    this.statusEl = form.createDiv({ cls: 'cw-secure-input-status' });
    const actions = form.createDiv({ cls: 'cw-secure-input-actions' });
    this.cancelButton = actions.createEl('button', { text: 'Cancel' });
    this.cancelButton.type = 'button';
    this.submitButton = actions.createEl('button', { text: 'Encrypt and send' });
    this.submitButton.type = 'submit';
    this.submitButton.addClass('mod-cta');

    this.cancelButton.addEventListener('click', () => this._cancel());
    form.addEventListener('submit', (event) => this._submit(event));

    window.setTimeout(() => {
      const first = this.inputs.values().next().value;
      if (first) first.focus();
    }, 50);
  }

  _setBusy(busy) {
    this.busy = busy;
    if (this.cancelButton) this.cancelButton.disabled = busy;
    if (this.submitButton) this.submitButton.disabled = busy;
    for (const input of this.inputs.values()) input.disabled = busy;
  }

  _setStatus(message, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.setText(message || '');
    this.statusEl.toggleClass('is-error', Boolean(isError));
  }

  _wipeInputs() {
    for (const input of this.inputs.values()) input.value = '';
  }

  async _submit(event) {
    event.preventDefault();
    if (this.busy) return;

    const values = {};
    for (const field of this.request.fields) {
      const input = this.inputs.get(field.name);
      const value = input ? input.value : '';
      if (field.required !== false && value === '') {
        this._setStatus(`${field.label || field.name} is required.`, true);
        if (input) input.focus();
        return;
      }
      values[field.name] = value;
    }

    this._setBusy(true);
    this._setStatus('Encrypting locally…');
    try {
      const envelope = await this.module.encryptValues(this.request, values);
      for (const name of Object.keys(values)) values[name] = '';
      this._setStatus('Sending encrypted bundle…');
      await this.module.submit(this.request.id, envelope);
      this.completed = true;
      this._wipeInputs();
      this._setStatus('Sent securely. The agent can continue.');
      new Notice(`Secure input delivered to ${this.workspaceLabel}`);
      window.setTimeout(() => this.close(), 250);
    } catch (error) {
      for (const name of Object.keys(values)) values[name] = '';
      this._setBusy(false);
      this._setStatus((error && error.message) || String(error), true);
    }
  }

  _cancel() {
    if (this.busy) return;
    this.completed = true;
    this._wipeInputs();
    this.module.cancel(this.request.id).catch((error) => {
      console.warn('[workbench] secure input cancellation failed:', error && error.message);
    });
    this.close();
  }

  onClose() {
    this._wipeInputs();
    this.contentEl.empty();
    if (!this.completed && !this.suppressCancel) {
      this.module.cancel(this.request.id).catch((error) => {
        console.warn('[workbench] secure input dismissal failed:', error && error.message);
      });
    }
    this.module.modalClosed(this);
  }
}

class SecureInputModule {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.settings = null;
    this.listener = null;
    this.listenerBuffer = '';
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.stopping = false;
    this.queue = [];
    this.knownRequests = new Set();
    this.activeModal = null;
    this.activeWorkspace = null;
    this.status = 'stopped';
    this.lastError = '';
    this.noticeError = '';
  }

  async load() {
    if (!this.plugin.settings.secureInput || typeof this.plugin.settings.secureInput !== 'object') {
      this.plugin.settings.secureInput = {};
    }
    this.settings = this.plugin.settings.secureInput;
    let dirty = false;
    if (typeof this.settings.enabled !== 'boolean') {
      this.settings.enabled = false;
      dirty = true;
    }
    if (typeof this.settings.workspace !== 'string') {
      this.settings.workspace = '';
      dirty = true;
    }
    if (dirty) await this.plugin.saveSettings();

    this.plugin.addCommand({
      id: 'secure-input-restart-listener',
      name: 'Secure input: Restart credential listener',
      callback: () => this.restart(),
    });
    this.plugin.addCommand({
      id: 'secure-input-listener-status',
      name: 'Secure input: Show listener status',
      callback: () => {
        const label = this.activeWorkspace ? this._workspaceLabel(this.activeWorkspace) : 'no workspace';
        new Notice(`Secure input: ${this.status} · ${label}${this.lastError ? ` · ${this.lastError}` : ''}`);
      },
    });

    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(() => {
        if (!this.stopping && this.settings.enabled) this.start();
      }, 1000);
    });
  }

  _gsdSettings() {
    const gsd = this.plugin.modules && this.plugin.modules.gsd;
    return (gsd && gsd.settings) || this.plugin.settings.gsd || {};
  }

  _workspaceLabel(workspace) {
    return String((workspace && (workspace.displayName || workspace.coderName || workspace.sshHost)) || 'workspace');
  }

  _credentialWorkspaces() {
    // Credential routing is an explicit administrative selection. Background
    // workspaces stay hidden from normal terminals, but can receive setup input.
    const settings = this._gsdSettings();
    const top = settings.workspaces;
    const nested = settings.gsd && settings.gsd.workspaces;
    return Array.isArray(top) && top.length ? top : (Array.isArray(nested) ? nested : []);
  }

  _selectWorkspace() {
    const workspaces = this._credentialWorkspaces();
    if (!workspaces.length) return null;
    const configured = this.settings.workspace.trim();
    if (!configured) return null;
    // Never redirect a credential request to a different workspace.
    const matches = workspaces.filter(workspace => workspace && workspace.coderName === configured);
    return matches.length === 1 ? matches[0] : null;
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
    const userExecutable = path.join(os.homedir(), '.local', 'bin', 'secenv');
    if (fs.existsSync(userExecutable)) return userExecutable;
    return 'secenv';
  }

  _remoteCommand(args) {
    const commandArgs = args.map(secenvShellQuote).join(' ');
    return [
      'if command -v secenv >/dev/null 2>&1; then',
      `exec secenv ${commandArgs};`,
      'elif [ -x "$HOME/.local/bin/secenv" ]; then',
      `exec "$HOME/.local/bin/secenv" ${commandArgs};`,
      'else echo "secenv is not installed" >&2; exit 127; fi',
    ].join(' ');
  }

  _spawn(target, args, options = {}) {
    if (target.local) {
      return spawn(this._localExecutable(), args, options);
    }
    const sshArgs = [];
    if (target.pemPath) sshArgs.push('-i', target.pemPath);
    sshArgs.push(
      ...SECENV_SSH_OPTIONS,
      '-o', `StrictHostKeyChecking=${target.coderTransport ? 'no' : 'accept-new'}`,
      '-T', target.host, this._remoteCommand(args)
    );
    return spawn('/usr/bin/ssh', sshArgs, options);
  }

  start() {
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
    const child = this._spawn(target, ['workbench', 'watch', '--poll-interval', '1'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.listener = child;
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      if (this.listener === child) this._consumeListenerOutput(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8192) stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (this.listener !== child) return;
      this.listener = null;
      this._listenerFailed(error);
    });
    child.on('close', (code) => {
      if (this.listener !== child) return;
      this.listener = null;
      if (this.stopping) return;
      const detail = stderr.trim();
      this._listenerFailed(new Error(detail || `credential listener exited ${code}`));
    });
  }

  _consumeListenerOutput(chunk) {
    this.listenerBuffer += chunk.toString('utf8');
    if (this.listenerBuffer.length > SECENV_MAX_LINE) {
      const child = this.listener;
      this.listenerBuffer = '';
      if (child) child.kill();
      this._listenerFailed(new Error('credential listener sent an oversized message'));
      return;
    }
    while (this.listenerBuffer.includes('\n')) {
      const newline = this.listenerBuffer.indexOf('\n');
      const line = this.listenerBuffer.slice(0, newline);
      this.listenerBuffer = this.listenerBuffer.slice(newline + 1);
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch (_) {
        console.warn('[workbench] ignored malformed secure input event');
        continue;
      }
      if (event.type === 'ready') {
        this.status = 'listening';
        this.lastError = '';
        this.noticeError = '';
        this.reconnectAttempt = 0;
      } else if (event.type === 'request') {
        this._receiveRequest(event.request);
      }
    }
  }

  _listenerFailed(error) {
    if (this.stopping) return;
    const message = ((error && error.message) || String(error)).trim().slice(0, 300);
    this.status = 'reconnecting';
    this.lastError = message;
    if (message && message !== this.noticeError) {
      this.noticeError = message;
      new Notice(`Secure input listener unavailable: ${message}`, 7000);
    }
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (this.stopping || this.reconnectTimer || !this.settings.enabled) return;
    const index = Math.min(this.reconnectAttempt, SECENV_RECONNECT_DELAYS.length - 1);
    const delay = SECENV_RECONNECT_DELAYS[index];
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.start();
    }, delay);
  }

  _validRequest(request) {
    if (!request || typeof request !== 'object' || !SECENV_ID_RE.test(String(request.id || ''))) return false;
    if (!Array.isArray(request.fields) || request.fields.length < 1 || request.fields.length > 32) return false;
    if (typeof request.title === 'string' && request.title.length > 200) return false;
    if (typeof request.description === 'string' && request.description.length > 2000) return false;
    if (typeof request.requested_cwd === 'string' && request.requested_cwd.length > 512) return false;
    if (request.install_targets !== undefined) {
      if (!Array.isArray(request.install_targets) || request.install_targets.length > 32) return false;
      const validTargets = request.install_targets.every((target) =>
        target
        && ['env', 'file'].includes(target.type)
        && typeof target.path === 'string'
        && target.path.length > 0
        && target.path.length <= 1024
        && Array.isArray(target.fields)
        && target.fields.every((name) => SECENV_FIELD_RE.test(String(name || '')))
      );
      if (!validTargets) return false;
    }
    const jwk = request.public_jwk;
    if (!jwk || jwk.kty !== 'RSA' || jwk.alg !== 'RSA-OAEP-256' || !jwk.n || !jwk.e) return false;
    if (Array.isArray(jwk.key_ops) && !jwk.key_ops.includes('wrapKey')) return false;
    return request.fields.every((field) => {
      if (!field || !SECENV_FIELD_RE.test(String(field.name || ''))) return false;
      if (!['password', 'text', 'textarea', undefined].includes(field.type)) return false;
      if (typeof field.label === 'string' && field.label.length > 160) return false;
      if (typeof field.help === 'string' && field.help.length > 1000) return false;
      if ((field.type || 'password') === 'password' && field.default) return false;
      if (field.provider_url) {
        try {
          const provider = new URL(field.provider_url);
          if (provider.protocol !== 'https:' || provider.username || provider.password) return false;
        } catch (_) {
          return false;
        }
      }
      return true;
    });
  }

  _receiveRequest(request) {
    if (!this._validRequest(request)) {
      console.warn('[workbench] ignored invalid secure input request');
      return;
    }
    if (this.knownRequests.has(request.id)) return;
    this.knownRequests.add(request.id);
    this.queue.push(request);
    this._showNext();
  }

  _showNext() {
    if (this.stopping || this.activeModal || !this.queue.length) return;
    const request = this.queue.shift();
    const label = this.activeWorkspace ? this._workspaceLabel(this.activeWorkspace) : 'workspace';
    const modal = new SecureInputModal(this.app, this, request, label);
    this.activeModal = modal;
    try { window.focus(); } catch (_) {}
    modal.open();
    new Notice(`Credential request from ${label}`);
  }

  modalClosed(modal) {
    if (this.activeModal === modal) this.activeModal = null;
    window.setTimeout(() => this._showNext(), 0);
  }

  async encryptValues(request, values) {
    const cryptoApi = window.crypto || globalThis.crypto;
    if (!cryptoApi || !cryptoApi.subtle) throw new Error('WebCrypto is unavailable in Obsidian');
    const utf8 = new TextEncoder();
    const payload = JSON.stringify({
      request_id: request.id,
      submitted_at: new Date().toISOString(),
      values,
    });
    const aesKey = await cryptoApi.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: utf8.encode(request.id) },
      aesKey,
      utf8.encode(payload)
    );
    const rsaKey = await cryptoApi.subtle.importKey(
      'jwk',
      request.public_jwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['wrapKey']
    );
    const wrappedKey = await cryptoApi.subtle.wrapKey('raw', aesKey, rsaKey, { name: 'RSA-OAEP' });
    return {
      version: 1,
      request_id: request.id,
      alg: 'RSA-OAEP-256+A256GCM',
      wrapped_key: secenvB64Url(wrappedKey),
      iv: secenvB64Url(iv),
      ciphertext: secenvB64Url(ciphertext),
    };
  }

  _runBroker(args, input = null, timeoutMs = 30000) {
    const workspace = this.activeWorkspace || this._selectWorkspace();
    const target = this._target(workspace);
    return new Promise((resolve, reject) => {
      const child = this._spawn(target, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (error) reject(error);
        else resolve(value);
      };
      const timer = window.setTimeout(() => {
        child.kill();
        finish(new Error('Secure submission timed out'));
      }, timeoutMs);
      child.stdout.on('data', (chunk) => {
        if (stdout.length < 65536) stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        if (stderr.length < 65536) stderr += chunk.toString();
      });
      child.on('error', (error) => finish(error));
      child.on('close', (code) => {
        if (code === 0) finish(null, stdout);
        else finish(new Error(stderr.trim() || `secure broker exited ${code}`));
      });
      if (input === null) {
        child.stdin.end();
      } else {
        child.stdin.end(Buffer.from(input, 'utf8'));
      }
    });
  }

  async submit(requestId, envelope) {
    if (!SECENV_ID_RE.test(requestId)) throw new Error('Invalid secure request id');
    await this._runBroker(['workbench', 'submit', requestId], JSON.stringify(envelope));
  }

  async cancel(requestId) {
    if (!SECENV_ID_RE.test(requestId)) throw new Error('Invalid secure request id');
    await this._runBroker(['workbench', 'cancel', requestId]);
  }

  async configure(change) {
    if (this.activeModal || this.queue.length) throw new Error('Finish or cancel pending credential requests before changing the listener.');
    const workspace = change.workspace === undefined ? this.settings.workspace : String(change.workspace).trim();
    const enabled = change.enabled === undefined ? this.settings.enabled : Boolean(change.enabled);
    if (enabled) {
      const matches = this._credentialWorkspaces().filter(w => w.coderName === workspace);
      if (!workspace || matches.length !== 1) throw new Error('Select one available workspace before enabling Secure Input.');
      this._target(matches[0]);
    }
    if (this.listener) {
      const previous = this.listener;
      this.listener = null;
      previous.kill();
    }
    this.activeWorkspace = null;
    this.listenerBuffer = '';
    this.knownRequests.clear();
    this.settings.workspace = workspace;
    this.settings.enabled = enabled;
    await this.plugin.saveSettings();
    this.restart();
  }

  restart() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.listener) {
      const child = this.listener;
      this.listener = null;
      child.kill();
    }
    this.reconnectAttempt = 0;
    this.status = this.settings.enabled ? 'restarting' : 'disabled';
    if (this.settings.enabled) window.setTimeout(() => this.start(), 100);
  }

  async unload() {
    this.stopping = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.listener) {
      const child = this.listener;
      this.listener = null;
      child.kill();
    }
    if (this.activeModal) {
      this.activeModal.suppressCancel = true;
      this.activeModal.close();
      this.activeModal = null;
    }
    this.queue = [];
  }
}

module.exports = SecureInputModule;
