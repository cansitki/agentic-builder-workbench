from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import stat
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from .paths import expand_user_path

FIELD_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
ENV_ASSIGNMENT_RE = re.compile(r"^(\s*(?:export\s+)?)([A-Z][A-Z0-9_]*)(\s*)=")
SENSITIVE_FIELD_NAME_RE = re.compile(
    r"(?:^|_)(?:TOKEN|KEY|SECRET|PASSWORD|PASSPHRASE|SEED|MNEMONIC|PRIVATE_KEY|CREDENTIAL|COOKIE|PEM|SERVICE_ACCOUNT|RECOVERY_CODE|OTP|TOTP)(?:_|$)"
)
SECRET_SHAPE_PATTERNS = (
    re.compile(r"-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}"),
    re.compile(r"(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}"),
    re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    re.compile(r"glpat-[A-Za-z0-9_-]{20,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"[0-9]{8,10}:[A-Za-z0-9_-]{35}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
)


def now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")


def load_request(path: Path) -> dict[str, Any]:
    request = json.loads(path.read_text())
    validate_request(request)
    return request


def _reject_secret_shape(label: str, value: str) -> None:
    if any(pattern.search(value) for pattern in SECRET_SHAPE_PATTERNS):
        raise ValueError(
            f"{label} appears to contain a secret value; revoke/rotate it and rebuild the request"
        )


def validate_request(request: dict[str, Any]) -> None:
    if not isinstance(request, dict):
        raise TypeError("request must be an object")
    if not REQUEST_ID_RE.fullmatch(str(request.get("id", ""))):
        raise ValueError("request.id is invalid")
    for key, limit in (
        ("title", 200),
        ("description", 2000),
        ("requested_from", 80),
        ("requested_cwd", 512),
    ):
        if key in request and (
            not isinstance(request[key], str) or len(request[key]) > limit
        ):
            raise ValueError(f"request.{key} is invalid")
    if not isinstance(request.get("title"), str) or not request["title"].strip():
        raise ValueError("request.title is required")
    if (
        not isinstance(request.get("description"), str)
        or len(request["description"].strip()) < 80
    ):
        raise ValueError(
            "request.description must explain the credential request in at least 80 characters"
        )
    _reject_secret_shape("request.title", request["title"])
    _reject_secret_shape("request.description", request["description"])
    fields = request.get("fields")
    if not isinstance(fields, list) or not fields or len(fields) > 32:
        raise ValueError("request.fields must be a non-empty list")
    seen: set[str] = set()
    for field in fields:
        if not isinstance(field, dict):
            raise TypeError("each request field must be an object")
        name = field.get("name")
        if not name or not FIELD_RE.match(name):
            raise ValueError(f"invalid field name: {name!r}")
        if name in seen:
            raise ValueError(f"duplicate field: {name}")
        seen.add(name)
        field_type = field.get("type", "password")
        if field_type not in {"password", "text", "textarea"}:
            raise ValueError(f"invalid field type for {name}: {field_type!r}")
        if field_type != "password" and SENSITIVE_FIELD_NAME_RE.search(name):
            raise ValueError(
                f"secret-looking field must use a masked password input: {name}"
            )
        for key, limit in (
            ("label", 160),
            ("help", 1000),
            ("placeholder", 240),
            ("provider_label", 120),
        ):
            if key in field and (
                not isinstance(field[key], str) or len(field[key]) > limit
            ):
                raise ValueError(f"invalid {key} for field: {name}")
        if not isinstance(field.get("label"), str) or not field["label"].strip():
            raise ValueError(f"field label is required: {name}")
        if not isinstance(field.get("help"), str) or len(field["help"].strip()) < 80:
            raise ValueError(
                f"field help must describe provider/account, type, purpose, minimum permissions, "
                f"resource/environment restrictions, capabilities, lifetime, destination, and consumer: {name}"
            )
        _reject_secret_shape(f"field label for {name}", field["label"])
        _reject_secret_shape(f"field help for {name}", field["help"])
        if "default" in field and not isinstance(field["default"], str):
            raise ValueError(f"invalid default for field: {name}")
        if field.get("default"):
            raise ValueError(
                f"credential fields must not contain default values: {name}"
            )
        if isinstance(field.get("placeholder"), str):
            _reject_secret_shape(f"field placeholder for {name}", field["placeholder"])
        if "required" in field and not isinstance(field["required"], bool):
            raise ValueError(f"invalid required flag for field: {name}")
        provider_url = field.get("provider_url")
        if provider_url is not None:
            if not isinstance(provider_url, str):
                raise ValueError(f"invalid provider_url for field: {name}")
            parsed_provider_url = urlparse(provider_url)
            if (
                parsed_provider_url.scheme != "https"
                or not parsed_provider_url.netloc
                or parsed_provider_url.username is not None
                or parsed_provider_url.password is not None
                or parsed_provider_url.query
                or parsed_provider_url.fragment
            ):
                raise ValueError(f"invalid provider_url for field: {name}")
    outputs = request.get("outputs", [])
    if not isinstance(outputs, list) or not outputs or len(outputs) > 32:
        raise ValueError("request.outputs must contain between 1 and 32 items")
    covered: dict[str, int] = {name: 0 for name in seen}
    output_paths: set[Path] = set()
    for output in outputs:
        if not isinstance(output, dict):
            raise TypeError("each output must be an object")
        output_path = output.get("path")
        if (
            not isinstance(output_path, str)
            or not output_path.strip()
            or len(output_path) > 1024
        ):
            raise ValueError("output.path is missing or exceeds 1024 characters")
        if "\0" in output_path:
            raise ValueError("output.path contains a forbidden null character")
        expanded_output_path = expand_user_path(output_path)
        if not expanded_output_path.is_absolute():
            raise ValueError("output.path must be absolute or start with ~")
        normalized_output_path = Path(os.path.normpath(expanded_output_path))
        if normalized_output_path in output_paths:
            raise ValueError(f"duplicate output.path: {output_path}")
        output_paths.add(normalized_output_path)
        try:
            mode = int(str(output.get("mode", "0600")), 8)
        except ValueError as exc:
            raise ValueError("invalid output mode") from exc
        if mode != 0o600:
            raise ValueError("secret output mode must be exactly 0600")
        if output.get("type") == "env":
            output_vars = output.get("vars", [])
            if (
                not isinstance(output_vars, list)
                or not output_vars
                or len(output_vars) != len(set(output_vars))
            ):
                raise ValueError("env output vars must be a non-empty unique list")
            for name in output_vars:
                if name not in seen:
                    raise ValueError(f"output references unknown field: {name}")
                covered[name] += 1
            if "merge" in output and not isinstance(output["merge"], bool):
                raise ValueError("env output merge must be a boolean")
            path_vars = output.get("path_vars", {})
            if not isinstance(path_vars, dict):
                raise ValueError("env output path_vars must be an object")
            for name, path_value in path_vars.items():
                if not FIELD_RE.match(name):
                    raise ValueError(f"invalid path var name: {name!r}")
                if (
                    not isinstance(path_value, str)
                    or "\0" in path_value
                    or len(path_value) > 1024
                ):
                    raise ValueError(f"invalid path var value: {name!r}")
                if not expand_user_path(path_value).is_absolute():
                    raise ValueError(
                        f"path var must be absolute or start with ~: {name}"
                    )
        elif output.get("type") == "file":
            field_name = output.get("field")
            if field_name not in seen:
                raise ValueError(
                    f"file output references unknown field: {output.get('field')}"
                )
            covered[field_name] += 1
            if "newline" in output and not isinstance(output["newline"], bool):
                raise ValueError("file output newline must be a boolean")
        else:
            raise ValueError(f"unknown output type: {output.get('type')}")
    invalid_coverage = sorted(name for name, count in covered.items() if count != 1)
    if invalid_coverage:
        raise ValueError(
            "every field must be written exactly once; invalid coverage: "
            + ", ".join(invalid_coverage)
        )


def validate_values(request: dict[str, Any], values: dict[str, Any]) -> dict[str, str]:
    if not isinstance(values, dict):
        raise TypeError("submission values must be an object")
    expected = {field["name"] for field in request["fields"]}
    extras = sorted(set(values) - expected)
    if extras:
        raise ValueError("submission contains unknown fields: " + ", ".join(extras))
    clean: dict[str, str] = {}
    for field in request["fields"]:
        name = field["name"]
        raw = values.get(name, "")
        if raw is None:
            raw = ""
        value = str(raw)
        if field.get("required", True) and value == "":
            raise ValueError(f"missing required field: {name}")
        clean[name] = value
    return clean


def redact_values(values: dict[str, str]) -> dict[str, str]:
    return {name: "<set>" if value else "<empty>" for name, value in values.items()}


def _ensure_safe_existing_file(path: Path) -> None:
    if not path.exists() and not path.is_symlink():
        return
    if path.is_symlink():
        raise ValueError(f"refusing secret output through symlink: {path}")
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode):
        raise ValueError(f"secret output must be a regular file: {path}")
    if hasattr(os, "geteuid") and metadata.st_uid != os.geteuid():
        raise ValueError(f"secret output is not owned by the current user: {path}")


