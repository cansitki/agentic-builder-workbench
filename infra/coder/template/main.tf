terraform {
  required_version = ">= 1.5.0, < 2.0.0"
  required_providers {
    coder  = { source = "coder/coder", version = "2.18.0" }
    docker = { source = "kreuzwerker/docker", version = "4.6.0" }
  }
}
variable "timezone" {
  type    = string
  default = "UTC"
}
variable "owner_id" {
  type    = string
  default = "OWNER_ID_REQUIRED"
}
provider "coder" {}
provider "docker" { host = "unix:///var/run/docker.sock" }
data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}
data "coder_provisioner" "me" {}
resource "coder_agent" "main" {
  arch                    = data.coder_provisioner.me.arch
  os                      = "linux"
  startup_script_behavior = "blocking"
  env                     = { WORKBENCH_VAULT = "/vault", WORKBENCH_TIMEZONE = var.timezone, TZ = var.timezone }
  startup_script          = <<-EOT
    set -eu
    mkdir -p "$HOME/projects" "$HOME/vault" "$HOME/.config"
    if [ ! -e "$HOME/.agents" ]; then ln -s /opt/workbench/.agents "$HOME/.agents"; fi
    secenv init >/dev/null
    secenv doctor
    git --version
    node --version
    python3 --version
    tmux -V
  EOT
}
resource "docker_volume" "home" {
  name = "workbench-home-${data.coder_workspace.me.id}"
  lifecycle { ignore_changes = all }
}
resource "docker_container" "workspace" {
  count      = data.coder_workspace.me.start_count
  name       = "workbench-${data.coder_workspace.me.id}"
  hostname   = data.coder_workspace.me.name
  image      = "workbench-workspace:2026-09-09"
  entrypoint = ["sh", "-c", coder_agent.main.init_script]
  env        = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  volumes {
    volume_name    = docker_volume.home.name
    container_path = "/workspace"
    read_only      = false
  }
  labels {
    label = "workbench.managed"
    value = "true"
  }
  volumes {
    volume_name    = "workbench-vault"
    container_path = "/vault"
    read_only      = false
  }
  dynamic "volumes" {
    for_each = data.coder_workspace.me.name == "system" ? [1] : []
    content {
      volume_name    = "workbench-sync-config"
      container_path = "/workspace/.config/obsidian-headless"
      read_only      = false
    }
  }
  lifecycle {
    precondition {
      condition     = var.owner_id == data.coder_workspace_owner.me.id
      error_message = "This personal template is restricted to the verified installation owner."
    }
  }
  networks_advanced { name = "workbench-network" }
}
