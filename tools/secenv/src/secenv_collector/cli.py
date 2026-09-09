from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .crypto import (
    decrypt_submission,
    generate_private_key,
    public_jwk_from_private_key,
    validate_private_key_file,
)
from .paths import ensure_base_dirs, private_key_path, requests_dir, submissions_dir
from .schema import (
    FIELD_RE,
    install_outputs,
    load_request,
    redact_values,
    validate_request,
    validate_values,
)
from .workbench import (
    WORKBENCH_CHANNEL,
    cancel_request,
    cancellation_path,
    cleanup_request,
    parse_timestamp,
    request_is_expired,
    store_submission,
    submission_path,
    validate_request_id,
    watch_events,
)


def _json_print(payload: dict) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True), flush=True)


def _slug(value: str, fallback: str = "secure-input") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:72]
    return slug or fallback


def _private_json_create(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(path, flags, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            os.fchmod(handle.fileno(), 0o600)
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
    except Exception:
        path.unlink(missing_ok=True)
        raise


def _parse_field_spec(
    spec: str, *, required: bool, field_type: str = "password"
) -> dict:
    name, separator, label = spec.partition("=")
    name = name.strip()
    if not FIELD_RE.fullmatch(name):
        raise ValueError(f"invalid field name: {name!r}")
    label = label.strip() if separator else name.replace("_", " ").title()
    if not label:
        raise ValueError(f"field label is empty: {name}")
    return {
        "name": name,
        "label": label,
        "type": field_type,
        "required": required,
    }


def _parse_named_values(specs: list[str] | None, option: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for spec in specs or []:
        name, separator, value = spec.partition("=")
        name = name.strip()
        value = value.strip()
        if not separator or not FIELD_RE.fullmatch(name) or not value:
            raise ValueError(f"{option} must use FIELD=VALUE")
        if name in values:
            raise ValueError(f"duplicate {option} for field: {name}")
        values[name] = value
    return values


def _parse_file_outputs(specs: list[str] | None) -> dict[str, str]:
    return _parse_named_values(specs, "--file")


def _request_from_schema(path: str) -> dict:
    request = load_request(Path(path).expanduser())
    return json.loads(json.dumps(request))


def _dynamic_request(args: argparse.Namespace) -> dict:
    field_specs = [
        *(_parse_field_spec(spec, required=True) for spec in (args.field or [])),
        *(
            _parse_field_spec(spec, required=False)
            for spec in (args.optional_field or [])
        ),
        *(
            _parse_field_spec(spec, required=True, field_type="text")
            for spec in (args.text_field or [])
        ),
    ]
    if not field_specs:
        raise ValueError("provide --schema or at least one --field")
    if not args.title or not args.description:
        raise ValueError("dynamic requests require --title and --description")

    names: set[str] = set()
    for field in field_specs:
        if field["name"] in names:
            raise ValueError(f"duplicate field: {field['name']}")
        names.add(field["name"])

    help_by_field = _parse_named_values(args.field_help, "--field-help")
    provider_urls = _parse_named_values(args.provider_url, "--provider-url")
    if set(help_by_field) != names:
        missing = sorted(names - set(help_by_field))
        extra = sorted(set(help_by_field) - names)
        detail = []
        if missing:
            detail.append("missing: " + ", ".join(missing))
        if extra:
            detail.append("unknown: " + ", ".join(extra))
        raise ValueError(
            "every field requires exactly one --field-help (" + "; ".join(detail) + ")"
        )
    unknown_urls = sorted(set(provider_urls) - names)
    if unknown_urls:
        raise ValueError(
            "--provider-url references unknown fields: " + ", ".join(unknown_urls)
        )

    for field in field_specs:
        field["help"] = help_by_field[field["name"]]
        if field["name"] in provider_urls:
            field["provider_url"] = provider_urls[field["name"]]
            field["provider_label"] = "Open official provider page"

    file_outputs = _parse_file_outputs(args.file)
    unknown_files = sorted(set(file_outputs) - names)
    if unknown_files:
        raise ValueError(
            "--file references unknown fields: " + ", ".join(unknown_files)
        )

    env_fields = [
        field["name"] for field in field_specs if field["name"] not in file_outputs
    ]
    if env_fields and not args.env_file:
        raise ValueError(
            "fields without --file require --env-file: " + ", ".join(env_fields)
        )

    outputs: list[dict] = []
    if env_fields:
        outputs.append(
            {
                "type": "env",
                "path": args.env_file,
                "mode": "0600",
                "vars": env_fields,
                "merge": True,
            }
        )
    for name, output_path in file_outputs.items():
        outputs.append(
            {
                "type": "file",
                "path": output_path,
                "mode": "0600",
                "field": name,
                "newline": False,
            }
        )

    return {
        "id": args.id or _slug(args.title),
        "title": args.title,
        "description": args.description,
        "fields": field_specs,
        "outputs": outputs,
    }


def _ask_request(args: argparse.Namespace) -> dict:
    dynamic_args_used = any(
        (
            args.field,
            args.optional_field,
            args.text_field,
            args.field_help,
            args.provider_url,
            args.env_file,
            args.file,
        )
    )
    if args.schema:
        if dynamic_args_used:
            raise ValueError(
                "--schema cannot be combined with dynamic field or output arguments"
            )
        request = _request_from_schema(args.schema)
        if args.title:
            request["title"] = args.title
        if args.description:
            request["description"] = args.description
    else:
        request = _dynamic_request(args)

    if args.expires_in < 30 or args.expires_in > 86400:
        raise ValueError("--expires-in must be between 30 and 86400 seconds")
    now = datetime.now(timezone.utc)
    base_id = args.id or str(request.get("id", "secure-input"))
    request["id"] = f"{_slug(base_id)}-{secrets.token_hex(5)}"
    request["created_at"] = now.isoformat()
    request["expires_at"] = (now + timedelta(seconds=args.expires_in)).isoformat()
    request["channel"] = WORKBENCH_CHANNEL
    workspace_name = os.environ.get("CODER_WORKSPACE_NAME", "").strip()
    if workspace_name:
        request["requested_from"] = workspace_name[:80]
    request["requested_cwd"] = str(Path.cwd())[:512]
    validate_request(request)
    return request


def _write_request(request: dict) -> Path:
    validate_request(request)
    path = requests_dir() / f"{request['id']}.request.json"
    _private_json_create(path, request)
    return path


def cmd_init(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    if args.rotate:
        pending = [*requests_dir().glob("*.json"), *submissions_dir().glob("*.json")]
        if pending:
            raise ValueError(
                "refusing key rotation while request/submission artifacts exist"
            )
    generate_private_key(private_key_path(), force=args.rotate)
    jwk = public_jwk_from_private_key(private_key_path())
    _json_print(
        {
            "ok": True,
            "private_key": str(private_key_path()),
            "public_key_kid": jwk["n"][:16],
            "mode": oct(private_key_path().stat().st_mode & 0o777),
        }
    )
    return 0


def cmd_ask(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    generate_private_key(private_key_path())
    validate_private_key_file(private_key_path())
    request = _ask_request(args)
    request_file = _write_request(request)
    request_id = request["id"]
    _json_print(
        {
            "ok": True,
            "status": "waiting",
            "channel": WORKBENCH_CHANNEL,
            "request_id": request_id,
            "request": str(request_file),
            "fields": [field["name"] for field in request["fields"]],
            "expires_at": request["expires_at"],
            "message": "Waiting for the native secure-input modal. No chat or browser fallback is available.",
        }
    )

    values: dict[str, str] | None = None
    payload: dict | None = None
    try:
        while True:
            if cancellation_path(request_id).exists():
                cleanup_request(request_id)
                _json_print(
                    {"ok": False, "status": "cancelled", "request_id": request_id}
                )
                return 3

            encrypted_submission = submission_path(request_id)
            if encrypted_submission.exists():
                payload = decrypt_submission(encrypted_submission, private_key_path())
                if payload.get("request_id") != request_id:
                    raise ValueError("submission request_id does not match request")
                submitted_at = payload.get("submitted_at")
                if not isinstance(submitted_at, str) or len(submitted_at) > 64:
                    raise ValueError("submission submitted_at is invalid")
                submitted_at = parse_timestamp(submitted_at).isoformat()
                values = validate_values(request, payload.get("values", {}))
                redacted = redact_values(values)
                actions = install_outputs(request, values)
                result = {
                    "ok": True,
                    "status": "installed",
                    "request_id": request_id,
                    "submitted_at": submitted_at,
                    "fields": redacted,
                    "installed": actions,
                }
                cleanup_request(request_id)
                _json_print(result)
                return 0

            if request_is_expired(request):
                cleanup_request(request_id)
                _json_print(
                    {"ok": False, "status": "expired", "request_id": request_id}
                )
                return 4
            time.sleep(0.25)
    except KeyboardInterrupt:
        cleanup_request(request_id)
        raise
    except Exception:
        cleanup_request(request_id)
        raise
    finally:
        if values is not None:
            for name in values:
                values[name] = ""
            values.clear()
        if isinstance(payload, dict) and isinstance(payload.get("values"), dict):
            payload["values"].clear()


def cmd_workbench_watch(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    generate_private_key(private_key_path())
    validate_private_key_file(private_key_path())
    for event in watch_events(private_key_path(), poll_interval=args.poll_interval):
        print(json.dumps(event, separators=(",", ":"), sort_keys=True), flush=True)
    return 0


def cmd_workbench_submit(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    request_id = validate_request_id(args.request_id)
    stored = store_submission(request_id, sys.stdin.buffer)
    _json_print(
        {
            "ok": True,
            "status": "submitted",
            "request_id": request_id,
            "submission": str(stored),
        }
    )
    return 0


def cmd_workbench_cancel(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    request_id = validate_request_id(args.request_id)
    cancel_request(request_id)
    _json_print({"ok": True, "status": "cancelled", "request_id": request_id})
    return 0


def _mode(path: Path) -> str | None:
    return oct(path.stat().st_mode & 0o777) if path.exists() else None


def cmd_doctor(args: argparse.Namespace) -> int:
    ensure_base_dirs()
    key = private_key_path()
    key_error = None
    try:
        validate_private_key_file(key)
        ok = True
    except ValueError as exc:
        key_error = str(exc)
        ok = False
    _json_print(
        {
            "ok": ok,
            "private_key_exists": key.exists(),
            "private_key": str(key),
            "private_key_mode": _mode(key),
            "private_key_error": key_error,
            "requests_dir": str(requests_dir()),
            "requests_dir_mode": _mode(requests_dir()),
            "channel": WORKBENCH_CHANNEL,
            "browser_fallback": False,
        }
    )
    return 0 if ok else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="secenv",
        description="Secure credential intake through a native Workbench modal; no chat/browser fallback.",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    command = sub.add_parser("init", help="Create local collector key material.")
    command.add_argument(
        "--rotate",
        action="store_true",
        help="Rotate only when no request artifacts exist.",
    )
    command.set_defaults(func=cmd_init)

    command = sub.add_parser(
        "ask", help="Request informed secure input and install owner-only outputs."
    )
    command.add_argument(
        "--schema", help="Rich JSON request schema with per-field help."
    )
    command.add_argument(
        "--field", action="append", help="Required secret field as NAME=Label."
    )
    command.add_argument(
        "--optional-field", action="append", help="Optional secret field as NAME=Label."
    )
    command.add_argument(
        "--text-field", action="append", help="Required visible field as NAME=Label."
    )
    command.add_argument(
        "--field-help",
        action="append",
        help="Required informed help as NAME=Detailed explanation.",
    )
    command.add_argument(
        "--provider-url",
        action="append",
        help="Optional official HTTPS page as NAME=URL.",
    )
    command.add_argument(
        "--env-file",
        help="Absolute/~ owner-only env destination for fields not using --file.",
    )
    command.add_argument(
        "--file",
        action="append",
        help="Write one field directly using FIELD=ABSOLUTE_PATH.",
    )
    command.add_argument(
        "--id", help="Readable request-id prefix; a random suffix is always added."
    )
    command.add_argument(
        "--title", help="Exact provider credential and purpose shown in the modal."
    )
    command.add_argument(
        "--description",
        help="Account, operation, environment, risk, expiry, destination, and consumer.",
    )
    command.add_argument(
        "--expires-in",
        type=int,
        default=900,
        help="Request lifetime in seconds (30-86400).",
    )
    command.set_defaults(func=cmd_ask)

    command = sub.add_parser(
        "workbench", help="Ciphertext-only Workbench broker protocol."
    )
    workbench = command.add_subparsers(dest="workbench_cmd", required=True)

    broker = workbench.add_parser(
        "watch", help="Stream public request manifests as JSON Lines."
    )
    broker.add_argument("--poll-interval", type=float, default=1.0)
    broker.set_defaults(func=cmd_workbench_watch)

    broker = workbench.add_parser(
        "submit", help="Read one encrypted envelope from stdin."
    )
    broker.add_argument("request_id")
    broker.set_defaults(func=cmd_workbench_submit)

    broker = workbench.add_parser(
        "cancel", help="Cancel a pending request without a secret."
    )
    broker.add_argument("request_id")
    broker.set_defaults(func=cmd_workbench_cancel)

    command = sub.add_parser(
        "doctor", help="Check paths, modes, channel, and disabled browser fallback."
    )
    command.set_defaults(func=cmd_doctor)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130
    except Exception as exc:  # noqa: BLE001 - CLI boundary must fail closed with a redacted error.
        print(f"secenv: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
