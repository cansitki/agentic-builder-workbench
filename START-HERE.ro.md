# Workbench — lista completă și ordinea de pornire

Acesta este pachetul de transfer al sistemului de lucru. Include pluginul Obsidian
cu sursa și bundle-ul folosit la audit, runtime-ul `secenv`, brainul, structura
vaultului, structura proiectelor, procedurile și probele de verificare.

Data inventarului: **9 septembrie 2026, Europe/Bucharest**.
Versiunea 3.0.0 este derivata portabilă Workbench: fără username sau workspace-uri
precompletate. Hashurile descriu această versiune, nu instalarea veche. Calculatorul
destinatarului nu a fost încă testat. Vezi [rolul fiecărei componente](COMPONENTS.ro.md).

## 1. Ce deschizi efectiv

| Ordine | Aplicație / suprafață | Unde și pentru ce |
|---|---|---|
| 1 | Obsidian Desktop | Pe calculatorul principal, deschizi vaultul propriu |
| 2 | Workbench, în Obsidian | Conexiuni, proiecte, fișiere, terminale și modal securizat |
| 3 | Terminalul proiectului din Workbench | Alegi conexiunea Local / Coder / SSH, apoi folderul proiectului |
| 4 | Codex în acel terminal | Agentul citește brainul, TODO-ul și instrucțiunile proiectului |
| 5 | Browser | Preview-ul aplicației, documentație și GitHub; dashboardul Coder pentru administrare |
| Opțional | Termius pe telefon | SSH și reatașare la sesiunea proiectului |
| Opțional | Editor / IDE | Editare manuală; nu este necesar un al doilea agent |

Pentru fluxul remote, Obsidian este interfața, Coder este workspace-ul Linux, iar
tmux păstrează terminalul între deconectări. Workbench nu înlocuiește Git, Codex,
backupul sau autentificările proprii. Pentru fluxul Local nu este necesar un VPS.

## 2. Aplicații, servicii și unelte

| Componentă | Rol | Obligatoriu / condiționat | Ce există în repo |
|---|---|---|---|
| Obsidian Desktop | Vault și interfață nativă | Obligatoriu pentru secure intake | Template vault și ghid |
| Workbench 3.0.0 | Terminal, fișiere, workspace, input | Obligatoriu | Sursă, bundle, hashuri, installer offline |
| Codex | Agentul de coding | Obligatoriu pentru varianta Codex | Config exemplu și instrucțiuni |
| Git | Versiuni și recuperare | Obligatoriu | Repo, checks și workflow |
| GitHub / gh | Remote și review | GitHub pentru acest repo; `gh` pentru administrare | Proceduri; cont propriu |
| Node.js + npm | Helper scripts, WebCrypto, proiecte JS | Obligatoriu pentru verificarea completă | Scripturi; runtime extern |
| Python 3.11+ + venv + pip | Build plugin și secenv | Obligatoriu | Pachet Python și teste |
| cryptography 50.0.1 | Criptarea secenv | Obligatoriu | Versiune fixată în pachet |
| Bash, ripgrep, utilitare Unix | Installere și audit | Obligatoriu pentru aceste scripturi | Scripturi; suport verificat pe Linux |
| SSH | Transport remote | Pentru SSH/Coder | Configurare cu datele destinatarului |
| Coder | Workspace Linux persistent | Pentru topologia remote | Ghid de separare work/runtime |
| tmux | Terminal persistent | Pentru sesiuni remote persistente | Convenții și probe |
| Docker / Compose | Containere și dependențe | Numai unde proiectul/hostul le cere | Ghid; nu o imagine identică a hostului |
| systemd / timers | Servicii durabile | Pe hostul Linux, dacă există servicii | Runbookuri și template |
| Obsidian Sync | Același vault pe dispozitive | Pentru topologia cu vault sincronizat | Configurare cu contul propriu |
| restic + stocare compatibilă S3/R2 | Backup criptat și restore | Pentru paritate de recuperare remote | Ghid și criterii; bucket propriu |
| Termius | Acces de pe telefon | Opțional | Procedură de utilizare |
| MCP / Apps / pluginuri Codex | Integrări cu servicii | Per proiect și permisiuni | Template de evaluare |
| Theme sync / wrappers / tlist | Confort și administrare | Extensii specifice mediului | Inventariate; nu sunt runtime generic inclus |
| OpenClaw / servicii de mesagerie | Runtimes suplimentare | Numai dacă se cer explicit | Nu sunt necesare pentru nucleul Workbench |

Nu există un cont, abonament, server, token sau storage transferat prin clonarea Git.
Uneltele externe se instalează din sursele lor oficiale. Urmează
[INSTALL.md](INSTALL.md) pentru comenzile repo-ului și
[inventarul de dependențe](docs/external-dependencies.md).

## 3. Pluginuri Obsidian