def _backup_existing(path: Path) -> None:
    _ensure_safe_existing_file(path)
    if not path.exists():
        return
    backup = path.with_name(f"{path.name}.bak.{now_stamp()}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(backup, flags, 0o600)
    source_descriptor = -1
    try:
        source_flags = os.O_RDONLY
        if hasattr(os, "O_NOFOLLOW"):
            source_flags |= os.O_NOFOLLOW
        source_descriptor = os.open(path, source_flags)
        if not stat.S_ISREG(os.fstat(source_descriptor).st_mode):
            raise ValueError(f"secret output must be a regular file: {path}")
        with (
            os.fdopen(source_descriptor, "rb") as source,
            os.fdopen(descriptor, "wb") as destination,
        ):
            source_descriptor = -1
            descriptor = -1
            os.fchmod(destination.fileno(), 0o600)
            shutil.copyfileobj(source, destination)
            destination.flush()
            os.fsync(destination.fileno())
    except Exception:
        if source_descriptor >= 0:
            os.close(source_descriptor)
        if descriptor >= 0:
            os.close(descriptor)
        backup.unlink(missing_ok=True)
        raise


def _write_private(path: Path, content: str, mode: int) -> None:
    # The destination may live in an existing project/config directory whose
    # permissions belong to the operator.  Only newly-created directories use
    # the private default; never silently chmod an existing parent.
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    _backup_existing(path)
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="",
            prefix=f".{path.name}.",
            dir=path.parent,
            delete=False,
        ) as temporary:
            temporary_name = temporary.name
            os.fchmod(temporary.fileno(), mode)
            temporary.write(content)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, path)
        temporary_name = None
    finally:
        if temporary_name is not None:
            Path(temporary_name).unlink(missing_ok=True)


