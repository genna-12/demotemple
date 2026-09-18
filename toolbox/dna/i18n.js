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
        'dna-compat': 'Compatibili',
        'dna-bpm-fold-aria': "Correggi l'ottava",
        'dna-fold-half': 'Dimezza',
        'dna-fold-double': 'Raddoppia',

        'dna-platform': 'Piattaforma',
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
        'dna-too-long': 'File troppo grande',
        'dna-long-warning': "File lungo: l'analisi potrebbe metterci di più",

        'dna-del-one': 'Elimina',
        'dna-clear': 'Svuota storico',
        'dna-clear-ask': 'Cancello tutto lo storico?',
        'dna-clear-yes': 'Svuota',
        'dna-clear-no': 'Annulla',
        'dna-history-empty': 'Nessuna analisi ancora',

        'dna-mic-denied': 'Permesso del microfono negato',
        'dna-mic-none': 'Nessun microfono trovato',
        'dna-mic-busy': 'Microfono già in uso',
        'dna-mic-unsupported': 'Microfono non disponibile su questo browser',
        'dna-mic-failed': 'Non è stato possibile usare il microfono',

        'dna-press': 'Premi per iniziare',
        'dna-listening': 'In ascolto…',
        'dna-almost': 'Quasi fatto…',
        'dna-uncertain': 'Il risultato non è del tutto certo: verificalo a orecchio.',
        'dna-mic-note': 'Stima dal microfono: un buon punto di partenza, non sostituisce il file audio.',
        'dna-mic-info-title': 'Stima dal microfono',
        'dna-mic-info-text': "La registrazione dal microfono capta anche l'ambiente e la qualità di chi riproduce il brano: BPM e tonalità restano affidabili nella maggior parte dei casi, ma il loudness (LUFS/picco reale) misurato così non è utilizzabile per la distribuzione. Per quei valori usa sempre il file audio originale.",
        'dna-target-label': 'Target {platform}: {lufs} LUFS'
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
        'dna-compat': 'Compatible',
        'dna-bpm-fold-aria': 'Fix the octave',
        'dna-fold-half': 'Halve',
        'dna-fold-double': 'Double',

        'dna-platform': 'Platform',
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
        'dna-too-long': 'File too large',
        'dna-long-warning': 'Long file: analysis may take a bit longer',

        'dna-del-one': 'Delete',
        'dna-clear': 'Clear history',
        'dna-clear-ask': 'Clear the whole history?',
        'dna-clear-yes': 'Clear',
        'dna-clear-no': 'Cancel',
        'dna-history-empty': 'No analyses yet',

        'dna-mic-denied': 'Microphone permission denied',
        'dna-mic-none': 'No microphone found',
        'dna-mic-busy': 'Microphone already in use',
        'dna-mic-unsupported': 'Microphone not available in this browser',
        'dna-mic-failed': 'Could not use the microphone',

        'dna-press': 'Tap to start',
        'dna-listening': 'Listening…',
        'dna-almost': 'Almost there…',
        'dna-uncertain': "The result isn't fully certain: double-check it by ear.",
        'dna-mic-note': "Microphone estimate: a good starting point, not a substitute for the audio file.",
        'dna-mic-info-title': 'Microphone estimate',
        'dna-mic-info-text': "A microphone recording also picks up the room and the quality of whatever is playing the track: BPM and key stay reliable in most cases, but loudness (LUFS/true peak) measured this way isn't usable for distribution. For those values, always use the original audio file.",
        'dna-target-label': 'Target {platform}: {lufs} LUFS'
    }
};
