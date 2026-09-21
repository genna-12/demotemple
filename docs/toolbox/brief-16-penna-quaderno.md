# Brief 16 — Penna v2: il quaderno (Genna, 21 settembre 2026)

Parole di Genna, riordinate:

- Penna "deve diventare lo strumento più elaborato": un **blocchetto note di canzoni e poesie per artisti, perfetto e professionale**. Oggi "è troppo demo".
- Entrando in Penna oggi si finisce nell'editor: serve una **dashboard dei testi scritti** (elenco, ricerca, ordinamento, apertura, nuovo testo, elimina), da cui si apre l'editor. Penna può restare in Toolbox ma "elaborata per bene".
- Deve permettere di **ritrovare gli stessi testi su PC e telefono** (un artista trova tutti i suoi testi). Vincoli: costo zero, niente account, niente tracciamento, niente terzi, niente cookie banner. Scelta dell'orchestratore, da spiegare in spec: **sincronizzazione con codice segreto e cifratura lato client** (il server vede solo blob cifrati) su Cloudflare Pages Functions + D1 dello stesso progetto (stesso origin, nessuna modifica CSP, si deploya col push). In più, **esporta/importa** (file .json) e condivisione del singolo testo come file .txt: funzionano subito, anche senza sincronizzazione.
- **Problemi di overflow e spaziatura in tutta la pagina** su PC (da telefono non ha controllato bene). Vanno trovati e risolti (larghezza massima dell'editor su desktop, colonna dei numeri, pannello rimario, riga dei pacchetti, foglio impostazioni).
- Testo di prova ufficiale: `docs/toolbox/contenuti/testo-prova-canto.txt` (una canzone vera di Genna, 55 versi, con "Ooo-ooo-ooo", apostrofi tipografici, "io…", ritornelli ripetuti). Ogni validazione la usa.
- Stile: come il resto della Toolbox (spec 01-03): vetro, tutto molto arrotondato, componenti `tb-`, niente emoji, IT/EN.

Cose già a posto (non toccare la logica): conteggio metrico con tratti veri dal Worker (metrica.js `tratti`), rimario v3 IT / v2 FR, pacchetti lingua, sineresi e vocali tenute in `sillabe.js`.

Fuori perimetro di questo giro: accordi sopra il testo, registrazione vocale, collaborazione in tempo reale.
