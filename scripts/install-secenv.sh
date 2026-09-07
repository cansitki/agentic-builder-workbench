#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_command="${SECENV_PYTHON:-python3}"
install_root="${SECENV_INSTALL_ROOT:-$HOME/.local/share/agentic-secenv}"
virtualenv_path="$install_root/venv"
bin_directory="${SECENV_BIN_DIR:-$HOME/.local/bin}"
link_path="$bin_directory/secenv"
expected_executable="$virtualenv_path/bin/secenv"

if [[ "$install_root" != /* || "$bin_directory" != /* ]]; then
  printf 'SECENV_INSTALL_ROOT and SECENV_BIN_DIR must resolve to absolute paths.\n' >&2
  exit 1
fi

command -v "$python_command" >/dev/null 2>&1 || {
  printf 'Missing Python command: %s\n' "$python_command" >&2
  exit 1
}
for command_name in cp find mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  }
done

if [[ -e "$install_root" && ! -x "$virtualenv_path/bin/python" ]]; then
  printf 'Refusing unmanaged existing install root: %s\n' "$install_root" >&2
  exit 1
fi

if [[ -L "$link_path" ]]; then
  existing_target="$(readlink "$link_path")"
  if [[ "$existing_target" != "$expected_executable" ]]; then
    printf 'Refusing to replace existing secenv link: %s -> %s\n' "$link_path" "$existing_target" >&2
    exit 1
  fi
elif [[ -e "$link_path" ]]; then
  printf 'Refusing to replace existing secenv executable: %s\n' "$link_path" >&2
  exit 1
fi

mkdir -p "$install_root" "$bin_directory"
if [[ ! -x "$virtualenv_path/bin/python" ]]; then
  "$python_command" -m venv "$virtualenv_path"
fi

package_temp="$(mktemp -d)"
cleanup() {
  find "$package_temp" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT
mkdir -p "$package_temp/source"
cp "$repo_root/tools/secenv/pyproject.toml" "$package_temp/source/pyproject.toml"
cp "$repo_root/tools/secenv/README.md" "$package_temp/source/README.md"
cp -R "$repo_root/tools/secenv/src" "$package_temp/source/src"

"$virtualenv_path/bin/python" -m pip install --disable-pip-version-check --timeout 30 --retries 2 --upgrade "$package_temp/source"

if [[ ! -L "$link_path" ]]; then
  ln -s "$expected_executable" "$link_path"
fi

"$expected_executable" init
"$expected_executable" doctor
printf 'Installed secenv at %s\n' "$expected_executable"
printf 'Ensure %s is on PATH.\n' "$bin_directory"
