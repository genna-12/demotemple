# Rimario italiano — fonti, licenze, algoritmi

19 settembre 2026. Ricerca per la spec 14 (strumento "Penna"). Tutte le verifiche
sono del 19 settembre 2026; le dimensioni dei dump cambiano nel tempo.

## 1. Sorgenti di dati e licenze

Il vincolo: sito **commerciale**, quindi niente NC; niente chiavi, niente
chiamate a runtime; i file generati si committano nel repo. Servono tre cose
diverse — **lemmario**, **posizione dell'accento tonico**, **frequenza d'uso** —
e nessuna fonte libera le dà tutte e tre.

| Fonte | Cosa dà | Licenza | Uso commerciale | Verdetto |
|---|---|---|---|---|
| **Wikizionario IT via kaikki.org (wiktextract)** | lemmi + **sillabazione con l'accento tonico segnato** (`hyphenations.parts` = `["a","mó","re"]`) + IPA (`sounds.ipa` = `/aˈmore/`) | CC BY-SA 4.0 (voci vecchie 3.0), come tutti i progetti Wikimedia dal 29 giugno 2023 | **Sì**, con attribuzione + share-alike sull'opera derivata | **Scelta principale** |
| **napolux/paroleitaliane** | 14 liste di forme, la più utile `280000_parole_italiane.txt` (279 894 voci); anche 60 444, 661 569, `parole_uniche.txt` 935 808 | **MIT** (eccezione: `coniugazione_verbi.txt`, 334 953 voci, CC BY-SA 3.0 da `ian-hamlin/verb-data`) | Sì, con avviso di copyright | **Scelta per la copertura** |
| **hermitdave/FrequencyWords** | frequenze da OpenSubtitles 2018, `content/2018/it/it_50k.txt` (`parola<spazio>occorrenze`, ordinato) e `it_full.txt` | codice MIT, **contenuti CC BY-SA 4.0** | Sì, con attribuzione + share-alike | **Scelta per l'ordinamento** |
| nibrica/Super-Rimario-Italiano | rimario italiano già fatto: Wikizionario + CoLFIS + WItalian + paroleitaliane, accenti mancanti stimati con `espeak` | **GPL-3.0-or-later** (codice) | Il codice no: contaminerebbe la Toolbox | Non si riusa il codice. **Si conferma l'impianto** (Wikizionario come fonte dell'accento, ordinamento per frequenza, omografi `àncora`/`ancòra`) e si cita come precedente |
| CoLFIS | frequenze dell'italiano scritto | corpus accademico 2005, nessuna licenza libera pubblicata | No | Scartata |
| PAISÀ | corpus + liste di frequenza | **CC BY-NC-SA** | **No** (clausola NC) | Scartata |
| SUBTLEX-IT (OSF) | frequenze da sottotitoli | materiale accademico, licenza non dichiarata sulla pagina OSF | Incerto | Scartata: `FrequencyWords` dà lo stesso registro con licenza esplicita |
| PhonItalia | lessico fonologico con accento | risorsa accademica (Goslin & Galluzzi, 2013), redistribuzione non dichiarata | Incerto | Scartata |
| Morph-it! | forme + lemma + tratti morfologici | CC BY-SA | Sì | Scartata: **non ha l'accento**, non aggiunge nulla a Wikizionario + paroleitaliane |
| eSpeak NG | trascrizione fonetica con accento, offline | **GPL-3.0** | Come strumento sì, ma l'output porta con sé voci del suo dizionario di pronuncia | Scartato anche in build: si evita la zona grigia usando Wikizionario per l'accento certo e le regole per il resto |
| Hunspell `it_IT` | forme + affissi | GPL/LGPL/MPL | Sì | Non serve: copertura inferiore a paroleitaliane, nessun accento |

### Numeri utili
- kaikki.org, edizione **it.wiktionary**: 715 150 sensi in italiano (più 49 altre lingue). Raw wiktextract JSONL: **490 MB, 38,3 MB compresso**. La pagina chiede di citare Ylonen, *Wiktextract: Wiktionary as Machine-Readable Structured Data* (LREC 2022) e di linkare kaikki.org.
- kaikki.org, edizione **en.wiktionary → Italian**: 589 335 forme distinte. Copertura maggiore sulle forme flesse, ma la sillabazione accentata all'italiana è una convenzione di it.wiktionary: **resta la sorgente primaria**.
- `it_50k.txt`: 50 000 righe, la testa è `e 7389373 / non 6257811 / che 6063914 …`.

