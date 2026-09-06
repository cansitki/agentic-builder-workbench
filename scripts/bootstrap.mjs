#!/usr/bin/env node

import { access, cp, mkdir, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import process from "node:process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const [mode, rawDestination, ...flags] = process.argv.slice(2);
const dryRun = flags.includes("--dry-run");

const sources = {
  personal: join(repoRoot, "templates", "personal"),
  project: join(repoRoot, "templates", "project"),
  vault: join(repoRoot, "templates", "vault"),
};

if (!sources[mode] || !rawDestination || flags.some((flag) => flag !== "--dry-run")) {
  process.stderr.write(
    "Usage: node scripts/bootstrap.mjs <personal|project|vault> <destination> [--dry-run]\n",
  );
  process.exit(2);
}

const source = sources[mode];
const destination = resolve(rawDestination);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function collectRelativeFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(join(directory, entry.name), relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const relativeFiles = await collectRelativeFiles(source);
const collisions = [];
for (const relativeFile of relativeFiles) {
  if (await exists(join(destination, relativeFile))) collisions.push(relativeFile);
}

if (collisions.length > 0) {
  process.stderr.write("Refusing to overwrite existing files:\n");
  for (const collision of collisions) process.stderr.write(`- ${collision}\n`);
  process.exit(1);
}

process.stdout.write(
  `${dryRun ? "Would copy" : "Copying"} ${relativeFiles.length} ${mode} template files to ${destination}\n`,
);

if (!dryRun) {
  await mkdir(destination, { recursive: true });
  for (const relativeFile of relativeFiles) {
    const sourceFile = join(source, relativeFile);
    const destinationFile = join(destination, relativeFile);
    await mkdir(resolve(destinationFile, ".."), { recursive: true });
    await cp(sourceFile, destinationFile, { errorOnExist: true, force: false });
  }
  process.stdout.write(`Bootstrap complete. Replace placeholders in ${basename(destination)}.\n`);
}
