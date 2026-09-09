from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from secenv_collector.crypto import (
    decrypt_submission,
    encrypt_values_for_request,
    generate_private_key,
    public_jwk_from_private_key,
)
from secenv_collector.schema import (
    install_outputs,
    load_request,
    validate_request,
    validate_values,
)
from secenv_collector.workbench import (
    cancellation_path,
    pending_requests,
    request_is_expired,
    request_path,
    submission_path,
    validate_request_id,
)

DESCRIPTION = (
    "Provider/account: Dummy Provider development account. Operation: read project metadata for demo-project. "
    "Environment: development. No writes, deploys, deletion, billing, user management, admin, signing, value "
    "transfer, or production. Revoke after the test. Destination and consumer are declared in the field help."
)
FIELD_HELP = (
    "Credential type: resource-scoped API token. Minimum permission: Project Metadata Read. Restrict to "
    "demo-project and development, plus localhost if supported. Enables reads only; no writes, deploys, deletion, "
    "billing, users, admin, signing, value transfer, or production. Expire in one hour and revoke after the test. "
    "Destination is the owner-only service.env fixture; consumer is the test metadata checker."
)


class SecureFlowTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_root = str(Path(__file__).resolve().parents[1] / "src")

    def _environment(
        self, home: Path, config: Path, state_root: Path
    ) -> dict[str, str]:
        env = os.environ.copy()
        env.update(
            {
                "HOME": str(home),
                "SECENV_HOME": str(config),
                "SECENV_STATE": str(state_root),
                "PYTHONPATH": self.source_root,
            }
        )
        return env

    def _run(
        self, arguments: list[str], env: dict[str, str], **kwargs
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-m", "secenv_collector.cli", *arguments],
            capture_output=True,
            text=True,
            env=env,
            timeout=kwargs.pop("timeout", 10),
            check=False,
            **kwargs,
        )

    def _wait_for_request(
        self, state_root: Path, process: subprocess.Popen[str]
    ) -> Path:
        deadline = time.monotonic() + 5
        request_dir = state_root / "requests"
        while time.monotonic() < deadline:
            matches = (
                list(request_dir.glob("*.request.json")) if request_dir.exists() else []
            )
            if matches:
                return matches[0]
            if process.poll() is not None:
                stdout, stderr = process.communicate()
                self.fail(
                    f"ask exited before creating a request: {stdout!r} {stderr!r}"
                )
            time.sleep(0.05)
        process.kill()
        process.communicate()
        self.fail("timed out waiting for a Workbench request")

    def _valid_request(self, output: Path) -> dict:
        return {
            "id": "dummy-request",
            "title": "Dummy Provider read-only development token",
            "description": DESCRIPTION,
            "fields": [
                {
                    "name": "DUMMY_API_TOKEN",
                    "label": "Dummy Provider API token",
                    "help": FIELD_HELP,
                    "type": "password",
                    "required": True,
                }
            ],
            "outputs": [
                {
                    "type": "env",
                    "path": str(output),
                    "mode": "0600",
                    "vars": ["DUMMY_API_TOKEN"],
                    "merge": True,
                }
            ],
        }

    def test_crypto_round_trip_keeps_plaintext_out_of_envelope(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            key_path = Path(tmp) / "private.pem"
            generate_private_key(key_path)
            secret_value = "dummy-secret-never-print"
            envelope = encrypt_values_for_request(
                request_id="dummy-request",
                public_jwk=public_jwk_from_private_key(key_path),
                values={"DUMMY_API_TOKEN": secret_value},
                submitted_at="2026-09-07T00:00:00Z",
            )
            self.assertNotIn(secret_value, json.dumps(envelope))
            submission = Path(tmp) / "submission.json"
            submission.write_text(json.dumps(envelope))
            submission.chmod(0o600)
            payload = decrypt_submission(submission, key_path)
            self.assertEqual(payload["values"]["DUMMY_API_TOKEN"], secret_value)

    @unittest.skipUnless(
        shutil.which("node"),
        "Node.js is required for the Workbench WebCrypto compatibility test",
    )
    def test_workbench_webcrypto_envelope_decrypts_in_python(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            key_path = root / "private.pem"
            generate_private_key(key_path)
            request = {
                "id": "webcrypto-compatibility",
                "public_jwk": public_jwk_from_private_key(key_path),
            }
            secret_value = "dummy-cross-runtime-value"
            helper = Path(__file__).with_name("workbench_encrypt.mjs")
            encrypted = subprocess.run(
                ["node", str(helper)],
                input=json.dumps(
                    {
                        "request": request,
                        "values": {"DUMMY_API_TOKEN": secret_value},
                        "submitted_at": "2026-09-07T00:00:00Z",
                    }
                ),
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            self.assertEqual(encrypted.returncode, 0, encrypted.stderr)
            self.assertNotIn(secret_value, encrypted.stdout)
            submission = root / "submission.json"
            submission.write_text(encrypted.stdout)
            submission.chmod(0o600)
            payload = decrypt_submission(submission, key_path)
            self.assertEqual(payload["values"]["DUMMY_API_TOKEN"], secret_value)

    def test_request_requires_informed_metadata_and_safe_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            request = self._valid_request(Path(tmp) / "service.env")
            validate_request(request)

            for mutation in ("title", "description"):
                invalid = json.loads(json.dumps(request))
                invalid[mutation] = ""
                with self.assertRaises(ValueError):
                    validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["fields"][0]["help"] = "too vague"
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["outputs"][0]["path"] = "relative.env"
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["outputs"][0]["mode"] = "0640"
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["description"] += " Exposed value: " + "ghp_" + ("A" * 30)
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["fields"][0]["provider_url"] = (
                "https://example.com/tokens?access=one-time-link"
            )
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["fields"][0]["type"] = "text"
            invalid["fields"][0]["default"] = "never-prefill-credential-fields"
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["fields"][0]["type"] = "textarea"
            with self.assertRaises(ValueError):
                validate_request(invalid)

            invalid = json.loads(json.dumps(request))
            invalid["outputs"] = [
                {
                    "type": "file",
                    "path": str(Path(tmp) / "secret.txt"),
                    "mode": "0600",
                    "field": "DUMMY_API_TOKEN",
                    "newline": "yes",
                }
            ]
            with self.assertRaises(ValueError):
                validate_request(invalid)

    def test_dynamic_request_rejects_missing_field_help_before_modal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            home.mkdir()
            state = root / "state"
            env = self._environment(home, root / "config", state)
            result = self._run(
                [
                    "ask",
                    "--title",
                    "Dummy Provider token",
                    "--description",
                    DESCRIPTION,
                    "--field",
                    "DUMMY_API_TOKEN=Dummy token",
                    "--env-file",
                    str(home / "service.env"),
                ],
                env,
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn(
                "every field requires exactly one --field-help", result.stderr
            )
            self.assertEqual(list((state / "requests").glob("*.json")), [])

    def test_workbench_submit_installs_without_plaintext_in_process_output(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            config = root / "config"
            state_root = root / "state"
            home.mkdir()
            output = home / "service.env"
            output.write_text(
                "KEEP_ME=existing\n"
                "DUMMY_API_TOKEN=stale-first\n"
                "export DUMMY_API_TOKEN=stale-last\n"
            )
            output.parent.chmod(0o755)
            secret_value = "dummy-secret-never-print"
            env = self._environment(home, config, state_root)

            ask = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "secenv_collector.cli",
                    "ask",
                    "--title",
                    "Dummy Provider read-only development token",
                    "--description",
                    DESCRIPTION,
                    "--field",
                    "DUMMY_API_TOKEN=Dummy Provider API token",
                    "--field-help",
                    f"DUMMY_API_TOKEN={FIELD_HELP}",
                    "--provider-url",
                    "DUMMY_API_TOKEN=https://example.com/account/tokens",
                    "--env-file",
                    str(output),
                    "--expires-in",
                    "60",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
            )
            request_file = self._wait_for_request(state_root, ask)
            self.assertEqual(stat.S_IMODE(request_file.stat().st_mode), 0o600)
            request = load_request(request_file)
            self.assertNotIn(secret_value, request_file.read_text())

            with patch.dict(
                os.environ,
                {
                    "HOME": str(home),
                    "SECENV_HOME": str(config),
                    "SECENV_STATE": str(state_root),
                },
            ):
                public = pending_requests(config / "private_key.pem")
            self.assertEqual(len(public), 1)
            self.assertNotIn("outputs", public[0])
            self.assertEqual(public[0]["fields"][0]["help"], FIELD_HELP)
            self.assertEqual(public[0]["install_targets"][0]["path"], str(output))

            envelope = encrypt_values_for_request(
                request_id=request["id"],
                public_jwk=public_jwk_from_private_key(config / "private_key.pem"),
                values={"DUMMY_API_TOKEN": secret_value},
                submitted_at="2026-09-07T00:00:00Z",
            )
            self.assertNotIn(secret_value, json.dumps(envelope))
            submitted = self._run(
                ["workbench", "submit", request["id"]],
                env,
                input=json.dumps(envelope),
            )
            self.assertEqual(submitted.returncode, 0, submitted.stderr)
            stdout, stderr = ask.communicate(timeout=5)
            self.assertEqual(ask.returncode, 0, stderr)
            for process_output in (stdout, stderr, submitted.stdout, submitted.stderr):
                self.assertNotIn(secret_value, process_output)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(output.parent.stat().st_mode), 0o755)
            installed = output.read_text()
            self.assertIn("KEEP_ME=existing", installed)
            self.assertIn(f"DUMMY_API_TOKEN={secret_value}", installed)
            self.assertEqual(installed.count("DUMMY_API_TOKEN="), 1)
            backups = list(home.glob("service.env.bak.*"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(stat.S_IMODE(backups[0].stat().st_mode), 0o600)
            self.assertNotIn(secret_value, backups[0].read_text())
            self.assertFalse(request_file.exists())
            self.assertEqual(list((state_root / "submissions").glob("*.json")), [])

    def test_cancel_stops_ask_and_installs_nothing(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            home.mkdir()
            state_root = root / "state"
            env = self._environment(home, root / "config", state_root)
            output = home / "cancelled.env"
            ask = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "secenv_collector.cli",
                    "ask",
                    "--title",
                    "Dummy Provider read-only development token",
                    "--description",
                    DESCRIPTION,
                    "--field",
                    "DUMMY_API_TOKEN=Dummy Provider API token",
                    "--field-help",
                    f"DUMMY_API_TOKEN={FIELD_HELP}",
                    "--env-file",
                    str(output),
                    "--expires-in",
                    "60",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
            )
            request = load_request(self._wait_for_request(state_root, ask))
            cancelled = self._run(["workbench", "cancel", request["id"]], env)
            self.assertEqual(cancelled.returncode, 0, cancelled.stderr)
            stdout, stderr = ask.communicate(timeout=5)
            self.assertEqual(ask.returncode, 3, stderr)
            self.assertIn('"status": "cancelled"', stdout)
            self.assertFalse(output.exists())
            self.assertEqual(list((state_root / "requests").glob("*.json")), [])

    def test_id_expiry_extra_fields_and_control_characters_fail_closed(self) -> None:
        for unsafe in ("../secret", "/absolute", "with space", ""):
            with self.assertRaises(ValueError):
                validate_request_id(unsafe)

        expired = {
            "expires_at": (
                datetime.now(timezone.utc) - timedelta(seconds=1)
            ).isoformat()
        }
        live = {
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(seconds=60)
            ).isoformat()
        }
        self.assertTrue(request_is_expired(expired))
        self.assertFalse(request_is_expired(live))

        with tempfile.TemporaryDirectory() as tmp:
            request = self._valid_request(Path(tmp) / "service.env")
            with self.assertRaises(ValueError):
                validate_values(request, {"DUMMY_API_TOKEN": "x", "EXTRA": "y"})
            for value in ("line-one\nline-two", "line-one\rline-two", "prefix\0suffix"):
                with self.assertRaises(ValueError):
                    install_outputs(request, {"DUMMY_API_TOKEN": value}, dry_run=True)

    def test_listener_cleans_expired_crash_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            config = root / "config"
            state_root = root / "state"
            home.mkdir()
            with patch.dict(
                os.environ,
                {
                    "HOME": str(home),
                    "SECENV_HOME": str(config),
                    "SECENV_STATE": str(state_root),
                },
            ):
                from secenv_collector.paths import ensure_base_dirs

                ensure_base_dirs()
                key = config / "private_key.pem"
                generate_private_key(key)
                request = self._valid_request(home / "service.env")
                request["id"] = "expired-crash-residue"
                request["channel"] = "workbench"
                request["expires_at"] = (
                    datetime.now(timezone.utc) - timedelta(seconds=1)
                ).isoformat()
                request_path(request["id"]).write_text(json.dumps(request))
                submission_path(request["id"]).write_text("encrypted-placeholder")
                cancellation_path(request["id"]).write_text("cancelled-placeholder")

                self.assertEqual(pending_requests(key), [])
                self.assertFalse(request_path(request["id"]).exists())
                self.assertFalse(submission_path(request["id"]).exists())
                self.assertFalse(cancellation_path(request["id"]).exists())

    def test_symlink_destination_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            actual = root / "actual.env"
            actual.write_text("KEEP=original\n")
            link = root / "service.env"
            link.symlink_to(actual)
            request = self._valid_request(link)
            validate_request(request)
            with self.assertRaises(ValueError):
                install_outputs(request, {"DUMMY_API_TOKEN": "dummy"})
            self.assertEqual(actual.read_text(), "KEEP=original\n")

    def test_symlink_or_public_submission_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            key = root / "private.pem"
            generate_private_key(key)
            envelope = encrypt_values_for_request(
                request_id="submission-file-guard",
                public_jwk=public_jwk_from_private_key(key),
                values={"DUMMY_API_TOKEN": "dummy"},
                submitted_at="2026-09-07T00:00:00Z",
            )
            actual = root / "actual.submission.json"
            actual.write_text(json.dumps(envelope))
            actual.chmod(0o644)
            with self.assertRaises(ValueError):
                decrypt_submission(actual, key)

            actual.chmod(0o600)
            link = root / "linked.submission.json"
            link.symlink_to(actual)
            with self.assertRaises(ValueError):
                decrypt_submission(link, key)

    def test_key_rotation_refuses_pending_artifacts_and_doctor_is_redacted(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            home.mkdir()
            state_root = root / "state"
            env = self._environment(home, root / "config", state_root)
            initialized = self._run(["init"], env)
            self.assertEqual(initialized.returncode, 0, initialized.stderr)
            doctor = self._run(["doctor"], env)
            self.assertEqual(doctor.returncode, 0, doctor.stderr)
            status_payload = json.loads(doctor.stdout)
            self.assertEqual(status_payload["private_key_mode"], "0o600")
            self.assertFalse(status_payload["browser_fallback"])

            pending = state_root / "requests" / "pending.request.json"
            pending.write_text("{}\n")
            rotated = self._run(["init", "--rotate"], env)
            self.assertEqual(rotated.returncode, 1)
            self.assertIn("refusing key rotation", rotated.stderr)

    def test_unsafe_key_and_state_paths_fail_before_request(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            home.mkdir()
            config = root / "config"
            state_root = root / "state"
            env = self._environment(home, config, state_root)
            initialized = self._run(["init"], env)
            self.assertEqual(initialized.returncode, 0, initialized.stderr)
            key = config / "private_key.pem"
            key.chmod(0o644)

            unsafe = self._run(
                [
                    "ask",
                    "--title",
                    "Dummy Provider read-only development token",
                    "--description",
                    DESCRIPTION,
                    "--field",
                    "DUMMY_API_TOKEN=Dummy Provider API token",
                    "--field-help",
                    f"DUMMY_API_TOKEN={FIELD_HELP}",
                    "--env-file",
                    str(home / "service.env"),
                    "--expires-in",
                    "30",
                ],
                env,
            )
            self.assertEqual(unsafe.returncode, 1)
            self.assertIn("private key mode must be 0600", unsafe.stderr)
            self.assertEqual(list((state_root / "requests").glob("*.json")), [])

            relative_env = env.copy()
            relative_env["SECENV_STATE"] = "relative-state"
            rejected_relative = self._run(["doctor"], relative_env)
            self.assertEqual(rejected_relative.returncode, 1)
            self.assertIn("must be absolute", rejected_relative.stderr)

            state_root.mkdir(exist_ok=True)
            symlink = root / "state-link"
            symlink.symlink_to(state_root, target_is_directory=True)
            symlink_env = env.copy()
            symlink_env["SECENV_STATE"] = str(symlink)
            rejected_symlink = self._run(["doctor"], symlink_env)
            self.assertEqual(rejected_symlink.returncode, 1)
            self.assertIn("directory symlink", rejected_symlink.stderr)

    def test_legacy_plaintext_or_browser_commands_do_not_exist(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "home"
            home.mkdir()
            env = self._environment(home, root / "config", root / "state")
            for command in ("serve", "collect", "request", "inspect", "install"):
                result = self._run([command], env)
                self.assertEqual(result.returncode, 2)
            result = self._run(["ask", "--coder-link"], env)
            self.assertEqual(result.returncode, 2)


if __name__ == "__main__":
    unittest.main()
