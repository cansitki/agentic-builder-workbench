---
tags: [security, vibecoding, infrastructure, ops, tls, dns, backup]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Infrastructure and Operations Security

The vibecoded app might be locked down at the application layer and still get owned via the infra layer: weak TLS, no DNSSEC, exposed admin ports, backups stored in a public bucket, no key rotation, no offboarding for ex-contributors.

## TLS / Transport

- TLS 1.2+ only; TLS 1.0 / 1.1 disabled. Test with `testssl.sh` or SSL Labs (target A or A+).
- HSTS with `preload`, `includeSubDomains`, `max-age=31536000`. Submit to the preload list.
- Wildcard certs auto-renewed; expiry monitored (Let's Encrypt cron + alert).
- Internal service-to-service: mTLS or at minimum TLS, never plaintext on the private network.
- Certificate Transparency monitoring (e.g. crt.sh polling) catches mis-issued certs.

## DNS

- DNSSEC enabled where the registrar supports it.
- SPF, DKIM, DMARC configured for every domain that sends email — `p=quarantine` minimum, `p=reject` for prod.
- BIMI optional, but DMARC enforcement first.
- Subdomain takeovers: every CNAME pointing at a third-party (Heroku, Vercel, Netlify, S3 bucket) must point at a claimed resource. Run `subjack` or `subzy` periodically.
- Registrar lock + 2FA on the registrar account.

## Backups

- Daily automated backups for prod DB. Tested restore at least quarterly.
- Backups encrypted at-rest with a separate key from the prod DB.
- Backups stored in a different region / account from prod (defense against ransomware lateral movement).
- Backup access list reviewed quarterly. CI / dev systems do NOT have backup read access.
- Backup integrity: hash + signed manifest, verified on restore.

## Disaster recovery

- RTO and RPO documented per system. Tested in a game day at least annually.
- Runbooks for: prod DB lost, region down, key compromised, account compromised, ransomware.
- Off-site secondary that can be promoted (read replica / snapshot).
- Communication plan: status page, customer email template, regulator notification timeline.

## Access management

- Every prod credential in KMS / Vault / 1Password, not in shell history.
- SSH keys per-person, rotated annually, revoked at offboarding within 24h.
- Principle of least privilege on cloud IAM. No "AdministratorAccess" on engineer day-to-day roles.
- MFA enforced on every console (cloud, GitHub, Stripe, registrar, email, observability).
- Service accounts have explicit short-TTL tokens, not long-lived API keys, where possible.
- Quarterly access review: who has prod access, why, still relevant.

## Network

- No DBs / Redis / queue listeners exposed to public internet. Behind VPC + bastion / Tailscale / Cloudflare Access.
- Egress filtering on prod servers — they should not be able to reach arbitrary internet hosts (limits exfil + reduces blast radius of compromise).
- CDN / WAF in front of public endpoints (Cloudflare, Vercel, AWS WAF) with rate limiting and bot challenge.

## Container / VM hardening

- Images built from minimal bases (distroless, alpine, scratch where possible).
- No latest tags in prod — pinned digests.
- Images scanned in CI (Trivy, Grype). Block on critical CVEs.
- Runtime non-root user.
- Read-only root filesystem where possible.
- No SSH into prod containers — use SSM / k8s exec with audit logging.

## Logging & SIEM

See [[Vibecoding - Logging and SIEM Without PII Leakage]].

## Related

- [[Vibecoding - Things to Check on Your Code]]
- [[Vibecoding - Cryptography and Key Management]]
