#!/usr/bin/env node
"use strict";

const { execFileSync } = require("child_process");
const { readFileSync } = require("fs");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
    ...options
  });
}

function check(command, args) {
  process.stdout.write(`check: ${[command, ...args].join(" ")}\n`);
  run(command, args, { stdio: "inherit" });
}

function pythonWithTomllib() {
  const candidates = [
    process.env.CODEX_ATTENTION_PYTHON,
    "python3",
    "python3.14",
    "python3.13",
    "python3.12",
    "python3.11"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      run(candidate, ["-c", "import tomllib"]);
      return candidate;
    } catch {}
  }
  throw new Error("Codex attention verification needs Python 3.11+ (tomllib)");
}

function assertOpenSessionMatchingSource() {
  process.stdout.write("check: open-session workspace matching source invariant\n");
  const required = [
    "if (workspace) {",
    "open.add(`${workspace}\\0${tmuxName}`);",
    "} else {",
    "open.add(`*\\0${tmuxName}`);"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not keep marked tmux sessions workspace-exact; missing ${missing.join(", ")}`);
    }
    const unsafe = /if \(workspace\)\s+open\.add\(`\$\{workspace\}\\0\$\{tmuxName\}`\);\s+open\.add\(`\*\\0\$\{tmuxName\}`\);/.test(source);
    if (unsafe) {
      throw new Error(`${file} still adds wildcard open-session matches for workspace-marked tmux sessions`);
    }
  }
}

function assertResponsivePickerSource() {
  process.stdout.write("check: responsive picker source invariant\n");
  const required = [
    "width: min(620px, calc(100vw - 48px));",
    "min-width: min(520px, calc(100vw - 48px));",
    "max-width: calc(100vw - 48px);",
    "max-height: clamp(260px, calc(100vh - 220px), 520px);"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} picker CSS is not viewport-responsive; missing ${missing.join(", ")}`);
    }
    if (source.includes("max-height: min(520px, calc(100vh - 220px));")) {
      throw new Error(`${file} still uses short-viewport-unsafe picker body max-height`);
    }
  }
}

function assertVmConnectUsesNestedSettingsHelpers() {
  process.stdout.write("check: vm-connect nested settings source invariant\n");
  const files = ["main.js", "modules/vm-connect.js"];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const required of [
      "this.plugin._getGsdWorkspaces(gsdSettings)",
      "this.plugin._getGsdCoderUser(gsdSettings)"
    ]) {
      if (!source.includes(required)) {
        throw new Error(`${file} does not consistently use nested GSD settings helpers; missing ${required}`);
      }
    }
    for (const stale of [
      "gsdSettings.workspaces",
      "gsdSettings?.workspaces",
      "gsdVendor?.settings?.workspaces"
    ]) {
      if (source.includes(stale)) {
        throw new Error(`${file} still has direct GSD workspace access: ${stale}`);
      }
    }
  }
}

function assertCodexAttentionSource() {
  process.stdout.write("check: Codex attention source invariant\n");
  const required = [
    "new CodexAttentionModule(this)",
    "Codex Alerts",
    "agent-turn-complete",
    "window.Notification",
    "os.platform() === 'darwin'",
    "seenEventIds",
    "codex-workbench-notify"
  ];
  const files = ["main.js", "modules/codex-attention.js"];
  const sources = files.map((file) => readFileSync(file, "utf8"));
  const combined = sources.join("\n");
  const missing = required.filter((part) => !combined.includes(part));
  if (missing.length) {
    throw new Error(`Codex alert bridge is incomplete; missing ${missing.join(", ")}`);
  }
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const source = sources[index];
    for (const forbidden of ["last-assistant-message", "input-messages"]) {
      if (source.includes(forbidden)) {
        throw new Error(`${file} forwards sensitive Codex payload field: ${forbidden}`);
      }
    }
  }
}

function assertDefaultWorkspaceScopeSource() {
  process.stdout.write("check: default workspace scope source invariant\n");
  const required = [
    "function isDefaultVisibleWorkspace(ws)",
    "name === \"system\" || scope === \"system\" || type === \"system\"",
    "ws.hidden === true || ws.visible === false || ws.showInWorkbench === false",
    "function getDefaultVisibleWorkspaces(workspaces)",
    "return getDefaultVisibleWorkspaces(topLevel);",
    "return getDefaultVisibleWorkspaces(nested);"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not keep system workspace hidden by default; missing ${missing.join(", ")}`);
    }
  }
}

function assertSystemTmuxScopeSource() {
  process.stdout.write("check: system tmux scope source invariant\n");
  const required = [
    "#{@workbench_scope}",
    "const [name, attached, scope] = line.split(\"|||\");",
    "scope: String(scope || \"\").trim().toLowerCase()",
    "getSystemSessionInfo(sessionName, scope = \"\")",
    "normalizedScope === \"system\"",
    "name.startsWith(\"sys-\")",
    "[\"obsidian-headless\", \"Obsidian background runtime\"]",
    "[\"ttyd\", \"Workspace tmux web terminal\"]",
    "this.getSystemSessionInfo(session.name, session.scope)"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not classify tmux system scope safely; missing ${missing.join(", ")}`);
    }
    const scopeFormatCount = (source.match(/#\{@workbench_scope\}/g) || []).length;
    if (scopeFormatCount < 2) {
      throw new Error(`${file} does not read tmux system scope from both local and remote inventories`);
    }
    for (const unsafe of [
      'name.includes("service")',
      'name.includes("daemon")',
      'name.endsWith("-backup")',
      'name.endsWith("-gateway")'
    ]) {
      if (source.includes(unsafe)) {
        throw new Error(`${file} still uses broad system-session heuristic: ${unsafe}`);
      }
    }
  }
}

function assertSystemTmuxHiddenFromNormalUiSource() {
  process.stdout.write("check: system tmux hidden from normal UI source invariant\n");
  const required = [
    "getVisibleUserSessions(ws, sessions)",
    "!systemInfo && !this.isSystemSession(ws.coderName, session.name)",
    "this.getVisibleUserSessions(ws, sessions)",
    "const visibleSessions = this.getVisibleUserSessions(ws, sessions);",
    "totalCount += visibleSessions.length;"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not hide system tmux sessions from the normal Running UI; missing ${missing.join(", ")}`);
    }
  }
}

function assertHiddenTerminalRenderGuardSource() {
  process.stdout.write("check: hidden terminal render guard source invariant\n");
  const required = [
    "this.isVisible = false;",
    "this.installVisibilityRenderGuard();",
    "selectionService.__workbenchVisibilityGuard",
    "selectionService.__workbenchDeferredRefresh = true;",
    "renderService.handleSelectionChanged = (...args) =>",
    "renderService._renderRows = (...args) =>",
    "renderService._needsFullRefresh = true;",
    "if (!this.isVisible)",
    "if (this.isVisible) this.fit();",
    "this.isVisible = true;",
    "this.terminal.refresh(0, Math.max(0, this.terminal.rows - 1));"
  ];
  for (const file of ["main.js", "vendor/internetvin-terminal/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = required.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not suppress hidden xterm selection redraws; missing ${missing.join(", ")}`);
    }
  }
}

function assertSystemTmuxPolicyBehavior() {
  process.stdout.write("check: system tmux policy behavior\n");
  const cases = [
    ["anything", "system", true],
    ["sys-smoke-server", "", true],
    ["obsidian-headless", "", true],
    ["ttyd", "", true],
    ["salad-orch-v3", "", true],
    ["main", "", false],
    ["prl-web", "", false],
    ["salad-kryptex-ops", "", false],
    ["payment-service", "", false],
    ["project-backup", "", false],
    ["api-gateway", "", false]
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const start = source.indexOf("  getSystemSessionInfo(");
    const end = source.indexOf("\n\n  sortSessionsForDisplay(", start);
    if (start < 0 || end < 0) {
      throw new Error(`${file} system-session policy method was not found`);
    }
    const method = source.slice(start, end).trim();
    const classify = Function(`return ({${method}}).getSystemSessionInfo`)();
    for (const [name, scope, expected] of cases) {
      const actual = !!classify(name, scope);
      if (actual !== expected) {
        throw new Error(`${file} classified ${name}/${scope || "user"} as ${actual}; expected ${expected}`);
      }
    }

    const sortStart = source.indexOf("  sortSessionsForDisplay(");
    const sortEnd = source.indexOf("\n\n  getVisibleUserSessions(", sortStart);
    const visibleStart = source.indexOf("  getVisibleUserSessions(", sortEnd);
    const visibleEnd = source.indexOf("\n\n  async openLocalTmuxSession(", visibleStart);
    const attachStart = source.indexOf("  getAttachableSessionEntries(");
    const attachEnd = source.indexOf("\n\n  confirmAttachAllSessions(", attachStart);
    if (sortStart < 0 || sortEnd < 0 || visibleStart < 0 || visibleEnd < 0 || attachStart < 0 || attachEnd < 0) {
      throw new Error(`${file} system-session bulk-action methods were not found`);
    }
    const sortSessions = Function(`return ({${source.slice(sortStart, sortEnd).trim()}}).sortSessionsForDisplay`)();
    const getVisible = Function(`return ({${source.slice(visibleStart, visibleEnd).trim()}}).getVisibleUserSessions`)();
    const getAttachable = Function(`return ({${source.slice(attachStart, attachEnd).trim()}}).getAttachableSessionEntries`)();
    const sessions = [
      { name: "scoped-worker", scope: "system", workspace: "ops-main" },
      { name: "sys-probe", scope: "", workspace: "ops-main" },
      { name: "main", scope: "", workspace: "ops-main" },
      { name: "payment-service", scope: "", workspace: "ops-main" }
    ];
    const policyOwner = {
      getSystemSessionInfo: classify,
      isSystemSession: () => false
    };
    const visible = getVisible.call({
      ...policyOwner,
      sortSessionsForDisplay: (items) => sortSessions.call(policyOwner, items)
    }, { coderName: "ops-main" }, sessions);
    const visibleNames = visible.map(({ session }) => session.name).sort();
    const expectedVisible = ["main", "payment-service"];
    if (JSON.stringify(visibleNames) !== JSON.stringify(expectedVisible)) {
      throw new Error(`${file} normal Running UI policy mismatch: ${visibleNames.join(", ")}`);
    }
    const entries = visible.map(({ session, systemInfo }) => ({
      ws: { coderName: "ops-main" },
      session,
      systemInfo
    }));
    const attachable = getAttachable.call({
      getOpenWorkbenchSessions: () => new Set(),
      getLoadedSessionEntries: () => entries,
      isSystemSession: () => false,
      isOpenInWorkbench: () => false
    });
    const attachableNames = attachable.map(({ session }) => session.name).sort();
    const expectedAttachable = ["main", "payment-service"];
    if (JSON.stringify(attachableNames) !== JSON.stringify(expectedAttachable)) {
      throw new Error(`${file} Attach all policy mismatch: ${attachableNames.join(", ")}`);
    }
  }
}

