#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

secenv_test_root="$(mktemp -d)"
workbench_test_root="$(mktemp -d)"
cleanup() {
  find "$secenv_test_root" -depth -delete 2>/dev/null || true
  find "$workbench_test_root" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    printf 'Missing sha256sum or shasum.\n' >&2
    exit 1
  fi
}

test_user_home="$secenv_test_root/operator-home"
mkdir -p "$test_user_home"
HOME="$test_user_home" \
SECENV_INSTALL_ROOT="$secenv_test_root/install" \
SECENV_BIN_DIR="$secenv_test_root/bin" \
bash scripts/install-secenv.sh >/dev/null

first_key_hash="$(hash_file "$test_user_home/.config/agentic-secenv/private_key.pem")"

HOME="$test_user_home" \
SECENV_INSTALL_ROOT="$secenv_test_root/install" \
SECENV_BIN_DIR="$secenv_test_root/bin" \
bash scripts/install-secenv.sh >/dev/null

second_key_hash="$(hash_file "$test_user_home/.config/agentic-secenv/private_key.pem")"
[[ "$first_key_hash" == "$second_key_hash" ]]
HOME="$test_user_home" "$secenv_test_root/bin/secenv" doctor >/dev/null

if find tools/secenv -type d \( -name build -o -name '*.egg-info' -o -name __pycache__ \) -print -quit | rg -q .; then
  printf 'secenv installer polluted the source tree.\n' >&2
  exit 1
fi

mkdir -p "$workbench_test_root/Vault/.obsidian"
bash scripts/install-workbench.sh "$workbench_test_root/Vault" >/dev/null

set +e
bash scripts/install-workbench.sh "$workbench_test_root/Vault" >/dev/null 2>&1
workbench_repeat_rc=$?
set -e
if [[ "$workbench_repeat_rc" -eq 0 ]]; then
  printf 'Workbench installer overwrote an existing installation.\n' >&2
  exit 1
fi

printf 'Installer tests passed: secenv is repeatable/key-preserving/source-clean; Workbench is pinned and no-overwrite.\n'
