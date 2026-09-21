/**
 * Tiny Temple Toolbox - Pianificatore di uscita: dizionario (spec 15 §3).
 *
 * Due famiglie di chiavi:
 * 1. Interfaccia (bottoni, campi, stati, fogli) — le usa sia questo file
 *    (markup statico, `data-i18n`) sia pianificatore.js (CONTRATTO nella
 *    sua testata, sezione "CHIAVI i18n USATE QUI").
 * 2. `pia-step-<id>-titolo/testo/foglio` — i testi delle tappe, in ordine
 *    IDENTICO a `docs/toolbox/contenuti/pianificatore-tappe.md` (unica
 *    sorgente per queste: si corregge lì, poi si riporta qui). tappe.js
 *    punta a queste chiavi per id, non contiene testo.
 */
export default {
    it: {
        /* ---- pagina, navigazione fra stati ---- */
        'pia-title': 'Pianificatore di uscita',
        'pia-new': 'Nuovo piano',
        'pia-plans': 'Piani',
        'pia-empty': 'Nessun piano',

        /* ---- modulo nuovo piano ---- */
        'pia-field-title': 'Titolo',
        'pia-field-title-placeholder': 'Titolo del brano',
        'pia-type-label': 'Tipo',
        'pia-type-single': 'Singolo',
        'pia-type-ep': 'EP',
        'pia-type-album': 'Album',
        'pia-date-label': 'Data di uscita',
        'pia-profile-label': 'Profilo',
        'pia-profile-full': 'Completa',
        'pia-profile-fast': 'Veloce',
        'pia-distro-label': 'Distributore',
        'pia-notes-label': 'Note',
        'pia-cancel': 'Annulla',
        'pia-save': 'Crea il piano',
        'pia-date-bad': 'Scegli una data di uscita valida',

        /* nomi dei distributori (marchi DistroKid/TuneCore/Amuse/Believe
           invariati: la chiave esiste comunque perche' pianificatore.js
           prova prima `pia-distro-<value>` e scrive `pia-distro-label +
           ': ' + nome` nella riga della tappa "consegna", spec §3). */
        'pia-distro-nessuno': 'Non ancora scelto',
        'pia-distro-distrokid': 'DistroKid',
        'pia-distro-tunecore': 'TuneCore',
        'pia-distro-amuse': 'Amuse',
        'pia-distro-believe': 'Believe',
        'pia-distro-altro': 'Altro',

        /* ---- piano aperto ---- */
        'pia-untitled': 'Senza titolo',
        'pia-done-count': 'fatte {n} di {tot}',
        'pia-progress-aria': 'Avanzamento del piano',
        'pia-due': 'in scadenza',
        'pia-late': 'in ritardo',
        'pia-today': 'oggi',
        'pia-in-days': 'fra {n} giorni',
        'pia-days-ago': '{n} giorni fa',
        'pia-view-aria': 'Vista',
        'pia-all': 'Tutte',
        'pia-upcoming': 'Prossime',
        'pia-no-upcoming': 'Nessuna tappa in arrivo',
        'pia-plans-empty': 'Nessun piano',
        'pia-add': 'Aggiungi tappa',
        'pia-add-title': 'Aggiungi tappa',
        'pia-name': 'Nome',
        'pia-step-menu-aria': 'Altre azioni per {tappa}',
        'pia-rename': 'Rinomina',
        'pia-move': 'Sposta',
        'pia-restore': 'Ripristina',
        'pia-delete-step': 'Elimina tappa',
        'pia-delete-step-ask': 'Elimino questa tappa?',
        'pia-delete-ask': 'Elimino questo piano?',
        'pia-deleted': 'Eliminato',
        'pia-recalc': 'Ricalcola dalla data',
        'pia-recalc-ask': 'Ricalcolo le tappe non personalizzate dalla nuova data. Quelle rinominate, spostate o aggiunte a mano restano come sono.',
        'pia-recalc-done': 'Ricalcolato',
        'pia-ics': 'Aggiungi al calendario',
        'pia-share': 'Condividi',
        'pia-share-fail': 'Condivisione non disponibile: ho scaricato il file .ics',
        'pia-print': 'Stampa o PDF',
        'pia-copy': 'Copia il testo',
        'pia-copied': 'Copiato',
        'pia-copy-manual': 'Copia non riuscita: seleziona e copia a mano',
        'pia-saved': 'Salvato',
        'pia-save-fail': 'Non riesco a salvare il piano',
        'pia-custom': 'Tappa personalizzata',
        'pia-date': 'Data',
        'pia-ok': 'OK',
        'pia-edit': 'Modifica il piano',
        'pia-delete': 'Elimina il piano',

        /* ---- tappe (sorgente: contenuti/pianificatore-tappe.md) ---- */
        'pia-step-data-titolo': 'Data e formato decisi',
        'pia-step-data-testo': 'Scegli il giorno (di solito un venerdì), il formato e quanto vuoi spendere.',
        'pia-step-data-foglio': "Tutto il piano si misura da questa data. Cambiarla dopo la consegna significa scrivere al distributore e rischiare che i negozi non si allineino. I venerdì sono la convenzione: le vetrine settimanali si aggiornano lì.",

        'pia-step-master-titolo': 'Master approvato',
        'pia-step-master-testo': 'Master finito e approvato in WAV 24 bit, con le versioni che ti servono.',
        'pia-step-master-foglio': 'Artwork, teaser e consegna partono tutti dal master. I giri di revisione con chi missa si contano in giorni, non in ore: otto settimane lasciano spazio a due passaggi senza spostare la data.',

        'pia-step-split-titolo': 'Split sheet e deposito',
        'pia-step-split-testo': 'Metti per iscritto le quote fra autori, poi avvia il deposito (SIAE o Soundreef).',
        'pia-step-split-foglio': 'Il deposito si chiude solo quando tutti i coautori hanno dato il consenso: è un tempo sociale, non tecnico. Decidere le quote a freddo, prima che il brano esca, evita discussioni quando arrivano i soldi. Il deposito SIAE è gratuito.',

        'pia-step-artwork-titolo': 'Artwork e foto',
        'pia-step-artwork-testo': 'Copertina quadrata 3000×3000 in JPG, più foto stampa e bio aggiornata.',
        'pia-step-artwork-foglio': "L'artwork va consegnato insieme alla musica, quindi è pronto prima. I distributori rifiutano copertine sfocate, rettangolari, con URL, codici QR, loghi di social o di negozi: un rifiuto costa un ciclo intero di revisione.",

        'pia-step-consegna-titolo': 'Consegna al distributore',
        'pia-step-consegna-testo': 'Carica tutto sul distributore: audio, artwork, crediti, testi, data.',
        'pia-step-consegna-foglio': "È il vero collo di bottiglia. DistroKid consiglia almeno quattro settimane di anticipo, TuneCore tre o quattro: con meno margine il brano può restare nella coda di revisione di un negozio proprio il giorno dell'uscita. Sei settimane lasciano spazio a un rifiuto.",

        'pia-step-visual-titolo': 'Canvas, smart link, sito',
        'pia-step-visual-testo': 'Clip verticali, Canvas, smart link e pagina del sito aggiornata.',
        'pia-step-visual-foglio': "Fra pochi giorni manderai gente su un link: meglio che trovi qualcosa di finito. Preparare i visual adesso evita di girare contenuti nella settimana dell'uscita, quando serve testa libera.",

        'pia-step-pitch-titolo': 'Pitch editoriale Spotify',
        'pia-step-pitch-testo': 'Proponi il brano agli editor dalla tua pagina Spotify for Artists.',
        'pia-step-pitch-foglio': "Il minimo è sette giorni prima dell'uscita, ed è anche la condizione per finire nel Release Radar di chi ti segue. Farlo a quattro settimane vuol dire avere margine se la consegna slitta. Si propone un brano alla volta, e il pitch non garantisce la playlist.",

        'pia-step-presave-titolo': 'Pre-save e primo teaser',
        'pia-step-presave-testo': 'Apri il pre-save e pubblica il primo teaser.',
        'pia-step-presave-foglio': 'Secondo Spotify chi pubblica la pagina di pre-save almeno sette giorni prima raccoglie in media quasi il doppio dei salvataggi. Tre settimane servono a spingerlo più di una volta, senza stancare.',

        'pia-step-press-titolo': 'Press e curatori',
        'pia-step-press-testo': 'Manda il brano a testate, radio e curatori con un link privato.',
        'pia-step-press-foglio': "Chi scrive lavora con una o tre settimane di anticipo: prima è troppo presto e il pezzo invecchia, dopo non c'è più tempo per pubblicare. Link privato e data chiara, così nessuno anticipa l'uscita.",

        'pia-step-social-titolo': 'Contenuti programmati',
        'pia-step-social-testo': 'Programma i post della settimana e avvisa la tua lista.',
        'pia-step-social-foglio': "Nella settimana dell'uscita si esegue, non si produce. Avere già pronti tre o quattro contenuti significa poter rispondere alle persone invece di montare video.",

        'pia-step-uscita-titolo': 'Uscita',
        'pia-step-uscita-testo': "Controlla che tutto sia online, poi racconta l'uscita.",
        'pia-step-uscita-foglio': 'Verifica link, crediti, testi e che il brano sia arrivato nel Release Radar. I negozi non si aggiornano tutti allo stesso minuto: se qualcosa manca, di solito rientra in giornata.',

        'pia-step-seguito-titolo': 'Seconda ondata',
        'pia-step-seguito-testo': 'Seconda ondata di contenuti, playlist tue e di chi ti ascolta.',
        'pia-step-seguito-foglio': 'La prima settimana pesa: i sistemi di raccomandazione guardano come reagisce chi già ti segue. Un secondo contenuto a qualche giorno dall\'uscita allunga la coda.',

        'pia-step-dati-titolo': 'Lettura dei dati',
        'pia-step-dati-testo': 'Guarda i numeri con calma e decidi la prossima mossa.',
        'pia-step-dati-foglio': "Con un mese di dati si capisce da dove sono arrivati gli ascolti e cosa ha funzionato. È anche il momento giusto per fissare la data della prossima uscita, mentre l'esperienza è fresca.",

        /* solo variante album (non nel file dei contenuti, DA VALIDARE) */
        'pia-step-singolo-titolo': 'Singolo di lancio {n}',
        'pia-step-singolo-testo': "Pubblica un singolo per anticipare l'album."
    },
    en: {
        'pia-title': 'Release Planner',
        'pia-new': 'New plan',
        'pia-plans': 'Plans',
        'pia-empty': 'No plans yet',

        'pia-field-title': 'Title',
        'pia-field-title-placeholder': 'Track title',
        'pia-type-label': 'Type',
        'pia-type-single': 'Single',
        'pia-type-ep': 'EP',
        'pia-type-album': 'Album',
        'pia-date-label': 'Release date',
        'pia-profile-label': 'Profile',
        'pia-profile-full': 'Full',
        'pia-profile-fast': 'Fast',
        'pia-distro-label': 'Distributor',
        'pia-notes-label': 'Notes',
        'pia-cancel': 'Cancel',
        'pia-save': 'Create the plan',
        'pia-date-bad': 'Pick a valid release date',

        'pia-distro-nessuno': 'Not chosen yet',
        'pia-distro-distrokid': 'DistroKid',
        'pia-distro-tunecore': 'TuneCore',
        'pia-distro-amuse': 'Amuse',
        'pia-distro-believe': 'Believe',
        'pia-distro-altro': 'Other',

        'pia-untitled': 'Untitled',
        'pia-done-count': '{n} of {tot} done',
        'pia-progress-aria': 'Plan progress',
        'pia-due': 'due soon',
        'pia-late': 'overdue',
        'pia-today': 'today',
        'pia-in-days': 'in {n} days',
        'pia-days-ago': '{n} days ago',
        'pia-view-aria': 'View',
        'pia-all': 'All',
        'pia-upcoming': 'Upcoming',
        'pia-no-upcoming': 'No upcoming steps',
        'pia-plans-empty': 'No plans yet',
        'pia-add': 'Add step',
        'pia-add-title': 'Add step',
        'pia-name': 'Name',
        'pia-step-menu-aria': 'More actions for {tappa}',
        'pia-rename': 'Rename',
        'pia-move': 'Move',
        'pia-restore': 'Restore',
        'pia-delete-step': 'Delete step',
        'pia-delete-step-ask': 'Delete this step?',
        'pia-delete-ask': 'Delete this plan?',
        'pia-deleted': 'Deleted',
        'pia-recalc': 'Recalculate from the date',
        'pia-recalc-ask': "Recalculating the steps you haven't customised from the new date. Steps you renamed, moved or added by hand stay as they are.",
        'pia-recalc-done': 'Recalculated',
        'pia-ics': 'Add to calendar',
        'pia-share': 'Share',
        'pia-share-fail': 'Sharing unavailable: the .ics file has been downloaded',
        'pia-print': 'Print or PDF',
        'pia-copy': 'Copy the text',
        'pia-copied': 'Copied',
        'pia-copy-manual': 'Copy failed: select and copy by hand',
        'pia-saved': 'Saved',
        'pia-save-fail': 'Could not save the plan',
        'pia-custom': 'Custom step',
        'pia-date': 'Date',
        'pia-ok': 'OK',
        'pia-edit': 'Edit the plan',
        'pia-delete': 'Delete the plan',

        'pia-step-data-titolo': 'Date and format set',
        'pia-step-data-testo': 'Pick the day (usually a Friday), the format and what you want to spend.',
        'pia-step-data-foglio': 'The whole plan is measured from this date. Changing it after delivery means writing to your distributor and risking stores falling out of sync. Fridays are the convention: weekly shelves refresh then.',

        'pia-step-master-titolo': 'Master approved',
        'pia-step-master-testo': 'Final approved master, 24-bit WAV, plus any versions you need.',
        'pia-step-master-foglio': 'Artwork, teasers and delivery all start from the master. Revision rounds with your mix engineer take days, not hours: eight weeks leave room for two passes without moving the date.',

        'pia-step-split-titolo': 'Split sheet and registration',
        'pia-step-split-testo': 'Put the writer shares in writing, then start the registration (SIAE or Soundreef).',
        'pia-step-split-foglio': 'Registration only completes once every co-writer has agreed: that is social time, not technical time. Settling shares calmly, before the song is out, avoids arguments once money arrives. SIAE registration is free.',

        'pia-step-artwork-titolo': 'Artwork and photos',
        'pia-step-artwork-testo': 'Square 3000×3000 JPG cover, plus press photos and an updated bio.',
        'pia-step-artwork-foglio': 'Artwork ships with the music, so it has to be ready earlier. Distributors reject covers that are blurry, non-square, or carry URLs, QR codes, social or store logos: a rejection costs a full review cycle.',

        'pia-step-consegna-titolo': 'Delivery to the distributor',
        'pia-step-consegna-testo': 'Upload everything to your distributor: audio, artwork, credits, lyrics, date.',
        'pia-step-consegna-foglio': "This is the real bottleneck. DistroKid recommends at least four weeks, TuneCore three to four: with less margin your track can still sit in a store's review queue on release day. Six weeks leave room for one rejection.",

        'pia-step-visual-titolo': 'Canvas, smart link, website',
        'pia-step-visual-testo': 'Vertical clips, Canvas, smart link and an updated page on your site.',
        'pia-step-visual-foglio': 'In a few days you will be sending people to a link: better that it looks finished. Making the visuals now keeps you from shooting content during release week, when you need a clear head.',

        'pia-step-pitch-titolo': 'Spotify editorial pitch',
        'pia-step-pitch-testo': 'Pitch the track to editors from your Spotify for Artists page.',
        'pia-step-pitch-foglio': "The minimum is seven days before release, and it is also what gets you into your followers' Release Radar. Doing it four weeks out leaves margin if delivery slips. One song at a time, and a pitch never guarantees placement.",

        'pia-step-presave-titolo': 'Pre-save and first teaser',
        'pia-step-presave-testo': 'Open the pre-save and post the first teaser.',
        'pia-step-presave-foglio': 'Spotify reports that publishing the pre-save page at least seven days ahead collects on average nearly twice the saves. Three weeks let you push it more than once without wearing people out.',

        'pia-step-press-titolo': 'Press and curators',
        'pia-step-press-testo': 'Send the track to press, radio and curators with a private link.',
        'pia-step-press-foglio': 'Writers work one to three weeks ahead: earlier and the piece goes stale, later and there is no time to publish. Private link and a clear date, so nobody jumps the release.',

        'pia-step-social-titolo': 'Content scheduled',
        'pia-step-social-testo': "Schedule the week's posts and tell your mailing list.",
        'pia-step-social-foglio': 'Release week is for executing, not producing. Having three or four pieces ready means you can answer people instead of editing videos.',

        'pia-step-uscita-titolo': 'Release day',
        'pia-step-uscita-testo': "Check everything is live, then tell people it's out.",
        'pia-step-uscita-foglio': 'Check links, credits, lyrics and that the track reached Release Radar. Stores do not all update at the same minute: if something is missing, it usually lands the same day.',

        'pia-step-seguito-titolo': 'Second wave',
        'pia-step-seguito-testo': "Second wave of content, your own playlists and your listeners'.",
        'pia-step-seguito-foglio': 'The first week counts: recommendation systems watch how your existing audience reacts. A second piece a few days in stretches the tail.',

        'pia-step-dati-titolo': 'Reading the numbers',
        'pia-step-dati-testo': 'Look at the numbers calmly and decide the next move.',
        'pia-step-dati-foglio': 'With a month of data you can see where the plays came from and what worked. It is also the right moment to set the next release date, while it is all still fresh.',

        'pia-step-singolo-titolo': 'Launch single {n}',
        'pia-step-singolo-testo': 'Release a single to lead into the album.'
    }
};