function assertTerminalLocationCategorySource() {
  process.stdout.write("check: terminal location category source invariant\n");
  const sharedRequired = [
    "terminalSessionCategorySources",
    "sourceMap[key] = source === \"manual\" ? \"manual\" : \"auto\";",
    "const storedSource = sourceMap[key] || (Object.prototype.hasOwnProperty.call(map, key) ? \"manual\" : \"auto\");",
    "slugTerminalNamePart(value, fallback = \"main\")",
    "getTerminalLocationCategory(sessionName)"
  ];
  for (const file of ["main.js", "vendor/gsd-control/main.js"]) {
    const source = readFileSync(file, "utf8");
    const missing = sharedRequired.filter((part) => !source.includes(part));
    if (missing.length) {
      throw new Error(`${file} does not preserve manual terminal categories or infer location categories; missing ${missing.join(", ")}`);
    }
    for (const stale of [
      "const sessionName = `gsd-term-${",
      "const tmuxName = `gsd-term-${",
      "this.tmuxSession = `gsd-term-${"
    ]) {
      if (source.includes(stale)) {
        throw new Error(`${file} still creates new tmux sessions with legacy gsd-term names: ${stale}`);
      }
    }
  }
  const mainSource = readFileSync("main.js", "utf8");
  for (const required of [
    "sourceMap[key] = \"manual\";",
    "_locationPrefixedTmuxName(location, sessionName = '')",
    "_getAutoTerminalCategory(settings, sessionName)"
  ]) {
    if (!mainSource.includes(required)) {
      throw new Error(`main.js is missing Workbench terminal location/category behavior: ${required}`);
    }
  }
}

async function assertTerminalSurfingLinkBehavior() {
  process.stdout.write("check: terminal Surfing link behavior\n");
  for (const file of ["main.js", "vendor/internetvin-terminal/main.js"]) {
    const source = readFileSync(file, "utf8");
    for (const required of [
      "async function openTerminalLink(app, rawUrl)",
      'getPlugin?.("surfing")',
      'workspace.getLeavesOfType("surfing-view")',
      'type: "surfing-view"',
      "activate: (_event, url) => {",
      "void openTerminalLink(this.app, url);",
      'window.open(url, "_blank", "external");'
    ]) {
      if (!source.includes(required)) {
        throw new Error(`${file} is missing terminal-to-Surfing link handling: ${required}`);
      }
    }
  }

  const source = readFileSync("vendor/internetvin-terminal/main.js", "utf8");
  const start = source.indexOf("async function openTerminalLink(app, rawUrl)");
  const end = source.indexOf("\nfunction getObsidianTheme()", start);
  if (start < 0 || end < 0) {
    throw new Error("Could not isolate openTerminalLink for behavior testing");
  }
  const openTerminalLink = Function(`${source.slice(start, end)}; return openTerminalLink;`)();
  const originalWindow = global.window;
  const external = [];
  global.window = {
    open: (...args) => {
      external.push(args);
    }
  };
  try {
    const createdStates = [];
    const revealed = [];
    const createdLeaf = {
      async setViewState(state) {
        createdStates.push(state);
      }
    };
    const workspace = {
      getLeavesOfType: () => [],
      getLeaf: (kind) => {
        if (kind !== "tab") throw new Error(`unexpected leaf kind: ${kind}`);
        return createdLeaf;
      },
      revealLeaf: (leaf) => revealed.push(leaf)
    };
    await openTerminalLink({
      plugins: { getPlugin: (id) => id === "surfing" ? { settings: { openInSameTab: false } } : null },
      workspace
    }, "https://example.com/path");
    if (createdStates.length !== 1 || createdStates[0]?.type !== "surfing-view" || createdStates[0]?.state?.url !== "https://example.com/path") {
      throw new Error(`new Surfing tab state mismatch: ${JSON.stringify(createdStates)}`);
    }
    if (revealed[0] !== createdLeaf || external.length !== 0) {
      throw new Error("new Surfing tab was not revealed cleanly");
    }

    const reusedStates = [];
    const reusedLeaf = {
      activeTime: 10,
      async setViewState(state) {
        reusedStates.push(state);
      }
    };
    await openTerminalLink({
      plugins: { getPlugin: () => ({ settings: { openInSameTab: true } }) },
      workspace: {
        getLeavesOfType: () => [{ activeTime: 1 }, reusedLeaf],
        getLeaf: () => {
          throw new Error("same-tab mode created a new leaf");
        },
        revealLeaf: (leaf) => revealed.push(leaf)
      }
    }, "https://example.org");
    if (reusedStates[0]?.state?.url !== "https://example.org" || revealed.at(-1) !== reusedLeaf) {
      throw new Error("same-tab Surfing behavior did not reuse the latest leaf");
    }

    await openTerminalLink({
      plugins: { getPlugin: () => null }
    }, "https://fallback.example");
    if (external.length !== 1 || external[0].join("|") !== "https://fallback.example|_blank|external") {
      throw new Error(`external fallback mismatch: ${JSON.stringify(external)}`);
    }
  } finally {
    global.window = originalWindow;
  }
}

function parseObsidianEval(output) {
  const marker = "=>";
  const idx = output.lastIndexOf(marker);
  if (idx === -1) {
    throw new Error(`Could not find Obsidian eval result marker in output:\n${output}`);
  }
  const payload = output.slice(idx + marker.length).trim();
  return JSON.parse(payload);
}

function obsidianEval(code) {
  const output = run("obsidian", ["eval", `code=${code}`]);
  return parseObsidianEval(output);
}

