# AI Pulse: archivio pubblicato e verificato

**Tutti i 67 nuovi articoli sono pubblici: 55 AI Pulse e 12 evergreen.** La [PR #146](https://github.com/kiki76it/christianfarioli-site/pull/146) è stata integrata con squash nel commit [aad1960131ea66cd70ef9fb39707126fba1ea220](https://github.com/kiki76it/christianfarioli-site/commit/aad1960131ea66cd70ef9fb39707126fba1ea220). La verifica HTTP sul dominio pubblico è terminata il **7 ottobre 2026 alle 23:09:40 a Dubai** (19:09:40 UTC): **84 controlli superati, zero errori**.

I 55 articoli AI Pulse derivano da **57 file sorgente** della cartella locale Dropbox `SM Chris DBOX` e coprono le edizioni dal **12 agosto al 7 ottobre 2026**. I pack del **13 agosto** e del **1 settembre** non sono presenti: non sono state inventate edizioni per colmare gli intervalli.

Per le date con più versioni è stata selezionata **FRESH.docx per il 12 agosto** e **V3.docx per il 19 agosto**. Il Markdown del 12 agosto resta un riscontro della stessa edizione. I file originali sono rimasti invariati.

## Date e stato dei contenuti

Tutti i 67 articoli hanno `status: published` e `draft: false` nei sorgenti della release pubblicata. Il timestamp comune, registrato durante la preparazione del rilascio, è **7 ottobre 2026, 22:50:43.598 a Dubai** (`2026-10-07T18:50:43.598Z`).

Non sono state inventate date di aggiornamento o revisione. Per AI Pulse, la data originale del pack resta separata dalla pubblicazione e permette di ordinare le edizioni dalla più recente a parità di timestamp. La data della notizia identifica l'annuncio, il rapporto o l'evento verificato e può essere diversa dalla data del pack.

I **12 evergreen** fanno parte della stessa release autorizzata e restano nelle categorie AI Marketing, Future of Work e Human-Centered AI. Nessun testo dei 67 articoli è stato cambiato dalla transizione di pubblicazione.

## Preparazione locale della release: 7 ottobre 2026

| Controllo | Esito locale |
| --- | --- |
| Fonti e provenienza dei 55 AI Pulse | Superato; note, limiti e correzioni conservati nei registri di ricerca |
| Controllo Astro e test unitari | Superati dal processo principale: 18 test unitari |
| Build | Completata con esito positivo: 478 pagine, 7 ottobre alle 22:56 a Dubai |
| Verifica dei 55 AI Pulse | Superata: 55 pagine, 5 pagine archivio, schema, fonti, date, sitemap, RSS e ordine delle edizioni |
| Verifica dei 12 evergreen | Superata: pagine pubbliche, date, schema, CTA, collegamenti e tabelle |
| Test dell'output AI Pulse | 8 superati; 1 fixture isolato saltato intenzionalmente |
| Conferma HTTP live successiva alla build | 84/84 controlli superati; risultati dettagliati nella sezione seguente |

Il confronto RSS/dati strutturati rispetta la precisione dei formati: RSS riporta i secondi, mentre pagina e dati strutturati mantengono anche i millisecondi. La verifica locale è stata seguita dal controllo indipendente delle URL sul dominio, descritto sotto.

## Verifica del dominio pubblico: 7 ottobre 2026

Il controllo anonimo HTTP/HTTPS ha eseguito **352 richieste** fra le 23:08:53 e le 23:09:40 a Dubai, dopo la propagazione del deploy. Nessuna credenziale è stata inviata al sito.

| Controllo live | Esito |
| --- | --- |
| Articoli | 67/67 rispondono 200; contenuti renderizzati confrontati con il build approvato, autore, canonical, Open Graph, schema e date verificati |
| AI Pulse | 55 articoli; fonti pubbliche corrispondenti ai metadati; cinque pagine archivio con 12, 12, 12, 12 e 7 card |
| RSS | XML valido, 55 URL canonici, autore e timestamp coerenti con la precisione RSS |
| Indice, categorie e policy | Insights e le tre categorie evergreen contengono gli articoli; editorial policy e redirect canonici verificati |
| Sitemap | 250 URL controllati: 245 risposte dirette 200 e cinque redirect storici 308 verso destinazioni 200; zero errori |
| Bozze e admin | Tre route non pubbliche/inesistenti rispondono 404; otto varianti admin anonime rispondono 401, nessuna 503 |
| Indicizzazione e ambito | Nessun noindex sui contenuti pubblici; card bianca Future rimossa, testo e collegamento Future conservati |

Resta una nota non bloccante già presente: il filtro All dell'indice Insights non espone `aria-current`; il collegamento canonico e i filtri categoria funzionano. La correzione locale è preparata per la successiva PR dell'automazione e non fa parte della release live qui verificata. Questa è una verifica tecnica automatizzata; le evidenze non vengono presentate come approvazione editoriale umana.

URL verificati: [archivio AI Pulse](https://christianfarioli.com/insights/ai-pulse/), [quinta pagina](https://christianfarioli.com/insights/ai-pulse/page/5/), [RSS](https://christianfarioli.com/insights/ai-pulse/feed.xml), [editorial policy](https://christianfarioli.com/editorial-policy/) e [sitemap](https://christianfarioli.com/sitemap.xml).

Evidenze nel workspace: [QA live](../../../qa/ai-pulse-archive-20261007/live-http.json), [QA preview 84/84](../../../qa/ai-pulse-archive-20261007/preview-http-67.json), [manifesto dei 67 ID](../../../qa/ai-pulse-archive-20261007/publication-batch.json) e [risultato del merge](../../../qa/ai-pulse-archive-20261007/merge-result.json).

## Fase di bozza: evidenze storiche del 7 ottobre 2026

L'archivio è stato inizialmente preparato e controllato come 55 bozze senza date di pubblicazione. In quella fase i test verificavano l'esclusione dalle pagine pubbliche, dalla sitemap e dai feed. Questi risultati restano evidenze della fase di bozza; lo stato corrente è quello della pubblicazione live verificata descritta sopra.

## Elaborazione quotidiana dei nuovi pack

Questa release riguarda la pubblicazione dei 67 articoli. L'integrazione, il collaudo completo e l'attivazione dell'automazione quotidiana sono in corso e vengono trattati separatamente. **Questa release non attiva un nuovo task quotidiano.**

Il precedente controllo automatico aveva richiesto consenso per l'elaborazione del pack tramite Codex. L'autorizzazione successiva dell'utente è stata ricevuta; il precedente stato “consenso in attesa” non descrive più la situazione corrente. Non viene qui dichiarata un'automazione operativa.

## Elenco dei 55 AI Pulse

Tutti i collegamenti seguenti sono URL pubblici controllati durante la verifica live. L'elenco parte dall'edizione più recente; le date dei pack e delle notizie restano distinte dalla data di pubblicazione.

| Data del pack | Titolo | Articolo pubblico | Data della notizia | Stato |
| --- | --- | --- | --- | --- |
| 07/10/2026 | DNB's AI Restructuring Puts Leadership Choices in Focus | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/dnb-ai-agents-workforce-restructuring-2026-10-06/) | 06/10/2026 | Pubblicata |
| 06/10/2026 | ChatGPT Visual Ads Bring Marketing Closer to the Moment of Intention | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/chatgpt-visual-ads-intention-marketing-2026-10-05/) | 05/10/2026 | Pubblicata |
| 05/10/2026 | The Schneider-PTC Deal Points Beyond the Chatbot | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/schneider-ptc-industrial-ai-workflows-2026-10-04/) | 04/10/2026 | Pubblicata |
| 04/10/2026 | Kolibri Puts the Cost of AI Independence on the Agenda | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/aleph-alpha-kolibri-portable-ai-2026-10-03/) | 03/10/2026 | Pubblicata |
| 03/10/2026 | AI Deployment Needs People Who Can Finish the Handover | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/anthropic-frontier-academy-business-handover-2026-10-02/) | 02/10/2026 | Pubblicata |
| 02/10/2026 | AI Agent Incidents Make Action Records a Business Requirement | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/openai-agent-notifications-action-records-2026-10-01/) | 01/10/2026 | Pubblicata |
| 01/10/2026 | A Model Announcement Is Not a Business Deployment Plan | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/gemini-4-argon-access-business-readiness-2026-09-30/) | 30/09/2026 | Pubblicata |
| 30/09/2026 | The AI Contract Matters as Much as the AI Capability | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/anthropic-infrastructure-commitments-exit-options-2026-09-29/) | 29/09/2026 | Pubblicata |
| 29/09/2026 | An AI Agent Must Account for What It Actually Did | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/openai-astra-release-safety-accountability-2026-09-28/) | 28/09/2026 | Pubblicata |
| 28/09/2026 | AI Governance Needs More Than Access to the Decision-Maker | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/trump-amodei-meeting-ai-governance-2026-09-27/) | 27/09/2026 | Pubblicata |
| 27/09/2026 | AI Productivity Can Disappear Between Two Systems | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/ai-workflow-handoffs-human-integration-2026-09-26/) | 26/09/2026 | Pubblicata |
| 26/09/2026 | A Familiar Voice Is Not Payment Authorisation | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/intesa-voice-impersonation-authorisation-2026-09-25/) | 25/09/2026 | Pubblicata |
| 25/09/2026 | AI Coding Costs Raise a Harder Question About Business Value | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/bcbsa-ai-coding-costs-incentives-2026-09-24/) | 24/09/2026 | Pubblicata |
| 24/09/2026 | Muse Charm Makes the AI Permission Question More Portable | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/meta-muse-charm-portable-ai-permissions-2026-09-23/) | 23/09/2026 | Pubblicata |
| 23/09/2026 | Meta's Muse Test Shows Why Human Handoffs Must Be Visible | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/meta-muse-human-concierge-disclosure-2026-09-22/) | 22/09/2026 | Pubblicata |
| 22/09/2026 | AI Growth Depends on Whether People Can Move into New Work | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/idb-ai-growth-worker-mobility-scenarios-2026-09-21/) | 21/09/2026 | Pubblicata |
| 21/09/2026 | The AI Incident Hotline Question Every Business Should Ask | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/us-china-ai-incident-notification-proposal-2026-09-20/) | 20/09/2026 | Pubblicata |
| 20/09/2026 | The US AI Force Pledge Highlights the Need for Defined Decision Rights | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/us-ai-force-announcement-decision-rights/) | 19/09/2026 | Pubblicata |
| 19/09/2026 | Anthropic and Accenture's Evaluation Plan Makes Independence a Design Question | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/anthropic-accenture-embedded-evaluation/) | 18/09/2026 | Pubblicata |
| 18/09/2026 | Anthropic's 30,000-Agent Snapshot Raises the Question of Oversight Capacity | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/anthropic-agent-scale-oversight/) | 17/09/2026 | Pubblicata |
| 17/09/2026 | OpenAI's Misalignment Reports Make Incident Records a Management Priority | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/openai-misalignment-reporting-business-incidents/) | 16/09/2026 | Pubblicata |
| 16/09/2026 | Workers Paying for AI Reveal a Gap in the Approved Toolset | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/deloitte-uk-worker-ai-spending/) | 16/09/2026 | Pubblicata |
| 15/09/2026 | Microsoft's Draft AI Code Makes Stopping a System an Operating Requirement | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/microsoft-ai-code-shutdown-control/) | 14/09/2026 | Pubblicata |
| 14/09/2026 | Fergus Puts Trades Administration at the Centre of Its AI Plans | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/fergus-ai-trades-administration/) | 13/09/2026 | Pubblicata |
| 13/09/2026 | Computing Graduate Pathways Need Deliberate Practice as AI Changes Work | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/computing-graduate-pathways-ai-practice/) | 12/09/2026 | Pubblicata |
| 12/09/2026 | NVIDIA's Reported Anthropic IPO Talks Highlight Supplier Dependencies | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/nvidia-anthropic-ipo-talks-supplier-dependencies/) | 11/09/2026 | Pubblicata |
| 11/09/2026 | Wipro's AI Capacity Claim Puts Redeployment Under the Spotlight | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/wipro-ai-capacity-redeployment/) | 10/09/2026 | Pubblicata |
| 10/09/2026 | Know Your Agent Is a Payment Identity Step, Not a Spending Mandate | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/ant-mastercard-visa-know-your-agent/) | 10/09/2026 | Pubblicata |
| 09/09/2026 | Meta's Muse Makes Permission Design a Personal AI Priority | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/meta-muse-agent-permissions/) | 08/09/2026 | Pubblicata |
| 08/09/2026 | AI-Designed Rentosertib Shows Why Biomarkers Need Careful Interpretation | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/rentosertib-aging-clocks-evidence/) | 07/09/2026 | Pubblicata |
| 07/09/2026 | AI Skills Training Needs a Way to Adapt | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/ai-skills-training-adaptability/) | 06/09/2026 | Pubblicata |
| 06/09/2026 | Robots on IFA's Runway Show the Difference Between Familiar and Useful | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/ifa-robots-runway-familiarity-business-readiness/) | 05/09/2026 | Pubblicata |
| 05/09/2026 | The Cybercab Inquiry Highlights the Controls Autonomy Needs | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/tesla-cybercab-investigation-autonomy-controls/) | 04/09/2026 | Pubblicata |
| 04/09/2026 | NVIDIA's Hugging Face Deal Makes Developer Choice a Strategy Issue | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/nvidia-hugging-face-acquisition-developer-choice/) | 03/09/2026 | Pubblicata |
| 03/09/2026 | New York's School AI Pause Raises a Workplace Learning Question | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/new-york-school-ai-moratorium-learning/) | 02/09/2026 | Pubblicata |
| 02/09/2026 | Alexa's Shopping Alerts Put Permission Before the Purchase | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/amazon-alexa-shopping-alerts-permission/) | 01/09/2026 | Pubblicata |
| 31/08/2026 | How a Small Business Can Design Its First AI Trial | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/small-business-first-ai-trial/) | 30/08/2026 | Pubblicata |
| 30/08/2026 | Valon's AI Access Rule Puts Judgement Into Onboarding | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/valon-ai-access-new-hires-judgement/) | 29/08/2026 | Pubblicata |
| 29/08/2026 | Microduck's Early Orders Point to Accessible Robotics Learning | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/microduck-orders-accessible-robotics-learning/) | 28/08/2026 | Pubblicata |
| 28/08/2026 | Better AI-Assisted Answers Still Need Independent Thinking | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/chatgpt-study-quality-and-original-thinking/) | 27/08/2026 | Pubblicata |
| 27/08/2026 | Meta's Project OT Report Puts Useful Work Ahead of AI Activity | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/meta-project-ot-measure-useful-work/) | 26/08/2026 | Pubblicata |
| 26/08/2026 | A More Capable Mac mini Still Needs an AI Operating Plan | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/mac-mini-local-ai-still-needs-an-owner/) | 25/08/2026 | Pubblicata |
| 25/08/2026 | AI Shopping Intent Is a Readiness Test for Retailers | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/holiday-ai-shopping-intent-retail-readiness/) | 24/08/2026 | Pubblicata |
| 24/08/2026 | Alibaba's AI Funding Plan Brings the Return Question Into Focus | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/alibaba-ai-share-placement-return-on-investment/) | 24/08/2026 | Pubblicata |
| 23/08/2026 | At the Robot Games, Speed Is Only One Measure | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/robot-games-speed-is-not-operational-readiness/) | 22/08/2026 | Pubblicata |
| 22/08/2026 | AI Productivity Does Not Guarantee Lower Costs | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/ai-productivity-does-not-guarantee-lower-costs/) | 21/08/2026 | Pubblicata |
| 21/08/2026 | Binance Agent OS Shows Why Permission to Act Changes AI Risk | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/binance-agent-os-permission-to-act/) | 20/08/2026 | Pubblicata |
| 20/08/2026 | Amazon's Drone Expansion Puts the Customer Outcome First | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/amazon-drone-expansion-outcomes-before-technology/) | 19/08/2026 | Pubblicata |
| 19/08/2026 | China's AI Sovereignty Response Makes Business Options Worth Testing | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/china-ai-sovereignty-response-business-options/) | 19/08/2026 | Pubblicata |
| 18/08/2026 | Amazon's Reported Book Scanning Raises a Data Provenance Question | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/amazon-rare-books-ai-data-provenance/) | 17/08/2026 | Pubblicata |
| 17/08/2026 | Stripe and OpenRouter Put AI Routing in the Business Spotlight | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/stripe-openrouter-ai-routing-business-value/) | 16/08/2026 | Pubblicata |
| 16/08/2026 | An AI Boss Recommended a Dismissal. Humans Still Owned the Decision. | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/andon-ai-boss-human-employment-decisions/) | 14/08/2026 | Pubblicata |
| 15/08/2026 | A US AI Coalition Draft Puts Vendor Dependency on the Agenda | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/us-ai-coalition-draft-and-vendor-dependency/) | 14/08/2026 | Pubblicata |
| 14/08/2026 | Burry's AI Warning Is a Test of Business Case Discipline | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/burry-ai-warning-and-business-case-discipline/) | 14/08/2026 | Pubblicata |
| 12/08/2026 | Autonomous AI Agents Need Operating Boundaries | [Leggi articolo](https://christianfarioli.com/insights/ai-pulse/autonomous-ai-agents-need-operating-boundaries/) | 12/08/2026 | Pubblicata |

## Documenti di riferimento

- [Indice completo dell'archivio](ai-pulse-archive-index.json), con provenienza e fonti.
- [Note di ricerca per edizione](ai-pulse-research/), con decisioni editoriali e limiti.
- [Registro dei 12 evergreen](insights-content-batch.md).
