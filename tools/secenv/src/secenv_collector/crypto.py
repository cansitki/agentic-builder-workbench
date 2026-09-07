from __future__ import annotations

import base64
import json
import os
import stat
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAX_ENCRYPTED_SUBMISSION_BYTES = 512 * 1024


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode((data + pad).encode("ascii"))


@dataclass(frozen=True)
class KeyStatus:
    private_key_path: Path
    exists: bool
    public_jwk: dict[str, Any] | None


def validate_private_key_file(path: Path) -> None:
    if path.is_symlink():
        raise ValueError(f"refusing collector private-key symlink: {path}")
    if not path.exists():
        raise ValueError(f"collector private key does not exist: {path}")
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode):
        raise ValueError(f"collector private key is not a regular file: {path}")
    if stat.S_IMODE(metadata.st_mode) != 0o600:
        raise ValueError(f"collector private key mode must be 0600: {path}")
    if hasattr(os, "geteuid") and metadata.st_uid != os.geteuid():
        raise ValueError(
            f"collector private key is not owned by the current user: {path}"
        )


def _read_private_regular_file(
    path: Path, *, expected_mode: int, max_bytes: int
) -> bytes:
    if path.is_symlink():
        raise ValueError(f"refusing symlink: {path}")
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(path, flags)
    try:
        metadata = os.fstat(descriptor)
        if not stat.S_ISREG(metadata.st_mode):
            raise ValueError(f"expected a regular file: {path}")
        if stat.S_IMODE(metadata.st_mode) != expected_mode:
            raise ValueError(f"file mode must be {expected_mode:04o}: {path}")
        if hasattr(os, "geteuid") and metadata.st_uid != os.geteuid():
            raise ValueError(f"file is not owned by the current user: {path}")
        with os.fdopen(descriptor, "rb") as handle:
            descriptor = -1
            data = handle.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError(f"file exceeds the maximum supported size: {path}")
        return data
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def generate_private_key(path: Path, *, force: bool = False) -> None:
    if path.exists() and not force:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.parent.chmod(0o700)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    temporary_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=f".{path.name}.",
            dir=path.parent,
            delete=False,
        ) as temporary:
            temporary_name = temporary.name
            os.fchmod(temporary.fileno(), 0o600)
            temporary.write(pem)
            temporary.flush()
            os.fsync(temporary.fileno())
        if force:
            os.replace(temporary_name, path)
            temporary_name = None
        else:
            try:
                # Publish a fully-written key in one step. This avoids a race
                # when the persistent listener and the first `ask` start at
                # the same time.
                os.link(temporary_name, path)
            except FileExistsError:
                return
    finally:
        if temporary_name is not None:
            Path(temporary_name).unlink(missing_ok=True)


def load_private_key(path: Path):
    validate_private_key_file(path)
    pem = _read_private_regular_file(path, expected_mode=0o600, max_bytes=64 * 1024)
    return serialization.load_pem_private_key(pem, password=None)


def public_jwk_from_private_key(path: Path) -> dict[str, Any]:
    private_key = load_private_key(path)
    public_numbers = private_key.public_key().public_numbers()
    n = public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, "big")
    e = public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, "big")
    return {
        "kty": "RSA",
        "alg": "RSA-OAEP-256",
        "key_ops": ["encrypt", "wrapKey"],
        "ext": True,
        "n": b64url_encode(n),
        "e": b64url_encode(e),
    }


def public_key_from_jwk(jwk: dict[str, Any]):
    n = int.from_bytes(b64url_decode(jwk["n"]), "big")
    e = int.from_bytes(b64url_decode(jwk["e"]), "big")
    return rsa.RSAPublicNumbers(e=e, n=n).public_key()


def decrypt_submission(path: Path, private_key_path: Path) -> dict[str, Any]:
    raw_submission = _read_private_regular_file(
        path,
        expected_mode=0o600,
        max_bytes=MAX_ENCRYPTED_SUBMISSION_BYTES,
    )
    submission = json.loads(raw_submission.decode("utf-8"))
    private_key = load_private_key(private_key_path)
    wrapped_key = b64url_decode(submission["wrapped_key"])
    aes_key = private_key.decrypt(
        wrapped_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    aesgcm = AESGCM(aes_key)
    plaintext = aesgcm.decrypt(
        b64url_decode(submission["iv"]),
        b64url_decode(submission["ciphertext"]),
        submission["request_id"].encode("utf-8"),
    )
    return json.loads(plaintext.decode("utf-8"))


def encrypt_values_for_request(
    *,
    request_id: str,
    public_jwk: dict[str, Any],
    values: dict[str, str],
    submitted_at: str = "test",
) -> dict[str, Any]:
    public_key = public_key_from_jwk(public_jwk)
    aes_key = AESGCM.generate_key(bit_length=256)
    iv = os.urandom(12)
    payload = {
        "request_id": request_id,
        "submitted_at": submitted_at,
        "values": values,
    }
    plaintext = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
        "utf-8"
    )
    ciphertext = AESGCM(aes_key).encrypt(iv, plaintext, request_id.encode("utf-8"))
    wrapped_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return {
        "version": 1,
        "request_id": request_id,
        "alg": "RSA-OAEP-256+A256GCM",
        "wrapped_key": b64url_encode(wrapped_key),
        "iv": b64url_encode(iv),
        "ciphertext": b64url_encode(ciphertext),
    }
