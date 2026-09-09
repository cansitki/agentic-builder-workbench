#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const markdownFiles = [];
const ignoredDirectories = new Set([
  ".git",
  ".terraform",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "build",
  "dist",
  "node_modules",
  "venv",
]);

async function walk(directory) {
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory() && ignoredDirectories.has(entry)) continue;
    if (info.isDirectory()) await walk(path);
    else if (extname(entry).toLowerCase() === ".md") markdownFiles.push(path);
  }
}

await walk(root);

const knowledgeRoot = join(root, "knowledge");
const knowledgeFiles = markdownFiles.filter((file) => file.startsWith(`${knowledgeRoot}/`));
const knowledgeNames = new Set(
  knowledgeFiles.map((file) => relative(knowledgeRoot, file).replace(/\.md$/i, "")),
);
const knowledgeBasenames = new Set(
  knowledgeFiles.map((file) => relative(knowledgeRoot, file).replace(/\.md$/i, "").split("/").at(-1)),
);

const failures = [];

function cleanTarget(raw) {
  return raw
    .replace(/\\\|/g, "|")
    .split("|")[0]
    .split("#")[0]
    .trim()
    .replace(/\.md$/i, "");
}

for (const file of knowledgeFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = cleanTarget(match[1]);
    if (!target || target.includes("://")) continue;
    const basename = target.split("/").at(-1);
    if (!knowledgeNames.has(target) && !knowledgeBasenames.has(basename)) {
      failures.push(`${relative(root, file)} -> [[${target}]]`);
    }
  }
}

for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(https?:|mailto:|#)/i.test(rawTarget)) continue;
    const pathPart = decodeURIComponent(rawTarget.split("#")[0]);
    const target = normalize(resolve(dirname(file), pathPart));
    try {
      await stat(target);
    } catch {
      failures.push(`${relative(root, file)} -> (${rawTarget})`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write("Broken internal links:\n");
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(`Link check passed (${markdownFiles.length} Markdown files).\n`);
