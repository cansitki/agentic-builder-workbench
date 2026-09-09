#!/usr/bin/env python3
"""Verify the Codex attention helper, queue protocol, and installer."""

from __future__ import annotations

import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile
import tomllib
from pathlib import Path


sys.dont_write_bytecode = True


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "scripts" / "codex-workbench-notify.py"
INSTALLER = ROOT / "scripts" / "install-codex-attention.py"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_helper(args: list[str], state_dir: Path) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["CODEX_ATTENTION_STATE_DIR"] = str(state_dir)
    env.pop("TMUX_PANE", None)
    return subprocess.run(
        [sys.executable, str(HELPER), *args],
        check=True,
        capture_output=True,
        text=True,
        env=env,
    )


def verify_heartbeat(state_dir: Path) -> None:
    env = os.environ.copy()
    env["CODEX_ATTENTION_STATE_DIR"] = str(state_dir)
    process = subprocess.Popen(
        [
            sys.executable,
            str(HELPER),
            "watch",
            "--poll-interval",
            "0.25",
            "--heartbeat-interval",
            "0.25",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )
    try:
        assert process.stdout is not None
        ready = json.loads(process.stdout.readline())
        heartbeat = json.loads(process.stdout.readline())
        assert ready == {"type": "ready", "version": 1}
        assert heartbeat == {"type": "heartbeat", "version": 1}
    finally:
        process.terminate()
        process.wait(timeout=3)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="cw-codex-attention-") as temporary:
        root = Path(temporary)
        state_dir = root / "state"
        secret_marker = "private-output-must-not-cross-the-bridge"
        payload = {
            "type": "agent-turn-complete",
            "thread-id": "thread-test-1",
            "turn-id": "turn-test-1",
            "cwd": "/workspace/example-project",
            "input-messages": ["sensitive prompt"],
            "last-assistant-message": secret_marker,
        }
        run_helper(["emit", json.dumps(payload)], state_dir)
        run_helper(["emit", json.dumps(payload)], state_dir)
        events = list((state_dir / "events").glob("*.json"))
        assert len(events) == 1, "duplicate notify calls must create one event"
        assert stat.S_IMODE((state_dir / "events").stat().st_mode) == 0o700
        assert stat.S_IMODE(events[0].stat().st_mode) == 0o600
        event_text = events[0].read_text(encoding="utf-8")
        event = json.loads(event_text)
        assert secret_marker not in event_text
        assert "input-messages" not in event and "last-assistant-message" not in event
        assert event["type"] == "agent-turn-complete"
        assert event["cwd"] == "/workspace/example-project"
        assert len(event["id"]) == 64

        watched = run_helper(["watch", "--once"], state_dir)
        lines = [json.loads(line) for line in watched.stdout.splitlines() if line.strip()]
        assert lines[0] == {"type": "ready", "version": 1}
        assert lines[1]["type"] == "codex-attention"
        assert lines[1]["event"] == event

        run_helper(["emit", json.dumps({"type": "unsupported", "thread-id": "x"})], state_dir)
        assert len(list((state_dir / "events").glob("*.json"))) == 1

        verify_heartbeat(root / "heartbeat-state")

        installer = load_module(INSTALLER, "cw_install_codex_attention")
        home = root / "home"
        codex_home = home / ".codex"
        codex_home.mkdir(parents=True)
        config = codex_home / "config.toml"
        config.write_text('model = "test-model"\n\n[tui]\nnotifications = true\n', encoding="utf-8")
        os.chmod(config, 0o600)
        first = installer.install(home, codex_home)
        helper_link = Path(first["helper"])
        assert helper_link.is_symlink() and helper_link.resolve() == HELPER.resolve()
        parsed = tomllib.loads(config.read_text(encoding="utf-8"))
        assert parsed["notify"] == [str(helper_link), "emit"]
        assert stat.S_IMODE(config.stat().st_mode) == 0o600
        backups_before = sorted(codex_home.glob("config.toml.bak-codex-attention-*"))
        assert len(backups_before) == 1
        installer.install(home, codex_home)
        assert sorted(codex_home.glob("config.toml.bak-codex-attention-*")) == backups_before
        installer.check(home, codex_home)

        conflict_home = root / "conflict-home"
        conflict_codex = conflict_home / ".codex"
        conflict_codex.mkdir(parents=True)
        (conflict_codex / "config.toml").write_text('notify = ["/different/helper"]\n', encoding="utf-8")
        try:
            installer.install(conflict_home, conflict_codex)
        except installer.InstallError:
            pass
        else:
            raise AssertionError("installer overwrote a different notify command")

    print("Codex attention helper verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
