# Start rapid

Repo-ul este un schelet de lucru cu agenți, nu o copie a vieții sau proiectelor altcuiva.

## În 30 de minute

1. Completează [întrebările de configurare](docs/customize-first.md).
2. Copiază `templates/personal/AGENTS.md` în directorul care trebuie să-ți guverneze munca și înlocuiește toate valorile `[DIN PARANTEZE]`.
3. Pentru fiecare proiect, copiază `templates/project/` în rădăcina repo-ului și completează `PROJECT.md`, `PLANS.md` și `AGENTS.md`.
4. Copiază `templates/vault/` în Obsidian. Păstrează un singur `To Do List.md` general.
5. Pornește orice task cu: obiectiv, context, constrângeri și definiția exactă a rezultatului final.
6. Cere agentului să verifice schimbarea și să arate dovada, nu doar să spună că a terminat.
7. Înainte de release, treci prin `Vibecoding - Audit Checklist.md` și rulează `bash scripts/audit-publication.sh`.

Poți copia fail-closed un template, fără suprascriere:

```bash
node scripts/bootstrap.mjs project /cale/către/proiect --dry-run
node scripts/bootstrap.mjs project /cale/către/proiect
```

## Cum lucrezi zilnic

- Dimineața: citești TODO-ul canonic și alegi un singur rezultat principal.
- În proiect: agentul citește `AGENTS.md`, `PROJECT.md` și planul activ.
- În execuție: lucrezi în felii mici, fiecare cu test observabil.
- La final: reconciliezi TODO-ul, scrii rezultatul în daily note și promovezi doar deciziile durabile în note separate.
- Când agentul repetă aceeași greșeală: corectezi regula cea mai apropiată de proiect sau creezi un skill îngust.

## Regula de securitate

Nu pune parole, tokenuri, seed phrases, chei private sau linkuri de recovery în chat, prompturi, repo, loguri ori note. Folosește un password manager sau un flux local de secret intake, păstrează fișierele owner-only și verifică doar existența/scopul credentialului, niciodată valoarea.

Pentru boți Telegram și proiecte crypto găsești numai arhitectură generală în `docs/blueprints/`; nu există cod, conturi sau logică operațională importată din alte sisteme.
