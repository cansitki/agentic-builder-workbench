#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

command -v rg >/dev/null || { echo "ripgrep is required for publication checks" >&2; exit 1; }

failed=0
rg_excludes=(
  --glob '!**/.git/**'
  --glob '!**/.terraform/**'
  --glob '!**/.venv/**'
  --glob '!**/venv/**'
  --glob '!**/node_modules/**'
  --glob '!**/build/**'
  --glob '!**/dist/**'
  --glob '!**/__pycache__/**'
)

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
  matches="$(rg -l --hidden "${rg_excludes[@]}" -e "$pattern" . || true)"
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
require_file tools/secenv/pyproject.toml
require_file tools/secenv/src/secenv_collector/cli.py
require_file tools/secenv/tests/test_secure_flow.py
require_file integrations/workbench/README.md
require_file .agents/skills/secure-credential-intake/SKILL.md
require_file .agents/skills/workbench-onboarding/SKILL.md

brain_bytes="$(wc -c < templates/personal/AGENTS.md | tr -d ' ')"
if (( brain_bytes > 32768 )); then
  fail "full personal AGENTS.md exceeds the default 32 KiB Codex project-instruction budget: ${brain_bytes} bytes"
fi

unexpected_env="$(find . -type d \( -name '.git' -o -name '.terraform' -o -name '.venv' -o -name 'venv' -o -name 'node_modules' -o -name 'build' -o -name 'dist' -o -name '__pycache__' \) -prune -o -type f \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' -print)"
[[ -z "$unexpected_env" ]] || fail "unexpected environment file(s): $(printf '%s' "$unexpected_env" | tr '\n' ' ')"

sensitive_files="$(find . -type d \( -name '.git' -o -name '.terraform' -o -name '.venv' -o -name 'venv' -o -name 'node_modules' -o -name 'build' -o -name 'dist' -o -name '__pycache__' \) -prune -o -type f \( -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -name '*.keystore' -o -name '*.jks' -o -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \) -print)"
[[ -z "$sensitive_files" ]] || fail "sensitive-looking file(s): $(printf '%s' "$sensitive_files" | tr '\n' ' ')"

# Private-key material is checked by check-private-paths.py, including source;
# no source-file exemptions apply.
scan_pattern "GitHub token shape" 'gh[pousr]_[A-Za-z0-9]{20,}'
scan_pattern "AWS access-key shape" 'AKIA[0-9A-Z]{16}'
scan_pattern "OpenAI key shape" 'sk-(proj-)?[A-Za-z0-9_-]{20,}'
scan_pattern "Stripe key shape" '(sk|rk)_(live|test)_[A-Za-z0-9]{16,}'
scan_pattern "Google API-key shape" 'AIza[0-9A-Za-z_-]{35}'
scan_pattern "GitLab token shape" 'glpat-[A-Za-z0-9_-]{20,}'
scan_pattern "Slack token shape" 'xox[baprs]-[A-Za-z0-9-]{10,}'
scan_pattern "Telegram bot-token shape" '[0-9]{8,10}:[A-Za-z0-9_-]{35}'
scan_pattern "JWT shape" 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
python3 scripts/check-private-paths.py || failed=1

security_count="$(find knowledge/vibecoding-security -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')"
if (( security_count < 80 )); then
  fail "security library unexpectedly small: ${security_count} Markdown files"
fi

node scripts/check-links.mjs || failed=1
node scripts/check-skills.mjs || failed=1
node scripts/check-brain.mjs || failed=1
git diff --check || failed=1

if (( failed != 0 )); then
  exit 1
fi

printf 'Publication audit passed. Security notes: %s.\n' "$security_count"