const runtimeSmoke = String.raw`
(async()=>{
  const cp = require("child_process");
  const delay = (ms)=>new Promise(r=>setTimeout(r,ms));
  const rawTmuxCount = () => {
    try {
      const legacySystemNames = new Set([
        "novnc", "no-vnc", "obsidian-headless", "openclaw", "openclaw-gateway",
        "obsidian-vnc", "salad-orch-v3", "salad-orch-v3-tunnel", "ttyd",
        "websockify", "x11vnc", "vault-github-backup", "vault-backup"
      ]);
      return cp.execFileSync("tmux", ["list-sessions", "-F", "#{session_name}|||#{@workbench_scope}"], {encoding:"utf8"})
        .split("\n")
        .filter(Boolean)
        .map(line=>line.split("|||"))
        .filter(([rawName, rawScope])=>{
          const name=String(rawName||"").trim().toLowerCase();
          const scope=String(rawScope||"").trim().toLowerCase();
          return scope!=="system" && !name.startsWith("sys-") && !legacySystemNames.has(name) && !name.includes("novnc") && !name.includes("x11vnc");
        })
        .length;
    } catch {
      return 0;
    }
  };
  const closeModals = () => {
    for (const btn of [...document.querySelectorAll(".modal-close-button")]) btn.click();
  };
  const killTmuxSession = (name) => {
    if (!name) return;
    try { cp.execFileSync("tmux", ["kill-session", "-t", name], {stdio:"ignore"}); } catch {}
  };
  const closeWorkbenchTmuxSession = (name) => {
    if (!name) return;
    for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
      const view = leaf.view;
      if (!view?.sessions || typeof view.closeSession !== "function") continue;
      for (const session of [...view.sessions]) {
        if (session?.__cwTmuxName === name || session?.name === name) {
          try { view.closeSession(session); } catch {}
        }
      }
    }
  };
  const listWorkbenchTmuxSessions = (excludeNames=[]) => {
    const excluded = new Set(excludeNames.filter(Boolean));
    const matches = [];
    for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
      for (const session of leaf.view?.sessions || []) {
        const tmuxName = session?.__cwTmuxName || "";
        if (!tmuxName || excluded.has(tmuxName)) continue;
        matches.push({
          name:session.name || "",
          tmuxName,
          workspace:session.__cwWorkspace || "",
          category:session.category || ""
        });
      }
    }
    return matches;
  };
  const exerciseTerminal = (terminal, copierOwner) => {
    const handler = terminal?._core?._customKeyEventHandler;
    const selectionService = terminal?._core?._selectionService;
    if (!terminal || !copierOwner || typeof handler !== "function") {
      return { available:false, reason:"terminal handler unavailable" };
    }
    const originalHasSelection = terminal.hasSelection;
    const originalGetSelection = terminal.getSelection;
    const originalCopy = copierOwner.copyTerminalSelection;
    let copies = 0;
    terminal.hasSelection = () => true;
    terminal.getSelection = () => "selected text";
    copierOwner.copyTerminalSelection = () => { copies++; };
    const makeEvent = (overrides={}) => ({
      type:"keydown",
      key: Object.prototype.hasOwnProperty.call(overrides, "key") ? overrides.key : "c",
      metaKey:false,
      ctrlKey:false,
      shiftKey:false,
      altKey:false,
      preventDefault(){},
      stopPropagation(){},
      ...overrides
    });
    let missingKeyNoThrow = true;
    try { handler(makeEvent({key:undefined, metaKey:true})); } catch { missingKeyNoThrow = false; }
    const cmdReturned = handler(makeEvent({metaKey:true}));
    const ctrlShiftReturned = handler(makeEvent({ctrlKey:true, shiftKey:true}));
    const ctrlReturned = handler(makeEvent({ctrlKey:true}));
    const normalSelect = selectionService?.shouldForceSelection?.({button:0, altKey:false, ctrlKey:false, metaKey:false}) === true;
    const patchInstalled = selectionService?.__workbenchNormalSelection === true;
    terminal.hasSelection = originalHasSelection;
    terminal.getSelection = originalGetSelection;
    copierOwner.copyTerminalSelection = originalCopy;
    return { available:true, missingKeyNoThrow, cmdReturned, ctrlShiftReturned, ctrlReturned, copies, normalSelect, patchInstalled };
  };

  let createdVinLeaf = false;
  let vinLeaf = null;
  let gsdSettings = null;
  let originalWorkspaces = null;
  let originalNestedGsd = null;
  let hadOriginalNestedGsd = false;
  let originalCoderUser = "";
  let nestedOpenSessionName = "";
  let rowOpenSessionName = "";
  let longLayoutSessionName = "";
  let cleanGeneratedSessionName = "";
  let createdExplorerLeaf = null;
  let createdStatusLeaf = null;
  try {
    closeModals();
    if (app.plugins.plugins["workbench"]) await app.plugins.unloadPlugin("workbench");
    await app.plugins.loadPlugin("workbench");
    const loaded = !!app.plugins.plugins["workbench"];
    const enabled = Array.from(app.plugins.enabledPlugins || []).includes("workbench");
    if (!loaded || !enabled) throw new Error("workbench did not reload cleanly");
    gsdSettings = app.plugins.plugins["workbench"]?.modules?.gsd?.settings || null;
    if (Array.isArray(gsdSettings?.workspaces)) originalWorkspaces = gsdSettings.workspaces.slice();
    originalCoderUser = gsdSettings?.coderUser || "";
    if (gsdSettings && Object.prototype.hasOwnProperty.call(gsdSettings, "gsd")) {
      hadOriginalNestedGsd = true;
      originalNestedGsd = gsdSettings.gsd;
    }

    const rawBefore = rawTmuxCount();
    app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
    await delay(300);
    let modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal did not open");
    const tabBeforeLoad = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!tabBeforeLoad) throw new Error("Running tab not found before session load");
    tabBeforeLoad.click();
    await delay(900);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during session load");
    const summary = modal.querySelector(".gsd-session-count-summary");
    const bar = modal.querySelector(".gsd-session-bulk-actions");
    if (!bar) throw new Error("Running tab bulk action bar not found");
    const runningTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!runningTab) throw new Error("Running tab not found after session load");
    const pickerRect = modal.getBoundingClientRect();
    const bodyEl = modal.querySelector(".gsd-picker-body");
    const bodyRect = bodyEl?.getBoundingClientRect();
    const beforeRefresh = {
      tab: runningTab?.textContent.trim() || "",
      rows: [...modal.querySelectorAll(".gsd-session-item")].length,
      systemRows: [...modal.querySelectorAll(".gsd-session-item.is-system")].length,
      systemKillButtons: [...modal.querySelectorAll(".gsd-session-item.is-system .gsd-kill-btn")].length,
      systemCategoryButtons: [...modal.querySelectorAll(".gsd-session-item.is-system button.gsd-session-category")].length,
      lockedSystemCategories: [...modal.querySelectorAll(".gsd-session-item.is-system .gsd-session-category.is-locked")].length,
      metrics: [...modal.querySelectorAll(".gsd-session-count-metric")].map(e=>({
        value: e.querySelector(".gsd-session-count-value")?.textContent,
        label: e.querySelector(".gsd-session-count-label")?.textContent
      })),
      warning: modal.querySelector(".gsd-session-load-warning")?.textContent || "",
      buttons: [...bar.querySelectorAll("button")].map(b=>({text:b.textContent.trim(), disabled:b.disabled})),
      summaryOverflow: summary ? summary.scrollWidth > Math.ceil(summary.getBoundingClientRect().width) + 1 : null,
      actionOverflow: bar ? bar.scrollWidth > bar.clientWidth + 1 : null,
      actionWrap: bar ? getComputedStyle(bar).flexWrap : "",
      pickerGeometry: {
        width:Math.round(pickerRect.width),
        left:Math.round(pickerRect.left),
        right:Math.round(pickerRect.right),
        viewportWidth:window.innerWidth,
        overflowX:pickerRect.left < -1 || pickerRect.right > window.innerWidth + 1,
        cssWidth:getComputedStyle(modal).width,
        cssMinWidth:getComputedStyle(modal).minWidth,
        cssMaxWidth:getComputedStyle(modal).maxWidth
      },
      bodyGeometry: {
        height:bodyRect ? Math.round(bodyRect.height) : 0,
        viewportHeight:window.innerHeight,
        overflowY:bodyRect ? bodyRect.bottom > window.innerHeight + 1 : true,
        cssMaxHeight:bodyEl ? getComputedStyle(bodyEl).maxHeight : ""
      }
    };
    const attachAllBtn = [...bar.querySelectorAll("button")].find(b=>b.textContent.trim().startsWith("Attach all"));
    beforeRefresh.attachConfirm = { available:false, reason:"Attach all unavailable" };
    if (attachAllBtn && !attachAllBtn.disabled) {
      const vinLeavesBeforeAttachConfirm = app.workspace.getLeavesOfType("vin-terminal-view").length;
      attachAllBtn.click();
      await delay(300);
      const confirmModal = document.querySelector(".vin-category-modal");
      const confirmTitle = confirmModal?.querySelector("h3")?.textContent || "";
      const confirmMessage = confirmModal?.querySelector(".setting-item-description")?.textContent || "";
      const confirmButtons = [...confirmModal?.querySelectorAll("button") || []].map(btn=>({
        text:btn.textContent.trim(),
        warning:btn.classList.contains("mod-warning")
      }));
      const cancelBtn = [...confirmModal?.querySelectorAll("button") || []].find(btn=>btn.textContent.trim() === "Cancel");
      if (cancelBtn) cancelBtn.click();
      await delay(250);
      modal = document.querySelector(".gsd-picker-modal");
      beforeRefresh.attachConfirm = {
        available:true,
        attachText:attachAllBtn.textContent.trim(),
        title:confirmTitle,
        message:confirmMessage,
        buttons:confirmButtons,
        modalClosed:!document.querySelector(".vin-category-modal"),
        pickerStillOpen:!!modal,
        vinLeavesBefore:vinLeavesBeforeAttachConfirm,
        vinLeavesAfter:app.workspace.getLeavesOfType("vin-terminal-view").length
      };
    }
    const refresh = [...bar.querySelectorAll("button")].find(b=>b.textContent.trim() === "Refresh");
    if (!refresh) throw new Error("Refresh button not found");
    refresh.click(); refresh.click(); refresh.click();
    await delay(1400);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during rapid refresh");
    const runningTabAfterRefresh = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!runningTabAfterRefresh) throw new Error("Running tab not found after rapid refresh");
    const afterRefresh = {
      tab: runningTabAfterRefresh.textContent.trim(),
      rows: [...modal.querySelectorAll(".gsd-session-item")].length,
      warning: modal.querySelector(".gsd-session-load-warning")?.textContent || ""
    };
    closeModals();

    let longLayout = { available:false, reason:"not checked" };
    longLayoutSessionName = "cw-layout-verify-long-session-name-1234567890";
    killTmuxSession(longLayoutSessionName);
    cp.execFileSync("tmux", ["new-session", "-d", "-s", longLayoutSessionName, "sleep 600"], {stdio:"ignore"});
    app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
    await delay(300);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal did not open for long-layout check");
    const longLayoutTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!longLayoutTab) throw new Error("Running tab not found for long-layout check");
    longLayoutTab.click();
    await delay(900);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during long-layout check");
    const longRow = [...modal.querySelectorAll(".gsd-session-item")].find(row=>row.querySelector(".gsd-session-name")?.textContent.trim() === longLayoutSessionName);
    const longActions = longRow?.querySelector(".gsd-session-actions");
    const rowRect = longRow?.getBoundingClientRect();
    longLayout = {
      available:true,
      rows:[...modal.querySelectorAll(".gsd-session-item")].length,
      found:!!longRow,
      rowWidth:rowRect ? Math.round(rowRect.width) : 0,
      rowScrollWidth:longRow?.scrollWidth || 0,
      rowOverflow:longRow ? longRow.scrollWidth > Math.ceil(rowRect.width) + 1 : true,
      actionsWidth:longActions ? Math.round(longActions.getBoundingClientRect().width) : 0,
      actionsScrollWidth:longActions?.scrollWidth || 0,
      actionsOverflow:longActions ? longActions.scrollWidth > Math.ceil(longActions.getBoundingClientRect().width) + 1 : true,
      actionWrap:longActions ? getComputedStyle(longActions).flexWrap : "",
      actionMaxWidth:longActions ? getComputedStyle(longActions).maxWidth : ""
    };
    closeModals();
    killTmuxSession(longLayoutSessionName);
    longLayoutSessionName = "";

    let cleanGenerated = { available:false, reason:"not checked" };
    cleanGeneratedSessionName = "gsd-term-cw-clean-verify";
    killTmuxSession(cleanGeneratedSessionName);
    cp.execFileSync("tmux", ["new-session", "-d", "-s", cleanGeneratedSessionName, "sleep 600"], {stdio:"ignore"});
    app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
    await delay(300);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal did not open for clean-generated check");
    const cleanGeneratedTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!cleanGeneratedTab) throw new Error("Running tab not found for clean-generated check");
    cleanGeneratedTab.click();
    await delay(900);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during clean-generated check");
    const cleanGeneratedBtn = [...modal.querySelectorAll(".gsd-session-bulk-actions button")].find(b=>b.textContent.trim().startsWith("Clean generated"));
    const cleanGeneratedRow = [...modal.querySelectorAll(".gsd-session-item")].find(row=>row.querySelector(".gsd-session-name")?.textContent.trim() === cleanGeneratedSessionName);
    cleanGenerated = {
      available:true,
      buttonText:cleanGeneratedBtn?.textContent.trim() || "",
      buttonDisabled:!!cleanGeneratedBtn?.disabled,
      rowFound:!!cleanGeneratedRow,
      confirm:null,
      after:null
    };
    if (!cleanGeneratedBtn) throw new Error("Clean generated button not found");
    if (!cleanGeneratedBtn.disabled) {
      cleanGeneratedBtn.click();
      await delay(300);
      const confirmModal = document.querySelector(".vin-category-modal");
      const confirmTitle = confirmModal?.querySelector("h3")?.textContent || "";
      const confirmMessage = confirmModal?.querySelector(".setting-item-description")?.textContent || "";
      const confirmButtons = [...confirmModal?.querySelectorAll("button") || []].map(btn=>({
        text:btn.textContent.trim(),
        warning:btn.classList.contains("mod-warning")
      }));
      const countMatch = cleanGeneratedBtn.textContent.trim().match(/\((\d+)\)/);
      const cleanupCount = countMatch ? Number(countMatch[1]) : 0;
      cleanGenerated.confirm = {
        title:confirmTitle,
        message:confirmMessage,
        buttons:confirmButtons,
        count:cleanupCount
      };
      if (cleanupCount === 1) {
        const confirmBtn = [...confirmModal?.querySelectorAll("button") || []].find(btn=>btn.textContent.trim() === "Kill 1");
        if (!confirmBtn) throw new Error("Clean generated confirm button not found");
        confirmBtn.click();
        await delay(900);
        let stillExists = false;
        try { cp.execFileSync("tmux", ["has-session", "-t", cleanGeneratedSessionName], {stdio:"ignore"}); stillExists = true; } catch {}
        modal = document.querySelector(".gsd-picker-modal");
        const rowAfterCleanup = [...modal?.querySelectorAll(".gsd-session-item") || []].find(row=>row.querySelector(".gsd-session-name")?.textContent.trim() === cleanGeneratedSessionName);
        cleanGenerated.after = {
          confirmed:true,
          stillExists,
          modalStillOpen:!!modal,
          rowFound:!!rowAfterCleanup,
          rows:[...modal?.querySelectorAll(".gsd-session-item") || []].length
        };
        cleanGeneratedSessionName = "";
      } else {
        const cancelBtn = [...confirmModal?.querySelectorAll("button") || []].find(btn=>btn.textContent.trim() === "Cancel");
        if (cancelBtn) cancelBtn.click();
        await delay(250);
        cleanGenerated.after = {
          confirmed:false,
          skipped:true,
          reason:"other generated sessions would be cleaned",
          modalClosed:!document.querySelector(".vin-category-modal"),
          pickerStillOpen:!!document.querySelector(".gsd-picker-modal")
        };
      }
    }
    closeModals();
    killTmuxSession(cleanGeneratedSessionName);
    cleanGeneratedSessionName = "";

    let rowOpen = { available:false, reason:"not checked" };
    rowOpenSessionName = "cw-row-open-verify";
    killTmuxSession(rowOpenSessionName);
    const preexistingWorkbenchTmux = listWorkbenchTmuxSessions([rowOpenSessionName]);
    cp.execFileSync("tmux", ["new-session", "-d", "-s", rowOpenSessionName, "sleep 600"], {stdio:"ignore"});
    app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
    await delay(300);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal did not open for row-open check");
    const rowOpenTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!rowOpenTab) throw new Error("Running tab not found for row-open check");
    rowOpenTab.click();
    await delay(900);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during row-open check");
    const rowOpenNameEl = [...modal.querySelectorAll(".gsd-session-name")].find(e=>e.textContent.trim() === rowOpenSessionName);
    if (!rowOpenNameEl) throw new Error("Disposable row-open tmux session not listed");
    rowOpenNameEl.click();
    await delay(1200);
    const rowOpenMatches = [];
    for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
      for (const session of leaf.view?.sessions || []) {
        if (session?.__cwTmuxName === rowOpenSessionName || session?.name === rowOpenSessionName) {
          rowOpenMatches.push({
            name:session.name || "",
            tmuxName:session.__cwTmuxName || "",
            workspace:session.__cwWorkspace || "",
            category:session.category || ""
          });
        }
      }
    }
    app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
    await delay(300);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal did not reopen for row-open badge check");
    const rowOpenBadgeTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
    if (!rowOpenBadgeTab) throw new Error("Running tab not found for row-open badge check");
    rowOpenBadgeTab.click();
    await delay(900);
    modal = document.querySelector(".gsd-picker-modal");
    if (!modal) throw new Error("Terminal picker modal closed during row-open badge check");
    const rowOpenItem = [...modal.querySelectorAll(".gsd-session-item")].find(row=>row.querySelector(".gsd-session-name")?.textContent.trim() === rowOpenSessionName);
    const rowOpenMetrics = [...modal.querySelectorAll(".gsd-session-count-metric")].map(e=>({
      value:e.querySelector(".gsd-session-count-value")?.textContent || "",
      label:e.querySelector(".gsd-session-count-label")?.textContent || ""
    }));
    const rowOpenDetachBtn = [...modal.querySelectorAll(".gsd-session-bulk-actions button")].find(b=>b.textContent.trim().startsWith("Detach all"));
    rowOpen = {
      available:true,
      matches:rowOpenMatches,
      rows:[...modal.querySelectorAll(".gsd-session-item")].length,
      openHere:Number(rowOpenMetrics.find(m=>m.label === "open here")?.value || 0),
      itemText:rowOpenItem?.textContent || "",
      hasOpenBadge:!!rowOpenItem?.querySelector(".gsd-session-meta.is-open-here"),
      detachBefore:{
        text:rowOpenDetachBtn?.textContent.trim() || "",
        disabled:!!rowOpenDetachBtn?.disabled
      },
      preexistingWorkbenchTmux,
      detachAfter:null
    };
    if (!rowOpenDetachBtn) throw new Error("Detach all button not found during row-open check");
    if (preexistingWorkbenchTmux.length === 0) {
      rowOpenDetachBtn.click();
      await delay(900);
      const rowOpenMatchesAfterDetach = [];
      for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
        for (const session of leaf.view?.sessions || []) {
          if (session?.__cwTmuxName === rowOpenSessionName || session?.name === rowOpenSessionName) {
            rowOpenMatchesAfterDetach.push({
              name:session.name || "",
              tmuxName:session.__cwTmuxName || "",
              workspace:session.__cwWorkspace || ""
            });
          }
        }
      }
      modal = document.querySelector(".gsd-picker-modal");
      const rowOpenItemAfterDetach = [...modal?.querySelectorAll(".gsd-session-item") || []].find(row=>row.querySelector(".gsd-session-name")?.textContent.trim() === rowOpenSessionName);
      const rowOpenMetricsAfterDetach = [...modal?.querySelectorAll(".gsd-session-count-metric") || []].map(e=>({
        value:e.querySelector(".gsd-session-count-value")?.textContent || "",
        label:e.querySelector(".gsd-session-count-label")?.textContent || ""
      }));
      rowOpen.detachAfter = {
        skipped:false,
        modalStillOpen:!!modal,
        matches:rowOpenMatchesAfterDetach,
        rows:[...modal?.querySelectorAll(".gsd-session-item") || []].length,
        openHere:Number(rowOpenMetricsAfterDetach.find(m=>m.label === "open here")?.value || 0),
        hasOpenBadge:!!rowOpenItemAfterDetach?.querySelector(".gsd-session-meta.is-open-here")
      };
    } else {
      rowOpen.detachAfter = {
        skipped:true,
        reason:"pre-existing Workbench tmux sessions would be detached",
        preexistingWorkbenchTmux
      };
    }
    closeModals();
    closeWorkbenchTmuxSession(rowOpenSessionName);
    await delay(300);
    killTmuxSession(rowOpenSessionName);
    rowOpenSessionName = "";

    let unavailable = { available:false, reason:"GSD workspace settings unavailable" };
    if (originalWorkspaces) {
      gsdSettings.workspaces = [
        ...originalWorkspaces,
        {
          coderName:"cw-unreachable-verify",
          displayName:"Unreachable verify",
          type:"ssh",
          sshHost:"workbench-unreachable.invalid",
          projects:[]
        }
      ];
      app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
      await delay(300);
      modal = document.querySelector(".gsd-picker-modal");
      if (!modal) throw new Error("Terminal picker modal did not open for unavailable-workspace check");
      const unavailableTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
      if (!unavailableTab) throw new Error("Running tab not found for unavailable-workspace check");
      unavailableTab.click();
      await delay(2500);
      modal = document.querySelector(".gsd-picker-modal");
      if (!modal) throw new Error("Terminal picker modal closed during unavailable-workspace check");
      const warnings = [...modal.querySelectorAll(".gsd-session-load-warning")].map(w=>({
        text:w.textContent,
        title:w.getAttribute("title") || ""
      }));
      unavailable = {
        available:true,
        tabs:[...modal.querySelectorAll(".gsd-tab")].map(e=>e.textContent.trim()),
        rows:[...modal.querySelectorAll(".gsd-session-item")].length,
        warnings,
        refreshTabSwitch:null
      };
      const refreshDuringWarning = [...modal.querySelectorAll(".gsd-session-bulk-actions button")].find(b=>b.textContent.trim() === "Refresh");
      if (!refreshDuringWarning) throw new Error("Refresh button not found for tab-switch race check");
      refreshDuringWarning.click();
      const categoriesDuringRefresh = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim() === "Categories");
      if (!categoriesDuringRefresh) throw new Error("Categories tab not found for tab-switch race check");
      categoriesDuringRefresh.click();
      await delay(2500);
      modal = document.querySelector(".gsd-picker-modal");
      if (!modal) throw new Error("Terminal picker modal closed during tab-switch race check");
      unavailable.refreshTabSwitch = {
        activeTab:[...modal.querySelectorAll(".gsd-tab.active")].map(e=>e.textContent.trim()).join(", "),
        sessionRows:[...modal.querySelectorAll(".gsd-session-item")].length,
        hasCategoryManager:!!modal.querySelector(".gsd-category-manager-title"),
        categoryTitle:modal.querySelector(".gsd-category-manager-title")?.textContent || ""
      };
      closeModals();
      gsdSettings.workspaces = originalWorkspaces;
    }

    let nestedFallback = { available:false, reason:"GSD workspace settings unavailable" };
    if (originalWorkspaces) {
      closeModals();
      gsdSettings.workspaces = [];
      gsdSettings.gsd = {
        ...(originalNestedGsd && typeof originalNestedGsd === "object" ? originalNestedGsd : {}),
        coderUser: gsdSettings.coderUser,
        workspaces: originalWorkspaces
      };
      app.commands.executeCommandById("gsd-control:open-gsd-terminal-picker");
      await delay(300);
      modal = document.querySelector(".gsd-picker-modal");
      if (!modal) throw new Error("Terminal picker modal did not open for nested-settings fallback check");
      const nestedTab = [...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"));
      if (!nestedTab) throw new Error("Running tab not found for nested-settings fallback check");
      nestedTab.click();
      await delay(900);
      modal = document.querySelector(".gsd-picker-modal");
      if (!modal) throw new Error("Terminal picker modal closed during nested-settings fallback check");
      nestedFallback = {
        available:true,
        tab:[...modal.querySelectorAll(".gsd-tab")].find(e=>e.textContent.trim().startsWith("Running"))?.textContent.trim() || "",
        rows:[...modal.querySelectorAll(".gsd-session-item")].length,
        subtitle:modal.querySelector(".gsd-picker-subtitle")?.textContent || "",
        warning:modal.querySelector(".gsd-session-load-warning")?.textContent || "",
        open:{available:false, reason:"current Coder workspace unavailable"},
        explorer:{available:false, reason:"not checked"},
        upload:{available:false, reason:"vmConnect unavailable"},
        status:{available:false, reason:"not checked"}
      };
      closeModals();
      const uploadResolver = app.plugins.plugins["workbench"]?.modules?.vmConnect;
      if (uploadResolver?.resolveUploadTargetForSession) {
        const workspaceForUpload = originalWorkspaces[0];
        const markedTarget = uploadResolver.resolveUploadTargetForSession({
          name:"renamed-tab",
          __cwWorkspace:workspaceForUpload?.coderName || ""
        });
        const namedTarget = uploadResolver.resolveUploadTarget(workspaceForUpload?.displayName || workspaceForUpload?.coderName || "");
        nestedFallback.upload = {
          configuredDir: workspaceForUpload?.uploadDir || "",
          available:true,
          workspace:workspaceForUpload?.coderName || "",
          coderUser:gsdSettings.gsd?.coderUser || gsdSettings.coderUser || "",
          marked:markedTarget ? {
            scpHost:markedTarget.scpHost || "",
            label:markedTarget.label || "",
            remoteDir:markedTarget.remoteDir || ""
          } : null,
          named:namedTarget ? {
            scpHost:namedTarget.scpHost || "",
            label:namedTarget.label || "",
            remoteDir:namedTarget.remoteDir || ""
          } : null
        };
      }
      createdExplorerLeaf = app.workspace.getLeaf("tab");
      await createdExplorerLeaf.setViewState({type:"gsd-explorer-view", active:true});
      await delay(300);
      const explorerView = createdExplorerLeaf.view;
      const explorerRows = [...createdExplorerLeaf.view?.containerEl?.querySelectorAll(".gsd-explorer-list-row") || []].map(row=>row.textContent.trim());
      const explorerEmpty = createdExplorerLeaf.view?.containerEl?.querySelector(".gsd-explorer-list-empty")?.textContent || "";
      const workbenchPlugin = app.plugins.plugins["workbench"];
      const explorerWorkspaceName = originalWorkspaces[0]?.coderName || "";
      const explorerCoderUser = gsdSettings.gsd?.coderUser || gsdSettings.coderUser || "";
      const explorerDispatchWs = workbenchPlugin?._explorerFindWs?.(explorerWorkspaceName);
      const explorerViewWs = workbenchPlugin?._explorerWorkspaceForView?.({selectedWorkspace:explorerWorkspaceName});
      let explorerHost = "";
      try {
        explorerHost = explorerDispatchWs ? workbenchPlugin?._explorerHostFor?.(explorerDispatchWs)?.[0] || "" : "";
      } catch (err) {
        explorerHost = "ERROR: " + (err?.message || err);
      }
      nestedFallback.explorer = {
        available:true,
        rows:explorerRows,
        empty:explorerEmpty,
        displayText:typeof explorerView?.getDisplayText === "function" ? explorerView.getDisplayText() : "",
        dispatchWorkspace:explorerDispatchWs?.coderName || "",
        viewWorkspace:explorerViewWs?.coderName || "",
        host:explorerHost,
        coderUser:explorerCoderUser
      };
      try { await createdExplorerLeaf.detach(); } catch {}
      createdExplorerLeaf = null;

      const savedTopCoderUser = gsdSettings.coderUser;
      const savedNestedCoderUser = gsdSettings.gsd?.coderUser;
      const savedNestedWorkspaces = gsdSettings.gsd?.workspaces;
      gsdSettings.coderUser = "";
      gsdSettings.gsd = {
        ...(gsdSettings.gsd || {}),
        coderUser:"",
        workspaces:[{
          coderName:"cw-status-verify",
          displayName:"Status Verify",
          type:"coder",
          projects:[{path:"status-project", displayName:"Status Project"}]
        }]
      };
      createdStatusLeaf = app.workspace.getLeaf("tab");
      await createdStatusLeaf.setViewState({type:"gsd-status-view", active:true});
      await delay(500);
      const statusRoot = createdStatusLeaf.view?.containerEl;
      nestedFallback.status = {
        available:true,
        cardNames:[...statusRoot?.querySelectorAll(".gsd-status-project-name") || []].map(el=>el.textContent || ""),
        empty:statusRoot?.querySelector(".gsd-status-detail-empty")?.textContent || "",
        previews:[...statusRoot?.querySelectorAll(".gsd-status-preview, .gsd-status-row") || []].map(el=>el.textContent || "").slice(0, 8)
      };
      try { await createdStatusLeaf.detach(); } catch {}
      createdStatusLeaf = null;
      gsdSettings.coderUser = savedTopCoderUser;
      gsdSettings.gsd = {
        ...(gsdSettings.gsd || {}),
        coderUser:savedNestedCoderUser,
        workspaces:savedNestedWorkspaces
      };

      const currentWorkspace = (process.env.CODER_WORKSPACE_NAME || "").trim();
      const nestedWorkspace = originalWorkspaces.find(w=>w?.coderName === currentWorkspace) || originalWorkspaces[0];
      const canOpenNested = process.env.CODER === "true" && nestedWorkspace?.coderName === currentWorkspace;
      if (canOpenNested) {
        nestedOpenSessionName = "cw-nested-open-verify";
        killTmuxSession(nestedOpenSessionName);
        cp.execFileSync("tmux", ["new-session", "-d", "-s", nestedOpenSessionName, "sleep 600"], {stdio:"ignore"});
        const vinLeavesBeforeOpen = app.workspace.getLeavesOfType("vin-terminal-view").length;
        const gsd = app.plugins.plugins["workbench"]?.modules?.gsd;
        if (!gsd?.openSpecificSession) throw new Error("GSD openSpecificSession unavailable for nested-settings open check");
        await gsd.openSpecificSession(nestedWorkspace.coderName, nestedOpenSessionName, "", false, "");
        await delay(900);
        const matches = [];
        for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
          for (const session of leaf.view?.sessions || []) {
            if (session?.__cwTmuxName === nestedOpenSessionName || session?.name === nestedOpenSessionName) {
              matches.push({
                name:session.name || "",
                tmuxName:session.__cwTmuxName || "",
                workspace:session.__cwWorkspace || "",
                category:session.category || ""
              });
            }
          }
        }
        nestedFallback.open = {
          available:true,
          workspace:nestedWorkspace.coderName,
          matches,
          vinLeavesBeforeOpen,
          vinLeavesAfterOpen:app.workspace.getLeavesOfType("vin-terminal-view").length
        };
        closeWorkbenchTmuxSession(nestedOpenSessionName);
        await delay(300);
        killTmuxSession(nestedOpenSessionName);
        nestedOpenSessionName = "";
      }
      gsdSettings.workspaces = originalWorkspaces;
      if (!hadOriginalNestedGsd) {
        delete gsdSettings.gsd;
      } else {
        gsdSettings.gsd = originalNestedGsd;
      }
    }

    const vinLeavesBefore = app.workspace.getLeavesOfType("vin-terminal-view").length;
    vinLeaf = app.workspace.getLeavesOfType("vin-terminal-view")[0];
    if (!vinLeaf) {
      vinLeaf = app.workspace.getLeaf("tab");
      await vinLeaf.setViewState({type:"vin-terminal-view", active:true});
      createdVinLeaf = true;
      await delay(700);
    }
    const vinView = vinLeaf?.view;
    const vinSession = vinView?.activeSession || vinView?.sessions?.[0];
    const vin = exerciseTerminal(vinSession?.terminal, vinSession?.autocomplete);
    if (createdVinLeaf && vinLeaf) {
      try { await vinLeaf.detach(); } catch {}
    }

    return JSON.stringify({
      plugin:{loaded, enabled},
      settingsBaseline:{
        workspaceCount:Array.isArray(originalWorkspaces) ? originalWorkspaces.length : null,
        coderUser:originalCoderUser,
        hadNestedGsd:hadOriginalNestedGsd
      },
      tmux:{rawBefore, rawAfter:rawTmuxCount()},
      running:{beforeRefresh, afterRefresh, rowOpen},
      layout:{longLayout, cleanGenerated},
      unavailable,
      nestedFallback,
      vin,
      cleanup:{
        modals: document.querySelectorAll(".modal").length,
        vinLeavesBefore,
        vinLeavesAfter: app.workspace.getLeavesOfType("vin-terminal-view").length
      }
    });
  } finally {
    closeWorkbenchTmuxSession(nestedOpenSessionName);
    killTmuxSession(nestedOpenSessionName);
    closeWorkbenchTmuxSession(rowOpenSessionName);
    killTmuxSession(rowOpenSessionName);
    killTmuxSession(longLayoutSessionName);
    killTmuxSession(cleanGeneratedSessionName);
    if (createdExplorerLeaf && app.workspace.getLeavesOfType("gsd-explorer-view").includes(createdExplorerLeaf)) {
      try { await createdExplorerLeaf.detach(); } catch {}
    }
    if (createdStatusLeaf && app.workspace.getLeavesOfType("gsd-status-view").includes(createdStatusLeaf)) {
      try { await createdStatusLeaf.detach(); } catch {}
    }
    if (gsdSettings && originalWorkspaces) gsdSettings.workspaces = originalWorkspaces;
    if (gsdSettings) {
      if (!hadOriginalNestedGsd) {
        delete gsdSettings.gsd;
      } else {
        gsdSettings.gsd = originalNestedGsd;
      }
    }
    closeModals();
    if (createdVinLeaf && vinLeaf && app.workspace.getLeavesOfType("vin-terminal-view").includes(vinLeaf)) {
      try { await vinLeaf.detach(); } catch {}
    }
  }
})()
`;

