#!/usr/bin/env python3
"""Install the Workbench Codex notification helper and config hook."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
import tomllib
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HELPER_SOURCE = ROOT / "scripts" / "codex-workbench-notify.py"


class InstallError(RuntimeError):
    """Raised when installation would overwrite an unrelated hook or file."""


def expected_paths(home: Path, codex_home: Path | None = None) -> tuple[Path, Path, list[str]]:
    helper = home / ".local" / "bin" / "codex-workbench-notify"
    config = (codex_home or home / ".codex") / "config.toml"
    return helper, config, [str(helper), "emit"]


def write_atomic(path: Path, content: str, mode: int = 0o600) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", prefix=f".{path.name}.", dir=path.parent, delete=False
        ) as temporary:
            temporary_name = temporary.name
            temporary.write(content)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.chmod(temporary_name, mode)
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name:
            Path(temporary_name).unlink(missing_ok=True)


def ensure_helper_link(destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(destination.parent, 0o700)
    if destination.is_symlink() and destination.resolve() == HELPER_SOURCE.resolve():
        return
    if destination.exists() or destination.is_symlink():
        raise InstallError(f"refusing to replace existing helper: {destination}")
    temporary = destination.with_name(f".{destination.name}.new-{os.getpid()}")
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(HELPER_SOURCE)
    os.replace(temporary, destination)


def add_notify_config(config: Path, expected_notify: list[str]) -> Path | None:
    original = config.read_text(encoding="utf-8") if config.exists() else ""
    try:
        parsed = tomllib.loads(original) if original.strip() else {}
    except tomllib.TOMLDecodeError as error:
        raise InstallError(f"Codex config is invalid TOML: {error}") from error
    current = parsed.get("notify")
    if current is not None:
        if current != expected_notify:
            raise InstallError("Codex config already has a different notify command")
        os.chmod(config, 0o600)
        return None

    notify_line = f"notify = [{', '.join(json.dumps(value) for value in expected_notify)}]\n"
    lines = original.splitlines(keepends=True)
    insert_at = next((index for index, line in enumerate(lines) if line.lstrip().startswith("[")), len(lines))
    if insert_at and lines[insert_at - 1].strip():
        notify_line += "\n"
    updated = "".join(lines[:insert_at]) + notify_line + "".join(lines[insert_at:])

    backup = None
    if config.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = config.with_name(f"config.toml.bak-codex-attention-{stamp}")
        shutil.copy2(config, backup)
        os.chmod(backup, 0o600)
    write_atomic(config, updated, 0o600)
    check = tomllib.loads(config.read_text(encoding="utf-8"))
    if check.get("notify") != expected_notify:
        raise InstallError("notify config verification failed")
    return backup


def preflight(config: Path, helper: Path, expected_notify: list[str]) -> None:
    if helper.exists() or helper.is_symlink():
        if not helper.is_symlink() or helper.resolve() != HELPER_SOURCE.resolve():
            raise InstallError(f"refusing to replace existing helper: {helper}")
    if not config.exists():
        return
    try:
        parsed = tomllib.loads(config.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as error:
        raise InstallError(f"Codex config is invalid TOML: {error}") from error
    current = parsed.get("notify")
    if current is not None and current != expected_notify:
        raise InstallError("Codex config already has a different notify command")


def install(home: Path, codex_home: Path | None = None) -> dict[str, str]:
    helper, config, expected_notify = expected_paths(home, codex_home)
    if not HELPER_SOURCE.is_file():
        raise InstallError(f"helper source is missing: {HELPER_SOURCE}")
    preflight(config, helper, expected_notify)
    os.chmod(HELPER_SOURCE, 0o755)
    ensure_helper_link(helper)
    backup = add_notify_config(config, expected_notify)
    return {
        "helper": str(helper),
        "config": str(config),
        "backup": str(backup) if backup else "",
    }


def check(home: Path, codex_home: Path | None = None) -> dict[str, str]:
    helper, config, expected_notify = expected_paths(home, codex_home)
    if not helper.is_symlink() or helper.resolve() != HELPER_SOURCE.resolve():
        raise InstallError("helper symlink is missing or points to the wrong source")
    if not config.is_file() or (config.stat().st_mode & 0o077):
        raise InstallError("Codex config is missing or not owner-only")
    parsed = tomllib.loads(config.read_text(encoding="utf-8"))
    if parsed.get("notify") != expected_notify:
        raise InstallError("Codex notify command is not installed")
    return {"helper": str(helper), "config": str(config)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--home", type=Path, default=Path.home(), help=argparse.SUPPRESS)
    parser.add_argument("--codex-home", type=Path, default=None, help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        result = check(args.home, args.codex_home) if args.check else install(args.home, args.codex_home)
    except InstallError as error:
        print(f"install failed: {error}")
        return 1
    action = "verified" if args.check else "installed"
    print(f"Codex attention {action}: helper={result['helper']} config={result['config']}")
    if result.get("backup"):
        print(f"Config backup: {result['backup']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
