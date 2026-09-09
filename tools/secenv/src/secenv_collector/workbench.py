from __future__ import annotations

import json
import os
import re
import time
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO

from .crypto import public_jwk_from_private_key
from .paths import cancellations_dir, requests_dir, submissions_dir
from .schema import load_request

WORKBENCH_CHANNEL = "workbench"
MAX_SUBMISSION_BYTES = 512 * 1024
REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
BASE64URL_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(timezone.utc)


def validate_request_id(request_id: str) -> str:
    if not isinstance(request_id, str) or not REQUEST_ID_RE.fullmatch(request_id):
        raise ValueError("invalid request id")
    return request_id


def request_path(request_id: str) -> Path:
    return requests_dir() / f"{validate_request_id(request_id)}.request.json"


def submission_path(request_id: str) -> Path:
    return submissions_dir() / f"{validate_request_id(request_id)}.submission.json"


def cancellation_path(request_id: str) -> Path:
    return cancellations_dir() / f"{validate_request_id(request_id)}.cancelled.json"


def request_is_expired(request: dict[str, Any], *, now: datetime | None = None) -> bool:
    expires_at = request.get("expires_at")
    if not isinstance(expires_at, str) or not expires_at:
        return False
    return parse_timestamp(expires_at) <= (now or utc_now())


def public_request(request: dict[str, Any], private_key_path: Path) -> dict[str, Any]:
    public = json.loads(json.dumps(request))
    outputs = public.pop("outputs", [])
    public["install_targets"] = [
        {
            "type": output.get("type"),
            "path": output.get("path"),
            "fields": [
                *list(output.get("vars", [])),
                *list(output.get("path_vars", {}).keys()),
            ]
            if output.get("type") == "env"
            else [output.get("field")],
        }
        for output in outputs
    ]
    public["public_jwk"] = public_jwk_from_private_key(private_key_path)
    return public


def pending_requests(
    private_key_path: Path, *, now: datetime | None = None
) -> list[dict[str, Any]]:
    current_time = now or utc_now()
    pending: list[dict[str, Any]] = []
    for path in sorted(requests_dir().glob("*.request.json")):
        try:
            request = load_request(path)
            request_id = validate_request_id(request["id"])
            if request.get("channel") != WORKBENCH_CHANNEL:
                continue
            if request_is_expired(request, now=current_time):
                cleanup_request(request_id)
                continue
            if (
                submission_path(request_id).exists()
                or cancellation_path(request_id).exists()
            ):
                continue
            pending.append(public_request(request, private_key_path))
        except (OSError, TypeError, ValueError, json.JSONDecodeError):
            # One malformed/stale manifest must not take down the listener.
            continue
    pending.sort(key=lambda item: (str(item.get("created_at", "")), item["id"]))
    return pending


def _validate_envelope(body: Any, request_id: str) -> dict[str, Any]:
    if not isinstance(body, dict):
        raise TypeError("submission must be a JSON object")
    if body.get("version") != 1:
        raise ValueError("unsupported submission version")
    if body.get("alg") != "RSA-OAEP-256+A256GCM":
        raise ValueError("unsupported submission algorithm")
    if body.get("request_id") != request_id:
        raise ValueError("submission request_id does not match request")
    for key in ("wrapped_key", "iv", "ciphertext"):
        value = body.get(key)
        if not isinstance(value, str) or not value or not BASE64URL_RE.fullmatch(value):
            raise ValueError(f"invalid {key}")
    if len(body["iv"]) > 64 or len(body["wrapped_key"]) > 2048:
        raise ValueError("invalid encrypted envelope size")
    return body


def _read_limited(stream: BinaryIO, limit: int) -> bytes:
    data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("submission is too large")
    if not data:
        raise ValueError("submission body is empty")
    return data


def store_submission(request_id: str, stream: BinaryIO) -> Path:
    request_id = validate_request_id(request_id)
    req_path = request_path(request_id)
    if not req_path.exists():
        raise ValueError("request is not pending")
    request = load_request(req_path)
    if request.get("channel") != WORKBENCH_CHANNEL or request_is_expired(request):
        raise ValueError("request is not pending")
    if cancellation_path(request_id).exists():
        raise ValueError("request was cancelled")

    raw = _read_limited(stream, MAX_SUBMISSION_BYTES)
    try:
        body = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("submission is not valid JSON") from exc
    envelope = _validate_envelope(body, request_id)

    path = submission_path(request_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(path, flags, 0o600)
    except FileExistsError as exc:
        raise ValueError("request already has a submission") from exc
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            os.fchmod(handle.fileno(), 0o600)
            json.dump(envelope, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return path


def cancel_request(request_id: str) -> Path:
    request_id = validate_request_id(request_id)
    req_path = request_path(request_id)
    if not req_path.exists():
        raise ValueError("request is not pending")
    if submission_path(request_id).exists():
        raise ValueError("request was already submitted")

    path = cancellation_path(request_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    payload = {
        "request_id": request_id,
        "cancelled_at": utc_now().isoformat(),
    }
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(path, flags, 0o600)
    except FileExistsError:
        return path
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        os.fchmod(handle.fileno(), 0o600)
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    return path


def watch_events(
    private_key_path: Path,
    *,
    poll_interval: float = 1.0,
) -> Iterable[dict[str, Any]]:
    if poll_interval < 0.1 or poll_interval > 60:
        raise ValueError("poll interval must be between 0.1 and 60 seconds")
    announced: set[str] = set()
    yield {"type": "ready", "channel": WORKBENCH_CHANNEL}
    while True:
        pending = pending_requests(private_key_path)
        current_ids = {request["id"] for request in pending}
        announced.intersection_update(current_ids)
        for request in pending:
            if request["id"] in announced:
                continue
            announced.add(request["id"])
            yield {"type": "request", "request": request}
        time.sleep(poll_interval)


def cleanup_request(request_id: str, *, include_submission: bool = True) -> None:
    request_path(request_id).unlink(missing_ok=True)
    cancellation_path(request_id).unlink(missing_ok=True)
    if include_submission:
        submission_path(request_id).unlink(missing_ok=True)
