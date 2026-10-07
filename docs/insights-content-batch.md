# Insights: 12 articoli in revisione editoriale

Data di lavorazione: 7 ottobre 2026, Dubai. Stato: lavoro locale, nessun push o deploy di questi contenuti.

Ramo isolato: `content/insights-12-drafts-20261007`, base `b5727d8` (AI Pulse e rimozione della card Future). La PR AI Pulse #146 rimane aperta e non è stata unita durante questo lavoro.

## Verifica iniziale

Astro 5 e MDX, stessi template `ArticleLayout.astro` e `InsightsLayout.astro`, stessa tassonomia e stessi URL. La visibilità dipende dal workflow, non da categorie mancanti: AI Marketing contiene una vecchia bozza sullo stack 2025; Future of Work e Human-Centered AI non hanno articoli. Nessun difetto nella mappatura individuato. Nessun contenuto ricategorizzato.

La ricerca nei titoli e nei contenuti adiacenti non ha individuato copie dei dodici brief. La vecchia bozza sullo stack riguarda strumenti; la formazione di marketing tradizionale non affronta le competenze AI. Le quattro guide esistenti vengono mantenute alle loro URL:

- `/insights/executive-education/corporate-ai-training-cost-dubai/`
- `/insights/ai-strategy/why-ai-strategy-beats-ai-tools/`
- `/insights/ai-leadership/the-ceo-guide-to-ai-governance/`
- `/insights/ai-strategy/how-to-choose-an-ai-keynote-speaker-in-dubai/`

Non vengono modificati hero, navigazione, footer, firma autore, pagine di servizio, hosting o crawler per questo batch. La CSS aggiunta è attivata solo dai nuovi articoli. Le CTA sono override dei dodici ID nel componente esistente; Calendly e WhatsApp restano quelli già presenti.

## Registro

Tutte le URL qui sotto hanno origine prevista `https://christianfarioli.com/insights/`; non sono pubblicate. I codici e le query sono riferimenti editoriali, non dati di volume o difficoltà.

| Codice | Titolo | Categoria / URL relativa | Query principale | Obiettivo e contributo | CTA | Stato |
|---|---|---|---|---|---|---|
| A1 | AI Training for Marketing Teams in Dubai: What Should It Actually Cover? | ai-marketing/ai-training-marketing-teams-dubai/ | AI training for marketing teams Dubai | Scegliere un programma; giornata esemplificativa con competenze osservabili | Marketing training | Bozza completa; fonti e sintassi verificate |
| A2 | How to Build an AI Marketing Strategy Without Adding More Tools | ai-marketing/ai-marketing-strategy-without-more-tools/ | how to build an AI marketing strategy | Selezionare un progetto; scheda decisionale | Marketing strategy | Bozza completa; fonti e sintassi verificate |
| A3 | AI Marketing Agency vs Traditional Digital Agency: What Should Companies Look For? | ai-marketing/ai-marketing-agency-vs-traditional-digital-agency/ | AI marketing agency vs traditional digital agency | Valutare pratiche e fornitori; matrice di selezione | Marketing strategy | Bozza completa; fonti e sintassi verificate |
| A4 | How Should CMOs Prepare Their Marketing Teams for AI? | ai-marketing/prepare-marketing-teams-for-ai/ | how to prepare marketing teams for AI | Guidare il team; piano di 30 giorni | Marketing training | Bozza completa; fonti e sintassi verificate |
| B1 | Digital Employees vs Human Employees: What Should Companies Actually Automate? | future-of-work/digital-employees-vs-human-employees/ | digital employees vs human employees | Delegare attività entro limiti; matrice proposta | Digital employees | Bozza completa; fonti e sintassi verificate |
| B2 | How Will AI Change Middle Management? | future-of-work/ai-middle-management/ | how AI will change middle management | Ridefinire responsabilità; routine settimanali | Future of work | Bozza completa; fonti e sintassi verificate |
| B3 | AI Leadership Offsite: What Should Executives Discuss in 2027? | future-of-work/ai-leadership-offsite/ | AI leadership offsite Dubai | Preparare decisioni; agenda esemplificativa di 90 minuti | Leadership offsite | Bozza completa; fonti e sintassi verificate |
| B4 | Which Jobs Will AI Change First - and What Should Companies Do About It? | future-of-work/which-jobs-will-ai-change-first/ | which jobs will AI change first | Pianificare competenze; scheda di analisi del ruolo | Future of work | Bozza completa; fonti e sintassi verificate |
| C1 | Human-in-the-Loop AI: What Does It Actually Mean for Business? | human-centered-ai/human-in-the-loop-ai-business/ | human in the loop AI business | Organizzare supervisione; workflow con controlli espliciti | Human-centred adoption | Bozza completa; fonti e sintassi verificate |
| C2 | AI Should Augment People, Not Just Reduce Headcount | human-centered-ai/ai-augment-people-not-reduce-headcount/ | AI augmentation in the workplace | Valutare benefici effettivi; scheda bilanciata | Future of work | Bozza completa; fonti e sintassi verificate |
| C3 | Where Should Humans Stay in Control When Companies Deploy AI? | human-centered-ai/human-control-ai-deployment/ | human oversight in AI deployment | Assegnare diritti decisionali; matrice di controllo | Human-centred adoption | Bozza completa; fonti e sintassi verificate |
| C4 | How to Introduce AI Without Losing Employee Trust | human-centered-ai/introduce-ai-without-losing-employee-trust/ | how to introduce AI without losing employee trust | Gestire adozione e ascolto; piano di comunicazione | Human-centred adoption | Bozza completa; fonti e sintassi verificate |

