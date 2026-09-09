#!/usr/bin/env bash
set -euo pipefail
# Execute on the explicitly approved dedicated VPS, through sudo -n.
if [[ $# -ne 1 || "$(hostname -s)" != "$1" ]]; then
  echo 'Expected target hostname must match this dedicated VPS.' >&2; exit 1
fi
[[ $EUID -eq 0 ]] || { echo 'Run through sudo -n on the approved VPS.' >&2; exit 1; }
. /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'This bootstrap supports Ubuntu 24.04 only.' >&2; exit 1; }
bundle="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$bundle/runtime.env" && -f "$bundle/plan.sha256" ]] || exit 1
if ! command -v docker >/dev/null; then
  # Fresh host only: never remove a user's existing Docker/container packages.
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  arch="$(dpkg --print-architecture)"
  cat > /etc/apt/sources.list.d/docker.sources <<DOCKER
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $arch
Signed-By: /etc/apt/keyrings/docker.asc
DOCKER
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
# Coder controls the Docker socket: require a dedicated host, not an unrelated production stack.
other="$(docker ps -aq --filter 'label!=workbench.managed=true')"
[[ -z "$other" ]] || { echo 'Existing unmanaged containers found; inspect before continuing.' >&2; exit 1; }
docker compose version >/dev/null
install -d -m 0700 /srv/workbench
if [[ -f /srv/workbench/plan.sha256 ]]; then
  cmp -s "$bundle/plan.sha256" /srv/workbench/plan.sha256 || { echo 'Different existing deployment; migration review required.' >&2; exit 1; }
else
  [[ -z "$(ls -A /srv/workbench)" ]] || { echo 'Unmanaged target directory.' >&2; exit 1; }
  cp -a "$bundle/." /srv/workbench/
  chmod 0600 /srv/workbench/runtime.env
  printf '\nDOCKER_GID=%s\n' "$(stat -c %g /var/run/docker.sock)" >> /srv/workbench/runtime.env
fi
cd /srv/workbench
docker compose --env-file runtime.env config --quiet
docker volume create --label workbench.managed=true workbench-vault >/dev/null
docker volume create --label workbench.managed=true workbench-sync-config >/dev/null
docker compose --env-file runtime.env up -d database coder
docker build -t workbench-workspace:2026-09-09 -f workspace.Dockerfile kit
printf 'Host stack started on loopback. Initialize the Coder owner before publishing the tunnel.\n'
