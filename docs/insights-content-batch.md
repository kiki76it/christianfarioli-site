# Insights: 12 evergreen nella release candidata di 67 articoli

L'utente ha autorizzato la pubblicazione di **tutti i 67 nuovi articoli: questi 12 evergreen e i 55 AI Pulse**. I sorgenti sono configurati per la pubblicazione; **il rilascio e la disponibilità live restano da confermare con le verifiche del processo principale**.

I dodici evergreen mantengono i testi, gli URL, le categorie e le CTA preparati durante la fase di bozza. La transizione modifica soltanto `status: published`, `draft: false` e il timestamp reale comune di preparazione della release: **7 ottobre 2026, 22:50:43.598 a Dubai** (`2026-10-07T18:50:43.598Z`). Nessuna data di aggiornamento o revisione è stata inventata.

## Verifiche della release candidata

| Controllo | Esito |
| --- | --- |
| Sorgenti dei 67 articoli | Testi invariati; solo metadati di pubblicazione e, per AI Pulse, data di provenienza |
| Controllo Astro e test unitari | Superati dal processo principale; 18 test unitari |
| Build ordinaria | Completata con esito positivo: 478 pagine, 7 ottobre 2026 alle 22:56 a Dubai |
| `node scripts/check-insights-content.mjs --published` | 12/12 superati: pagine pubbliche, indice e categorie, canonical, date, BlogPosting, CTA, WhatsApp, collegamenti, tabelle, sitemap e RSS |
| `node scripts/check-ai-pulse-archive.mjs --published` | 55/55 superati; 5 pagine archivio, ordine e date coerenti |
| Test dell'output AI Pulse | 8 superati, 1 fixture isolato saltato intenzionalmente |
| Conferma sul dominio live | Non ancora dichiarata; serve verifica successiva al rilascio |

I controlli precedenti sulle bozze sono conservati più avanti e riguardano esclusivamente quella fase. Le verifiche correnti usano la modalità esplicita di pubblicazione e richiedono la presenza degli articoli nelle pagine pubbliche, nella sitemap e nei feed.

## Registro dei dodici evergreen

Lo stato “Candidata autorizzata” indica la preparazione della release verificata localmente; non attesta da solo la disponibilità sul dominio.

| Codice | Titolo | Categoria / URL relativa | Query principale | Obiettivo e contributo | CTA | Stato |
|---|---|---|---|---|---|---|
| A1 | AI Training for Marketing Teams in Dubai: What Should It Actually Cover? | ai-marketing/ai-training-marketing-teams-dubai/ | AI training for marketing teams Dubai | Scegliere un programma; giornata esemplificativa con competenze osservabili | Marketing training | Candidata autorizzata |
| A2 | How to Build an AI Marketing Strategy Without Adding More Tools | ai-marketing/ai-marketing-strategy-without-more-tools/ | how to build an AI marketing strategy | Selezionare un progetto; scheda decisionale | Marketing strategy | Candidata autorizzata |
| A3 | AI Marketing Agency vs Traditional Digital Agency: What Should Companies Look For? | ai-marketing/ai-marketing-agency-vs-traditional-digital-agency/ | AI marketing agency vs traditional digital agency | Valutare pratiche e fornitori; matrice di selezione | Marketing strategy | Candidata autorizzata |
| A4 | How Should CMOs Prepare Their Marketing Teams for AI? | ai-marketing/prepare-marketing-teams-for-ai/ | how to prepare marketing teams for AI | Guidare il team; piano di 30 giorni | Marketing training | Candidata autorizzata |
| B1 | Digital Employees vs Human Employees: What Should Companies Actually Automate? | future-of-work/digital-employees-vs-human-employees/ | digital employees vs human employees | Delegare attività entro limiti; matrice proposta | Digital employees | Candidata autorizzata |
| B2 | How Will AI Change Middle Management? | future-of-work/ai-middle-management/ | how AI will change middle management | Ridefinire responsabilità; routine settimanali | Future of work | Candidata autorizzata |
| B3 | AI Leadership Offsite: What Should Executives Discuss in 2027? | future-of-work/ai-leadership-offsite/ | AI leadership offsite Dubai | Preparare decisioni; agenda esemplificativa di 90 minuti | Leadership offsite | Candidata autorizzata |
| B4 | Which Jobs Will AI Change First - and What Should Companies Do About It? | future-of-work/which-jobs-will-ai-change-first/ | which jobs will AI change first | Pianificare competenze; scheda di analisi del ruolo | Future of work | Candidata autorizzata |
| C1 | Human-in-the-Loop AI: What Does It Actually Mean for Business? | human-centered-ai/human-in-the-loop-ai-business/ | human in the loop AI business | Organizzare supervisione; workflow con controlli espliciti | Human-centred adoption | Candidata autorizzata |
| C2 | AI Should Augment People, Not Just Reduce Headcount | human-centered-ai/ai-augment-people-not-reduce-headcount/ | AI augmentation in the workplace | Valutare benefici effettivi; scheda bilanciata | Future of work | Candidata autorizzata |
| C3 | Where Should Humans Stay in Control When Companies Deploy AI? | human-centered-ai/human-control-ai-deployment/ | human oversight in AI deployment | Assegnare diritti decisionali; matrice di controllo | Human-centred adoption | Candidata autorizzata |
| C4 | How to Introduce AI Without Losing Employee Trust | human-centered-ai/introduce-ai-without-losing-employee-trust/ | how to introduce AI without losing employee trust | Gestire adozione e ascolto; piano di comunicazione | Human-centred adoption | Candidata autorizzata |

## Provenienza, immagini e ambito

