# Da dove vengono le rime

I dati del rimario italiano di **Penna** sono costruiti da tre fonti libere.

| Fonte | Cosa da' | Licenza |
|---|---|---|
| [Wikizionario italiano](https://it.wiktionary.org) via [kaikki.org](https://kaikki.org/itwiktionary/index.html) (wiktextract, `raw-wiktextract-data.jsonl.gz`) | sillabazione con l'accento tonico, IPA | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) |
| [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018) | ordine per frequenza d'uso | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.it) |
| [napolux/paroleitaliane](https://github.com/napolux/paroleitaliane) | copertura delle forme | MIT |

I file generati (`parole-*.txt`, `chiavi-*.json`, `tratti-*.bin`) sono un'opera
derivata e si distribuiscono a loro volta sotto **CC BY-SA 4.0**.

Citazione chiesta da kaikki.org: Tatu Ylonen, *Wiktextract: Wiktionary as
Machine-Readable Structured Data*, LREC 2022.

Dove Wikizionario non arriva, l'accento e' **stimato** dalle regole
dell'italiano (accento grafico, suffissi sdruccioli, default piana): in quel
caso Penna lo dice, e la parola porta la nota "accento stimato".

Rigenerazione: `node scripts/build-rimario.mjs`.