const postSmokeCleanupAudit = String.raw`
(()=>{
  const gsd = app.plugins.plugins["workbench"]?.modules?.gsd;
  for (const btn of [...document.querySelectorAll(".modal-close-button")]) btn.click();
  const settings = gsd?.settings || {};
  const sessionNames = [];
  for (const leaf of app.workspace.getLeavesOfType("vin-terminal-view")) {
    for (const session of leaf.view?.sessions || []) {
      sessionNames.push({
        name:session.name || "",
        tmuxName:session.__cwTmuxName || "",
        workspace:session.__cwWorkspace || ""
      });
    }
  }
  return JSON.stringify({
    topLen:Array.isArray(settings.workspaces) ? settings.workspaces.length : null,
    coderUser:settings.coderUser || "",
    nestedExists:Object.prototype.hasOwnProperty.call(settings, "gsd"),
    hasFake:(settings.workspaces || []).some((ws) => ws?.coderName === "cw-unreachable-verify"),
    modals:document.querySelectorAll(".modal").length,
    vinLeaves:app.workspace.getLeavesOfType("vin-terminal-view").length,
    explorerLeaves:app.workspace.getLeavesOfType("gsd-explorer-view").length,
    statusLeaves:app.workspace.getLeavesOfType("gsd-status-view").length,
    hasNestedOpen:sessionNames.some((s) => s.tmuxName === "cw-nested-open-verify" || s.name === "cw-nested-open-verify"),
    hasRowOpen:sessionNames.some((s) => s.tmuxName === "cw-row-open-verify" || s.name === "cw-row-open-verify"),
    hasLayoutOpen:sessionNames.some((s) => s.tmuxName === "cw-layout-verify-long-session-name-1234567890" || s.name === "cw-layout-verify-long-session-name-1234567890"),
    hasCleanOpen:sessionNames.some((s) => s.tmuxName === "gsd-term-cw-clean-verify" || s.name === "gsd-term-cw-clean-verify"),
    sessionNames
  });
})()
`;

