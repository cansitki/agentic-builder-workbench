#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 1 ]]; then
  printf 'Usage: bash scripts/install-can-workbench.sh /absolute/path/to/ObsidianVault\n' >&2
  exit 2
fi

vault_path="$1"
if [[ "$vault_path" != /* || ! -d "$vault_path/.obsidian" ]]; then
  printf 'Expected an absolute Obsidian vault path containing .obsidian: %s\n' "$vault_path" >&2
  exit 1
fi

plugin_path="$vault_path/.obsidian/plugins/can-workbench"
if [[ -e "$plugin_path" ]]; then
  printf 'Refusing to overwrite existing plugin directory: %s\n' "$plugin_path" >&2
  exit 1
fi

for command_name in awk curl find install mktemp mv; do
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

release_base="https://github.com/cansitki/can-workbench/releases/download/v2.2.0"
curl_options=(--fail --silent --show-error --location --proto '=https' --tlsv1.2 --connect-timeout 10 --max-time 120 --retry 2)
curl "${curl_options[@]}" -o "$temp_path/main.js" "$release_base/main.js"
curl "${curl_options[@]}" -o "$temp_path/manifest.json" "$release_base/manifest.json"
curl "${curl_options[@]}" -o "$temp_path/styles.css" "$release_base/styles.css"

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

[[ "$(checksum "$temp_path/main.js")" == "15ee29bb4fbf90b6036f26b9d844e64e694a10b38093fffa866aef24264ff1b8" ]] || {
  printf 'Can Workbench main.js checksum mismatch.\n' >&2
  exit 1
}
[[ "$(checksum "$temp_path/manifest.json")" == "8a18b630740e065c3a2eec7a45ba593e909485d5843780c815bb1b05d08f4d29" ]] || {
  printf 'Can Workbench manifest.json checksum mismatch.\n' >&2
  exit 1
}
[[ "$(checksum "$temp_path/styles.css")" == "afd4bbe501f1b7804485c87d1721786ac23cf8315ba1df092dd23f253f0dd500" ]] || {
  printf 'Can Workbench styles.css checksum mismatch.\n' >&2
  exit 1
}

staged_plugin="$temp_path/can-workbench"
mkdir -p "$staged_plugin" "$vault_path/.obsidian/plugins"
install -m 0644 "$temp_path/main.js" "$staged_plugin/main.js"
install -m 0644 "$temp_path/manifest.json" "$staged_plugin/manifest.json"
install -m 0644 "$temp_path/styles.css" "$staged_plugin/styles.css"
mv "$staged_plugin" "$plugin_path"

printf 'Installed verified Can Workbench v2.2.0 assets at %s\n' "$plugin_path"
printf 'Open Obsidian, enable Can Workbench, configure your own Local/Coder/SSH workspace, then restart the secure-input listener.\n'
