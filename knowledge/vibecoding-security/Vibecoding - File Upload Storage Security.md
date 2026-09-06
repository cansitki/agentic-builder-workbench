---
tags: [security, vibecoding, file-upload, storage, r2, s3]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# File Upload and Storage Security

User-uploaded content is the most consistently mishandled surface in vibecoded apps. The default flow — "POST file, save it, serve it from the same domain" — is wrong on every axis: validation, isolation, access control, malware, content type confusion.

## What can go wrong

- **Path traversal.** `filename = req.body.filename; fs.write(filename, body)` → `../../../etc/passwd`.
- **Content-Type confusion.** User uploads `evil.html` claiming `image/png`. Browser ignores Content-Type, sniffs HTML, executes JS in your origin → stored XSS.
- **MIME-only validation.** Client sets `Content-Type: image/jpeg`; file is actually a PHP shell.
- **Extension-only validation.** `.jpg.php` slipped through, served as PHP by Apache.
- **Unbounded size.** 50GB upload → disk exhaustion / S3 bill.
- **Decompression bombs.** 1KB ZIP → 10GB on extract.
- **SSRF via remote-fetch.** "Import from URL" feature fetched `http://169.254.169.254/latest/meta-data/` → cloud creds leaked.
- **Stored XSS in SVG.** SVG can contain `<script>`; serving inline = XSS.
- **Direct object reference.** Predictable URLs (`/uploads/123.jpg`) enumerable by attackers.
- **No malware scan.** Marketplace / file-share apps host malware unknowingly.

## Pattern that works

### Upload
- Server presigns the upload URL with explicit `Content-Length` max (defense 1).
- Client uploads directly to object storage (R2/S3/GCS).
- Server-side complete handler: HEAD the object, verify `Content-Length <= MAX` (defense 2 — see [[Vibecoding - Things to Check on Your Code]] section 5).
- Verify magic bytes server-side (`file-type` package): rejects `.jpg.php`, accepts only the file types you intend.
- Re-encode where possible: JPEG → re-encoded JPEG via sharp; PDF → re-rendered PDF; SVG → strip scripts via DOMPurify-svg or convert to raster.

### Storage
- Bucket is private. Public objects served via CDN with signed URLs.
- Random keys (`uuid` or `nanoid`), not user-supplied filenames.
- Sanitize original filename for display only — never use it as a path component.
- Separate buckets / prefixes per tenant. Don't rely on path-prefix-only isolation; enforce in IAM.

### Serving
- Serve user-uploaded content from a **separate origin** (cookieless, isolated cookie scope) — `usercontent.example.com`, not `app.example.com`. Limits XSS blast radius even if a malicious upload escapes validation.
- `Content-Disposition: attachment` for risky types (HTML, SVG, exe, shell scripts) instead of inline.
- `X-Content-Type-Options: nosniff` always.
- Strict CSP on the user-content origin — at minimum no inline scripts, no JS execution.
- Authorization on every download. Don't rely on URL-as-secret for sensitive content.

### Malware scanning
- ClamAV / VirusTotal / cloud-native scanner (S3 Macie, GCP Cloud DLP) on every upload.
- Quarantine bucket: uploaded → scanned → moved to live bucket on clean.
- Async scanning is fine — gate the URL behind "scanned: true" before serving.

### Decompression
- If you accept ZIP / TAR / etc., enforce limits: max files, max total uncompressed bytes, max nesting depth, timeout.
- Stream-decompress with hard caps; abort on exceed.
- Run extraction in a sandbox (subprocess with rlimits, container).

### Remote fetch (SSRF)
- Allowlist of domains, never user-supplied URLs.
- Resolve hostname server-side, reject private IP ranges (RFC 1918, 169.254/16, ::1, fc00::/7, link-local).
- Block redirects to private IPs.
- Use a dedicated egress proxy for any "fetch arbitrary URL" feature.

## Quick checks

- Try uploading `evil.svg` containing `<script>alert(1)</script>`. Must reject or strip.
- Try uploading `../../etc/passwd` as filename. Must save with sanitized random key.
- Try `Content-Length: 99999999999`. Must reject before reading body.
- Try a ZIP that decompresses to 100GB. Must abort early.
- Curl an upload URL belonging to another user. Must 403 / 404.
- Inspect served URL: `Content-Disposition`, `X-Content-Type-Options`, origin separation.

## Related

- [[Vibecoding - No Input Validation]]
- [[Vibecoding - Authorization Depth IDOR BOLA]]
- [[Vibecoding - Things to Check on Your Code]]
