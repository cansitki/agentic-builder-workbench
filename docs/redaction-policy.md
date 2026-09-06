# Redaction and Sharing Policy

This repository was derived from operating principles, not exported from a live personal system.

## Allowed

- Generic workflows and templates.
- Empty project, task, research, and decision structures.
- Security principles, checklists, and public case-study references.
- Placeholder commands and configuration with conservative defaults.
- Architecture blueprints that contain no source implementation.

## Excluded

- Personal biography, relationships, preferences unrelated to software work, and daily history.
- Client names, commercial discussions, pricing, contracts, prospects, and outbound messages.
- Private project names, source code, findings, roadmaps, or postmortems.
- Hostnames, IP addresses, SSH routes, account IDs, filesystem paths, backup locations, and service inventory.
- Credential values or exact private credential destinations.
- Telegram/social-media bot implementation, routing, recipients, prompts, and logs.
- Crypto wallets, addresses, positions, targets, transaction history, or proprietary strategies.
- Chat transcripts, model usage records, and private research corpora.

## Review rule

Before publishing or inviting another collaborator:

1. Run `bash scripts/audit-publication.sh`.
2. Inspect every new file in `git diff --cached`.
3. Confirm the collaborator and visibility are exact.
4. Confirm the license matches the intended sharing boundary.
5. Treat a later visibility change from private to public as a new publication requiring a complete review.
