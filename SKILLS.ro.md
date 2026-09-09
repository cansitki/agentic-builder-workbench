# Skill-uri: inventar și instalare

Inventar verificat în runtime-ul sursă la 9 septembrie 2026. Un fișier instalat pe
disc nu garantează că agentul activ îl expune; verifică lista agentului.

## Nucleul inclus și validat

| Skill | Utilizare |
|---|---|
| workbench-onboarding | Turul sistemului și configurarea propriului setup |
| project-kickoff | Din idee în brief, plan și prima felie verificabilă |
| secure-credential-intake | Orice credential furnizat agentului; numai modal nativ |
| secure-release | Audit înainte de release și verificarea dovezilor |
| vault-reconcile | TODO, daily, proiecte, indexuri și legături coerente |

Toate se află în `.agents/skills/`, fiecare cu `SKILL.md` și metadata agentului.
Pornește agentul în repo și cere `$workbench-onboarding`. Pentru un proiect
separat, copiază skill-urile selectate în `.agents/skills/` al acelui proiect,
fără suprascriere. Clonarea starterului într-un folder vecin nu face automat
skill-urile sale disponibile tuturor proiectelor vecine.

Codex folosește `SKILL.md` cu nume și descriere și încarcă instrucțiunile la
utilizare. Confirmă descoperirea în runtime-ul instalat folosind
[documentația oficială](https://learn.chatgpt.com/docs/build-skills), consultată
9 septembrie 2026.

## Extensii expuse în sesiunea sursă

| Skill | Funcție | Furnizare / statut |
|---|---|---|
| imagegen | Generare/editare raster | Sistem; necesită unealtă de imagini |
| openai-docs | Documentație și setup OpenAI/Codex | Sistem |
| skill-creator | Creare/revizie skill-uri | Sistem |
| skill-installer | Instalare din catalog/repo | Sistem |
| plugin-creator | Structura pluginurilor Codex | Sistem; distinct de pluginul Obsidian |
| copywriting | Copy de conversie pentru web | Custom; inclus, referințe generalizate |
| design-taste-frontend | Landing, portfolio, redesign frontend | Custom inclus, folder instalat `design-taste-frontend` |
| write-articles | Research, brief, draft și QA editorial | Custom inclus; referința privată de brand exclusă |
| deep-research-work:deep-research | Research amplu cerut explicit | Plugin al runtime-ului |
| plugin-management:plugin-management | Descoperire și management integrări | Plugin al runtime-ului |

Cele trei skill-uri custom sunt acum incluse în `.agents/skills/`, împreună cu
referințele generale și verificatorul editorial. Au fost eliminate rutarea și
referința privată de brand din write-articles; designul păstrează instrucțiunile
sursei. Celelalte șapte extensii de sistem/plugin se obțin din aplicația destinatarului. Nu copia
întregul director de configurare al altui utilizator. Biblioteca Vibecoding
Security este referință inclusă, nu un skill executabil.

## Referințe istorice

- `research`, `academic-deep-research`, `scrapling` apar în brainul istoric,
  dar nu sunt expuse în catalogul activ al sesiunii auditate.
- `review-agent` există pe discul sursă, dar nu este în catalogul activ.
- Uneltele, permisiunile, modelele și abonamentele nu se transferă prin Git.

## Recepție

Agentul trebuie să vadă și să poată invoca cele opt skill-uri incluse.
`node scripts/check-skills.mjs` trebuie să treacă. Extensiile alese trebuie să
apară în catalogul activ, cu toate referințele și uneltele lor disponibile.
Vezi [START-HERE.ro.md](START-HERE.ro.md) și [PARITY.ro.md](PARITY.ro.md).