### Conseguenze pratiche della licenza
CC BY-SA 4.0 permette l'uso commerciale. Impone due cose sui **file generati**
(`toolbox/penna/data/*`), che sono un'opera derivata: (a) attribuzione a
Wikizionario e a FrequencyWords/OpenSubtitles con link alla licenza; (b) gli
stessi file vanno distribuiti **CC BY-SA 4.0**. Non impone nulla al codice
dell'app: il JS legge i dati, non li incorpora, ed è una semplice aggregazione.
MIT (paroleitaliane) chiede solo di riportare l'avviso di copyright. Servono
quindi `toolbox/penna/data/LICENSE.txt` (testo delle licenze) e
`ATTRIBUZIONE.md` (chi, cosa, link), più una riga visibile nel foglio "Da dove
vengono le rime".

## 2. Algoritmi

### Sillabazione
Regole ortografiche standard, sufficienti senza dizionario:
1. nucleo = vocale; `i`/`u` atone accanto a un'altra vocale formano **dittongo**
   (un nucleo solo), `qu`/`gu` + vocale sempre un nucleo; due vocali forti
   (`a e o`) o una `i`/`u` **tonica** fanno **iato** (due nuclei);
2. consonante singola fra vocali → va con la vocale che segue (`ca-sa`);
3. digrammi e trigrammi non si spezzano: `ch gh gn gl(i) sc(i/e) ci gi`;
4. doppie si spezzano (`not-te`); `cq` si spezza (`ac-qua`);
5. **s impura**: `s` + consonante non si spezza mai (`fi-ne-stra`, `pa-sta`);
6. **muta + liquida** (`bl br cl cr dr fl fr gl gr pl pr tr vr`) resta unita
   (`so-pra`, `ci-clo`); gli altri nessi si spezzano (`al-to`, `tem-po`);
7. tre consonanti: si spezza dopo la prima, salvo quando il gruppo comincia per `s`.

### Accento tonico
L'accento italiano è **libero** (Treccani, *accento fonico*): tronche, piane,
sdrucciole, bisdrucciole; le bisdrucciole e oltre sono marginali. Nessuna regola
copre tutto, per questo il dato di Wikizionario è la sorgente vera. Stima di
ripiego, da marcare come tale nell'interfaccia:
- accento grafico sull'ultima vocale → **tronca** (`però`, `città`, `perché`);
- monosillabo → tonico su di sé;
- suffissi sdruccioli chiusi (`-abile -ibile -evole -ico/-ica -udine -aggine
  -logo -grafo -metro -fobo -voro -tesi …`);
- voci verbali in `-ano`/`-ono` della 3ª plurale: accento indietro di uno
  rispetto al singolare (coperte da Wikizionario, non dalla regola);
- **default: piana** — confermato dalla norma "sono piane tutte le parole di
  almeno tre sillabe la cui penultima è chiusa" (`attenzione`, `importanza`).

**Omografi**: `àncora`/`ancòra`, `càpitano`/`capitàno`, `àmbito`/`ambìto`. Senza
contesto non si risolvono: il record tiene entrambe le letture e l'interfaccia
le mostra come due voci.

### Classi di rima
Chiave fonetica = trascrizione dalla **vocale tonica** alla fine della parola
(la rima italiana parte da lì). Normalizzazioni: `c/g` + `i,e` → /tʃ/, /dʒ/;
`ci/gi` + vocale → stesso suono con `i` muta (`bacio` ≈ `braccio`); `gli` → /ʎ/;
`gn` → /ɲ/; `sc` + `i,e` → /ʃ/; `ch/gh` → /k/,/g/; `qu` → /kw/; `s` sonora e
sorda in una classe sola; `z` in una classe sola. **Le doppie restano** (`notte`
≠ `note`). `e`/`ɛ` e `o`/`ɔ` si **accorpano**: `còlto`/`cólto` non sono rima
perfetta per un metricista, ma lo sono cantate; l'IPA di Wikizionario resta nel
record per un eventuale filtro "timbro esatto".
- **rima perfetta**: stessa chiave, consonante d'appoggio diversa (`amore` →
  `cuore`, `dolore`, `sapore`);
