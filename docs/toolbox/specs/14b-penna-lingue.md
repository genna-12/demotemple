# Spec 14b — Penna: pacchetti lingua del rimario (EN, FR, ES)

20 settembre 2026. Estende la 14, non la sostituisce. Fonti, licenze e regole stanno in
`docs/toolbox/research/2026-09-20-rimario-lingue.md`: qui si applicano.

## 1. Scopo e utente

Chi scrive in inglese, francese o spagnolo ha lo stesso rimario dell'italiano — rime,
assonanze, consonanze, multisillabiche — e il gutter che conta le sillabe con le regole
della sua lingua. **L'italiano resta com'è**; le altre tre sono **estensioni
facoltative**: chi non le scarica non paga un byte. Fuori perimetro: traduzione, rime fra
lingue diverse, altre lingue.

## 2. Vincoli applicati

**Niente cookie banner.** Il pacchetto arriva **dal nostro origine** dopo un tocco
esplicito, sta in Cache Storage e in `prefs`, non identifica nessuno: archiviazione
*tecnica* strettamente necessaria al servizio richiesto dall'utente (art. 5(3) ePrivacy,
esenzione confermata dalle EDPB *Guidelines 2/2023*), non profilazione — e solo la
profilazione fa scattare il consenso. **Impatto informative: nessuno.**

**Zero rete prima del tocco:** nessun manifesto remoto da sondare, il catalogo è un
modulo precacheato (`penna/pacchetti.js`); il `manifest-v1.json` scende col pacchetto.
**`_headers` non cambia**: l'`immutable` della 14 è già `/penna/data/*` e copre le
sottocartelle — **trappola**: per questo ogni file del pacchetto porta il suffisso di
versione, manifesto compreso. **Precache:** i dati non entrano mai in `SHELL`/`TOOLS`;
entrano i moduli di regole (~20 KB), che il gutter usa anche senza pacchetto. Resta la
cache di runtime `toolbox-rimario`, mai svuotata al cambio VERSION.

**Licenze:** ogni pacchetto è CC BY-SA 4.0 (deriva da Wikizionario e FrequencyWords) e
porta dentro l'avviso BSD di CMU e quelli MIT, con `LICENSE.txt` e `ATTRIBUZIONE.md` per
lingua.

## 3. Flusso utente

In cima al pannello rimario, `tb-segment` **IT · EN · FR · ES** (`#pen-lang`); le lingue
non installate hanno un puntino. Toccarne una apre `#pen-pack-sheet`: «Scarica il
pacchetto inglese», «**0,9 MB · una volta sola · funziona offline**», attribuzione con
link a «Da dove vengono le rime», «Scarica» e «Annulla». Stati: **in scaricamento**
(barra con percentuale e «Annulla»), **installato** (foglio chiuso, segmento sulla lingua
nuova), **errore/offline** («Serve la rete solo per questo», l'editor resta usabile);
chiudere il foglio non lascia nulla a metà. Fra lingue installate il Worker ricarica
dalla cache, **un pacchetto alla volta**.

**Lingua del documento**: impostazione **per documento** (`tb-select` nel menu) che decide
le regole del gutter e la lingua proposta al rimario; default l'interfaccia se è fra le
quattro, altrimenti `it`. Il conteggio funziona **anche senza pacchetto**, con le sole
regole ortografiche, marcando *stimato* ciò che lo è. IT ed ES hanno la sinalefe coi
toggle esistenti (ES normalizza a piano: aguda +1, esdrújula −1); FR al suo posto ha
`tb-toggle` **«e muta: non conta / conta (verso classico)»**, default *non conta*.

**Rimuovi pacchetto**: riga `#tb-packs-row` nel menu, **accanto a quella del microfono**,
nascosta se non c'è nulla; una voce per pacchetto con nome, peso e «Rimuovi» (conferma in
`tb-sheet`), che svuota la cache e aggiorna le prefs. Anche l'italiano.

**Chiavi nuove, IT · EN:** `penna-lang` Lingua del rimario · Rhyme dictionary language;
`penna-pack-get` Scarica il pacchetto {lingua} · Download the {language} pack;
`penna-analogy` rima per analogia · rhyme by analogy; più `penna-doc-lang`,
`penna-pack-size`, `penna-pack-offline`, `penna-emuet`, `pack-installed`, `pack-remove`,
`pack-remove-ask`. `penna-it-only` **sparisce**.

## 4. Architettura

**Nuovi:** `shared/testo/lingue.js` (registro `codice → modulo` con `import()` dinamico:
si carica solo la lingua attiva; `it` punta ai file esistenti, che non si toccano);
`shared/testo/{en,fr,es}/{sillabe.js,fonetica.js}`, puri e con **le stesse firme** dei
moduli italiani; `penna/pacchetti.js` (catalogo: codice, etichetta, versione, byte, file,
licenze); `penna/data/{en,fr,es}/{manifest-v1.json, parole-v1.txt, chiavi-v1.json,
tratti-v1.bin, LICENSE.txt, ATTRIBUZIONE.md}`.

**Formato** identico alla 14; il manifesto dichiara versione, forme, byte per file e
licenze. **Lo spagnolo dichiara `chiavi` e `tratti` come `derivate`** e non li spedisce:
le regole RAE li ricostruiscono al caricamento (≈ 0,45 MB invece di 0,8). FR usa un bit
di tratto libero per «rima femminile».

**Chiave di rima a runtime:** in ES si calcola dall'ortografia, come in italiano; in EN e
FR viene dalla **pronuncia**, quindi per una parola nota il Worker la legge dall'indice
inverso costruito al caricamento (zero byte in più) e per una sconosciuta usa
l'**analogia ortografica**: la parola nota col suffisso scritto più lungo in comune
(≥ 2 lettere) presta la sua chiave, col badge `penna-analogy`.