Le verifiche delle fonti e le limitazioni sono registrate in `research-<codice>.md`, fuori dai contenuti del sito. Tutti gli articoli devono mantenere `draft: true`, `status: draft`, senza date di pubblicazione o dichiarazioni di revisione già avvenuta.

Consegna finale: tutti i dodici articoli sono completi e pronti per la revisione editoriale del proprietario. I controlli integrati sotto riportati sostituiscono le note di integrazione ancora pendente nei singoli registri di ricerca, che documentano la consegna intermedia di ciascun gruppo. Nessuna approvazione dell'autore viene dichiarata nei metadati.

## Anteprima

`node scripts/preview-insights-content.mjs` crea una copia temporanea isolata e avvia `http://127.0.0.1:8795/insights/`. Soltanto queste dodici bozze vengono aggiunte agli archivi di revisione; gli articoli già pubblicati restano visibili. Le date non vengono fabricate, le bozze mantengono il loro stato e restano escluse dai feed e dalle sitemap anche nella copia. Il server è vincolato al loopback, non accetta scritture e restituisce `noindex, nofollow`. La build ordinaria continua ad escludere le bozze da tutte le pagine pubbliche.

Aprire direttamente le categorie:

- [AI Marketing](http://127.0.0.1:8795/insights/category/ai-marketing/)
- [Future of Work](http://127.0.0.1:8795/insights/category/future-of-work/)
- [Human-Centered AI](http://127.0.0.1:8795/insights/category/human-centered-ai/)

L'anteprima è già avviata. Per riavviarla dopo una chiusura, aprire PowerShell nella radice di questo worktree ed eseguire il comando sopra. Richiede le dipendenze già presenti e la porta 8795 libera. Il file `docs/insights-preview-runtime.json` identifica la copia temporanea e il processo correnti. Ogni avvio ricrea la copia dai sorgenti; per vedere modifiche successive, riavviare l'anteprima. Non usare o distribuire la cartella temporanea come release.

Solo nella copia temporanea vengono soppressi GTM e Aladinia; i percorsi admin e le bozze estranee al batch non sono serviti. Tracciamento e consenso del sito sorgente restano invariati. La card del dominio Future mostrata nell'allegato è assente, come già implementato nella base AI Pulse.

## Riferimenti tecnici verificati

Documentazione Google consultata il 7 ottobre 2026: [AI features](https://developers.google.com/search/docs/appearance/ai-features), [Article](https://developers.google.com/search/docs/appearance/structured-data/article), [helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Implementazione con contenuti HTML, link contestuali, metadati specifici e schema esistente. Nessun file speciale AI o promessa di inclusione nei risultati.

## Verifiche finali

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

## Immagini, limiti e revisione

Nessuna immagine mancante: riutilizzate copertine e ritratto già presenti, con alt specifici e ispezione visiva. Nessun download, immagine generata o attribuzione inventata a clienti/eventi. B1 e C3 descrivono esplicitamente le proprie copertine come illustrazioni editoriali.

Non restano affermazioni fattuali essenziali prive di verifica. Le proposte operative e i casi ipotetici sono dichiarati come tali; i registri riportano contesto e limiti delle fonti. L'audit indipendente delle fonti è a campione, mentre i registri per articolo documentano tutte le attribuzioni. La disponibilità dei link è una verifica puntuale.

La revisione editoriale del proprietario resta da svolgere prima della pubblicazione. Non sono stati inviati messaggi WhatsApp, create prenotazioni, inviate newsletter o pubblicati post social. Nessun push o deploy del batch. La PR AI Pulse #146 rimane separatamente aperta.

## File interessati

- Dodici nuovi MDX nelle cartelle `src/content/insights/ai-marketing/`, `future-of-work/` e `human-centered-ai/`, identificati nel registro.
- `src/lib/insights-content-cta.mjs`: manifest e sei varianti CTA limitate ai dodici nuovi ID.
- `src/lib/article-contact-cta.mjs`: due righe di collegamento al manifest; override dei vecchi articoli invariati.
- `src/styles/insights-content-batch.css`: solo tabelle opt-in dei nuovi articoli.
- `scripts/preview-insights-content.mjs`: anteprima isolata, senza capacità di push o deploy.
- `scripts/check-insights-content.mjs`: verifica integrata di bozze, contenuti, HTML e CTA.
- Questo rapporto, dodici registri `research-*.md` ed evidenze JSON. Nessuna modifica a template pubblici, tassonomia, configurazioni, immagini o pagine preesistenti per questo batch.

## Screenshot

| AI Marketing | Future of Work | Human-Centered AI |
|---|---|---|
| ![AI Marketing](../../../qa/insights-content-20261007/category-ai-marketing.png) | ![Future of Work](../../../qa/insights-content-20261007/category-future-of-work.png) | ![Human-Centered AI](../../../qa/insights-content-20261007/category-human-centered-ai.png) |

![Articolo narrativo desktop](../../../qa/insights-content-20261007/b2-desktop-1440.png)

| Articolo mobile | Tabella a 320 px | CTA a 320 px |
|---|---|---|
| ![Articolo mobile](../../../qa/insights-content-20261007/c4-mobile-390.png) | ![Tabella scorrevole](../../../qa/insights-content-20261007/a1-table-320.png) | ![CTA mobile](../../../qa/insights-content-20261007/a1-cta-320.png) |
