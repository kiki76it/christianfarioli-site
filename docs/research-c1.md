# C1 - Human-in-the-Loop AI: verifica editoriale

- File: `src/content/insights/human-centered-ai/human-in-the-loop-ai-business.mdx`.
- Categoria: `human-centered-ai`, nome pubblico invariato Human-Centered AI.
- URL prevista: `https://christianfarioli.com/insights/human-centered-ai/human-in-the-loop-ai-business/`.
- Query del brief: `human in the loop AI business`; intento editoriale, senza affermazioni su volumi o difficoltà SEO.
- Lettore: dirigente che deve organizzare una supervisione utilizzabile.
- Obiettivo: spiegare il funzionamento concreto del controllo umano prima di un'azione, nel monitoraggio e nelle eccezioni.
- CTA prevista: HUMAN-CENTRED ADOPTION, attraverso l'override del componente condiviso gestito dal coordinatore. Nessuna CTA manuale nel corpo.
- Stato: `draft: true`, `status: draft`, `language: en-GB`. Nessuna data di pubblicazione, aggiornamento, programmazione o revisione inventata.
- Fonti consultate il 7 ottobre 2026; questa data è soltanto nel registro interno.

## Fonti primarie e limiti delle affermazioni

1. Amershi et al., Microsoft Research, *Guidelines for Human-AI Interaction*, CHI 2019: <https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf>.
   - Letto il documento originale; tabella 1, G8 e G9.
   - Uso circoscritto: possibilità di rifiutare assistenza indesiderata e correggere risultati errati. Il corpo collega direttamente il PDF vicino alla relativa frase.
   - È una raccomandazione di progettazione dell'interazione. Non è presentata come prova che una particolare approvazione impedisca ogni errore o renda il processo conforme.
2. Google PAIR, *People + AI Guidebook*, capitolo *Errors + Graceful Failure*: <https://pair.withgoogle.com/guidebook-v2/chapter/errors-failing/>.
   - Aperta la versione corrente; verificata la sezione *Return control to the user*.
   - Uso circoscritto: il passaggio alla gestione manuale richiede contesto sufficiente per comprendere la situazione e proseguire. Il requisito operativo del passaggio con richiesta, evidenza e questione irrisolta è una proposta applicativa dell'articolo.
   - La fonte stessa distingue le condizioni del controllo manuale nei diversi sistemi; il testo non lo presenta come soluzione universalmente sicura.

Le parafrasi attribuite sono brevi e restano ampiamente entro 200 parole per fonte anche includendo queste note. Nessuna citazione testuale estesa. Non sono usati dati numerici di efficacia, percentuali, casi cliente, affermazioni normative o statistiche. Le indicazioni operative sono raccomandazioni originali, non un metodo validato dalle fonti citate.

## Contributo originale e distinzione dagli altri articoli

Il distributore e l'enquiry sulla consegna prima di venerdì sono uno scenario dichiaratamente ipotetico. Le sei fasi narrative descrivono preparazione, evidenza, decisione del revisore, corrispondenza fra approvazione e invio, escalation e arresto, monitoraggio successivo. Non si attribuiscono esperienze, risultati o servizi specifici a Christian.

La lettura di C3, `human-control-ai-deployment.mdx`, ha confermato una distinzione precisa: C3 assegna controlli e diritti decisionali in funzione delle conseguenze aziendali; C1 spiega come rendere effettiva una singola revisione. C1 non ripropone la matrice marketing/procurement/finance/HR. La guida generale alla governance menziona human-in-the-loop come tema di policy, senza questo workflow dettagliato. La ricerca mirata nei contenuti adiacenti non ha individuato un articolo già dedicato allo stesso meccanismo.

A2 usa la bozza di risposta a un'enquiry come possibile progetto di strategia marketing; C1 tratta invece un ordine esistente, una promessa di consegna e le verifiche operative della risposta. Nessuna scheda di selezione progetto, baseline marketing o scelta di strumenti viene ripetuta.

Il collegamento contestuale a C3 usa la route reale `/insights/human-centered-ai/human-control-ai-deployment/`; lo stesso ID è presente in `related`. La presenza del file destinatario è stata verificata. Nessun elenco artificiale di altri link.

## Controllo del brief e dei metadati

- Risposta diretta nei primi paragrafi e distinzione esplicita fra revisione preventiva, monitoraggio ed eccezioni.
- Il caso mostra controlli su richiesta originale, ordine corretto, fonte aggiornata, affermazioni, destinatario e testo finale; una revisione materiale non eredita automaticamente la precedente approvazione.
- Il revisore può approvare, modificare e ricontrollare, rifiutare o chiedere aiuto. Informazioni, competenze, tempo e autorità sono sviluppati in prosa.
- Sono definiti destinatario dell'escalation, backup, tempi da concordare, arresto, gestione delle bozze in attesa, processo manuale e verifica prima del riavvio.
- I test con casi difficili comprendono fonti obsolete, documenti in conflitto, destinatario cambiato e referente assente. Sono proposte di prova, non test realmente eseguiti su un sistema cliente.
- Limiti espliciti: la presenza umana non garantisce sicurezza o conformità; attività con conseguenze gravi o competenze specialistiche richiedono una valutazione diversa.
- British English, paragrafi completi, H2/H3 coerenti e sei fasi numerate. Nessuna tabella e nessun import CSS non necessario. Nessun H1 nel corpo, em dash o en dash.
- Titolo esatto del brief; SEO title, description ed excerpt specifici; autore, ruolo, avatar e link coerenti con i campi approvati. Tag già presenti nella tassonomia dei contenuti vicini: `governance`, `risk`.
- Canonical, social metadata, H1 e BlogPosting restano responsabilità del template esistente; nessun JSON-LD duplicato nel post.
- Conteggio del corpo visibile: **1.420 parole**, dopo esclusione del frontmatter e della sintassi dei link/Markdown. `readingTime: 7`, calcolato con `ceil(1420 / 220)`.

## Immagine

Riutilizzato `/images/insights/covers/email-marketing-training.jpg`, già nel repository, senza download o generazione. Ispezione visiva eseguita: mani su tastiera bianca, mouse e orologio giallo. Dimensioni verificate: **1600 × 821 px**. L'alt descrive il contenuto visibile e non attribuisce la foto a Christian, a un cliente o a un evento. L'immagine offre un contesto neutro di lavoro al computer; non viene presentata come schermata del workflow illustrato.

## Verifiche effettivamente eseguite

- Rilettura completa del file finale rispetto al brief.
- Parsing del frontmatter con `gray-matter` e compilazione del corpo con `@mdx-js/mdx`: **PASS**.
- Conteggio con `reading-time` per le parole, poi conversione esplicita a 220 parole/minuto: **PASS**, metadato coerente.
- Controlli mirati su stato draft, lingua, categoria, assenza di date, H1 nel corpo e trattini lunghi: **PASS**.
- Verificata l'esistenza dell'immagine, le sue dimensioni e il file dell'articolo correlato: **PASS**.
- Fonti esterne aperte e verificate nei passaggi citati.

Non eseguiti da questo agente build integrata, browser QA, pubblicazione, push o modifiche ai componenti condivisi. Restano al coordinatore verifica CTA effettiva, route/canonical renderizzati, esclusione dalle sitemap pubbliche e controlli responsive. Rimane necessaria la revisione editoriale dell'autore prima dell'eventuale pubblicazione.