**Worker:** riceve `{type:'carica', lang}`, azzera le mappe, legge `/penna/data/<lang>/`,
emette `progresso` e `pronto`; resta il ripiego della 14. **Prefs** `tt.penna.lingua` e
`tt.penna.pacchetti`; il record del documento guadagna `lingua` e, per il francese,
`emuet`.

**Build:** `scripts/build-rimario.mjs` prende `--lang it|en|fr|es` (default `it`, uscita
in `penna/data/<lang>/` salvo `it`, che resta dov'è) e sceglie sorgenti e regole dal
registro. EN: `cmudict.dict` + `en_50k.txt`. FR: kaikki fr.wiktionary (IPA già sillabata
coi punti) + `fr_50k.txt` + lista MIT. ES: kaikki es.wiktionary + `es_50k.txt` + lista
MIT, accenti dalle regole. Stampa forme, accenti esatti e byte gzip, e **fallisce sopra i
2 MB**.

**Modificati:** `penna/{penna.js, rimario-worker.js, index.html, penna.css, i18n.js}`,
`shared/{nav.js, i18n-common.js}`, `sw.js` (VERSION `tb-v18` → `tb-v19`; `SHELL` +
`lingue.js` e i sei moduli di regole; `TOOLS` + `pacchetti.js`; **mai i dati**).
`_headers` e `sitemap.xml` non cambiano.

## 5. Divisione del lavoro

**builder (Sonnet):** selettore e foglio in `penna/index.html` (id fissati qui:
`#pen-lang #pen-pack-sheet #pen-pack-title #pen-pack-size #pen-pack-go #pen-pack-bar
#pen-doc-lang #pen-emuet`), riga `#tb-packs-row` / `#tb-pack-list` nel menu di `nav.js`
(solo markup), `penna/penna.css`, `penna/i18n.js`, `shared/i18n-common.js`, `sw.js`,
`penna/pacchetti.js`. Nessuna logica di rete.

**implementer (Opus):** i sei moduli `shared/testo/{en,fr,es}/*` e `lingue.js`,
`build-rimario.mjs`, i dati generati, caricamento per lingua e analogia nel Worker,
download con progresso e annullamento, rimozione dalla cache, prefs, lingua del documento
ed `emuet` in `penna.js`, riga pacchetti in `nav.js`. Non tocca HTML/CSS.

## 6. Criteri di accettazione

Da 1 a 5 in Node, senza DOM.

1. Rime: **EN** `love` → `above`, `dove`, `glove`, senza `love` né `move`; **FR** `amour`
   → `toujours`, `jour`, senza `amour`; **ES** `corazón` → `canción`, `razón`.
2. Sillabe: EN `beautiful` **3**; FR `petite fleur` **3** con la e muta che non conta e
   **4** col «verso classico»; ES `corazón` **3**, `aire` 2, `río` 2, `poeta` 3.
3. **ES**, accento dalle regole: `cantar` aguda, `canto` llana, `cántico` esdrújula,
   `árbol` llana, `compás` aguda, tutte **esatte**; anche l'inventata `zumbilar`.
4. **EN/FR** parola fuori dizionario (`blorping`, `chantouille`): badge `penna-analogy`,
   chiave dal suffisso più lungo, nessun errore.
5. `--lang en|fr|es` scrive in `penna/data/<lang>/`; ogni pacchetto **≤ 2 MB gzip**
   (attesi ≈ 0,7 / 0,8 / 0,45); `LICENSE.txt` cita CMU (BSD), Wikizionario e
   FrequencyWords (CC BY-SA 4.0), liste MIT.
6. Ricerca **< 50 ms**; indice costruito < 1 s (EN, FR) e **< 1,5 s** (ES, chiavi
   derivate); cambio fra lingue installate < 1 s **senza rete**.
7. Aprendo Penna e toccando il selettore, **nessuna richiesta** verso `/penna/data/`:
   parte solo al tocco di «Scarica». Niente fuori dall'origine, niente cookie, CSP ok.
8. Pacchetto scaricato: ricaricando **non riscarica**, in aereo funziona, alzando
   `VERSION` resta installato; «Rimuovi» lo toglie da cache e prefs. Tre documenti di
   lingua diversa riaprono con le loro regole dopo chiusura della PWA.
9. `?lang=en` traduce selettore, foglio e riga del menu; i risultati portano il `lang`
   attivo; bersagli ≥ 44 px a 390×844; barra con `aria-live`; reduced-motion rispettato.
   `node scripts/check.mjs` passa.
10. *Da provare su iPhone:* 0,9 MB in Cache Storage in standalone dopo giorni e sotto
    pressione di memoria di Safari; annullamento a metà scaricamento.

## 7. Rischi e alternative scartate

- **Lexique 3.83 scartato**: lexique.org dichiara CC BY-**NC**, il README di openlexicon
  CC BY-SA 4.0. Contraddizione che non risolviamo noi, sito commerciale: si rinuncia alla
  fonte migliore per il francese e si usa il Wikizionario FR, con IPA già sillabata.
- **G2P inglese per regole: scartato** (risultati scadenti). L'analogia ortografica è
  peggiore in teoria e più onesta in pratica: si vede che è una stima.
- **Pacchetto unico multilingue: scartato**, 2,5 MB imposti a chi ne vuole uno; **più
  pacchetti in memoria** anche, in v1 (rime fra due lingue non si fanno).
- **Manifesto remoto unico: scartato**, una richiesta all'apertura e `immutable` rotto.
- **e muta automatica in francese: impossibile**, dipende dal registro: come la dialefe
  è una scelta d'autore.
