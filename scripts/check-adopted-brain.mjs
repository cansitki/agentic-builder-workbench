#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const requestedPath = process.argv[2];
if (!requestedPath) {
  process.stderr.write("Usage: node scripts/check-adopted-brain.mjs /absolute/path/to/AGENTS.md\n");
  process.exit(2);
}

const brainPath = resolve(requestedPath);
let source;
try {
  source = await readFile(brainPath, "utf8");
} catch (error) {
  process.stderr.write(`Cannot read ${brainPath}: ${error.message}\n`);
  process.exit(1);
}

const placeholders = [
  ...new Set(
    [...source.matchAll(/\[[A-Z][A-Z0-9 _/;:.-]{1,80}\]/g)].map((match) => match[0]),
  ),
].sort();
const required = [
  "## IMPORTANT: Read Memory First",
  "## IMPORTANT: Canonical TODO List",
  "### Secure credential intake — hard gate, no exceptions",
  "secenv ask",
  "## Build/Fix Execution",
];
const missing = required.filter((value) => !source.includes(value));
const failures = [];
if (Buffer.byteLength(source, "utf8") > 32768) failures.push("file exceeds 32 KiB");
if (placeholders.length > 0) failures.push(`unresolved placeholders: ${placeholders.join(", ")}`);
if (missing.length > 0) failures.push(`missing required invariants: ${missing.join(", ")}`);

if (failures.length > 0) {
  process.stderr.write("Adopted brain validation failed:\n");
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  `Adopted brain validation passed (${Buffer.byteLength(source, "utf8")} bytes): ${brainPath}\n`,
);
