# Workbench — ce face fiecare componentă

**Workbench este pluginul Obsidian. Agentic Builder Workbench este repo-ul cu
pluginul, skill-urile, secenv și sistemul de lucru.**

## În plugin

| Componentă | Rol | Configurare |
|---|---|---|
| Remote Connections | Alege mașina terminalului: Local, SSH sau Coder | Conexiuni proprii, identificator unic, username Coder unde este cazul |
| Workspaces (core Obsidian) | Salvează și restaurează aranjarea panourilor din Obsidian | Se activează în Core plugins |
| Workspace (Workbench) | Grupează proiectele, sesiunile, statusul și fișierele | Proiecte, directoare și categorii; cele manuale au prioritate |
| Terminal | Shell și Codex în Obsidian, cu taburi, copy și integrare tmux | Shell, tmux și conexiunea proiectului |
| Upload / enhancements | Trimite imagini și fișiere în workspace-ul terminalului | Upload directory absolut per conexiune; fără țintă ghicită |
| Countdown Bar | Afișează timpul rămas până la datele alese | Titlu și dată; nu programează execuția taskurilor |
| Excalidraw Live Text | Actualizează text din desen prin `@from(Nota)` sau `@from(Nota#Secțiune)` | Excalidraw separat și notă sursă; nu este editorul de desen |
| Codex Alerts | Notificări macOS când Codex termină un răspuns; evenimentele sunt deduplicate | Helper notify în workspace și receptor configurat |
| Secure Input | Primește cereri secenv, arată originea/destinația și criptează valorile în modal | Workspace explicit, listener activ; implicit dezactivat |
| Credits | Proveniența componentelor și licențele | Fără configurare |

Uploadul este o funcție a Remote Connections, nu o aplicație separată. Captura
manuală folosește unelte macOS; paste/drop se verifică pe platforma aleasă.
Sesiunile `sys-*` sau cu `@workbench_scope=system` sunt ascunse din inventarul normal.

## Câmpurile importante

| Câmp | Ce înseamnă |
|---|---|
| Display name | Eticheta afișată în interfață |
| Coder username | Username-ul real din Coder; implicit gol |
| Coder workspace ID | Slugul workspace-ului folosit pentru aliasul SSH |
| SSH host | Ținta SSH proprie; nu cere username Coder |
| PEM key path | Calea unei chei existente pe calculatorul cu Obsidian, nu conținutul cheii |
| Project path | Directorul proiectului; preferabil absolut |
| Upload directory | Directorul absolut de pe mașina remote care primește fișierele |
| Credential workspace | Identificatorul unic pentru secenv; fără fallback după etichete similare |
| Enable credential listener | Pornește recepția cererilor după configurare |

## Aplicațiile din jur

| Aplicație / serviciu | Rol |
|---|---|
| Obsidian Desktop | Interfața, notele și pluginurile |
| Codex | Agentul care citește contextul, execută și verifică |
| Git / GitHub | Versiuni, istoric, review și distribuție |
| Coder | Workspace Linux persistent; opțional pentru utilizare locală |
| SSH | Transport către mașina remote |
| tmux | Păstrează procesele după deconectare |
| Node.js | Helper-ele JavaScript, verificatoarele și proiectele JS |
| Python | Buildul pluginului și runtime-ul secenv |
| secenv | Validează cererea, transportă ciphertext și instalează rezultate owner-only |
| Browser | Preview, documentație, GitHub și administrare Coder |
| Termius | SSH de pe telefon |
| Obsidian Sync | Sincronizare vault; nu înlocuiește restore-testul |
| restic + storage | Backup criptat și recuperare |
| systemd / timers | Procese durabile, independente de sesiunile terminalului |
| Docker | Izolează dependențe/servicii când proiectul o cere |

## Documente și skill-uri

AGENTS.md fixează regulile; MEMORY.md rutează contextul; user_profile.md păstrează
preferințele. TODO ține angajamentele, PROJECT.md descrie rezultatul, PLANS.md
ține pașii, iar HANDOFF.md permite reluarea. Daily notes țin cronologia; Vault Index
și legăturile fac contextul ușor de găsit.

Cele nouă skill-uri și utilizarea lor sunt în [SKILLS.ro.md](SKILLS.ro.md): onboarding,
bootstrap complet, project kickoff, secure intake, secure release, vault reconcile, copywriting,
frontend design și articole. Sunt instrucțiuni pentru agent, nu pluginuri Obsidian.

Urmează [INSTALL.md](INSTALL.md), [migrarea](integrations/workbench/MIGRATION.md)
și [PARITY.ro.md](PARITY.ro.md). Testele repo-ului verifică artefactele și comportamente
simulate; nu certifică un calculator sau cont remote neaccesat.

## Instalare ghidată completă

[GET-STARTED.ro.md](GET-STARTED.ro.md) conține mesajul pe care începătorul îl dă
lui Codex. [AGENT-SETUP.md](AGENT-SETUP.md) este runbookul agentului, iar `infra/`
conține instalarea și configurația Coder/Tunnel/workspaces. Adaptorul Sync citește
secrete numai din fișierele create de modal; serviciul durabil sincronizează
volumul `/vault`. `workbench-vault` oferă operațiile de note în workspace-ul fără GUI.
