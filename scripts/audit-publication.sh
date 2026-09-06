#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

failed=0

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  failed=1
}

require_file() {
  [[ -f "$1" ]] || fail "missing required file: $1"
}

scan_pattern() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(rg -l --hidden --glob '!.git/**' -e "$pattern" . || true)"
  if [[ -n "$matches" ]]; then
    fail "$label found in: $(printf '%s' "$matches" | tr '\n' ' ')"
  fi
}

require_file AGENTS.md
require_file README.md
require_file LICENSE.md
require_file templates/personal/AGENTS.md
require_file templates/vault/To\ Do\ List.md
require_file knowledge/vibecoding-security/Vibecoding\ Security\ -\ START\ HERE.md

unexpected_env="$(find . -path './.git' -prune -o -type f \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' -print)"
[[ -z "$unexpected_env" ]] || fail "unexpected environment file(s): $(printf '%s' "$unexpected_env" | tr '\n' ' ')"

sensitive_files="$(find . -path './.git' -prune -o -type f \( -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -name '*.keystore' -o -name '*.jks' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \) -print)"
[[ -z "$sensitive_files" ]] || fail "sensitive-looking file(s): $(printf '%s' "$sensitive_files" | tr '\n' ' ')"

scan_pattern "private-key material" '-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----'
scan_pattern "GitHub token shape" 'gh[pousr]_[A-Za-z0-9]{20,}'
scan_pattern "AWS access-key shape" 'AKIA[0-9A-Z]{16}'
scan_pattern "OpenAI key shape" 'sk-(proj-)?[A-Za-z0-9_-]{20,}'
scan_pattern "Slack token shape" 'xox[baprs]-[A-Za-z0-9-]{10,}'
scan_pattern "Telegram bot-token shape" '[0-9]{8,10}:[A-Za-z0-9_-]{35}'
scan_pattern "absolute user-home path" '/(home|Users)/[A-Za-z0-9._-]+/'

security_count="$(find knowledge/vibecoding-security -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')"
if (( security_count < 80 )); then
  fail "security library unexpectedly small: ${security_count} Markdown files"
fi

node scripts/check-links.mjs || failed=1
git diff --check || failed=1

if (( failed != 0 )); then
  exit 1
fi

printf 'Publication audit passed. Security notes: %s.\n' "$security_count"
