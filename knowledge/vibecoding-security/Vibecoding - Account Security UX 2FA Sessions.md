---
tags: [security, vibecoding, account-security, 2fa, mfa, sessions]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Account Security UX — 2FA, Sessions, Recovery

Application security is partly a UX problem. The strongest auth backend can't help if the recovery flow lets anyone with an email address take over the account, or if "log out everywhere" doesn't actually do that.

## MFA / 2FA

- TOTP (RFC 6238) at minimum. Don't roll your own — use `otplib` / equivalent.
- WebAuthn / passkeys preferred where the platform supports it. Phishing-resistant.
- SMS as a fallback only — known-weak (SIM swap), but better than nothing for last-resort recovery.
- Backup codes generated server-side, shown once, hashed at rest.
- Enroll flow can't be skipped silently. If MFA is "required for admin," the role can't be granted before enrollment.
- Step-up auth on sensitive actions (changing email, adding payment method, exporting data, deleting account) — re-prompt for MFA even within an active session.

## Sessions

- Session list visible in account settings: device, IP, location, last seen.
- "Log out everywhere" actually invalidates every refresh token + session row, not just the current cookie.
- Session expiry: idle timeout AND absolute timeout. Idle e.g. 30 days, absolute e.g. 90 days.
- Refresh token rotation: each use issues a new refresh token, old one revoked. Detect re-use → force re-auth (refresh token theft signal).
- Session bound to a fingerprint where possible (UA + IP class). Don't be too strict — mobile network IP roams.
- Logout: server-side revocation, not just client-side cookie clear.

## Password reset

- Single-use, 15-minute-TTL, CSPRNG token (32 bytes).
- Token never logged, never echoed in the URL outside the email.
- After reset: invalidate all sessions, all OAuth grants, all API keys (or at least notify the user).
- Rate-limited per-account AND per-IP.
- "Did you mean?" — never reveal whether the email exists ("If an account exists, we've sent a link").

## Email change

- Confirmation sent to BOTH old email (with revoke link) and new email (with confirm link).
- Old email can revoke up to 7 days after change.
- Step-up auth required before initiating.
- No silent email change — the old address must always be told.

## Account recovery

- Hardest path to get right. Define your recovery policy explicitly:
  - Self-serve via secondary email + phone, OR
  - Manual support flow with identity verification, OR
  - Hardware-key recovery (passkey backup), OR
  - Documented "no recovery — paid plans get account-loss protection" stance.
- Recovery via "answer your security question" is broken. Don't.

## OAuth grants

- User can see and revoke every third-party app that has API access to their account.
- Granting a new OAuth app requires re-auth.
- New-grant notification email.
- Tokens issued with minimum scope, not "everything."

## Login alerts

- Email on login from new device / new country.
- Email on password change, email change, MFA add/remove, OAuth grant added.
- All security-relevant emails include "this wasn't me" → revoke session + force password reset.

## Breach response

- Have you-been-pwned check on signup / password change.
- If your DB is breached: force password reset on next login, revoke all sessions, notify per Privacy/GDPR runbook.
- Consider integration with breach-notification services so users learn from you, not the news.

## Related

- [[Vibecoding - Cryptography and Key Management]]
- [[Vibecoding - Privacy and GDPR Reference]]
- [[Vibecoding - Incident Response Runbook]]
- [[Vibecoding - Things to Check on Your Code]]
