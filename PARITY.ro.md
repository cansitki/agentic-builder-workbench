# Recepția setup-ului

**Stare: artefacte pregătite; paritatea pe destinație nu este încă verificată.**
Această recepție aparține proiectului de transfer; nu înlocuiește TODO-ul general.

| Zonă | Proba de acceptare | Stare |
|---|---|---|
| Identitate | Destinatar, OS, vault, conexiune și workspace fixate | În așteptare |
| Git | Clone curat, SHA așteptat, acces repo | De verificat pe destinație |
| Repo | `bash scripts/verify-all.sh` | De rulat pe destinație |
| Plugin | Hashuri, build, activare în Obsidian | Artefacte identice cu sursa; UI destinație netestat |
| Brain | Placeholders completate, check-adopted-brain trece | Template inclus |
| Skill-uri | Opt skill-uri invocate; extensii alese | Nucleu inclus; extensii de configurat |
| Vault | Citire CLI index/TODO; daily path corect | Template inclus; CLI destinație de verificat |
| Daily | Scriere dummy, Links Inbox ultimul, timezone | Netestat pe destinație |
| Terminal | Folder corect, disconnect/reconnect, output | Netestat pe destinație |
| Work/system | Proiecte vizibile, sys-* ascunse | Netestat pe destinație |
| Fișiere | Upload/download dummy, hash identic | Netestat; atenție la defaultul Coder upload |
| Secure input | doctor, listener, modal dummy, cancel/expiry, 0600 | Runtime/teste incluse; UI destinație netestat |
| Proiect pilot | Bootstrap nou, editare, test și commit | Netestat pe destinație |
| Sync | Notă dummy sincronizată între dispozitive | Necesită cont și topologie proprii |
| Backup | Backup și restore izolat cu hash identic | Necesită storage propriu |
| Servicii | Health și restart după reboot | Definiții production identice neincluse |
| Toad | Nume exact și rol confirmat | Neclarificat |
| Volta | Nume exact și rol confirmat | Neclarificat |

## Diferențe explicite

- Codul pluginului este cel auditat, cu defaulturi descrise în
  [SOURCE.md](integrations/can-workbench/SOURCE.md).
- CLI-ul Obsidian din sursă include un bridge/wrapper suplimentar; nu este în
  bundle-ul pluginului. CLI funcțional pe destinație este un criteriu separat.
- Template-ul privat de infrastructură, theme sync, `tlist`, wrapper-ele,
  automatizările și proiectele comerciale nu sunt un export generic inclus.
- Extensiile agentului sunt inventariate în [SKILLS.ro.md](SKILLS.ro.md).
- Auditul local nu certifică un Mac, Windows sau server neaccesat.

Pentru fiecare probă înregistrează în proiectul privat al destinatarului: data,
OS, versiune, commit, comandă/acțiune, rezultat observat și blocaj. Transferul
este recepționat numai când probele necesare au dovezi; rândurile neaplicabile
primesc explicație, nu un succes automat.
