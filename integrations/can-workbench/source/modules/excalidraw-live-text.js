/*
 * Excalidraw Live Text module — runs inside can-workbench.
 *
 * @from(NoteName) and @from(NoteName#Heading) tag syncing — fetches note
 * content and updates Excalidraw text elements in-place.
 */

const { Notice, FuzzySuggestModal } = require('obsidian');

class FileSuggestModal extends FuzzySuggestModal {
  constructor(app, callback) {
    super(app);
    this.callback = callback;
    this.setPlaceholder('Search for a note to link with @from()...');
  }

  getItems() {
    return this.app.vault.getMarkdownFiles()
      .filter(f => !f.path.startsWith('.'))
      .sort((a, b) => b.stat.mtime - a.stat.mtime);
  }

  getItemText(file) {
    return file.basename;
  }

  onChooseItem(file) {
    this.callback(file);
  }
}

class HeadingSuggestModal extends FuzzySuggestModal {
  constructor(app, file, callback) {
    super(app);
    this.file = file;
    this.callback = callback;
    this.setPlaceholder('Pick a heading (or press Esc for full note)...');
  }

  getItems() {
    const cache = this.app.metadataCache.getFileCache(this.file);
    const headings = (cache && cache.headings) ? cache.headings.map(h => h.heading) : [];
    return ['(Full note)', ...headings];
  }

  getItemText(item) {
    return item;
  }

  onChooseItem(item) {
    this.callback(item === '(Full note)' ? null : item);
  }
}

const TAG_REGEX = /@from\(([^)]+)\)/;

// Discovered wikilinks per element (populated during sync)
let globalLinks = {};

class SourcePickerModal extends FuzzySuggestModal {
  constructor(app, sources) {
    super(app);
    this.sources = sources;
    this.setPlaceholder('Open source note...');
  }

  getItems() {
    return this.sources;
  }

  getItemText(item) {
    return item;
  }

  onChooseItem(item) {
    this.app.workspace.openLinkText(item, '', false);
  }
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+(.*)/gm, '\n$1')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\n?-{3,}\n?$/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^- \[[ x]\]\s*/gm, '- ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function getSectionContent(app, noteName, heading) {
  const name = noteName.replace(/\.md$/, '');
  const file = app.metadataCache.getFirstLinkpathDest(name, '');
  if (!file) return null;
  const content = await app.vault.cachedRead(file);
  if (!heading) return content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim();

  const lines = content.split('\n');
  let capturing = false;
  let headingLevel = 0;
  const result = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)/);
    if (match) {
      if (capturing && match[1].length <= headingLevel) break;
      if (match[2].trim() === heading.trim()) {
        capturing = true;
        headingLevel = match[1].length;
        continue;
      }
    }
    if (capturing) result.push(line);
  }
  return result.join('\n').trim() || null;
}

class ExcalidrawLiveTextModule {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  async load() {
    this.plugin.addCommand({
      id: 'excalidraw-sync-all',
      name: 'Excalidraw Live Text: Sync all live text connections',
      callback: () => this.syncActiveView()
    });

    this.plugin.addRibbonIcon('refresh-cw', 'Sync Excalidraw Live Text', () => {
      this.syncActiveView();
    });

    this.plugin.addCommand({
      id: 'excalidraw-insert-from-tag',
      name: 'Excalidraw Live Text: Insert @from() tag — pick a note to link',
      callback: () => this.insertFromTag()
    });

    this.plugin.addCommand({
      id: 'excalidraw-show-links',
      name: 'Excalidraw Live Text: Show linked notes in current diagram',
      callback: () => this.showLinksMenu()
    });

    this.plugin.addRibbonIcon('link', 'Show diagram links', () => {
      this.showLinksMenu();
    });
  }

