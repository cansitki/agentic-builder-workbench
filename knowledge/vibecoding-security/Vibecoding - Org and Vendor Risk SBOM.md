---
tags: [security, vibecoding, org, vendor-risk, sbom, compliance]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Org and Vendor Risk — Access Reviews, Offboarding, SBOM, Sub-processors

The boring side of security that wins audits and prevents the most expensive incidents. None of this is technical; all of it gets skipped in vibecoded teams.

## People

### Onboarding
- Documented checklist: which systems, what role, MFA enrollment, security training, signed AUP.
- Minimum-privilege from day 1. Promotions are explicit, not "they probably need this."
- Record of who provisioned what, when.

### Access reviews
- Quarterly: every prod system reviewed by an owner. Names without justification get removed.
- Auto-flag accounts that haven't logged in in 90 days.
- Auto-flag privilege escalations not tied to a documented role change.

### Offboarding
- Documented checklist, run within 24h of separation:
  - Cloud consoles (AWS, GCP, Azure, Cloudflare, Vercel)
  - Source control (GitHub, GitLab)
  - Comms (Slack, email, calendar)
  - Identity provider (Okta, Google Workspace, etc.)
  - Customer-facing tools (Stripe, Linear, Notion, Sentry, vendor portals)
  - VPN / Tailscale / bastion
  - SSH keys removed from servers
  - Laptop wipe / return
  - Personal SaaS accounts where they had owner role transferred
- Automated where possible (SCIM provisioning).

## Vendors / sub-processors

- Inventory of every SaaS / API / library / hosted service that processes data on your behalf.
- For each: DPA signed, SOC 2 / ISO 27001 reviewed, incident history checked, exit plan documented.
- Tier vendors by risk (handles PII / payments / auth = high; renders blog posts = low).
- Annual review of high-risk vendors. Sunset unused.
- Public sub-processor list (privacy requirement — see [[Vibecoding - Privacy and GDPR Reference]]).
- Notification mechanism if you add / change sub-processors (email, RSS, or page change diff).

## SBOM (Software Bill of Materials)

- Generated on every build (CycloneDX or SPDX). Stored with the artifact.
- Includes: direct deps, transitive deps, OS packages in containers, license metadata.
- Continuously scanned against CVE feeds (post-deploy too, not just at build time — new CVEs land daily).
- License compliance check: GPL contamination, attribution requirements, banned licenses.
- Customer-facing SBOM available on request (increasing buyer requirement).

## Supply chain integrity

- Lockfile committed; CI uses `--frozen-lockfile`.
- Every new dep PR has a human reviewer who reads the package name + maintainer.
- Slopsquatting check: 19.7% of AI-suggested package names don't exist on the registry; review every fresh import.
- Private registry mirror with deny-list of known malicious packages.
- Reproducible builds where possible (same input → same output).
- Sigstore / cosign signatures on internal artifacts; verified at deploy.

## Security training

- Annual baseline: phishing, password hygiene, social engineering, data handling.
- Role-specific: engineers get OWASP Top 10 + secure coding; support gets account-takeover red flags; finance gets BEC / wire-fraud.
- Phishing simulations quarterly. Track click rate; remediate trends, not individuals.

## Compliance frameworks (when you sell to enterprise)

- SOC 2 Type 2: 6-12 month observation window; pick a partner early.
- ISO 27001: more international, more process-heavy, less customer-facing.
- HIPAA: healthcare. Specific BAAs with sub-processors.
- PCI-DSS: payments. Stay SAQ-A (see [[Vibecoding - Payment and PCI Scope]]).
- FedRAMP: US government. Heavy lift — only pursue if revenue justifies.
- Don't pursue compliance for its own sake. It's a sales unblocker, not a security strategy.

## Insurance

- Cyber insurance for breach response, ransomware, regulatory fines.
- E&O / professional liability for SaaS contracts.
- Read the exclusions — many policies don't cover BEC, social engineering, or "acts of God."

## Related

- [[Vibecoding - CI CD and Container Security]]
- [[Vibecoding - Privacy and GDPR Reference]]
- [[Vibecoding - Things to Check on Your Code]]
