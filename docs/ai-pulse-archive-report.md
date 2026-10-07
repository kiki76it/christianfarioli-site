# Archivio AI Pulse: riepilogo per la revisione

Sono pronte **55 bozze AI Pulse**, ricavate da **57 file sorgente** della cartella locale Dropbox `SM Chris DBOX`. Coprono le edizioni dal **12 agosto al 7 ottobre 2026**. I pack del **13 agosto** e del **1 settembre** non sono presenti: non sono state inventate edizioni per colmare questi intervalli.

Per le date con più versioni è stata selezionata **FRESH.docx per il 12 agosto** e **V3.docx per il 19 agosto**. Il file Markdown del 12 agosto è conservato come riscontro della stessa edizione; il 19 agosto segue il contenuto della revisione V3. I file originali sono rimasti invariati.

Tutti gli articoli restano **bozze locali**. Non sono state assegnate date di pubblicazione, aggiornamento o revisione fittizie. La data del pack identifica l'edizione di partenza; la data della notizia identifica l'annuncio, il rapporto o l'evento verificato e può essere diversa. Non è stato eseguito alcun push o deploy.

I **12 articoli evergreen** preparati in precedenza rimangono bozze nelle rispettive altre categorie di Insights.

## Controlli e stato della revisione

- Controllo delle fonti e della provenienza dell'archivio: **superato per tutte le 55 bozze**. Le note di ricerca conservano attribuzioni, limiti delle affermazioni e correzioni rispetto ai pack.
- Revisione editoriale finale dell'autore: **in attesa**.
- Build del sito: **superata**. Astro check: zero errori, zero warning e 13 hint preesistenti. Build locale completata, senza deploy.
- Anteprima combinata: **55 articoli AI Pulse e 12 evergreen verificati nell'HTML**, con cinque pagine AI Pulse, autore, fonti, schema, canonical, collegamenti e date di bozza corretti.
- Risposte HTTP: **61 route locali con esito 200**, più due percorsi riservati/test correttamente non disponibili. Le 55 bozze restano escluse da route pubbliche, sitemap e feed nella build di produzione.
- Browser: archivio e articolo verificati a **320, 375, 390, 430, 768 e 1440 px**, senza overflow orizzontale. Verificati ricerca DNB, ultima pagina con sette articoli, presenza di tutte le 55 card in All e rimozione della card Future richiesta. Screenshot desktop/mobile conservati in `qa/ai-pulse-archive-20261007/`.
- Regressione: **21 test di contratto/routing/intake e 8 test dell'output passati**; un test riservato alle fixture resta escluso intenzionalmente. I controlli sui 12 evergreen sono passati in entrambe le build.

La verifica delle fonti non equivale all'approvazione editoriale o alla pubblicazione. Le anteprime sono disponibili solo sul computer locale e non vengono indicizzate.

