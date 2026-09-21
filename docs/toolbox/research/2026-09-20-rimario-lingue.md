# Rimario multilingue — fonti, licenze, algoritmi (EN, FR, ES)

20 settembre 2026. Ricerca per la spec 14b (pacchetti lingua di Penna). Continua la
ricerca del 19 settembre, che resta valida per l'italiano. Verifiche del 20 settembre
2026; le dimensioni dei dump cambiano nel tempo.

Vincolo invariato: sito **commerciale** → niente NC; nessuna chiamata a runtime verso
terzi; i file generati si committano nel repo (o si scaricano dal nostro origin).

## 1. Sorgenti e licenze

| Lingua | Fonte | Cosa dà | Licenza | Verdetto |
|---|---|---|---|---|
| EN | **CMU Pronouncing Dictionary** (`cmusphinx/cmudict`, 0.7b+) | ~134 000 voci, ARPAbet **con l'accento marcato sulle vocali** (`0` atona, `1` primaria, `2` secondaria): `LOVE → L AH1 V` | **BSD a 2 clausole** (CMU 1993‑2015; le versioni 0.1‑0.7 erano di pubblico dominio) | **Scelta principale.** Uso commerciale consentito, basta riportare l'avviso |
| EN | **hermitdave/FrequencyWords** `content/2018/en/en_50k.txt` | ordinamento per frequenza (OpenSubtitles) | codice MIT, **contenuti CC BY-SA 4.0** | Scelta per l'ordine |
| FR | **Lexique 3.83** | 140 000 forme con `phon`, `syll`, `nbsyll`, frequenze | **ambigua**: lexique.org dichiara «Creative Commons Attribution – NonCommerciale»; il README su openlexicon.fr dichiara **CC BY-SA 4.0** | **Scartata.** Due dichiarazioni in contraddizione, una delle due è NC: su un sito commerciale non si corre il rischio. Sarebbe la fonte migliore: da riconsiderare solo con un chiarimento scritto degli autori |
| FR | **Wikizionario FR via kaikki.org** (dump 2026‑09‑01) | 2 655 278 sensi in francese; `sounds.ipa` **già sillabata con i punti** (`\a.muʁ\`): pronuncia *e* confini di sillaba in un campo solo | CC BY-SA (+ GFDL), come Wikimedia | **Scelta principale FR** |
| FR | FrequencyWords `fr_50k.txt` | ordine | CC BY-SA 4.0 | Scelta per l'ordine |
| FR | `words/an-array-of-french-words` (~336 000) | copertura delle forme, **senza pronuncia** | MIT (Zeke Sikelianos), derivata dalla Letterpress word list | Riserva: le forme in più entrano marcate **stimato** (chiave per analogia). La provenienza a monte non è documentata: l'avviso MIT si riporta, ma non è la spina dorsale |
| ES | **Wikizionario ES via kaikki.org** (dump 2026‑09‑01, estratto il 19/09) | 1 036 458 sensi in spagnolo; IPA come controprova | CC BY-SA (+ GFDL) | **Scelta principale ES** (lemmario) |
| ES | FrequencyWords `es_50k.txt` | ordine | CC BY-SA 4.0 | Scelta per l'ordine |
| ES | `words/an-array-of-spanish-words` (~636 000) | copertura | MIT | Accettata, come `paroleitaliane` in italiano |
| ES | **Regole RAE di acentuación** | posizione dell'accento tonico | regole, non dati | **Niente dizionario di accenti**: in spagnolo l'accento si calcola |

**Licenza dei pacchetti generati.** Tutti e tre sono opera derivata di almeno una fonte
CC BY-SA 4.0 (le frequenze, e per FR/ES il Wikizionario): i file distribuiti sono
**CC BY-SA 4.0**, con dentro l'avviso BSD di CMU e gli avvisi MIT. Il codice dell'app
resta fuori (aggregazione, come per l'italiano). Ogni pacchetto porta il suo
`LICENSE.txt` e `ATTRIBUZIONE.md`, ripresi nel foglio «Da dove vengono le rime».

## 2. Che cosa serve, lingua per lingua

### Inglese
- **Rima perfetta**: dalla **vocale tonica** in poi tutto uguale, con la consonante
  d'appoggio diversa (`love → above, dove, glove`). Con il CMU è banale: si taglia la
  trascrizione all'ultima vocale con cifra `1` e si tiene la coda. `LOVE → AH1 V` →
  chiave `ahv`; `ABOVE → AH0 B AH1 V` → stessa chiave.
- **Assonanza**: solo le vocali dalla tonica in poi. **Consonanza**: solo le consonanti,
  dalla sillaba tonica.
- **Sillabe**: si contano le vocali della trascrizione (ARPAbet marca la cifra di accento
  su ogni vocale, quindi *contare le cifre* dà il numero di sillabe). `BEAUTIFUL →
  B Y UW1 T AH0 F AH0 L` = **3**.
- **Parole fuori dizionario**: l'ortografia inglese non si converte in suono con regole
  decenti. Ripiego onesto: **analogia ortografica** — si cerca la parola nota con il
  suffisso scritto più lungo in comune (almeno due lettere) e se ne riusa la chiave,
  marcandola *stimata*. Per le sillabe, conteggio dei gruppi vocalici con le eccezioni
  note (`-e` finale muta, `-le` sillabico, `-es`/`-ed` dopo sibilante).

### Francese
- **L'accento è fisso**: cade sull'ultima sillaba piena del gruppo (l'ultima vocale che
  non sia uno schwa). Quindi la rima francese parte dall'**ultima vocale pronunciata**:
  nessuna posizione da indovinare. `amour /a.muʁ/`, `toujours /tu.ʒuʁ/`, `jour /ʒuʁ/`
  condividono `uʁ`.
- **Ricchezza**: pauvre (solo la vocale tonica), suffisante (vocale + un fonema),
  riche (più di una sillaba). In v1 si mappano su rime / assonanze / multisillabiche:
  la classificazione classica si dichiara, non si impone.
- **Rima femminile / maschile**: dipende dalla `e` muta finale. Si tiene come **tratto**
  del record (1 bit), visibile come etichetta, non come filtro obbligatorio.
- **e muet (e caduc)**: nel parlato e nel cantato la `e` finale cade
  (`petite → [pə.tit]`); nel verso classico conta come sillaba davanti a consonante,
  si elide davanti a vocale ed è ipermetrica a fine verso. Sono due conteggi diversi
  per lo stesso testo: **va esposto come scelta dell'utente**, non deciso da noi
  (`petite fleur` = **3** cantata, **4** nel verso classico).
- **Sillabazione**: sillaba aperta preferita; consonante singola fra vocali va avanti;
  ostruente + liquida (`/l/`, `/ʁ/`) resta unita; consonante finale chiude la sillaba.
  L'IPA di kaikki porta già i punti: per le parole note non si calcola niente.

### Spagnolo
- **Accento deterministico** (RAE): parola con accento grafico → lì; altrimenti finisce
  per **vocale, `-n` o `-s`** → **llana** (piana); in ogni altro caso → **aguda**
  (tronca). Le esdrújulas e sobresdrújulas portano *sempre* la tilde, quindi sono già
  coperte dalla prima regola. **Nessun dizionario di accenti serve**: né in build né a
  runtime, e anche una parola inventata ha l'accento esatto.
- **Dittonghi e iati** (servono al conteggio): vocale aperta + chiusa atona, o due
  chiuse diverse = **dittongo** (`aire`, `ciudad`); due aperte = **iato** (`po-e-ta`);
  chiusa **tonica** accanto a un'aperta = iato e porta sempre la tilde (`rí-o`,
  `ra-íz`); aperta fra due chiuse = **trittongo** (`a-ve-ri-guáis`).
- **Rima**: dalla vocale tonica alla fine, come in italiano. `corazón → canción,
  razón` (chiave `on`). Assonante: solo le vocali dalla tonica — è la rima tradizionale
  del romance, quindi in spagnolo l'assonanza è una categoria di prima classe.
- **Verso**: sinalefa fra parole come in italiano, e la stessa normalizzazione a piano
  (aguda +1, esdrújula −1). `corazón` = **3** sillabe grammaticali.

## 3. Dimensioni stimate (obiettivo ≤ 2 MB compressi per lingua)

Stesso formato dell'italiano (lista ordinata per frequenza + mappe chiave→indici in
delta base 36 + un byte di tratti per parola), tagliando a 150 000 forme.

| Lingua | forme | parole.txt | chiavi.json | tratti.bin | **totale gzip** |
|---|---|---|---|---|---|
| EN | ~134 000 (tutto il CMU) | ~390 KB | ~280 KB | ~45 KB | **≈ 0,7 MB** |
| FR | 150 000 | ~430 KB | ~300 KB | ~45 KB | **≈ 0,8 MB** |
| ES | 150 000 | ~430 KB | *derivata* | *derivata* | **≈ 0,45 MB** |

Lo spagnolo è il caso fortunato: chiavi e tratti si ricalcolano dall'ortografia con le
regole RAE, quindi **non si scaricano** — il Worker li costruisce al caricamento. In
inglese e francese no: la chiave viene dalla pronuncia e va spedita.

Tutte e tre stanno **sotto la metà del tetto di 2 MB**: il margine serve a chi vorrà
alzare il limite di forme o aggiungere l'indice delle multisillabiche più profonde.

## 4. Consenso e cookie

Art. 5(3) ePrivacy copre ogni accesso al terminale, non solo i cookie: local storage,
IndexedDB e Cache Storage inclusi (EDPB, *Guidelines 2/2023 on the technical scope of
Art. 5(3)*). Vale però l'esenzione per ciò che è **strettamente necessario a fornire il
servizio esplicitamente richiesto dall'utente**: qui l'utente tocca «Scarica il
pacchetto inglese», i file arrivano dal **nostro origine**, restano in Cache Storage e
non identificano né profilano nessuno. Nessun terzo, nessun identificatore, nessuna
finalità ulteriore → **nessun banner**. La distinzione che regge tutto è tecnica
contro profilazione: se un giorno si misurasse *quanti* scaricano, quella sarebbe
un'altra cosa e servirebbe il consenso.

## Fonti

- [cmusphinx/cmudict](https://github.com/cmusphinx/cmudict) · [LICENSE (BSD 2 clausole)](https://raw.githubusercontent.com/cmusphinx/cmudict/master/LICENSE) · [CMU Pronouncing Dictionary — Wikipedia](https://en.wikipedia.org/wiki/CMU_Pronouncing_Dictionary) · [ARPABET](https://en.wikipedia.org/wiki/ARPABET)
- [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
- [Lexique.org](http://www.lexique.org/) (dichiara CC BY-NC) · [README Lexique su openlexicon.fr](http://openlexicon.fr/datasets-info/Lexique382/README-Lexique.html) (dichiara CC BY-SA 4.0)
- [kaikki.org — frwiktionary](https://kaikki.org/frwiktionary/index.html) · [voce «amour»](https://kaikki.org/frwiktionary/Fran%C3%A7ais/meaning/a/am/amour.html) · [kaikki.org — eswiktionary](https://kaikki.org/eswiktionary/index.html)
- [words/an-array-of-french-words](https://github.com/words/an-array-of-french-words) · [words/an-array-of-spanish-words](https://github.com/words/an-array-of-spanish-words)
- [RAE — tilde / reglas de acentuación](https://www.rae.es/dpd/tilde)
- [French phonology — Wikipedia](https://en.wikipedia.org/wiki/French_phonology) · [French poetry — Wikipedia](https://en.wikipedia.org/wiki/French_poetry) · [Rime — Wikipédia](https://fr.wikipedia.org/wiki/Rime) · [Rhyme — Wikipedia](https://en.wikipedia.org/wiki/Rhyme)
- [EDPB — Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy (PDF)](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf)
