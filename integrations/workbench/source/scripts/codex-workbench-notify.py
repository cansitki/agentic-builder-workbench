#!/usr/bin/env python3
"""Queue sanitized Codex turn-complete events for Workbench."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EVENT_TYPE = "agent-turn-complete"
MAX_EVENTS = 2048
MAX_AGE_SECONDS = 7 * 24 * 60 * 60
HEARTBEAT_INTERVAL = 15.0


def state_root() -> Path:
    override = os.environ.get("CODEX_ATTENTION_STATE_DIR", "").strip()
    if override:
        return Path(override).expanduser()
    xdg_state = os.environ.get("XDG_STATE_HOME", "").strip()
    base = Path(xdg_state).expanduser() if xdg_state else Path.home() / ".local" / "state"
    return base / "nomarh" / "codex-attention"


def ensure_private_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path, 0o700)


def clean_text(value: Any, limit: int) -> str:
    text = str(value or "")
    text = " ".join(text.replace("\x00", " ").replace("\r", " ").replace("\n", " ").split())
    return text[:limit]


def tmux_session() -> str:
    pane = os.environ.get("TMUX_PANE", "").strip()
    if not pane:
        return ""
    try:
        result = subprocess.run(
            ["tmux", "display-message", "-p", "-t", pane, "#{session_name}"],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return clean_text(result.stdout, 128)


def event_id(thread_id: str, turn_id: str) -> str:
    material = f"{thread_id}\0{turn_id}" if thread_id or turn_id else f"{time.time_ns()}\0{os.getpid()}"
    return hashlib.sha256(material.encode("utf-8", errors="replace")).hexdigest()


def normalize_payload(payload: Any) -> dict[str, str] | None:
    if not isinstance(payload, dict) or payload.get("type") != EVENT_TYPE:
        return None
    thread_id = clean_text(payload.get("thread-id"), 256)
    turn_id = clean_text(payload.get("turn-id"), 256)
    cwd = clean_text(payload.get("cwd"), 1024)
    workspace = clean_text(os.environ.get("CODER_WORKSPACE_NAME") or socket.gethostname(), 128)
    return {
        "id": event_id(thread_id, turn_id),
        "type": EVENT_TYPE,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "thread_id": thread_id,
        "turn_id": turn_id,
        "cwd": cwd,
        "tmux_session": tmux_session(),
        "workspace": workspace,
    }


def prune_events(events_dir: Path) -> None:
    now = time.time()
    files = sorted(
        (path for path in events_dir.glob("*.json") if path.is_file()),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for index, path in enumerate(files):
        try:
            too_old = now - path.stat().st_mtime > MAX_AGE_SECONDS
            if index >= MAX_EVENTS or too_old:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def write_event(event: dict[str, str]) -> None:
    root = state_root()
    ensure_private_dir(root)
    events_dir = root / "events"
    ensure_private_dir(events_dir)
    target = events_dir / f"{event['id']}.json"
    if target.exists():
        return
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            prefix=".event-",
            suffix=".json",
            dir=events_dir,
            delete=False,
        ) as temporary:
            temporary_name = temporary.name
            json.dump(event, temporary, ensure_ascii=False, separators=(",", ":"))
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, target)
        temporary_name = None
    finally:
        if temporary_name:
            Path(temporary_name).unlink(missing_ok=True)
    prune_events(events_dir)


def emit(payload_text: str) -> int:
    try:
        payload = json.loads(payload_text)
        event = normalize_payload(payload)
        if event is not None:
            write_event(event)
    except Exception as error:  # A notification helper must never break a Codex turn.
        print(f"codex-workbench-notify: emit failed ({type(error).__name__})", file=sys.stderr)
    return 0


def load_event(path: Path) -> dict[str, str] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    event = {key: clean_text(data.get(key), limit) for key, limit in {
        "id": 64,
        "type": 64,
        "created_at": 64,
        "thread_id": 256,
        "turn_id": 256,
        "cwd": 1024,
        "tmux_session": 128,
        "workspace": 128,
    }.items()}
    if event["type"] != EVENT_TYPE or len(event["id"]) != 64:
        return None
    if any(character not in "0123456789abcdef" for character in event["id"]):
        return None
    return event


def write_line(message: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def watch(poll_interval: float, once: bool = False, heartbeat_interval: float = HEARTBEAT_INTERVAL) -> int:
    root = state_root()
    ensure_private_dir(root)
    events_dir = root / "events"
    ensure_private_dir(events_dir)
    seen: set[str] = set()
    try:
        write_line({"type": "ready", "version": 1})
        last_output = time.monotonic()
        while True:
            paths = sorted(
                (path for path in events_dir.glob("*.json") if path.is_file()),
                key=lambda path: (path.stat().st_mtime, path.name),
            )
            for path in paths:
                if path.name in seen:
                    continue
                event = load_event(path)
                seen.add(path.name)
                if event is not None:
                    write_line({"type": "codex-attention", "event": event})
                    last_output = time.monotonic()
            if once:
                return 0
            if time.monotonic() - last_output >= heartbeat_interval:
                write_line({"type": "heartbeat", "version": 1})
                last_output = time.monotonic()
            time.sleep(poll_interval)
    except (BrokenPipeError, KeyboardInterrupt):
        return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    emit_parser = subparsers.add_parser("emit", help="store one Codex notify JSON payload")
    emit_parser.add_argument("payload")
    watch_parser = subparsers.add_parser("watch", help="stream queued completion events")
    watch_parser.add_argument("--poll-interval", type=float, default=1.0)
    watch_parser.add_argument("--heartbeat-interval", type=float, default=HEARTBEAT_INTERVAL, help=argparse.SUPPRESS)
    watch_parser.add_argument("--once", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "emit":
        return emit(args.payload)
    interval = min(60.0, max(0.25, args.poll_interval))
    heartbeat = min(300.0, max(0.25, args.heartbeat_interval))
    return watch(interval, args.once, heartbeat)


if __name__ == "__main__":
    raise SystemExit(main())
