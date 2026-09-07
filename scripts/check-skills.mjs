#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const skillsRoot = join(root, ".agents", "skills");
const directories = (await readdir(skillsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const failures = [];

for (const directory of directories) {
  const skillPath = join(skillsRoot, directory, "SKILL.md");
  const metadataPath = join(skillsRoot, directory, "agents", "openai.yaml");
  let source;
  try {
    source = await readFile(skillPath, "utf8");
  } catch {
    failures.push(`${directory}: missing SKILL.md`);
    continue;
  }
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    failures.push(`${directory}: missing YAML frontmatter`);
    continue;
  }
  const name = frontmatter[1].match(/^name:\s*([^\n]+)$/m)?.[1]?.trim();
  const description = frontmatter[1].match(/^description:\s*([^\n]+)$/m)?.[1]?.trim();
  if (name !== directory) failures.push(`${directory}: frontmatter name is ${name || "missing"}`);
  if (!description || description.length < 40) failures.push(`${directory}: description is missing or vague`);
  if (/\[TODO:|TODO items/i.test(source)) failures.push(`${directory}: unfinished scaffold marker`);
  try {
    await readFile(metadataPath, "utf8");
  } catch {
    failures.push(`${directory}: missing agents/openai.yaml`);
  }
}

if (failures.length > 0) {
  process.stderr.write("Skill validation failed:\n");
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(`Skill validation passed (${directories.length} skills).\n`);
