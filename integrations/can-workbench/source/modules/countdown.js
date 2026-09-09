/*
 * Countdown Bar module — runs inside can-workbench.
 *
 * Floating countdown widget in top-right corner. Shows days/hours/minutes
 * until configured dates. Draggable. Click to open settings.
 */

const { Notice } = require('obsidian');

const DEFAULT_SETTINGS = {
  // Start empty — the user adds countdowns from the settings page.
  countdowns: [],
  separator: '  •  ',
  position: { top: 8, left: null, right: 16 }
};

class CountdownModule {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.barEl = null;
    this.updateInterval = null;
  }

  async load() {
    // Point `this.settings` at the parent plugin's countdown subobject so
    // any edits made from the main Can Workbench settings tab are seen
    // live by this module without a reload. Initialize missing keys with
    // defaults in place.
    if (!this.plugin.settings.countdown) this.plugin.settings.countdown = {};
    const cd = this.plugin.settings.countdown;
    if (!Array.isArray(cd.countdowns)) cd.countdowns = DEFAULT_SETTINGS.countdowns.slice();
    if (typeof cd.separator !== 'string') cd.separator = DEFAULT_SETTINGS.separator;
    if (!cd.position) cd.position = Object.assign({}, DEFAULT_SETTINGS.position);
    this.settings = cd;

    // Create the bar element
    this.barEl = document.createElement('div');
    this.barEl.addClass('countdown-bar');
    this.barEl.style.cssText = `
      position: fixed;
      z-index: 1000;
      display: flex;
      align-items: center;
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--background-secondary-alt);
      border: 1px solid var(--background-modifier-border);
      border-radius: 10px;
      gap: 4px;
      -webkit-app-region: no-drag;
      user-select: none;
      cursor: grab;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: background 0.15s, color 0.15s;
      pointer-events: auto;
    `;
    this.applyPosition();
    this.barEl.title = 'Drag to move • Click to edit countdowns';
    this.setupDrag();

    document.body.appendChild(this.barEl);

    this.render();

    this.updateInterval = setInterval(() => this.render(), 30000);

    // Countdown settings are rendered inside the main Can Workbench
    // settings tab (see _renderCountdowns in build.py) — no separate tab.

    this.plugin.addCommand({
      id: 'countdown-add',
      name: 'Countdown: Add a new countdown',
      callback: async () => {
        this.settings.countdowns.push({
          name: 'New event',
          date: new Date().toISOString().split('T')[0],
          emoji: ''
        });
        await this.saveSettings();
        new Notice('Added — edit in Settings → Can Workbench → Countdown');
      }
    });
  }

  async saveSettings() {
    this.plugin.settings.countdown = this.settings;
    await this.plugin.saveSettings();
    this.render();
  }

  applyPosition() {
    const pos = this.settings.position || { top: 8, right: 16, left: null };
    this.barEl.style.top = (pos.top ?? 8) + 'px';
    if (pos.left !== null && pos.left !== undefined) {
      this.barEl.style.left = pos.left + 'px';
      this.barEl.style.right = '';
    } else {
      this.barEl.style.right = (pos.right ?? 16) + 'px';
      this.barEl.style.left = '';
    }
  }

  setupDrag() {
    let isDragging = false;
    let dragStarted = false;
    let startX, startY, startLeft, startTop;

    this.barEl.addEventListener('mouseenter', () => {
      if (!isDragging) {
        this.barEl.style.background = 'var(--background-modifier-hover)';
        this.barEl.style.color = 'var(--text-normal)';
      }
    });
    this.barEl.addEventListener('mouseleave', () => {
      if (!isDragging) {
        this.barEl.style.background = 'var(--background-secondary-alt)';
        this.barEl.style.color = 'var(--text-muted)';
      }
    });

    this.barEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStarted = false;
      const rect = this.barEl.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    });

    this.mouseMoveHandler = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragStarted && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      dragStarted = true;
      this.barEl.style.cursor = 'grabbing';
      this.barEl.style.transition = 'none';
      const newLeft = Math.max(0, Math.min(window.innerWidth - this.barEl.offsetWidth, startLeft + dx));
      const newTop = Math.max(0, Math.min(window.innerHeight - this.barEl.offsetHeight, startTop + dy));
      this.barEl.style.left = newLeft + 'px';
      this.barEl.style.top = newTop + 'px';
      this.barEl.style.right = '';
    };
    document.addEventListener('mousemove', this.mouseMoveHandler);

    this.mouseUpHandler = async (e) => {
      if (!isDragging) return;
      isDragging = false;
      this.barEl.style.cursor = 'grab';
      this.barEl.style.transition = 'background 0.15s, color 0.15s';

      if (dragStarted) {
        const rect = this.barEl.getBoundingClientRect();
        this.settings.position = {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          right: null
        };
        await this.saveSettings();
      } else {
        this.app.setting.open();
        this.app.setting.openTabById(this.plugin.manifest.id);
      }
      dragStarted = false;
    };
    document.addEventListener('mouseup', this.mouseUpHandler);
  }

  render() {
    if (!this.barEl) return;
    this.barEl.empty();

    const now = new Date();

    const parts = [];
    for (const cd of this.settings.countdowns) {
      if (!cd.date) continue;

      const target = new Date(cd.date);
      target.setHours(23, 59, 0, 0);

      const diffMs = target - now;
      const absMs = Math.abs(diffMs);
      const totalMinutes = Math.floor(absMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      let timeStr;
      if (days > 0) timeStr = `${days}d ${hours}h ${minutes}m`;
      else if (hours > 0) timeStr = `${hours}h ${minutes}m`;
      else timeStr = `${minutes}m`;

      let label;
      if (diffMs < 0) label = `${cd.name}: ${timeStr} ago`;
      else label = `${cd.name}: ${timeStr}`;

      if (cd.emoji) label = cd.emoji + ' ' + label;
      parts.push(label);
    }

    this.barEl.setText(parts.join(this.settings.separator));
  }

  async unload() {
    if (this.barEl) this.barEl.remove();
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.mouseMoveHandler) document.removeEventListener('mousemove', this.mouseMoveHandler);
    if (this.mouseUpHandler) document.removeEventListener('mouseup', this.mouseUpHandler);
  }
}

module.exports = CountdownModule;