- **rima imperfetta**: chiave che differisce per una sola classe consonantica;
- **assonanza**: stessa sequenza di vocali dalla tonica, consonanti diverse
  (`amore` → `sole`, `nome`, `notte` no → `o-e` sì: `sole`);
- **consonanza**: stesse consonanti dalla sillaba tonica, vocali diverse;
- **multisillabica / "da rap"**: uguale scheletro vocalico delle ultime 2–3
  sillabe, ordinata per quante sillabe combaciano.

### Metrica del verso
Regola confermata: si contano le sillabe **fino a quella successiva all'ultimo
accento tonico** del verso; in pratica si normalizza a "piano" (finale tronca
**+1**, sdrucciola **−1**, bisdrucciola −2).
- **sinalefe** (default): vocale finale di parola + vocale iniziale della
  successiva = una sillaba. `Mi / ri / tro / vai / per / u / na / sel / va_o /
  scu / ra` = 11.
- **dialefe**: le stesse vocali restano separate. `Tant'era pien di sonno a quel
  punto` è un endecasillabo **solo** con dialefe fra `sonno` e `a`; l'algoritmo
  automatico ne conta 10. Non è indovinabile da regole: va lasciata all'utente.
- **sineresi/dieresi** agiscono dentro la parola (`Bea-tri-ce`, `vï-ag-gio`):
  fuori perimetro, si dichiara.

## 3. Formato e dimensione

Obiettivo ≤ 1,5 MB compresso. Lavorando su ~150 000 forme:
- lista delle parole ordinata per frequenza (l'indice **è** il rango);
- mappa chiave fonetica → indici;
- un byte per parola con numero di sillabe, classe d'accento e bit
  "accento certo / stimato".
Stima: ~450 KB + ~300 KB + ~40 KB compressi, **sotto gli 800 KB**. Rimane spazio
per gli indici di assonanza e multisillabica.

Costruzione **offline**, mai a runtime: `scripts/build-rimario.mjs` scarica (a
mano, una volta) il JSONL di kaikki, le liste MIT e `it_50k.txt`, li fonde e
scrive `toolbox/penna/data/*.json` committati insieme a `LICENSE.txt` e
`ATTRIBUZIONE.md`.

## Fonti

- [napolux/paroleitaliane](https://github.com/napolux/paroleitaliane)
- [nibrica/Super-Rimario-Italiano](https://github.com/nibrica/Super-Rimario-Italiano)
- [kaikki.org — Italian Wiktionary](https://kaikki.org/itwiktionary/index.html) · [raw data](https://kaikki.org/itwiktionary/rawdata.html) · [esempio "amore"](https://kaikki.org/itwiktionary/Italiano/meaning/a/am/amore.html)
- [kaikki.org — Italian from enwiktionary](https://kaikki.org/dictionary/Italian/index.html)
- [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
- [Creative Commons — Wikipedia moves to CC 4.0](https://creativecommons.org/2023/06/29/wikipedia-moves-to-cc-4-0-licenses/)
- [Treccani — accento fonico, prontuario](https://www.treccani.it/enciclopedia/accento-fonico-prontuario_\(Enciclopedia-dell'Italiano\)/)
- [Skuola.net — conteggio delle sillabe in poesia](https://www.skuola.net/grammatica-italiana/conto-sillabe-poesia.html)
- [schola scholae — sinalefe, dialefe, sineresi, dieresi](https://scholascholae.wordpress.com/2018/09/22/le-figure-metriche-sinalefe-dialefe-sineresi-dieresi/)
- [Paisà — corpus (CC BY-NC-SA)](https://www.corpusitaliano.it/en/contents/description.html)
- [Morph-it!](https://www.docs.sslmit.unibo.it/doku.php?id=resources:morph-it) · [SUBTLEX-IT (OSF)](https://osf.io/zg7sc/wiki/home/) · [PhonItalia](https://link.springer.com/article/10.3758/s13428-013-0400-8)