Apri [AI Pulse](http://127.0.0.1:8796/insights/ai-pulse/) oppure [tutti gli Insights](http://127.0.0.1:8796/insights/). Per ricreare l'anteprima dopo un riavvio, eseguire nel checkout `work/ai-pulse-archive-20261007`:

```powershell
$env:INSIGHTS_REVIEW_PORT='8796'
node scripts/preview-insights-content.mjs
```

Il server usa una copia temporanea isolata. Nuove modifiche ai contenuti richiedono di ricreare questa anteprima; non si aggiorna da sola con la cartella Dropbox.

## Elaborazione quotidiana dei nuovi pack

Il codice per il percorso quotidiano è pronto, ma l'esecuzione completa dal nuovo pack alla bozza **non è ancora verificata né attiva**.

Il controllo automatico delle autorizzazioni ha bloccato il passaggio che richiede l'invio del contenuto del pack a Codex per l'elaborazione. La richiesta di consenso è già stata presentata all'utente ed è in attesa di risposta. **Non è stato registrato alcun nuovo task pianificato.**

## Elenco delle 55 bozze

I collegamenti seguenti aprono le anteprime sul computer locale e richiedono il server di revisione attivo sulla porta 8796. Non sono collegamenti a contenuti pubblicati. L'elenco è ordinato dall'edizione più recente.

| Data del pack | Titolo | Anteprima locale | Data della notizia | Stato |
| --- | --- | --- | --- | --- |
| 07/10/2026 | DNB's AI Restructuring Puts Leadership Choices in Focus | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/dnb-ai-agents-workforce-restructuring-2026-10-06/) | 06/10/2026 | Bozza |
| 06/10/2026 | ChatGPT Visual Ads Bring Marketing Closer to the Moment of Intention | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/chatgpt-visual-ads-intention-marketing-2026-10-05/) | 05/10/2026 | Bozza |
| 05/10/2026 | The Schneider-PTC Deal Points Beyond the Chatbot | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/schneider-ptc-industrial-ai-workflows-2026-10-04/) | 04/10/2026 | Bozza |
| 04/10/2026 | Kolibri Puts the Cost of AI Independence on the Agenda | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/aleph-alpha-kolibri-portable-ai-2026-10-03/) | 03/10/2026 | Bozza |
| 03/10/2026 | AI Deployment Needs People Who Can Finish the Handover | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/anthropic-frontier-academy-business-handover-2026-10-02/) | 02/10/2026 | Bozza |
| 02/10/2026 | AI Agent Incidents Make Action Records a Business Requirement | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/openai-agent-notifications-action-records-2026-10-01/) | 01/10/2026 | Bozza |
| 01/10/2026 | A Model Announcement Is Not a Business Deployment Plan | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/gemini-4-argon-access-business-readiness-2026-09-30/) | 30/09/2026 | Bozza |
| 30/09/2026 | The AI Contract Matters as Much as the AI Capability | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/anthropic-infrastructure-commitments-exit-options-2026-09-29/) | 29/09/2026 | Bozza |
| 29/09/2026 | An AI Agent Must Account for What It Actually Did | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/openai-astra-release-safety-accountability-2026-09-28/) | 28/09/2026 | Bozza |
| 28/09/2026 | AI Governance Needs More Than Access to the Decision-Maker | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/trump-amodei-meeting-ai-governance-2026-09-27/) | 27/09/2026 | Bozza |
| 27/09/2026 | AI Productivity Can Disappear Between Two Systems | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/ai-workflow-handoffs-human-integration-2026-09-26/) | 26/09/2026 | Bozza |
| 26/09/2026 | A Familiar Voice Is Not Payment Authorisation | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/intesa-voice-impersonation-authorisation-2026-09-25/) | 25/09/2026 | Bozza |
| 25/09/2026 | AI Coding Costs Raise a Harder Question About Business Value | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/bcbsa-ai-coding-costs-incentives-2026-09-24/) | 24/09/2026 | Bozza |
| 24/09/2026 | Muse Charm Makes the AI Permission Question More Portable | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/meta-muse-charm-portable-ai-permissions-2026-09-23/) | 23/09/2026 | Bozza |
| 23/09/2026 | Meta's Muse Test Shows Why Human Handoffs Must Be Visible | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/meta-muse-human-concierge-disclosure-2026-09-22/) | 22/09/2026 | Bozza |
| 22/09/2026 | AI Growth Depends on Whether People Can Move into New Work | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/idb-ai-growth-worker-mobility-scenarios-2026-09-21/) | 21/09/2026 | Bozza |
| 21/09/2026 | The AI Incident Hotline Question Every Business Should Ask | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/us-china-ai-incident-notification-proposal-2026-09-20/) | 20/09/2026 | Bozza |
| 20/09/2026 | The US AI Force Pledge Highlights the Need for Defined Decision Rights | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/us-ai-force-announcement-decision-rights/) | 19/09/2026 | Bozza |
| 19/09/2026 | Anthropic and Accenture's Evaluation Plan Makes Independence a Design Question | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/anthropic-accenture-embedded-evaluation/) | 18/09/2026 | Bozza |
| 18/09/2026 | Anthropic's 30,000-Agent Snapshot Raises the Question of Oversight Capacity | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/anthropic-agent-scale-oversight/) | 17/09/2026 | Bozza |
| 17/09/2026 | OpenAI's Misalignment Reports Make Incident Records a Management Priority | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/openai-misalignment-reporting-business-incidents/) | 16/09/2026 | Bozza |
| 16/09/2026 | Workers Paying for AI Reveal a Gap in the Approved Toolset | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/deloitte-uk-worker-ai-spending/) | 16/09/2026 | Bozza |
| 15/09/2026 | Microsoft's Draft AI Code Makes Stopping a System an Operating Requirement | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/microsoft-ai-code-shutdown-control/) | 14/09/2026 | Bozza |
| 14/09/2026 | Fergus Puts Trades Administration at the Centre of Its AI Plans | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/fergus-ai-trades-administration/) | 13/09/2026 | Bozza |
| 13/09/2026 | Computing Graduate Pathways Need Deliberate Practice as AI Changes Work | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/computing-graduate-pathways-ai-practice/) | 12/09/2026 | Bozza |
| 12/09/2026 | NVIDIA's Reported Anthropic IPO Talks Highlight Supplier Dependencies | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/nvidia-anthropic-ipo-talks-supplier-dependencies/) | 11/09/2026 | Bozza |
| 11/09/2026 | Wipro's AI Capacity Claim Puts Redeployment Under the Spotlight | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/wipro-ai-capacity-redeployment/) | 10/09/2026 | Bozza |
| 10/09/2026 | Know Your Agent Is a Payment Identity Step, Not a Spending Mandate | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/ant-mastercard-visa-know-your-agent/) | 10/09/2026 | Bozza |
| 09/09/2026 | Meta's Muse Makes Permission Design a Personal AI Priority | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/meta-muse-agent-permissions/) | 08/09/2026 | Bozza |
| 08/09/2026 | AI-Designed Rentosertib Shows Why Biomarkers Need Careful Interpretation | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/rentosertib-aging-clocks-evidence/) | 07/09/2026 | Bozza |
| 07/09/2026 | AI Skills Training Needs a Way to Adapt | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/ai-skills-training-adaptability/) | 06/09/2026 | Bozza |
| 06/09/2026 | Robots on IFA's Runway Show the Difference Between Familiar and Useful | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/ifa-robots-runway-familiarity-business-readiness/) | 05/09/2026 | Bozza |
| 05/09/2026 | The Cybercab Inquiry Highlights the Controls Autonomy Needs | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/tesla-cybercab-investigation-autonomy-controls/) | 04/09/2026 | Bozza |
| 04/09/2026 | NVIDIA's Hugging Face Deal Makes Developer Choice a Strategy Issue | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/nvidia-hugging-face-acquisition-developer-choice/) | 03/09/2026 | Bozza |
| 03/09/2026 | New York's School AI Pause Raises a Workplace Learning Question | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/new-york-school-ai-moratorium-learning/) | 02/09/2026 | Bozza |
| 02/09/2026 | Alexa's Shopping Alerts Put Permission Before the Purchase | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/amazon-alexa-shopping-alerts-permission/) | 01/09/2026 | Bozza |
| 31/08/2026 | How a Small Business Can Design Its First AI Trial | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/small-business-first-ai-trial/) | 30/08/2026 | Bozza |
| 30/08/2026 | Valon's AI Access Rule Puts Judgement Into Onboarding | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/valon-ai-access-new-hires-judgement/) | 29/08/2026 | Bozza |
| 29/08/2026 | Microduck's Early Orders Point to Accessible Robotics Learning | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/microduck-orders-accessible-robotics-learning/) | 28/08/2026 | Bozza |
| 28/08/2026 | Better AI-Assisted Answers Still Need Independent Thinking | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/chatgpt-study-quality-and-original-thinking/) | 27/08/2026 | Bozza |
| 27/08/2026 | Meta's Project OT Report Puts Useful Work Ahead of AI Activity | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/meta-project-ot-measure-useful-work/) | 26/08/2026 | Bozza |
| 26/08/2026 | A More Capable Mac mini Still Needs an AI Operating Plan | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/mac-mini-local-ai-still-needs-an-owner/) | 25/08/2026 | Bozza |
| 25/08/2026 | AI Shopping Intent Is a Readiness Test for Retailers | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/holiday-ai-shopping-intent-retail-readiness/) | 24/08/2026 | Bozza |
| 24/08/2026 | Alibaba's AI Funding Plan Brings the Return Question Into Focus | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/alibaba-ai-share-placement-return-on-investment/) | 24/08/2026 | Bozza |
| 23/08/2026 | At the Robot Games, Speed Is Only One Measure | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/robot-games-speed-is-not-operational-readiness/) | 22/08/2026 | Bozza |
| 22/08/2026 | AI Productivity Does Not Guarantee Lower Costs | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/ai-productivity-does-not-guarantee-lower-costs/) | 21/08/2026 | Bozza |
| 21/08/2026 | Binance Agent OS Shows Why Permission to Act Changes AI Risk | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/binance-agent-os-permission-to-act/) | 20/08/2026 | Bozza |
| 20/08/2026 | Amazon's Drone Expansion Puts the Customer Outcome First | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/amazon-drone-expansion-outcomes-before-technology/) | 19/08/2026 | Bozza |
| 19/08/2026 | China's AI Sovereignty Response Makes Business Options Worth Testing | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/china-ai-sovereignty-response-business-options/) | 19/08/2026 | Bozza |
| 18/08/2026 | Amazon's Reported Book Scanning Raises a Data Provenance Question | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/amazon-rare-books-ai-data-provenance/) | 17/08/2026 | Bozza |
| 17/08/2026 | Stripe and OpenRouter Put AI Routing in the Business Spotlight | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/stripe-openrouter-ai-routing-business-value/) | 16/08/2026 | Bozza |
| 16/08/2026 | An AI Boss Recommended a Dismissal. Humans Still Owned the Decision. | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/andon-ai-boss-human-employment-decisions/) | 14/08/2026 | Bozza |
| 15/08/2026 | A US AI Coalition Draft Puts Vendor Dependency on the Agenda | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/us-ai-coalition-draft-and-vendor-dependency/) | 14/08/2026 | Bozza |
| 14/08/2026 | Burry's AI Warning Is a Test of Business Case Discipline | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/burry-ai-warning-and-business-case-discipline/) | 14/08/2026 | Bozza |
| 12/08/2026 | Autonomous AI Agents Need Operating Boundaries | [Apri bozza](http://127.0.0.1:8796/insights/ai-pulse/autonomous-ai-agents-need-operating-boundaries/) | 12/08/2026 | Bozza |

## Documenti di riferimento

- [Indice completo dell'archivio](ai-pulse-archive-index.json), con file sorgente, impronta di verifica e fonti per ogni articolo.
- [Note di ricerca per edizione](ai-pulse-research/), con le decisioni editoriali e gli eventuali punti da considerare nella revisione.