function assertRuntime(result) {
  const raw = result.tmux.rawBefore;
  const before = result.running.beforeRefresh;
  const after = result.running.afterRefresh;
  const metricTotal = Number(before.metrics.find((m) => m.label === "tmux sessions")?.value);
  const failures = [];
  if (!result.plugin.loaded || !result.plugin.enabled) failures.push("plugin reload failed");
  if (result.tmux.rawAfter !== raw) failures.push(`raw tmux count changed during smoke: ${raw} -> ${result.tmux.rawAfter}`);
  if (before.tab !== `Running (${raw})`) failures.push(`running tab label mismatch: ${before.tab} vs Running (${raw})`);
  if (before.rows !== raw) failures.push(`running row count mismatch: ${before.rows} vs ${raw}`);
  if (metricTotal !== raw) failures.push(`tmux metric mismatch: ${metricTotal} vs ${raw}`);
  if (before.systemRows !== 0) failures.push(`Running tab exposes ${before.systemRows} system session row(s)`);
  if (before.systemKillButtons !== 0) failures.push(`system rows expose ${before.systemKillButtons} kill button(s)`);
  if (before.systemCategoryButtons !== 0) failures.push(`system rows expose ${before.systemCategoryButtons} editable category button(s)`);
  if (before.lockedSystemCategories !== 0) failures.push(`Running tab exposes ${before.lockedSystemCategories} locked system category pill(s)`);
  if (before.metrics.some((metric) => metric.label === "system")) failures.push("Running summary exposes a system-session metric");
  if (before.warning) failures.push(`unexpected running warning: ${before.warning}`);
  if (before.summaryOverflow) failures.push("session metric summary overflows");
  if (before.actionOverflow) failures.push("session action row overflows");
  if (before.actionWrap !== "wrap") failures.push(`action row flex-wrap is ${before.actionWrap}`);
  if (before.pickerGeometry?.overflowX) failures.push(`picker modal overflows viewport horizontally: ${JSON.stringify(before.pickerGeometry)}`);
  if (!String(before.pickerGeometry?.cssWidth || "").includes("px")) failures.push(`picker modal width was not measurable: ${JSON.stringify(before.pickerGeometry || {})}`);
  if (!String(before.pickerGeometry?.cssMaxWidth || "").includes("px")) failures.push(`picker modal max-width was not resolved: ${JSON.stringify(before.pickerGeometry || {})}`);
  if (before.bodyGeometry?.overflowY) failures.push(`picker body overflows viewport vertically: ${JSON.stringify(before.bodyGeometry)}`);
  if (!String(before.bodyGeometry?.cssMaxHeight || "").includes("px")) failures.push(`picker body max-height was not resolved: ${JSON.stringify(before.bodyGeometry || {})}`);
  if (before.attachConfirm?.available) {
    const confirm = before.attachConfirm;
    const countMatch = confirm.attachText.match(/\((\d+)\)/);
    const expectedCount = countMatch ? Number(countMatch[1]) : 0;
    if (confirm.title !== "Attach tmux sessions") failures.push(`Attach all confirmation title mismatch: ${confirm.title || ""}`);
    if (!confirm.message.includes(`Open ${expectedCount} non-system tmux session`)) {
      failures.push(`Attach all confirmation message/count mismatch: ${JSON.stringify(confirm)}`);
    }
    if (!confirm.buttons.some((button) => button.text === `Attach ${expectedCount}` && button.warning)) {
      failures.push(`Attach all confirmation missing warning confirm button: ${JSON.stringify(confirm.buttons || [])}`);
    }
    if (!confirm.buttons.some((button) => button.text === "Cancel")) {
      failures.push(`Attach all confirmation missing Cancel button: ${JSON.stringify(confirm.buttons || [])}`);
    }
    if (!confirm.modalClosed || !confirm.pickerStillOpen) failures.push(`Attach all Cancel did not return to picker cleanly: ${JSON.stringify(confirm)}`);
    if (confirm.vinLeavesAfter !== confirm.vinLeavesBefore) failures.push(`Attach all confirmation opened terminal leaves before confirm: ${JSON.stringify(confirm)}`);
  }
  if (after.tab !== `Running (${raw})` || after.rows !== raw || after.warning) {
    failures.push(`rapid refresh settled incorrectly: ${JSON.stringify(after)}`);
  }
  if (result.layout?.longLayout?.available) {
    const layout = result.layout.longLayout;
    if (!layout.found) failures.push("long tmux layout row was not rendered");
    if (layout.rows !== raw + 1) failures.push(`long tmux layout row count mismatch: ${layout.rows} vs ${raw + 1}`);
    if (layout.rowOverflow) failures.push(`long tmux row overflows: ${JSON.stringify(layout)}`);
    if (layout.actionsOverflow) failures.push(`long tmux row actions overflow: ${JSON.stringify(layout)}`);
    if (layout.actionWrap !== "wrap") failures.push(`long tmux row actions flex-wrap is ${layout.actionWrap}`);
  }
  if (result.layout?.cleanGenerated?.available) {
    const cleanup = result.layout.cleanGenerated;
    if (!cleanup.rowFound) failures.push("Clean generated disposable tmux row was not rendered");
    if (cleanup.buttonDisabled || !cleanup.buttonText.startsWith("Clean generated")) {
      failures.push(`Clean generated button was not enabled for disposable generated session: ${JSON.stringify(cleanup)}`);
    }
    const countMatch = cleanup.buttonText.match(/\((\d+)\)/);
    const expectedCount = countMatch ? Number(countMatch[1]) : 0;
    if (expectedCount < 1) failures.push(`Clean generated count missing: ${cleanup.buttonText || ""}`);
    if (cleanup.confirm) {
      if (cleanup.confirm.title !== "Clean generated tmux sessions") failures.push(`Clean generated confirmation title mismatch: ${cleanup.confirm.title || ""}`);
      if (!cleanup.confirm.message.includes(`Kill ${expectedCount} generated gsd-term-* tmux session`)) {
        failures.push(`Clean generated confirmation message/count mismatch: ${JSON.stringify(cleanup.confirm)}`);
      }
      if (!cleanup.confirm.buttons.some((button) => button.text === `Kill ${expectedCount}` && button.warning)) {
        failures.push(`Clean generated confirmation missing warning button: ${JSON.stringify(cleanup.confirm.buttons || [])}`);
      }
      if (!cleanup.confirm.buttons.some((button) => button.text === "Cancel")) {
        failures.push(`Clean generated confirmation missing Cancel button: ${JSON.stringify(cleanup.confirm.buttons || [])}`);
      }
    } else {
      failures.push("Clean generated confirmation was not captured");
    }
    if (cleanup.after?.confirmed) {
      if (cleanup.after.stillExists) failures.push("Clean generated confirmed but disposable tmux session still exists");
      if (!cleanup.after.modalStillOpen) failures.push("Clean generated confirmed and closed the picker unexpectedly");
      if (cleanup.after.rowFound) failures.push("Clean generated confirmed but disposable row still rendered");
      if (cleanup.after.rows !== raw) failures.push(`Clean generated confirmed row count mismatch: ${cleanup.after.rows} vs ${raw}`);
    } else if (cleanup.after?.skipped) {
      if (!cleanup.after.modalClosed || !cleanup.after.pickerStillOpen) failures.push(`Clean generated cancel did not return to picker cleanly: ${JSON.stringify(cleanup.after)}`);
    } else {
      failures.push(`Clean generated neither confirmed nor safely skipped: ${JSON.stringify(cleanup.after || {})}`);
    }
  }
  if (result.running.rowOpen?.available) {
    const rowOpen = result.running.rowOpen;
    if (rowOpen.matches.length !== 1) failures.push(`row-open expected one terminal match, got ${rowOpen.matches.length}`);
    const match = rowOpen.matches[0] || {};
    if (match.tmuxName !== "cw-row-open-verify") failures.push(`row-open tmux marker mismatch: ${match.tmuxName || ""}`);
    if (!rowOpen.hasOpenBadge || !rowOpen.itemText.includes("open")) failures.push(`row-open Running row missing open badge: ${rowOpen.itemText || ""}`);
    if (rowOpen.openHere < 1) failures.push(`row-open metric did not count open session: ${rowOpen.openHere}`);
    if (rowOpen.rows !== raw + 1) failures.push(`row-open rows mismatch while disposable session exists: ${rowOpen.rows} vs ${raw + 1}`);
    if (!rowOpen.detachBefore?.text?.startsWith("Detach all") || rowOpen.detachBefore?.disabled) {
      failures.push(`row-open detach button was not enabled: ${JSON.stringify(rowOpen.detachBefore || {})}`);
    }
    const detachAfter = rowOpen.detachAfter || {};
    if (detachAfter.skipped) {
      if (!rowOpen.preexistingWorkbenchTmux?.length) {
        failures.push(`Detach all was skipped without pre-existing Workbench tmux sessions: ${JSON.stringify(detachAfter)}`);
      }
    } else {
      if (rowOpen.preexistingWorkbenchTmux?.length) {
        failures.push(`Detach all clicked despite pre-existing Workbench tmux sessions: ${JSON.stringify(rowOpen.preexistingWorkbenchTmux)}`);
      }
      if (!detachAfter.modalStillOpen) failures.push("Detach all closed the Running modal unexpectedly");
      if ((detachAfter.matches || []).length !== 0) failures.push(`Detach all left row-open terminal attachment(s): ${JSON.stringify(detachAfter.matches || [])}`);
      if (detachAfter.openHere !== 0) failures.push(`Detach all did not reset open-here metric: ${detachAfter.openHere}`);
      if (detachAfter.hasOpenBadge) failures.push("Detach all left the open badge on the row-open tmux session");
      if (detachAfter.rows !== raw + 1) failures.push(`Detach all changed tmux row count before cleanup: ${detachAfter.rows} vs ${raw + 1}`);
    }
  }
  if (result.unavailable.available) {
    if (result.unavailable.rows !== raw) failures.push(`unavailable-workspace row count mismatch: ${result.unavailable.rows} vs ${raw}`);
    if (!result.unavailable.tabs.includes(`Running (${raw})`)) failures.push(`unavailable-workspace tab mismatch: ${result.unavailable.tabs.join(", ")}`);
    if (result.unavailable.warnings.length !== 1) failures.push(`expected one unavailable-workspace warning, got ${result.unavailable.warnings.length}`);
    const warning = result.unavailable.warnings[0] || {};
    if (!warning.text?.includes("cw-unreachable-verify")) failures.push(`unavailable warning missing workspace name: ${warning.text || ""}`);
    if (!warning.title?.includes("Could not resolve hostname")) failures.push(`unavailable warning title missing SSH failure detail: ${warning.title || ""}`);
    const tabSwitch = result.unavailable.refreshTabSwitch || {};
    if (tabSwitch.activeTab !== "Categories") failures.push(`refresh tab-switch active tab mismatch: ${tabSwitch.activeTab || ""}`);
    if (tabSwitch.sessionRows !== 0) failures.push(`refresh tab-switch leaked ${tabSwitch.sessionRows} running row(s) into Categories`);
    if (!tabSwitch.hasCategoryManager || tabSwitch.categoryTitle !== "Terminal categories") {
      failures.push(`refresh tab-switch did not preserve Categories content: ${JSON.stringify(tabSwitch)}`);
    }
  }
  if (result.nestedFallback.available) {
    if (result.nestedFallback.tab !== `Running (${raw})`) failures.push(`nested workspace fallback tab mismatch: ${result.nestedFallback.tab}`);
    if (result.nestedFallback.rows !== raw) failures.push(`nested workspace fallback rows mismatch: ${result.nestedFallback.rows} vs ${raw}`);
    if (!result.nestedFallback.subtitle.includes("1 connection")) failures.push(`nested workspace fallback subtitle mismatch: ${result.nestedFallback.subtitle}`);
    if (result.nestedFallback.warning) failures.push(`nested workspace fallback warning: ${result.nestedFallback.warning}`);
    if (result.nestedFallback.explorer?.available) {
      const explorerRows = result.nestedFallback.explorer.rows || [];
      if (!explorerRows.length) failures.push(`nested workspace explorer rendered no rows: ${result.nestedFallback.explorer.empty || ""}`);
      if (!explorerRows.some((row) => row.includes("main"))) failures.push(`nested workspace explorer missing main row: ${explorerRows.join(", ")}`);
      if (!result.nestedFallback.explorer.dispatchWorkspace) failures.push("nested explorer dispatch workspace missing");
      if (result.nestedFallback.explorer.viewWorkspace !== result.nestedFallback.explorer.dispatchWorkspace) {
        failures.push(`nested explorer view workspace mismatch: ${result.nestedFallback.explorer.viewWorkspace || ""}`);
      }
      const expectedExplorerHost = `main.${result.nestedFallback.explorer.dispatchWorkspace}.${result.nestedFallback.explorer.coderUser}.coder`;
      if (result.nestedFallback.explorer.host !== expectedExplorerHost) failures.push(`nested explorer host mismatch: ${result.nestedFallback.explorer.host || ""}`);
    }
    if (result.nestedFallback.upload?.available) {
      const upload = result.nestedFallback.upload;
      const expectedHost = `main.${upload.workspace}.${upload.coderUser}.coder`;
      if (upload.marked?.scpHost !== expectedHost) failures.push(`nested upload marked target mismatch: ${upload.marked?.scpHost || ""}`);
      if (upload.named?.scpHost !== expectedHost) failures.push(`nested upload named target mismatch: ${upload.named?.scpHost || ""}`);
      if (upload.marked?.remoteDir !== upload.configuredDir) failures.push(`nested upload marked remote dir mismatch: ${upload.marked?.remoteDir || ""}`);
    }
    if (result.nestedFallback.status?.available) {
      const status = result.nestedFallback.status;
      if (!status.cardNames?.includes("Status Project")) failures.push(`nested status fallback missing project card: ${(status.cardNames || []).join(", ")}`);
      if (status.empty) failures.push(`nested status fallback rendered empty state: ${status.empty}`);
    }
    if (result.nestedFallback.open?.available) {
      const matches = result.nestedFallback.open.matches || [];
      if (matches.length !== 1) failures.push(`nested workspace open expected one terminal match, got ${matches.length}`);
      const match = matches[0] || {};
      if (match.tmuxName !== "cw-nested-open-verify") failures.push(`nested workspace open tmux marker mismatch: ${match.tmuxName || ""}`);
      if (match.workspace !== result.nestedFallback.open.workspace) failures.push(`nested workspace open workspace marker mismatch: ${match.workspace || ""}`);
    }
  }
  const buttonTexts = before.buttons.map((button) => button.text);
  for (const label of ["Refresh", "Detach all", "Clean generated"]) {
    if (!buttonTexts.includes(label)) failures.push(`missing button: ${label}`);
  }
  if (!buttonTexts.some((label) => label.startsWith("Attach all"))) failures.push("missing button: Attach all");
  if (result.vin.available) {
    if (!result.vin.missingKeyNoThrow) failures.push("terminal copy handler throws on missing key");
    if (result.vin.cmdReturned !== false) failures.push("Cmd+C did not intercept selected text");
    if (result.vin.ctrlShiftReturned !== false) failures.push("Ctrl+Shift+C did not intercept selected text");
    if (result.vin.ctrlReturned !== true) failures.push("plain Ctrl+C did not pass through");
    if (result.vin.copies !== 2) failures.push(`copy handler count mismatch: ${result.vin.copies}`);
    if (!result.vin.normalSelect || !result.vin.patchInstalled) failures.push("normal terminal selection patch is not active");
  }
  if (result.cleanup.modals !== 0) failures.push(`left ${result.cleanup.modals} modal(s) open`);
  if (failures.length) {
    throw new Error(`Runtime verification failed:\n- ${failures.join("\n- ")}`);
  }
}

