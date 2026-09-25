// Tiny Temple Toolbox - DNA della traccia - dizionario (IT/EN)
// Modulo dati puro: nessun effetto all'import. Unito a shared/i18n-common.js
// da dna.js (init(commonDict, toolDict), spec 13 §3/§4). mic-denied e
// audio-resume-msg usate da questa pagina sono in i18n-common.js (mic.js/
// audio.js sono condivisi da tutta la Toolbox). "BPM"/"LUFS"/"dBTP"/"LU"
// non si traducono: unita' tecniche universali, scritte a mano nell'HTML
// o costruite dal JS senza passare da t() (stesso principio di "ms"/"Hz"
// nel calcolatore tempo). Spotify/Apple Music/YouTube/Tidal (nomi delle
// piattaforme nel <select> #dna-target) sono marchi, non si traducono.
export default {
    it: {
        'dna-title': 'DNA della traccia',
        'dna-choose': 'Scegli file',
        'dna-drop-hint': 'Trascina qui un brano',
        'dna-record': 'Registra',
        'dna-formats': 'MP3, WAV, M4A, AAC, OGG, FLAC — fino a 15 minuti',
        'dna-recent': 'Recenti',

        'dna-stop': 'Ferma',
        'dna-cancel': 'Annulla',
        'dna-level-aria': 'Livello del microfono',
        'dna-analysing': 'Analisi in corso',
        'dna-phase-decode': 'Decodifica…',
        'dna-phase-loudness': 'Loudness…',
        'dna-phase-rhythm': 'Ritmo…',
        'dna-phase-key': 'Tonalità…',

        'dna-key': 'Tonalità',
        'dna-major': 'maggiore',
        'dna-minor': 'minore',
        'dna-bpm-fold-aria': "Correggi l'ottava",
        'dna-fold-half': 'Dimezza',
        'dna-fold-double': 'Raddoppia',

        'dna-platform': 'Piattaforma',
        'dna-lufs-title': 'Loudness e target',
        'dna-lufs-info-title': 'Loudness e target',
        'dna-lufs-info-text': "I LUFS misurano quanto un brano suona forte in media nel tempo, come lo sente l'orecchio; il picco reale (true peak, dBTP) è invece il valore assoluto più alto del segnale. Le piattaforme di streaming abbassano da sole i brani troppo forti fino al loro livello di riferimento: Spotify punta a −14 LUFS, Apple Music a −16 LUFS, YouTube a −14 LUFS e Tidal a −14 LUFS, tutte con un picco reale massimo di −1 dBTP. Se questo strumento consiglia di alzare di X dB, il brano è più piano del target: alzando il volume in fase di mastering ti avvicini al livello scelto dalla piattaforma. Se consiglia di abbassare di X dB, il brano è più forte del target e verrà comunque abbassato in streaming: conviene farlo prima, mantenendo il controllo sul suono finale.",
        'dna-on-target': 'In target',
        'dna-turn-up': 'Alza di',
        'dna-turn-down': 'Abbassa di',
        'dna-tp-label': 'Picco reale',
        'dna-lra-label': 'Escursione',

        'dna-duration-label': 'Durata',
        'dna-rate-label': 'Campionamento',
        'dna-channels-label': 'Canali',

        'dna-conf-high': 'Confidenza alta',
        'dna-conf-mid': 'Confidenza media',
        'dna-conf-low': 'Confidenza bassa',

        'dna-estimate': 'Stima dal microfono',
        'dna-mic-name': 'Registrazione microfono',
        'dna-copy': 'Copia',
        'dna-copied': 'Copiato',
        'dna-copy-manual': 'Copia a mano',
        'dna-again': 'Analizza un altro',

        'dna-bad-file': 'Formato non letto',
        'dna-silent': 'Nessun suono rilevato',
        'dna-none-unsure': 'Nessun risultato affidabile',
        'dna-none-silent': 'Nessun suono rilevato',
        'dna-none-hint': 'Avvicina il telefono alla cassa, alza il volume e riprova.',
        'dna-retry': 'Riprova',
        'dna-rec-name': 'Registrazione {when}',
        'dna-rename': 'Rinomina',
        'dna-too-long': 'File troppo grande',
        'dna-long-warning': "File lungo: l'analisi potrebbe metterci di più",

        'dna-del-one': 'Elimina',
        'dna-clear': 'Svuota Recenti',
        'dna-clear-ask': 'Cancello tutti i Recenti?',
        'dna-clear-yes': 'Svuota',
        'dna-clear-no': 'Annulla',
        'dna-history-empty': 'Nessuna analisi ancora',

        'dna-mic-denied': 'Permesso del microfono negato',
        'dna-mic-none': 'Nessun microfono trovato',
        'dna-mic-busy': 'Microfono già in uso',
        'dna-mic-unsupported': 'Microfono non disponibile su questo browser',
        'dna-mic-failed': 'Non è stato possibile usare il microfono',

        'dna-press': 'Tocca il logo per iniziare',
        'dna-listening': 'In ascolto… tocca per annullare',
        'dna-almost': 'Quasi fatto…',
        'dna-uncertain': 'Il risultato non è del tutto certo: verificalo a orecchio.',
        'dna-mic-note': 'Stima dal microfono: un buon punto di partenza, non sostituisce il file audio.',
        'dna-mic-info-title': 'Stima dal microfono',
        'dna-mic-info-text': "BPM e tonalità possono essere sbagliati, anche di molto: dal microfono l'analisi è una stima. Per un risultato affidabile usa il file.",
        'dna-target-label': 'Target {platform}: {lufs} LUFS',

        /* Spec 20 (DNA «completo») + revisione ui-ux: router, Recenti anche
           nel risultato, ricerca, filtro per compatibili, confronto, esporta,
           condividi. Un solo termine in tutta la pagina per questa sezione:
           «Recenti», mai «storico» (coerente con l’h2 di #dna-history-wrap). */
        'dna-saved': 'Salvato nei Recenti',
        'dna-gone': 'Analisi non trovata',

        'dna-search': 'Cerca nei Recenti',
        'dna-search-empty': 'Nessun risultato per la ricerca',
        'dna-filter-label': 'Brani in {camelot}',
        'dna-filter-clear-aria': 'Togli il filtro',
        'dna-filter-empty': 'Nessun altro brano in {camelot} nei Recenti',
        'dna-export': 'Esporta .csv',
        'dna-share': 'Condividi',
        /* «Mostra tutte» sotto un risultato (revisione ui-ux): lo storico si
           accorcia a 5 voci, dna.js crea #dna-history-more col testo qui. */
        'dna-history-more': 'Mostra tutte ({n})',

        /* Sopra i chip Camelot (revisione ui-ux, non più solo «Compatibili»
           affiancata): spiega anche cosa fare col tocco. */
        'dna-compat-hint': 'Compatibili · tocca per filtrare',

        'dna-fold-hint': 'Forse è la metà o il doppio?',
        'dna-lufs-hint': 'I LUFS misurano il volume medio percepito: tocca la i',

        'dna-compare-title': 'Confronto',
        'dna-compare-tip': 'Confronta',
        'dna-compare-current': 'Questa',
        'dna-compare-other': 'Altra',
        'dna-compare-compatible': 'compatibile',
        'dna-compare-incompatible': 'non compatibile',
        /* Newline finale (revisione ui-ux): con .dna-compare-delta in
           white-space:pre-line manda «· compatibile/non compatibile» su una
           riga propria sotto i semitoni, senza toccare dna.js (che unisce le
           due parti con «space middot space»). meno() nei test normalizza
           gli spazi, quindi l’a capo non cambia le stringhe attese lì. */
        'dna-compare-semitone': '{n} semitono',
        'dna-compare-semitones': '{n} semitoni',

        'dna-csv-name': 'Nome',
        'dna-csv-date': 'Data',
        'dna-csv-bpm': 'BPM',
        'dna-csv-key': 'Tonalità',
        'dna-csv-camelot': 'Camelot',
        'dna-csv-lufs': 'LUFS',
        'dna-csv-tp': 'dBTP',
        'dna-csv-lra': 'LRA',
        'dna-csv-duration': 'Durata (s)',
        'dna-csv-source': 'Fonte',
        'dna-csv-copied': 'CSV copiato negli appunti',
        'dna-csv-fail': 'Impossibile esportare il CSV',

        'dna-src-file': 'File',
        'dna-src-mic': 'Microfono'
    },
    en: {
        'dna-title': 'Track DNA',
        'dna-choose': 'Choose a file',
        'dna-drop-hint': 'Drop a track here',
        'dna-record': 'Record',
        'dna-formats': 'MP3, WAV, M4A, AAC, OGG, FLAC — up to 15 minutes',
        'dna-recent': 'Recent',

        'dna-stop': 'Stop',
        'dna-cancel': 'Cancel',
        'dna-level-aria': 'Microphone level',
        'dna-analysing': 'Analysing',
        'dna-phase-decode': 'Decoding…',
        'dna-phase-loudness': 'Loudness…',
        'dna-phase-rhythm': 'Rhythm…',
        'dna-phase-key': 'Key…',

        'dna-key': 'Key',
        'dna-major': 'major',
        'dna-minor': 'minor',
        'dna-bpm-fold-aria': 'Fix the octave',
        'dna-fold-half': 'Halve',
        'dna-fold-double': 'Double',

        'dna-platform': 'Platform',
        'dna-lufs-title': 'Loudness and target',
        'dna-lufs-info-title': 'Loudness and target',
        'dna-lufs-info-text': "LUFS measures how loud a track sounds on average over time, the way the ear hears it; true peak (dBTP) is instead the highest absolute value of the signal. Streaming platforms turn down tracks that are too loud to their own reference level on their own: Spotify targets −14 LUFS, Apple Music −16 LUFS, YouTube −14 LUFS and Tidal −14 LUFS, all with a maximum true peak of −1 dBTP. If this tool suggests turning up by X dB, the track is quieter than the target: raising the level at mastering time brings it closer to what the platform expects. If it suggests turning down by X dB, the track is louder than the target and streaming will turn it down anyway: better to do it yourself first, keeping control over the final sound.",
        'dna-on-target': 'On target',
        'dna-turn-up': 'Turn up by',
        'dna-turn-down': 'Turn down by',
        'dna-tp-label': 'True peak',
        'dna-lra-label': 'Loudness range',

        'dna-duration-label': 'Duration',
        'dna-rate-label': 'Sample rate',
        'dna-channels-label': 'Channels',

        'dna-conf-high': 'High confidence',
        'dna-conf-mid': 'Medium confidence',
        'dna-conf-low': 'Low confidence',

        'dna-estimate': 'Microphone estimate',
        'dna-mic-name': 'Microphone recording',
        'dna-copy': 'Copy',
        'dna-copied': 'Copied',
        'dna-copy-manual': 'Copy it manually',
        'dna-again': 'Analyse another',

        'dna-bad-file': 'Could not read this file',
        'dna-silent': 'No sound detected',
        'dna-none-unsure': 'No reliable result',
        'dna-none-silent': 'No sound detected',
        'dna-none-hint': 'Move the phone closer to the speaker, turn the volume up and try again.',
        'dna-retry': 'Try again',
        'dna-rec-name': 'Recording {when}',
        'dna-rename': 'Rename',
        'dna-too-long': 'File too large',
        'dna-long-warning': 'Long file: analysis may take a bit longer',

        'dna-del-one': 'Delete',
        'dna-clear': 'Clear Recent',
        'dna-clear-ask': 'Clear everything in Recent?',
        'dna-clear-yes': 'Clear',
        'dna-clear-no': 'Cancel',
        'dna-history-empty': 'No analyses yet',

        'dna-mic-denied': 'Microphone permission denied',
        'dna-mic-none': 'No microphone found',
        'dna-mic-busy': 'Microphone already in use',
        'dna-mic-unsupported': 'Microphone not available in this browser',
        'dna-mic-failed': 'Could not use the microphone',

        'dna-press': 'Tap the logo to start',
        'dna-listening': 'Listening… tap to cancel',
        'dna-almost': 'Almost there…',
        'dna-uncertain': "The result isn't fully certain: double-check it by ear.",
        'dna-mic-note': "Microphone estimate: a good starting point, not a substitute for the audio file.",
        'dna-mic-info-title': 'Microphone estimate',
        'dna-mic-info-text': "BPM and key can be wrong, sometimes by a lot: from the microphone the analysis is only an estimate. For a reliable result, use the file.",
        'dna-target-label': 'Target {platform}: {lufs} LUFS',

        /* Spec 20 (DNA «complete») + ui-ux revision: router, Recent under the
           result, search, compatible-key filter, compare, export, share. One
           single term for this section everywhere on the page (Recent,
           never history), matching the h2 on #dna-history-wrap. */
        'dna-saved': 'Added to Recent',
        'dna-gone': 'Analysis not found',

        'dna-search': 'Search Recent',
        'dna-search-empty': 'No results for this search',
        'dna-filter-label': '{camelot} tracks',
        'dna-filter-clear-aria': 'Clear the filter',
        'dna-filter-empty': 'No other {camelot} tracks in Recent',
        'dna-export': 'Export .csv',
        'dna-share': 'Share',
        /* «Show all» under a result (ui-ux revision): the list shortens to
           5 entries, dna.js builds #dna-history-more with this text. */
        'dna-history-more': 'Show all ({n})',

        /* Above the Camelot chips (ui-ux revision, no longer just the word
           Compatible alongside them): also explains what a tap does. */
        'dna-compat-hint': 'Compatible · tap to filter',

        'dna-fold-hint': 'Could be half or double?',
        'dna-lufs-hint': 'LUFS measure average perceived loudness: tap the i',

        'dna-compare-title': 'Compare',
        'dna-compare-tip': 'Compare',
        'dna-compare-current': 'This one',
        'dna-compare-other': 'Other',
        'dna-compare-compatible': 'compatible',
        'dna-compare-incompatible': 'not compatible',
        /* Trailing newline (ui-ux revision): with .dna-compare-delta in
           white-space:pre-line this puts compatible/not compatible on its
           own line under the semitones, without touching dna.js (it joins
           the two parts with a middot). Tests normalise whitespace, so the
           newline does not change the strings they expect. */
        'dna-compare-semitone': '{n} semitone',
        'dna-compare-semitones': '{n} semitones',

        'dna-csv-name': 'Name',
        'dna-csv-date': 'Date',
        'dna-csv-bpm': 'BPM',
        'dna-csv-key': 'Key',
        'dna-csv-camelot': 'Camelot',
        'dna-csv-lufs': 'LUFS',
        'dna-csv-tp': 'dBTP',
        'dna-csv-lra': 'LRA',
        'dna-csv-duration': 'Duration (s)',
        'dna-csv-source': 'Source',
        'dna-csv-copied': 'CSV copied to the clipboard',
        'dna-csv-fail': 'Could not export the CSV',

        'dna-src-file': 'File',
        'dna-src-mic': 'Microphone'
    }
};
