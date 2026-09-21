# Ricerca — tempi di una uscita discografica indipendente

20 settembre 2026. Base della spec 15 (`/pianificatore-uscita/`). Ogni numero qui sotto viene da una
fonte primaria (documentazione del distributore o della piattaforma) o è dichiarato come stima.
Le fonti secondarie sono marcate. **Niente di questo è consulenza legale o fiscale.**

## 1. I vincoli duri (quelli che fissano la timeline)

| Vincolo | Numero | Fonte |
|---|---|---|
| Pitch editoriale Spotify | **almeno 7 giorni** prima dell'uscita: "Deliver your music at least 7 days before release so our editors have time to listen" | [Spotify — Pitching music to playlist editors](https://support.spotify.com/us/artists/article/pitching-music-to-playlist-editors/) |
| Release Radar | il brano consegnato **≥ 7 giorni** prima entra nel Release Radar dei follower la prima settimana; il pitch decide *quale* brano | [Spotify — Getting music on Release Radar](https://support.spotify.com/us/artists/article/getting-music-on-release-radar/) |
| Un pitch alla volta | "You can only pitch one song at a time" — niente compilation, niente featuring, niente ri-pubblicazioni o versioni alternative | [Spotify — Pitching](https://support.spotify.com/us/artists/article/pitching-music-to-playlist-editors/) |
| Pre-save / Countdown Page | chi pubblica la pagina **≥ 7 giorni** prima dell'uscita ottiene in media **quasi il doppio** dei pre-save | [Spotify for Artists — Countdown Pages](https://artists.spotify.com/countdown-pages) |
| Consegna al distributore (DistroKid) | "select a release date **at least four weeks ahead**"; con meno margine il disco può restare nella coda di revisione di un negozio il giorno dell'uscita | [DistroKid — Custom release date](https://support.distrokid.com/hc/en-us/articles/360013534454-If-I-Specify-a-Custom-Release-Date-When-Will-My-Album-Appear-in-Streaming-Services) |
| Consegna al distributore (TuneCore) | "fully uploading your release for distribution **3 to 4 weeks ahead** of your target release date or pre-order start date"; revisione interna ~2 giorni lavorativi; Spotify 2-5 giorni lavorativi, YouTube Music e iHeart 1-2 settimane, Pandora 3-4+ settimane | [TuneCore — How long does it take](https://support.tunecore.com/hc/en-us/articles/115006685548-How-long-does-it-take-for-my-music-to-go-live-in-stores) |
| Consegna al distributore (Amuse) | data fissabile con 14 / 10 / 7 giorni di anticipo secondo il piano; **cover: almeno 14 giorni** per ottenere la licenza; negozi 1-4 giorni, a volte fino a 2 settimane | [Amuse — When will my release go live](https://support.amuse.io/en/articles/107711-when-will-my-release-go-live) |
| Artwork | quadrato, **3000×3000** consigliato (minimo 1000×1000), .jpg, RGB; vietati URL, QR, loghi di social e di negozi, immagini sfocate o pixelate, stock non licenziato, prezzi, riferimenti al "CD" | [DistroKid — Album artwork requirements](https://support.distrokid.com/hc/en-us/articles/360013534334-What-Are-the-Requirements-for-Album-Artwork) |
| ISRC | 12 caratteri: prefisso di 5 + anno su 2 cifre + 5 cifre progressive; lo assegna il *registrant* (di norma il distributore), **uno per registrazione unica** | [IFPI — ISRC structure](https://isrc.ifpi.org/en/isrc-standard/structure) |
| UPC/EAN | identifica la *pubblicazione*, non la traccia; lo fornisce il distributore insieme all'ISRC | stessa catena, distributori sopra |
| SIAE | deposito **gratuito**, dichiarazione online da app SIAE+ o Portale; dal 12 gennaio 2026 le quote DEM si esprimono in **percentuali** e non più in ventiquattresimi | [SIAE — Tutela opere, musica](https://www.siae.it/it/autori-editori/iscritti/tutela-opere/musica/) · [SIAE — Copyright Management 2026](https://www.siae.it/it/autori-editori/iscritti/tutela-opere/musica-2026-copyright-management/) |
| Soundreef | l'ISRC è "essenziale" per il tracciamento online e YouTube; il deposito **diventa ufficiale solo dopo il consenso digitale di tutti** gli autori/editori coinvolti; MP3 consigliato | [Soundreef — Ottimizzare il deposito](https://support.soundreef.com/en/articles/278526-optimizing-my-soundreef-catalog-key-data-and-best-practices) |

**Due conseguenze pratiche.** (a) Il collo di bottiglia non è Spotify (7 giorni) ma il **distributore**:
3-4 settimane sono la raccomandazione concorde di DistroKid e TuneCore, e un artwork rifiutato brucia
giorni. (b) Il deposito a più mani ha un tempo **sociale**, non tecnico: serve che i coautori firmino.
Le quote vanno decise prima (split sheet), non il giorno prima dell'uscita.

**Non documentato dalle fonti primarie:** né SIAE né Soundreef fissano un termine rispetto all'uscita.
La buona pratica — depositare *prima* che il brano esca, con ISRC già assegnato — è una scelta
editoriale dello studio, non una regola: va validata con Ponz e dichiarata come tale nello strumento.

**Da fonti secondarie (distributori terzi), quindi indicativo:** l'Official Artist Channel e le
Art Track di YouTube nascono dalla consegna del distributore a YouTube (Content ID), quindi arrivano
*dopo* la distribuzione e non sono un'attività pre-uscita
([Symphonic](https://support.symdistro.com/hc/en-us/articles/360034127132-Official-Artist-Channel-OAC),
[Too Lost](https://help.toolost.com/hc/en-us/articles/360054360192-YouTube-Official-Artist-Channels)).
Le checklist indipendenti (per es. [Other Record Labels](https://www.otherrecordlabels.com/release))
concordano sul metodo — *workback schedule* a ritroso dalla data — ma **non danno settimane precise**:
è esattamente il vuoto che lo strumento riempie.

## 2. Timeline a ritroso — profilo "completa" (singolo, 10-12 settimane)

T0 = giorno dell'uscita, convenzionalmente un venerdì (i negozi aggiornano le vetrine settimanali).

| Tappa | Anticipo | Perché quell'anticipo |
|---|---|---|
| Data e formato decisi, budget | T−10 sett. | Tutto il resto si misura da qui; cambiare data dopo la consegna costa una richiesta al distributore |
| Master approvato (WAV 24 bit) + eventuali versioni | T−8 sett. | Il master è il prerequisito di artwork, teaser e consegna; i giri di revisione con chi missa richiedono giorni, non ore |
| Split sheet firmato e deposito SIAE/Soundreef avviato | T−8 sett. | Il deposito si chiude solo col consenso di tutti i coautori (Soundreef); le quote decise a freddo evitano litigi a uscita fatta |
| Artwork 3000×3000, foto, bio | T−7 sett. | Serve *prima* della consegna; un rifiuto per formato o logo social costa un ciclo intero |
| **Consegna al distributore** | **T−6 sett.** | DistroKid "almeno 4 settimane", TuneCore "3-4 settimane": 6 lascia due settimane di margine per rifiuti e code |
| Canvas/clip verticali, smart link, sito aggiornato | T−5 sett. | Materiale pronto prima che parta il pre-save, così il link porta a qualcosa di finito |
| **Pitch editoriale Spotify** (+ Apple/Amazon se il distributore lo consente) | **T−4 sett.** | Il minimo è 7 giorni, ma a 4 settimane il brano è già nel pannello e resta margine per rifare il pitch se la consegna slitta |
| Pre-save / Countdown Page + teaser #1 | T−3 sett. | ≥ 7 giorni raddoppia i pre-save; 3 settimane danno il tempo di spingerlo più volte |
| Press, radio, curatori indipendenti (link privato, embargo) | T−2 sett. | Le testate lavorano con 1-3 settimane di anticipo; oltre le 4 il pezzo "invecchia" prima di uscire |
| Contenuti social programmati, lista e DM, controllo finale | T−1 sett. | Nella settimana dell'uscita si esegue, non si produce |
| **Uscita** | T0 | Verificare Release Radar, link attivi, testi e crediti |
| Seconda ondata di contenuti, playlist proprie e di utenti | T+3 giorni | La finestra algoritmica premia la prima settimana |
| Lettura dati (Spotify for Artists), prossimo pitch, eventuali ads | T+4 sett. | Con un mese di dati si capisce cosa ha funzionato |

## 3. Varianti

**Profilo "veloce" (4 settimane).** Minimo sindacale, master già pronto: T−4 artwork + split + deposito
avviato; **T−3 consegna** (il limite di DistroKid); **T−2 pitch** (sopra i 7 giorni con margine);
T−1 pre-save e social; T0; T+1 sett. seguito. Si rinuncia a press e a una vera campagna di pre-save.

**EP (4-6 brani): +2 settimane a monte** (12-14 in totale). Master e sequenza di più brani, un ISRC per
traccia, e **un solo brano di punta** al pitch (Spotify accetta un pezzo alla volta). Opzione: singolo
apripista 6-8 settimane prima dell'EP.

**Album: 14-16 settimane.** Due o tre singoli anticipati (T−12, T−8, T−4 rispetto all'album), press con
embargo a T−6, deposito di tutte le opere avviato a T−12 perché i consensi dei coautori si moltiplicano.

## 4. Cosa lo strumento non deve promettere

Il pitch non garantisce la playlist (lo dice Spotify). I tempi dei negozi sono stime del distributore,
non impegni. I numeri sui pre-save sono medie di Spotify, non previsioni. SIAE/Soundreef: lo strumento
ricorda che il deposito esiste, non spiega quale scegliere — è contenuto legale ed economico che va
scritto e mantenuto da una persona (vedi `01-candidati.md` §2E).