function tmuxSessionExists(name) {
  try {
    run("tmux", ["has-session", "-t", name], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function assertPostSmokeCleanup(cleanup, baseline = {}) {
  const failures = [];
  if (cleanup.hasFake) failures.push("fake unavailable workspace remains in settings");
  if (typeof baseline.workspaceCount === "number" && cleanup.topLen !== baseline.workspaceCount) {
    failures.push(`workspace settings count changed: ${cleanup.topLen} vs ${baseline.workspaceCount}`);
  }
  if (typeof baseline.coderUser === "string" && cleanup.coderUser !== baseline.coderUser) {
    failures.push(`coderUser setting changed: ${cleanup.coderUser || ""} vs ${baseline.coderUser}`);
  }
  if (typeof baseline.hadNestedGsd === "boolean" && cleanup.nestedExists !== baseline.hadNestedGsd) {
    failures.push(`nested gsd settings presence changed: ${cleanup.nestedExists} vs ${baseline.hadNestedGsd}`);
  }
  if (cleanup.modals !== 0) failures.push(`left ${cleanup.modals} modal(s) open`);
  if (cleanup.explorerLeaves !== 0) failures.push(`left ${cleanup.explorerLeaves} explorer leaf/leaves open`);
  if (cleanup.statusLeaves !== 0) failures.push(`left ${cleanup.statusLeaves} status leaf/leaves open`);
  if (cleanup.hasNestedOpen) failures.push("nested disposable terminal session remains open");
  if (cleanup.hasRowOpen) failures.push("row-open disposable terminal session remains open");
  if (cleanup.hasLayoutOpen) failures.push("layout disposable terminal session remains open");
  if (cleanup.hasCleanOpen) failures.push("clean-generated disposable terminal session remains open");
  const disposableTmuxNames = [
    "cw-nested-open-verify",
    "cw-row-open-verify",
    "cw-layout-verify-long-session-name-1234567890",
    "gsd-term-cw-clean-verify"
  ];
  for (const name of disposableTmuxNames) {
    if (tmuxSessionExists(name)) failures.push(`tmux disposable session still exists: ${name}`);
  }
  if (failures.length) {
    throw new Error(`Post-smoke cleanup verification failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  const sourceOnly = process.argv.includes("--source-only") || process.env.WORKBENCH_VERIFY_SOURCE_ONLY === "1";
  check("python3", ["build.py", "--check"]);
  check(process.execPath, ["--check", "main.js"]);
  check(process.execPath, ["--check", "vendor/gsd-control/main.js"]);
  check(process.execPath, ["--check", "vendor/internetvin-terminal/main.js"]);
  check(process.execPath, ["scripts/verify-secure-input.js"]);
  check(process.execPath, ["scripts/verify-codex-attention.js"]);
  check(pythonWithTomllib(), ["scripts/verify-codex-attention-helper.py"]);
  check("git", ["diff", "--check"]);
  assertOpenSessionMatchingSource();
  assertResponsivePickerSource();
  assertVmConnectUsesNestedSettingsHelpers();
  assertCodexAttentionSource();
  assertDefaultWorkspaceScopeSource();
  assertSystemTmuxScopeSource();
  assertSystemTmuxHiddenFromNormalUiSource();
  assertHiddenTerminalRenderGuardSource();
  assertSystemTmuxPolicyBehavior();
  assertTerminalLocationCategorySource();
  await assertTerminalSurfingLinkBehavior();
  if (sourceOnly) {
    process.stdout.write("workbench source verification passed\n");
    return;
  }

  process.stdout.write("check: obsidian runtime smoke\n");
  const result = obsidianEval(runtimeSmoke);
  assertRuntime(result);
  process.stdout.write("check: post-smoke cleanup audit\n");
  const cleanup = obsidianEval(postSmokeCleanupAudit);
  assertPostSmokeCleanup(cleanup, result.settingsBaseline || {});
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ postSmokeCleanup: cleanup }, null, 2)}\n`);
  process.stdout.write("workbench verification passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
