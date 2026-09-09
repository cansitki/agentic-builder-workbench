#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  printf 'Usage: bash scripts/install-workbench.sh /absolute/path/to/ObsidianVault\n' >&2
  exit 2
fi

vault_path="$1"
if [[ "$vault_path" != /* || ! -d "$vault_path/.obsidian" ]]; then
  printf 'Expected an absolute Obsidian vault path containing .obsidian: %s\n' "$vault_path" >&2
  exit 1
fi

# The old and new plugins share embedded view types; do not run them together.
legacy_path="$vault_path/.obsidian/plugins/can-workbench"
if [[ -e "$legacy_path" || -L "$legacy_path" ]]; then
  printf 'Legacy plugin found. Follow integrations/workbench/MIGRATION.md before installing Workbench.\n' >&2
  exit 1
fi
plugin_path="$vault_path/.obsidian/plugins/workbench"
if [[ -e "$plugin_path" || -L "$plugin_path" ]]; then
  printf 'Refusing to overwrite existing plugin directory: %s\n' "$plugin_path" >&2
  exit 1
fi

for command_name in awk python3 find install mktemp mv; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  }
done

temp_path="$(mktemp -d)"
cleanup() {
  find "$temp_path" -depth -delete 2>/dev/null || true
}
trap cleanup EXIT

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python3 "$repo_root/scripts/verify-workbench-source.py"
source_path="$repo_root/integrations/workbench/source"
for asset in main.js manifest.json styles.css; do
  install -m 0644 "$source_path/$asset" "$temp_path/$asset"
done

checksum() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    printf 'Missing sha256sum or shasum.\n' >&2
    exit 1
  fi
}

[[ "$(checksum "$temp_path/main.js")" == "e2288ae4fb7690f6c0c2b6a711760c12148e7386515176aa12ded23f94fc298b" ]] || {
  printf 'Workbench main.js checksum mismatch.\n' >&2
  exit 1
}
[[ "$(checksum "$temp_path/manifest.json")" == "1fb2507bc71037d5c5dbc91f1604755560e6d60eb93ad7a8d5a28b6f1350068f" ]] || {
  printf 'Workbench manifest.json checksum mismatch.\n' >&2
  exit 1
}
[[ "$(checksum "$temp_path/styles.css")" == "0a4d60b8835a52099814e1de863815147fe6cb8ed89bc1c96f978d8889c4b6db" ]] || {
  printf 'Workbench styles.css checksum mismatch.\n' >&2
  exit 1
}

staged_plugin="$temp_path/workbench"
mkdir -p "$staged_plugin" "$vault_path/.obsidian/plugins"
install -m 0644 "$temp_path/main.js" "$staged_plugin/main.js"
install -m 0644 "$temp_path/manifest.json" "$staged_plugin/manifest.json"
install -m 0644 "$temp_path/styles.css" "$staged_plugin/styles.css"
mv "$staged_plugin" "$plugin_path"

printf 'Installed verified Workbench v3.0.0 assets at %s\n' "$plugin_path"
printf 'Open Obsidian, enable Workbench, configure your own Local/Coder/SSH workspace, then restart the secure-input listener.\n'