def _merge_env_content(path: Path, updates: dict[str, str]) -> str:
    _ensure_safe_existing_file(path)
    if not path.exists():
        lines = [
            "# Generated by agentic-secenv.",
            "# Do not commit this file or paste its contents into chat.",
        ]
    else:
        flags = os.O_RDONLY
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        descriptor = os.open(path, flags)
        try:
            if not stat.S_ISREG(os.fstat(descriptor).st_mode):
                raise ValueError(f"secret output must be a regular file: {path}")
            with os.fdopen(descriptor, "r", encoding="utf-8") as handle:
                descriptor = -1
                lines = handle.read().splitlines()
        finally:
            if descriptor >= 0:
                os.close(descriptor)

    seen: set[str] = set()
    merged: list[str] = []
    for line in lines:
        match = ENV_ASSIGNMENT_RE.match(line)
        if match and match.group(2) in updates:
            name = match.group(2)
            if name not in seen:
                merged.append(
                    f"{match.group(1)}{name}{match.group(3)}={shlex.quote(updates[name])}"
                )
                seen.add(name)
            # Drop duplicate assignments for a requested variable so a stale
            # later line cannot override the freshly-installed credential.
            continue
        merged.append(line)
    for name, value in updates.items():
        if name not in seen:
            merged.append(f"{name}={shlex.quote(value)}")
    return "\n".join(merged).rstrip("\n") + "\n"


def install_outputs(
    request: dict[str, Any], values: dict[str, str], *, dry_run: bool = False
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []
    for output in request.get("outputs", []):
        output_type = output["type"]
        path = expand_user_path(output["path"])
        mode = int(str(output.get("mode", "0600")), 8)
        if output_type == "env":
            env_values: dict[str, str] = {}
            for name in output["vars"]:
                value = values.get(name, "")
                if any(character in value for character in ("\n", "\r", "\0")):
                    raise ValueError(
                        f"env field {name} contains a forbidden control character"
                    )
                env_values[name] = value
            path_vars = output.get("path_vars", {})
            if not isinstance(path_vars, dict):
                raise ValueError("env output path_vars must be an object")
            for name, value in path_vars.items():
                if not FIELD_RE.match(name):
                    raise ValueError(f"invalid path var name: {name!r}")
                env_values[name] = str(expand_user_path(str(value)))
            if output.get("merge", False):
                content = _merge_env_content(path, env_values)
            else:
                lines = [
                    "# Generated by agentic-secenv.",
                    "# Do not commit this file or paste its contents into chat.",
                ]
                lines.extend(
                    f"{name}={shlex.quote(value)}" for name, value in env_values.items()
                )
                content = "\n".join(lines) + "\n"
            if not dry_run:
                _write_private(path, content, mode)
            actions.append(
                {
                    "type": "env",
                    "path": str(path),
                    "vars": output["vars"],
                    "path_vars": sorted(path_vars),
                    "merge": bool(output.get("merge", False)),
                    "mode": oct(mode),
                }
            )
        elif output_type == "file":
            value = values.get(output["field"], "")
            if output.get("newline", False):
                value = value.rstrip("\n") + "\n"
            if not dry_run:
                _write_private(path, value, mode)
            actions.append(
                {
                    "type": "file",
                    "path": str(path),
                    "field": output["field"],
                    "mode": oct(mode),
                }
            )
    return actions