  async insertFromTag() {
    const exPlugin = this.app.plugins.getPlugin('obsidian-excalidraw-plugin');
    if (!exPlugin) { new Notice('Excalidraw plugin not found'); return; }

    const leaves = this.app.workspace.getLeavesOfType('excalidraw');
    if (leaves.length === 0) { new Notice('Open an Excalidraw drawing first'); return; }

    const view = leaves[0].view;
    const ea = exPlugin.ea;
    if (!ea) { new Notice('ExcalidrawAutomate not available'); return; }

    new FileSuggestModal(this.app, (file) => {
      new HeadingSuggestModal(this.app, file, async (heading) => {
        const ref = heading ? file.basename + '#' + heading : file.basename;
        const tagText = '@from(' + ref + ')';

        ea.setView(view);
        const api = ea.getExcalidrawAPI();
        if (!api) { new Notice('API not available'); return; }

        const appState = api.getAppState();
        const x = appState.scrollX + appState.width / 2;
        const y = appState.scrollY + appState.height / 2;

        ea.style.fontSize = 20;
        ea.style.strokeColor = '#ffffff';
        ea.style.fontFamily = 4;
        ea.addText(x, y, tagText);
        await ea.addElementsToView(false, false);

        new Notice('Added ' + tagText + ' — click refresh to sync content');
      });
    }).open();
  }

  showLinksMenu() {
    const sources = [];
    const seen = new Set();
    for (const ref of Object.values(globalLinks)) {
      if (!seen.has(ref)) {
        seen.add(ref);
        sources.push(ref);
      }
    }

    if (sources.length === 0) {
      new Notice('No @from() tags found — sync first (click refresh)');
      return;
    }

    if (sources.length === 1) {
      this.app.workspace.openLinkText(sources[0], '', false);
      return;
    }

    new SourcePickerModal(this.app, sources).open();
  }

  async syncActiveView() {
    const exPlugin = this.app.plugins.getPlugin('obsidian-excalidraw-plugin');
    if (!exPlugin) { new Notice('Excalidraw plugin not found'); return; }

    const leaves = this.app.workspace.getLeavesOfType('excalidraw');
    if (leaves.length === 0) { new Notice('No Excalidraw drawing is open'); return; }

    await this.syncView(exPlugin, leaves[0].view);
  }

  async syncView(exPlugin, view) {
    try {
      const ea = exPlugin.ea;
      if (!ea) { new Notice('ExcalidrawAutomate not available'); return; }

      ea.setView(view);
      const api = ea.getExcalidrawAPI();
      if (!api) { new Notice('Excalidraw API not available'); return; }

      const allElements = api.getSceneElements();
      let updated = 0;

      for (const el of allElements) {
        if (el.type !== 'text' || el.isDeleted) continue;

        const text = el.originalText || el.text || '';
        const firstLine = text.split('\n')[0];
        const match = firstLine.match(TAG_REGEX);
        if (!match) continue;

        const ref = match[1];
        const parts = ref.split('#');
        const noteName = parts[0];
        const heading = parts[1] || null;

        const rawContent = await getSectionContent(this.app, noteName, heading);
        if (!rawContent) {
          console.log('Excalidraw Live Text: note not found:', noteName);
          continue;
        }

        const cleanContent = stripMarkdown(rawContent);
        const tagLine = '@from(' + ref + ')';
        const newText = tagLine + '\n' + cleanContent;

        if (el.text === newText) continue;

        el.text = newText;
        el.originalText = newText;
        el.rawText = newText;
        el.version = (el.version || 0) + 1;
        el.versionNonce = Math.floor(Math.random() * 2147483647);

        if (!globalLinks) globalLinks = {};
        globalLinks[el.id] = noteName;

        updated++;
      }

      if (updated > 0) {
        api.updateScene({
          elements: allElements,
          storeAction: 'capture'
        });

        new Notice('Excalidraw Live Text: updated ' + updated + ' element(s)');
      } else {
        const tagCount = allElements.filter(el =>
          el.type === 'text' && !el.isDeleted &&
          TAG_REGEX.test((el.originalText || el.text || '').split('\n')[0])
        ).length;
        new Notice('Excalidraw Live Text: ' + tagCount + ' tagged, no changes needed');
      }

    } catch (e) {
      console.error('Excalidraw Live Text error:', e);
      new Notice('Excalidraw Live Text: error - ' + e.message);
    }
  }

  async unload() {
    // no persistent state to clean up
  }
}

module.exports = ExcalidrawLiveTextModule;
