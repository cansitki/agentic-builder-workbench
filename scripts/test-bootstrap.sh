#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

for command_name in find mktemp node perl; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  }
done

bootstrap_test_root="$(mktemp -d)"
cleanup() {
  find "$bootstrap_test_root" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT

for bootstrap_mode in personal vault project; do
  node scripts/bootstrap.mjs "$bootstrap_mode" "$bootstrap_test_root/$bootstrap_mode" --dry-run >/dev/null
  node scripts/bootstrap.mjs "$bootstrap_mode" "$bootstrap_test_root/$bootstrap_mode" >/dev/null
  set +e
  node scripts/bootstrap.mjs "$bootstrap_mode" "$bootstrap_test_root/$bootstrap_mode" >/dev/null 2>&1
  bootstrap_repeat_rc=$?
  set -e
  if [[ "$bootstrap_repeat_rc" -eq 0 ]]; then
    printf 'Bootstrap overwrite refusal failed for %s.\n' "$bootstrap_mode" >&2
    exit 1
  fi
done

[[ "$(find "$bootstrap_test_root/personal" -type f | wc -l | tr -d ' ')" == "6" ]]
[[ "$(find "$bootstrap_test_root/vault" -type f | wc -l | tr -d ' ')" == "8" ]]
[[ "$(find "$bootstrap_test_root/project" -type f | wc -l | tr -d ' ')" == "8" ]]

set +e
node scripts/check-adopted-brain.mjs "$bootstrap_test_root/personal/AGENTS.md" >/dev/null 2>&1
unconfigured_brain_rc=$?
set -e
if [[ "$unconfigured_brain_rc" -eq 0 ]]; then
  printf 'Unconfigured personal brain unexpectedly passed validation.\n' >&2
  exit 1
fi
perl -0pi -e 's/\[[A-Z][A-Z0-9 _\/;:.-]{1,80}\]/configured/g' "$bootstrap_test_root/personal/AGENTS.md"
node scripts/check-adopted-brain.mjs "$bootstrap_test_root/personal/AGENTS.md" >/dev/null

printf 'Bootstrap tests passed for personal, vault, and project modes; overwrite refusal is active.\n'
