---
tags: [security, vibecoding, tool, github]
parent: "[[Vibecoding Security Research - Index]]"
verdict: mine-for-patterns
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Vibecoding Tool - armory

**Repo:** https://github.com/Mathews-Tom/armory
**Stars:** 216
**Last activity:** Active — pushed 2026-04-16
**License:** MIT
**Scale:** 106 packages, 100% eval coverage claimed.

## What it is
A curated, production-grade collection of Claude Skills, agents, hooks, rules, commands, utilities, and presets for Claude Code and Claude.ai. Seven package types, ~106 entries, with explicit research-paper lineage (EvoSkills arXiv 2604.01687, Memento-Skills arXiv 2603.18743).

## Activity signal
Active and serious. Single curator (Mathews-Tom). Real depth: every package has stated inputs, outputs, edge cases, failure modes. 100% eval-coverage badge implies they actually run tests against the skill packs.

## Core features
- **Orchestrator agents**: `team-lead` (meta-orchestrator on opus), `codebase-auditor` (spawns code-reviewer + security-reviewer + secret-scanner in parallel), `project-architect`, `release-captain`, `idea-scout`, `full-stack-builder`, etc.
- **Analyzer agents**: `code-reviewer` (sonnet), `security-reviewer` (OWASP Top 10), `secret-scanner` (haiku, pre-commit), `test-engineer`.
- **Review/Quality skills**: `architecture-reviewer` (7 dimensions), `pre-landing-review` (CRITICAL gates that block landing), `pr-review`, `repo-sentinel` (12 attack surfaces, CI gates, history scrubbing), `dependency-audit` (CVE + license + bloat), `devils-advocate`.
- **Backend & Data**: `sql-optimizer`, `migration-risk-analyzer`, `benchmark-runner`.
- **AI/ML**: `prompt-lab`, `rag-auditor`, `paper-to-skill`, `skill-distiller`, `surrogate-verifier`.
- **Memory**: `immune` skill — Cheatsheet (positive patterns) + Immune (negative patterns) Hot/Cold tiered, auto-learning. Implements the Memento-Skills stateful-prompt loop.
- Rules: commit-standards, test-standards, security-standards, token-efficiency.
- Hooks: git-protection (block dangerous git ops), pre-edit-backup, cost-tracker.

## How it works mechanically
- Each package is a markdown skill file + supporting YAML/scripts following Claude Code's skill protocol.
- Explicit model routing per package: `opus` for hard reasoning, `sonnet` for analysis-heavy, `haiku` for fast scans (e.g. secret-scanner).
- `skill-library` skill provides agent-native catalog operations — Claude can browse/install/sync armory skills inside a session.
- `manifest.yaml` enumerates all 106 packages.

## When to use it
- Looking for a battle-tested skill for a specific task (security review, PR review, dependency audit, migration risk) — start here before writing one.
- The `repo-sentinel` skill alone is worth reading for [[Vibecoding - Audit Checklist]] cross-checks (12 attack surfaces, history scrubbing, pre-release readiness).
- `pre-landing-review` with two-pass severity triage (CRITICAL blocks, INFORMATIONAL advises) is the right shape for a release gate.
- Mine `security-reviewer` (OWASP Top 10) and `secret-scanner` (pre-commit haiku scan) as direct competitors / complements to truecourse + vibe-check.

## When NOT to use it
- Big install footprint. Don't pull all 106. Pick the 5-10 you'd actually use.
- Single-curator project — quality is high but bus factor is 1.
- Skill quality is "as good as the prompt." Test against your own repos before trusting the verdict.
- Some packages are research-lineage flavored (EvoSkills, paper-to-skill) which is cool but not load-bearing for daily security work.

## Verdict: **mine-for-patterns** (with selective pull-in)
The `repo-sentinel`, `pre-landing-review`, `security-reviewer`, `secret-scanner`, and `dependency-audit` skills are all worth installing or at least reading the markdown to crib the prompt structure. The `immune`/cerebrum-style memory pattern overlaps with [[Vibecoding - Tooling openwolf]]'s `cerebrum.md` idea — armory's implementation is sturdier.

## Distinctive quotes
> "No magic, no demos — battle-tested workflows built for developers who use AI seriously."

> "**Philosophy:** Packages in this collection are practical and context-free. They define the _how_, not just the _what_ — covering inputs, outputs, edge cases, and failure modes."

> "`pre-landing-review` — Gate-oriented safety audit with two-pass severity triage — CRITICAL (SQL, races, trust) blocks landing, INFORMATIONAL is advisory."

## Cross-links
- [[Vibecoding - Audit Checklist]]
- [[Vibecoding - Things to Check on Your Code]]
- [[Vibecoding - Secrets and Env Hygiene]]
- [[Vibecoding - Tooling awesome-claude-skills]]
- [[Vibecoding - Tooling openwolf]]
- [[Vibecoding - Tooling truecourse]]