Le attribuzioni e le limitazioni delle fonti sono documentate nei registri `research-<codice>.md`. Gli esempi e gli strumenti manageriali proposti restano distinti dai risultati osservati nelle fonti. L'audit indipendente delle affermazioni è stato a campione; la verifica dei collegamenti e i registri per articolo conservano le evidenze disponibili.

Sono state riutilizzate copertine e ritratto già presenti, con descrizioni alternative specifiche. Non sono state generate nuove immagini o inventate attribuzioni a clienti ed eventi.

Le quattro guide già pubblicate mantengono i propri URL:

- `/insights/executive-education/corporate-ai-training-cost-dubai/`
- `/insights/ai-strategy/why-ai-strategy-beats-ai-tools/`
- `/insights/ai-leadership/the-ceo-guide-to-ai-governance/`
- `/insights/ai-strategy/how-to-choose-an-ai-keynote-speaker-in-dubai/`

La release degli articoli non invia messaggi WhatsApp, prenotazioni, newsletter o post social. L'integrazione dell'automazione quotidiana AI Pulse è separata da questa pubblicazione.

## Verifiche storiche della fase di bozza

I risultati seguenti sono conservati dal rapporto originario del 7 ottobre 2026. Descrivono la revisione delle dodici bozze e la relativa anteprima isolata: **le indicazioni di esclusione da route pubbliche, sitemap e RSS riguardano quella fase e non lo stato attuale della release candidata**.

Eseguite il 7 ottobre 2026:

| Controllo | Esito ed evidenza |
|---|---|
| `npm run check` | PASS: 59 file, 0 errori, 0 warning, 13 suggerimenti dei template esistenti. Nessuno script lint separato configurato. |
| `npm run build` | PASS: validazione contenuti, Astro e post-build, 352 pagine generate localmente. Nessun deploy. |
| Regressioni CTA, AI Pulse, routing/output e SEO | 37 test: 36 PASS, 1 skip intenzionale del fixture AI Pulse, 0 failure. |
| `node scripts/check-insights-content.mjs` | PASS per tutti i 12 articoli nell'output ordinario: bozze assenti dalle route pubbliche, sitemap e RSS. |
| `node scripts/check-insights-content.mjs <review-dist>` | PASS su tutte le route di revisione: singolo H1, canonical e social, autore, BlogPosting/BreadcrumbList unici, nessuna data fittizia, CTA e messaggi WhatsApp esatti, link interni, tabelle accessibili, nessun paragrafo sostanzialmente duplicato. |
| Audit HTTP indipendente | 42/42 PASS: articoli, categorie, indice, noindex, tracker assenti, admin/bozze estranee/route inesistenti 404, scritture 405, host estranei 403, sitemap/feed senza bozze. `insights-preview-http-qa.json`. |
| Fonti e collegamenti | 22 URL di fonti verificati: 16 HTTP 200 diretti, 6 accessibili tramite browser di ricerca dopo 403. Tutti i 22 link interni e 22 riferimenti related risolvono; quattro guide esistenti e Calendly 200. `insights-links-audit.json`. |
| Browser articoli | 48 combinazioni: tutti i 12 articoli a 1440, 768, 390 e 320 px. Nessun overflow della pagina, immagini rotte o CTA duplicate. |
| Browser categorie | Tre categorie a 1440, 768 e 390 px: quattro articoli ciascuna, nessun overflow. Filtri e apertura delle card verificati. |
| Ricerca | Categoria: risultato unico, zero risultati, cancellazione da tastiera e ripristino delle quattro card. Indice: ricerca e apertura dell'offsite. |
| Tabelle e CTA | Nove tabelle con caption, scope e regione nominata/focalizzabile. A 320 px: riquadro interno scorrevole, pagina senza overflow; A1 verificata anche con freccia destra. CTA leggibile e contenuta nella pagina. |
| Senza JavaScript | Testo e link C1, quattro card AI Marketing e href presenti nel browser con script disattivati. Il click automatizzato in questa modalità ha raggiunto un limite dello strumento; navigazione verificata in modalità ordinaria e destinazioni controllate nell'HTML. JavaScript ripristinato. |
| Console | Nessun warning o errore osservato durante la verifica finale. |
| Revisione editoriale indipendente | Riletti tutti i testi; distinzioni dei brief, esempi ipotetici, British English e limiti conservati. Nessuna criticità materiale. |

I dodici corpi renderizzati totalizzano circa 16.700 parole (il conteggio HTML include l'eventuale richiamo intermedio). Ogni articolo rientra nell'intervallo orientativo richiesto. Tempi di lettura da 6 a 8 minuti, calcolati sul testo editoriale a 220 parole/minuto.

Log, misurazioni DOM e screenshot sono nella cartella [qa/insights-content-20261007](../../../qa/insights-content-20261007/) del workspace. I risultati strutturati del controllo dei contenuti sono `insights-content-production-qa.json` e `insights-content-review-qa.json` in questa cartella.

## Riferimenti correnti

- [Archivio AI Pulse e riepilogo della release](ai-pulse-archive-report.md).
- [Esito dei controlli evergreen in modalità pubblicazione](insights-content-published-qa.json).
- `scripts/check-insights-content.mjs`: mantiene i controlli delle bozze e aggiunge la modalità esplicita `--published`.
- `src/lib/insights-content-cta.mjs`: registro e varianti CTA limitate ai dodici ID.
- `src/styles/insights-content-batch.css`: stile delle tabelle dei nuovi articoli.

La conferma del rilascio sul dominio e gli eventuali riferimenti a commit o deploy devono essere aggiunti solo dopo la verifica finale del processo principale.