**Workbench** este pluginul livrat în acest pachet. Instalarea veche din mediul
sursă este distinctă și nu a fost migrată automat.
Nu trebuie instalate separat componentele integrate `vm-connect`, `countdown`,
`excalidraw-live-text`, `internetvin-terminal` și `gsd-control`.

În Settings → Community plugins activezi Workbench. Configurezi conexiunea
proprie, username-ul Coder explicit, directoarele absolute ale proiectelor și
workspace-ul pentru listenerul secure input. Vezi
[limitele versiunii incluse](integrations/workbench/SOURCE.md).

În core plugins configurezi **Daily notes** cu folderul `daily notes` și formatul
`YYYY-MM-DD`; păstrezi **Templates** dacă folosești template-uri prin UI. Search,
Backlinks și Graph sunt utile pentru navigare. Activezi **Sync** dacă folosești
serviciul Obsidian Sync. Nu importa `.obsidian/data.json` ori conexiunile altcuiva.

**Excalidraw** este separat și condiționat de desenare: modulul live-text din
Workbench nu este editorul Excalidraw. Prezența lui pe Mac nu a fost verificată în
acest audit. Nu presupunem că Dataview, Tasks, Templater, Git sau BRAT sunt necesare.

## 4. Skill-uri

Lista completă, proveniența, utilizarea și statutul de transfer sunt în
[SKILLS.ro.md](SKILLS.ro.md). Cele cinci skill-uri de bază sunt deja în
`.agents/skills/`: `workbench-onboarding`, `project-kickoff`,
`secure-credential-intake`, `secure-release`, `vault-reconcile`.

Design-taste-frontend, copywriting și write-articles sunt de asemenea incluse: opt
skill-uri în total. Cele pentru imagini, documentație, research și managementul
pluginurilor sunt extensii furnizate de aplicația agentului. Nu sunt pluginuri Obsidian.
Biblioteca Vibecoding Security este material de referință, nu un skill executabil.

## 5. Structura proiectelor și a vaultului

```text
operator device
  Obsidian + Workbench + browser
  own vault / own connection settings

work workspace
  AGENTS.md                  brain personal aplicabil
  memory/MEMORY.md            rutare către context
  memory/user_profile.md     preferințe proprii
  vault/
    Vault Index.md
    To Do List.md            singurul TODO general
    daily notes/
    projects/                huburi și legături către repo-uri
    research/                note atomice și indexuri
  projects/
    project-a/               repo Git separat
      AGENTS.md
      PROJECT.md
      PLANS.md
      HANDOFF.md
      src/                   adaptat stackului ales
      tests/
    project-b/
  tmux project-a / project-b

system runtime workspace
  watchers / collectors / probes / smoke servers
  sys-* sessions, system scope

host
  durable services + timers + backups + health + logs
```

Folderele de cod `src/tests` se aleg per stack; bootstrapul copiază documentele de
proiect, nu generează automat o aplicație. Repo-urile comerciale și bazele de date
proprii nu fac parte din acest starter. Pentru structuri concrete vezi
[blueprint web](docs/blueprints/web-app.md),
[Telegram](docs/blueprints/telegram-bot.md) și
[crypto](docs/blueprints/crypto-project.md).

## 6. Ce fusese stabilit în transferul anterior

Pe 7 septembrie a fost pregătit sistemul generic: brain, memorie, TODO, vault,
daily/weekly, proiecte, research, verificare, workspaces, backup/cutover și blueprints.
Revizia ulterioară a adăugat mecanismul real `secenv`, installerul pluginului,
metadata obligatorie per credential și teste de criptare/instalare.

Această completare pune efectiv sursa pluginului în același repo, permite
instalarea pluginului fără download de release și adaugă inventarul operatorului
și o recepție de paritate. Versiunea 3.0.0 redenumește pluginul și corectează defaulturile personale.
Acesta este un rezumat al deciziilor de transfer;
conversațiile și daily notes private nu sunt distribuite colaboratorilor.

## 7. Toad și Volta

Numele sunt păstrate exact cum au fost cerute. În workspace-ul auditat nu există
comenzi `toad` sau `volta`, iar notele relevante din 7–8 septembrie nu le identifică
drept componente ale Workbench. Nu le înlocuim arbitrar cu aplicații cu același nume.
Este necesar numele exact/linkul sau clarificarea dacă se intenționa TODO/vault.
Până atunci rămân poziții deschise în recepția de paritate.

## 8. Cum închidem transferul

Rulezi [instalarea](INSTALL.md), apoi fiecare probă din
[PARITY.ro.md](PARITY.ro.md) pe calculatorul și workspace-ul destinatarului.
Verificarea repo-ului și hashurile confirmă artefactele. Numai probele pe destinație
confirmă că setup-ul funcționează în aceeași formă operațională.
