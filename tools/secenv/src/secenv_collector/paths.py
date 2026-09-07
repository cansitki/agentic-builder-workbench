from __future__ import annotations

import os
import stat
from pathlib import Path

APP_NAME = "agentic-secenv"


def _configured_path(value: str | os.PathLike[str]) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        raise ValueError(
            "secenv configuration/state paths must be absolute or start with ~"
        )
    return path


def config_home() -> Path:
    return _configured_path(
        os.environ.get("SECENV_HOME", Path.home() / ".config" / APP_NAME)
    )


def state_home() -> Path:
    return _configured_path(
        os.environ.get("SECENV_STATE", Path.home() / ".local" / "state" / APP_NAME)
    )


def private_key_path() -> Path:
    return config_home() / "private_key.pem"


def requests_dir() -> Path:
    return state_home() / "requests"


def submissions_dir() -> Path:
    return state_home() / "submissions"


def cancellations_dir() -> Path:
    return state_home() / "cancellations"


def ensure_base_dirs() -> None:
    for path in (
        config_home(),
        state_home(),
        requests_dir(),
        submissions_dir(),
        cancellations_dir(),
    ):
        if path.is_symlink():
            raise ValueError(f"refusing secenv directory symlink: {path}")
        path.mkdir(parents=True, exist_ok=True)
        metadata = path.lstat()
        if not stat.S_ISDIR(metadata.st_mode):
            raise ValueError(f"secenv path is not a directory: {path}")
        if hasattr(os, "geteuid") and metadata.st_uid != os.geteuid():
            raise ValueError(
                f"secenv directory is not owned by the current user: {path}"
            )
        path.chmod(0o700)


def expand_user_path(value: str) -> Path:
    return Path(value).expanduser()
