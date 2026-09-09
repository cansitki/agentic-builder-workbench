#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = await readFile(resolve(root, "templates/personal/AGENTS.md"), "utf8");
const requiredHeadings = [
  "## IMPORTANT: Read Memory First",
  "## IMPORTANT: Canonical TODO List",
  "## Identity",
  "### Instruction sync",
  "## Operating Structure",
  "### Operator flow",
  "### Work workspace",
  "### System/runtime workspace",
  "### Durable services",
  "### Backup and migration gates",
  "### Secure credential intake — hard gate, no exceptions",
  "### Tmux visibility and ownership",
  "### Obsidian vault",
  "### Excalidraw quality",
  "### Obsidian CLI safety",
  "### Before writing to the vault",
  "### Wikilinks and Vault Index",
  "### Time",
  "### Interaction logging",
  "### External alert ordering",
  "### Daily note structure",
  "### Links Inbox",
  "### Weekly reports",
  "### Daily close",
  "### Research workflow",
  "### Which research skill to use",
  "### Agents",
  "### Communication",
  "### External commercial or operational messages",
  "### Security",
  "### Session management",
  "## Platform-Specific Configuration",
  "### Workbench plugin",
  "### Key paths",
  "### Legacy systems",
  "## Active Projects",
  "## Logging Rule",
  "## Build/Fix Execution",
];
const requiredInvariants = [
  "secenv ask",
  "There is no legacy browser-link",
  "Secure intake does not authorize",
  "Move one item between sections rather than copying it",
  "`## Links Inbox` is always the last section",
  "becomes `unknown` and is never retried automatically",
  "Durable services do not belong in tmux",
];
const missing = [
  ...requiredHeadings.filter((heading) => !source.includes(heading)),
  ...requiredInvariants.filter((invariant) => !source.includes(invariant)),
];

if (Buffer.byteLength(source, "utf8") > 32768) {
  missing.push("AGENTS.md exceeds 32 KiB");
}

if (missing.length > 0) {
  process.stderr.write("Full brain coverage check failed:\n");
  for (const item of missing) process.stderr.write(`- ${item}\n`);
  process.exit(1);
}

process.stdout.write(
  `Full brain coverage passed (${requiredHeadings.length} sections, ${requiredInvariants.length} invariants, ${Buffer.byteLength(source, "utf8")} bytes).\n`,
);
