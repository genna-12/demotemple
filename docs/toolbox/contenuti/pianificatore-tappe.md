# Contenuti del Pianificatore di uscita — DA VALIDARE CON PONZ

20 settembre 2026. Questo file è **la sorgente dei testi** dello strumento `/pianificatore-uscita/`:
chi implementa copia da qui in `toolbox/pianificatore-uscita/tappe.js` e `i18n.js`, non inventa.
Lo studio può correggere qualunque riga: titolo, testo, anticipo, motivazione. Le fonti dei numeri
stanno in `docs/toolbox/research/2026-09-20-release-timeline.md` §1.

**Come leggerlo.** `id` = chiave stabile (non cambiarla, è salvata nei piani degli utenti).
`anticipo` = giorni prima dell'uscita, profilo **completa**; fra parentesi il profilo **veloce**
(`—` = la tappa non c'è nel profilo veloce). `testo` = una riga sotto il titolo.
`perché` = il foglio che si apre con la "i". Ogni voce esiste in IT ed EN.

## Tappe

| id | anticipo | IT — titolo | EN — title |
|---|---|---|---|
| `data` | 70 (28) | Data e formato decisi | Date and format set |
| `master` | 56 (28) | Master approvato | Master approved |
| `split` | 56 (28) | Split sheet e deposito | Split sheet and registration |
| `artwork` | 49 (28) | Artwork e foto | Artwork and photos |
| `consegna` | 42 (21) | Consegna al distributore | Delivery to the distributor |
| `visual` | 35 (—) | Canvas, smart link, sito | Canvas, smart link, website |
| `pitch` | 28 (14) | Pitch editoriale Spotify | Spotify editorial pitch |
| `presave` | 21 (7) | Pre-save e primo teaser | Pre-save and first teaser |
| `press` | 14 (—) | Press e curatori | Press and curators |
| `social` | 7 (7) | Contenuti programmati | Content scheduled |
| `uscita` | 0 (0) | Uscita | Release day |
| `seguito` | −3 (−3) | Seconda ondata | Second wave |
| `dati` | −28 (−28) | Lettura dei dati | Reading the numbers |

### `data`
- **testo IT:** Scegli il giorno (di solito un venerdì), il formato e quanto vuoi spendere.
- **testo EN:** Pick the day (usually a Friday), the format and what you want to spend.
- **perché IT:** Tutto il piano si misura da questa data. Cambiarla dopo la consegna significa scrivere al distributore e rischiare che i negozi non si allineino. I venerdì sono la convenzione: le vetrine settimanali si aggiornano lì.
- **perché EN:** The whole plan is measured from this date. Changing it after delivery means writing to your distributor and risking stores falling out of sync. Fridays are the convention: weekly shelves refresh then.

### `master`
- **testo IT:** Master finito e approvato in WAV 24 bit, con le versioni che ti servono.
- **testo EN:** Final approved master, 24-bit WAV, plus any versions you need.
- **perché IT:** Artwork, teaser e consegna partono tutti dal master. I giri di revisione con chi missa si contano in giorni, non in ore: otto settimane lasciano spazio a due passaggi senza spostare la data.
- **perché EN:** Artwork, teasers and delivery all start from the master. Revision rounds with your mix engineer take days, not hours: eight weeks leave room for two passes without moving the date.

### `split`
- **testo IT:** Metti per iscritto le quote fra autori, poi avvia il deposito (SIAE o Soundreef).
- **testo EN:** Put the writer shares in writing, then start the registration (SIAE or Soundreef).
- **perché IT:** Il deposito si chiude solo quando tutti i coautori hanno dato il consenso: è un tempo sociale, non tecnico. Decidere le quote a freddo, prima che il brano esca, evita discussioni quando arrivano i soldi. Il deposito SIAE è gratuito.
- **perché EN:** Registration only completes once every co-writer has agreed: that is social time, not technical time. Settling shares calmly, before the song is out, avoids arguments once money arrives. SIAE registration is free.

### `artwork`
- **testo IT:** Copertina quadrata 3000×3000 in JPG, più foto stampa e bio aggiornata.
- **testo EN:** Square 3000×3000 JPG cover, plus press photos and an updated bio.
- **perché IT:** L'artwork va consegnato insieme alla musica, quindi è pronto prima. I distributori rifiutano copertine sfocate, rettangolari, con URL, codici QR, loghi di social o di negozi: un rifiuto costa un ciclo intero di revisione.
- **perché EN:** Artwork ships with the music, so it has to be ready earlier. Distributors reject covers that are blurry, non-square, or carry URLs, QR codes, social or store logos: a rejection costs a full review cycle.

### `consegna`
- **testo IT:** Carica tutto sul distributore: audio, artwork, crediti, testi, data.
- **testo EN:** Upload everything to your distributor: audio, artwork, credits, lyrics, date.
- **perché IT:** È il vero collo di bottiglia. DistroKid consiglia almeno quattro settimane di anticipo, TuneCore tre o quattro: con meno margine il brano può restare nella coda di revisione di un negozio proprio il giorno dell'uscita. Sei settimane lasciano spazio a un rifiuto.
- **perché EN:** This is the real bottleneck. DistroKid recommends at least four weeks, TuneCore three to four: with less margin your track can still sit in a store's review queue on release day. Six weeks leave room for one rejection.

### `visual`
- **testo IT:** Clip verticali, Canvas, smart link e pagina del sito aggiornata.
- **testo EN:** Vertical clips, Canvas, smart link and an updated page on your site.
- **perché IT:** Fra pochi giorni manderai gente su un link: meglio che trovi qualcosa di finito. Preparare i visual adesso evita di girare contenuti nella settimana dell'uscita, quando serve testa libera.
- **perché EN:** In a few days you will be sending people to a link: better that it looks finished. Making the visuals now keeps you from shooting content during release week, when you need a clear head.

### `pitch`
- **testo IT:** Proponi il brano agli editor dalla tua pagina Spotify for Artists.
- **testo EN:** Pitch the track to editors from your Spotify for Artists page.
- **perché IT:** Il minimo è sette giorni prima dell'uscita, ed è anche la condizione per finire nel Release Radar di chi ti segue. Farlo a quattro settimane vuol dire avere margine se la consegna slitta. Si propone un brano alla volta, e il pitch non garantisce la playlist.
- **perché EN:** The minimum is seven days before release, and it is also what gets you into your followers' Release Radar. Doing it four weeks out leaves margin if delivery slips. One song at a time, and a pitch never guarantees placement.

### `presave`
- **testo IT:** Apri il pre-save e pubblica il primo teaser.
- **testo EN:** Open the pre-save and post the first teaser.
- **perché IT:** Secondo Spotify chi pubblica la pagina di pre-save almeno sette giorni prima raccoglie in media quasi il doppio dei salvataggi. Tre settimane servono a spingerlo più di una volta, senza stancare.
- **perché EN:** Spotify reports that publishing the pre-save page at least seven days ahead collects on average nearly twice the saves. Three weeks let you push it more than once without wearing people out.

### `press`
- **testo IT:** Manda il brano a testate, radio e curatori con un link privato.
- **testo EN:** Send the track to press, radio and curators with a private link.
- **perché IT:** Chi scrive lavora con una o tre settimane di anticipo: prima è troppo presto e il pezzo invecchia, dopo non c'è più tempo per pubblicare. Link privato e data chiara, così nessuno anticipa l'uscita.
- **perché EN:** Writers work one to three weeks ahead: earlier and the piece goes stale, later and there is no time to publish. Private link and a clear date, so nobody jumps the release.

### `social`
- **testo IT:** Programma i post della settimana e avvisa la tua lista.
- **testo EN:** Schedule the week's posts and tell your mailing list.
- **perché IT:** Nella settimana dell'uscita si esegue, non si produce. Avere già pronti tre o quattro contenuti significa poter rispondere alle persone invece di montare video.
- **perché EN:** Release week is for executing, not producing. Having three or four pieces ready means you can answer people instead of editing videos.

### `uscita`
- **testo IT:** Controlla che tutto sia online, poi racconta l'uscita.
- **testo EN:** Check everything is live, then tell people it's out.
- **perché IT:** Verifica link, crediti, testi e che il brano sia arrivato nel Release Radar. I negozi non si aggiornano tutti allo stesso minuto: se qualcosa manca, di solito rientra in giornata.
- **perché EN:** Check links, credits, lyrics and that the track reached Release Radar. Stores do not all update at the same minute: if something is missing, it usually lands the same day.

### `seguito`
- **testo IT:** Seconda ondata di contenuti, playlist tue e di chi ti ascolta.
- **testo EN:** Second wave of content, your own playlists and your listeners'.
- **perché IT:** La prima settimana pesa: i sistemi di raccomandazione guardano come reagisce chi già ti segue. Un secondo contenuto a qualche giorno dall'uscita allunga la coda.
- **perché EN:** The first week counts: recommendation systems watch how your existing audience reacts. A second piece a few days in stretches the tail.

### `dati`
- **testo IT:** Guarda i numeri con calma e decidi la prossima mossa.
- **testo EN:** Look at the numbers calmly and decide the next move.
- **perché IT:** Con un mese di dati si capisce da dove sono arrivati gli ascolti e cosa ha funzionato. È anche il momento giusto per fissare la data della prossima uscita, mentre l'esperienza è fresca.
- **perché EN:** With a month of data you can see where the plays came from and what worked. It is also the right moment to set the next release date, while it is all still fresh.

## Note per lo studio

1. **Anticipi da confermare.** Solo `consegna`, `pitch` e `presave` poggiano su numeri pubblicati
   (rispettivamente 4 e 3-4 settimane dei distributori, 7 giorni di Spotify). Gli altri sono la
   proposta dello studio: correggeteli.
2. **SIAE o Soundreef?** Lo strumento non consiglia: nomina entrambi e si ferma lì. Se volete una
   riga di indirizzo, scrivetela qui.
3. **Manca qualcosa?** Candidati scartati per non allungare la lista: budget, video ufficiale,
   merchandising, distribuzione fisica, invio a radio universitarie, Official Artist Channel YouTube
   (arriva dopo la distribuzione, non è un'attività pre-uscita).
4. Nessuna cifra su quanto rendono gli ascolti, nessuna promessa di playlist, nessun consiglio
   legale o fiscale: sono scelte deliberate.
