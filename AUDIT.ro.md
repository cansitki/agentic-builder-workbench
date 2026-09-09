# Audit Workbench 3.0.0 — 9 septembrie 2026

## Corectat

- Nume **Workbench**, ID `workbench`, directoare, clase, comenzi ale pluginului,
  loguri, documentație și installer redenumite. Numele vechi rămâne numai unde
  explică proveniența sau detectează o instalare legacy pentru migrare.
- Username Coder implicit gol; fără workspace automat. Setările proprii existente
  sunt păstrate, iar conexiunile incomplete nu primesc contul autorului.
- Upload directory explicit per conexiune; fără director personal ori redirecționare
  la primul server. Un terminal nemapat sau șters nu primește o țintă alternativă.
- Explorerul rezolvă home-ul real al utilizatorului remote pentru căi relative.
- Pagina Secure Input a fost adăugată în Settings. Selectarea workspace-ului precede
  activarea; un ID absent/ambiguu oprește ruta. Nu se schimbă listenerul peste cereri pending.
- Formularul legacy pentru lipirea cheilor SSH a fost eliminat. SSH folosește
  configurație/fișier existent; intake-ul agentului rămâne modalul secenv.
- Pluginul folosește secenv 0.4.0 și canalul `workbench`; documentele descriu perechea corectă.
- Installerul refuză suprascrierea și coexistarea cu vechiul plugin. Migrarea și
  rollbackul sunt explicate, fără import automat de setări private.

## Verificări executate

| Probă | Rezultat |
|---|---|
| Inventar și SHA-256 pentru 17 fișiere sursă | Pass |
| Build reproductibil și sintaxă bundle/vendor | Pass |
| Defaults: identitate goală, fără workspace injectat, păstrare alegeri | Pass |
| Upload: ținte explicite, refuz la director lipsă, quoting pentru spații/apostrof | Pass |
| Secure Input: selecție explicită, refuz la ID lipsă și cerere pending, crypto | Pass |
| secenv: 13 teste Python/integration/cross-runtime | 13/13 |
| Installer offline, spații în cale, no-overwrite, legacy protection, tamper rejection | Pass |
| Bootstrap personal/vault/proiect | Pass |
| Opt skill-uri, linkuri Markdown și invarianta brainului | Pass |
| Regresii source-only: tmux, categorii, picker, terminal ascuns | Pass |
| Formulare native Obsidian: username gol, salvare username, selector, enable | Pass, pe fixture izolat |
| Scanare Gitleaks 8.30.1 | Fără findings după șase false positives exacte ale atribuirii FourKeyMap/TwoKeyMap |

Testul formularelor nu a pornit conexiuni și nu a modificat setările pluginului
live. Fixture-ul temporar a fost descărcat și șters. Poate fi reprodus opțional cu:

```bash
python3 scripts/test-obsidian-ui.py /absolute/path/to/active-vault
```

## Limite

Nu a fost migrat automat vaultul live al operatorului. Nu sunt verificate pe
calculatorul destinatarului încărcarea întregului plugin, conectarea la conturile
sale, uploadul remote real, captura macOS, Sync sau restore. Acestea rămân în
[PARITY.ro.md](PARITY.ro.md). Verificarea nativă a formularelor nu este o captură
vizuală sau un test complet al tuturor ferestrelor pluginului.

Ruff nu era disponibil în mediul local; sintaxa helperelor Python și testele
funcționale au fost verificate. Acesta este auditul descris mai sus, nu o garanție
că întregul cod terț este lipsit de vulnerabilități.

Vezi [ce face fiecare componentă](COMPONENTS.ro.md),
[proveniența sursei](integrations/workbench/SOURCE.md) și
[migrarea](integrations/workbench/MIGRATION.md).
