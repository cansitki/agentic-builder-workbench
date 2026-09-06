---
tags: [security, vibecoding, ci, cd, container, supply-chain]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# CI/CD and Container Security

Your pipeline writes to prod. If it's compromised, every safeguard inside the app is bypassed. Vibecoded teams routinely ship CI/CD with secrets in environment, third-party actions pinned to `@v1` (mutable tag), and a workflow that builds + signs + deploys in one job with no separation of duty.

## Pipeline hygiene

- Branch protection on main: require PR, require reviews, require status checks, dismiss stale approvals on push.
- Required CI checks include SAST + dependency scan + secret scan + tests.
- No `pull_request_target` workflows that check out fork code AND have repo secrets — the canonical CI compromise vector.
- Third-party Actions / reusable workflows pinned to a commit SHA, not a tag (`uses: actions/checkout@<sha>` not `@v4`).
- Action allowlist enabled at the org level; review every new third-party action.

## Secrets in CI

- Secrets scoped to environment (prod / staging / preview), not repo-wide.
- Prod deploys gated on a manual approval (environment protection rule).
- OIDC to cloud providers (AWS, GCP) instead of long-lived static keys.
- No secrets in artifact bundles, Docker layers, or container env labels.
- `env:` block does not echo secrets to logs (`run: echo $SECRET` is the classic foot-shotgun).

## Build provenance

- SLSA level 2+ where possible: signed provenance attestation from the build.
- Sigstore / cosign signatures on every container image.
- Verify signatures at deploy time (Kyverno / Gatekeeper / native cloud verifier).

## SBOM

- Generate SBOM (CycloneDX or SPDX) for every build.
- Store with the artifact.
- Scan SBOM against CVE feeds in CI and post-deploy continuously.
- Dependency-bot enabled (Renovate / Dependabot) with security PRs auto-prioritized.

## Container specifics

- Base images from a vetted internal registry mirror or a small set of known-good public bases.
- Multi-stage builds: only runtime deps in the final layer, no compilers / shells in prod images.
- No `curl | sh` install steps. Pin every download with a checksum.
- `docker scan` / Trivy / Grype in CI. Block on critical, alert on high.
- Don't run as root. Drop all caps, add only what you need.
- Read-only root FS, writable tmpfs only where needed.

## Deploy gates

- Migration safety: a destructive migration (DROP, ALTER TYPE that rewrites table, NOT NULL with no default on a large table) requires a separate approval.
- Rollback plan documented and tested. Database changes reversible or paired with a forward-fix path.
- Feature flags / canary for risky changes. No "deploy-and-pray" for major features.

## Supply chain attacks (slopsquatting + typosquatting)

- Lockfile committed and CI uses `--frozen-lockfile`.
- Every new dep added in a PR has a human reviewer who actually checks the package name vs intent (slopsquatting protection).
- `npm audit` / `pnpm audit` in CI, blocks on critical.
- Deny-list for known-malicious package names; private registry mirror filters at the edge.
- Don't `npm install -g` random tools in CI without a pin.

See [[Vibecoding - Stat - CSA AI Vulnerability Storm and Slopsquatting]].

## Related

- [[Vibecoding - Things to Check on Your Code]]
- [[Vibecoding - Tooling SAST and Scanners for AI Code]]
- [[Vibecoding - Org and Vendor Risk SBOM]]
