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
        'dna-too-long': 'File troppo grande',
        'dna-long-warning': "File lungo: l'analisi potrebbe metterci di più"
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
        'dna-too-long': 'File too large',
        'dna-long-warning': 'Long file: analysis may take a bit longer'
    }
};
