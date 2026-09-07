# Transfer Completeness Matrix

The goal is structural and operational fidelity without copying private facts. Each generalizable part of the source operating system has an explanation, a template, executable support, or an explicit external dependency.

| Source-system concern | Transfer artifact | Form | Status |
|---|---|---|---|
| Memory-first startup | `docs/brain-and-memory.md`, personal `MEMORY.md` | Guide + template | Included |
| User collaboration profile | `templates/personal/user_profile.md` | Template | Included |
| Canonical brain | full `templates/personal/AGENTS.md` | Complete template | Included |
| Customized brain validation | `scripts/check-adopted-brain.mjs` | Executable, placeholder/invariant/size checks | Included |
| Personal Codex configuration | `templates/personal/codex.config.example.toml` | Conservative template | Included |
| Concise brain option | `templates/personal/AGENTS.minimal.md` | Template | Included |
| Instruction synchronization | full brain + brain/memory guide | Rule | Included |
| One canonical TODO | task guide + vault TODO | Guide + template | Included |
| WIP/main quest/Next limits | task guide + full brain | Rule | Included |
| Project backlogs and hubs | project/vault templates | Templates | Included |
| Operator surface | system map + environment guide | Guide | Included |
| External toolchain and trust boundary | `docs/external-dependencies.md` | Guide | Included |
| Can Workbench terminals/files/sessions/diagrams | `docs/can-workbench.md` + pinned installer | Guide + verified external release | Included |
| Work vs system workspace | workspace/session guide | Guide + inventory | Included |
| Durable service boundary | workspace/runbook templates | Guide + template | Included |
| Backup and restore drill | backup/cutover guide + runbook | Guide + template | Included |
| State transfer and cutover | backup/cutover guide | Guide | Included |
| Secure credential policy | root/full/project AGENTS | Hard gate | Included |
| Secure credential runtime | `tools/secenv/` | Executable Python package | Included |
| Native encrypted modal | pinned Can Workbench v2.2.0 installer | Verified external release | Included |
| No browser/chat/terminal fallback | secenv CLI + tests + AGENTS + skill | Enforced design | Included |
| Informed least-privilege request | secenv validation + schema + skill | Code + procedure | Included |
| tmux naming/scope/cleanup | workspaces guide + full brain | Rule | Included |
| Obsidian vault operations | vault guide + full brain | Guide | Included |
| Obsidian CLI wipe prevention | full brain | Exact safety rules | Included |
| Search-before-write | vault workflow + full brain | Rule | Included |
| Wikilinks and Vault Index | vault templates + workflow | Template + rule | Included |
| Local timezone logging | personal brain + daily templates | Rule + template | Included |
| Significant interaction logging | daily/weekly guide | Rule | Included |
| Receipt-before-delivery logging | external actions + full brain | Rule | Included |
| Daily note and final Links Inbox | vault/daily templates + full brain | Template + rule | Included |
| Daily close | daily/weekly guide + full brain | Procedure | Included |
| Weekly review | weekly template + guide | Template + procedure | Included |
| Research routing and evidence | research workflow + full brain | Guide | Included |
| Bounded parallel agents | tool routing + full brain | Rule | Included |
| Communication preferences | user profile + full brain | Template | Included |
| Exact external-action approval | external actions + full brain | Rule + manifest pattern | Included |
| General secret hygiene | security model + security library | Guide | Included |
| Session handoff | project handoff + workspace guide | Template + rule | Included |
| Request-mode authorization | `docs/request-modes.md` | Guide | Included |
| Build/fix execution | operating loop + full brain | Guide + rule | Included |
| Git/dirty worktree safety | Git/file guide | Guide | Included |
| Testing and review | test/review guide + secure release skill | Guide + skill | Included |
| Incident handling | incident guide/template | Guide + template | Included |
| Excalidraw geometry/visual QA | visual notes guide + full brain | Rule | Included |
| Skills | `.agents/skills/` | Five validated skills | Included |
| Hooks/CI/automations | automation guide/template + CI | Guide + executable check | Included |
| MCP/connectors | connector review template | Template | Included |
| Web architecture | web blueprint | Guide | Included |
| Telegram architecture | Telegram blueprint | Guide | Included; no source bot code |
| Crypto architecture | crypto blueprint | Guide | Included; no wallets/strategies |
| Vibe-coding security corpus | `knowledge/vibecoding-security/` | Sanitized knowledge set | Included |
| Methodology/context architecture | `knowledge/methodology/` | Atomic notes | Included |
| Capability discovery | `CAPABILITIES.md` | Interactive catalog | Included |
| Common security/adoption questions | `FAQ.md` | Reference | Included |
| End-to-end “how the system works” explanation | `TOUR.md` | Narrative walkthrough | Included |
| Guided personalization | onboarding skill + `ONBOARDING.md` | Interactive workflow | Included |
| Ordered full installation | `INSTALL.md` + fail-closed installers | Guide + scripts | Included |
| Installer regression/provenance checks | `scripts/test-installers.sh` + CI | Executable | Included |
| Safe template copy | `scripts/bootstrap.mjs` | Executable, no overwrite | Included |
| Bootstrap regression for all modes | `scripts/test-bootstrap.sh` + CI | Executable | Included |
| Publication/privacy audit | audit + link checker + CI | Executable | Included |

## Deliberately not transferred

- Real names/profile details beyond repository authorship.
- Daily history and conversation transcripts.
- Client, company, project, lead, pricing, contract, and outbound history.
- Hostnames, IP addresses, SSH routes, account IDs, credential paths, backup targets, and live service inventory.
- Credential values, encrypted submissions, private keys, recovery material, or local settings.
- Social-media bot implementations, recipients, prompts, schedules, and logs.
- Wallets, addresses, positions, transactions, monitoring targets, and trading/market strategies.
- Active production authorization or standing delegation.

Those exclusions preserve the method while preventing the transfer from becoming a copy of another person's operational identity or access.
