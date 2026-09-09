# De la un PC la propriul Workbench

**Îi dai repo-ul lui Codex și îl lași să execute instalarea ghidată.** Nu trebuie
să știi Docker, Terraform sau DNS. Codex explică fiecare pas, cere informațiile
necesare și verifică rezultatul înainte să continue.

## Ce faci tu

1. Ai Codex funcțional în terminal și acces la acest repo privat. Dacă nu ai încă
   Codex, urmează [instalarea oficială](https://learn.chatgpt.com/docs/codex/cli).
   Autentifică-te direct în fluxul oficial al aplicației.
2. Pornești `codex` și îi dai mesajul de mai jos.
3. Răspunzi la întrebările despre PC, server, domeniu și conturi. Confirmi planul
   concret și costurile înainte de crearea resurselor externe.
4. Te autentifici tu în paginile oficiale. Când agentul are nevoie de un secret,
   îl introduci numai în modalul nativ Workbench, după ce vezi scopul și permisiunile.

```text
Vreau să-mi construiești întregul mediu de lucru folosind:
https://github.com/cansitki/agentic-builder-workbench

Citește AGENT-SETUP.md și folosește skill-ul workbench-bootstrap.
Sunt începător: detectează sistemul, explică-mi simplu ce urmează și execută
pregătirea locală. Vreau Obsidian cu Workbench și Workspace, propriul server
Coder cu ops-main și system, acces HTTPS prin Cloudflare Tunnel, autentificări,
vault, skill-uri și verificări de funcționare.

Cere-mi numai informațiile necesare, în pași mici. Pregătește planul concret
înainte de cheltuieli și modificări externe. Nu cere niciodată parole sau tokenuri
în conversație ori terminal. Continuă până la recepția funcțională și spune exact
ce lipsește dacă o etapă nu poate fi verificată.
```

## Ce trebuie să existe și cine îl pregătește

| Componentă | Cine se ocupă |
|---|---|
| Cont și acces Codex | Tu te autentifici; agentul verifică instalarea |
| Acces GitHub la repo-ul privat | Tu accepți accesul și autentificarea; agentul clonează |
| Obsidian Desktop | Agentul instalează/configurează pe sistemul compatibil |
| Workbench, inclusiv modulul Workspace | Inclus în repo; agentul instalează pluginul |
| Workspaces, pluginul de bază Obsidian | Salvează aranjarea panourilor; agentul îl activează în Obsidian |
| Node, Python, Git, SSH și uneltele auxiliare | Agentul verifică și instalează ce lipsește |
| VPS Ubuntu 24.04 dedicat | Alegi providerul/bugetul și îl autorizezi; agentul configurează serverul accesibil |
| Domeniu administrat în Cloudflare | Alegi domeniul și contul; agentul configurează Tunnel/DNS după aprobare |
| Cont administrator Coder | Alegi username/email; parola intră prin modal, contul este creat privat |
| ops-main și system | Agentul le creează și verifică terminalele și persistența |
| Vault sincronizat cu PC-ul | Cont Obsidian Sync propriu; agentul configurează adaptorul securizat și verifică ambele direcții |
| Backup | Alegi destinația/costul; agentul configurează și verifică restaurarea |

Pe Windows, ruta acestui pachet este Ubuntu WSL2 + WSLg, inclusiv Obsidian Linux.
Agentul te ghidează dacă sunt necesare instalarea WSL sau un restart. Nu presupunem
că terminalul POSIX al pluginului funcționează în Obsidian Windows nativ.

## Ce obții

Deschizi **Obsidian → Workbench → proiect → terminal → Codex**. Coder rulează pe
serverul tău și este accesibil la hostname-ul ales, prin Cloudflare Tunnel.
`ops-main` este pentru lucru, `system` pentru configurarea proceselor de fundal,
iar serviciile durabile rulează separat pe host. Username-ul Coder este al tău;
nu există conturi sau conexiuni personale precompletate.

[Rolul fiecărei componente](COMPONENTS.ro.md) · [pașii executați de agent](AGENT-SETUP.md)
· [probele de recepție](PARITY.ro.md).

Crearea conturilor, autorizarea cheltuielilor, aprobările sistemului de operare și
introducerea secretelor rămân la tine. „Ghidat de Codex” nu înseamnă acces automat
la conturi sau o instalare declarată reușită fără teste reale.
