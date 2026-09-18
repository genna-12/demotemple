// Tiny Temple Toolbox - Calcolatore tempo - dizionario (IT/EN)
// Modulo dati puro: nessun effetto all'import. Unito a shared/i18n-common.js
// da calcolatore-tempo.js (init(commonDict, toolDict), spec 12 §3/§8).
// Le note (C, C#, D...) e le unita' "ms"/"Hz" non si traducono: notazione
// musicale/scientifica universale, testo statico nell'HTML o scritto dal
// JS senza passare da t(). calc-*-full e calc-copy-action/calc-cents-value
// sono per l'aria-label esteso delle celle ("1/8 puntata, 375 millisecondi,
// copia", spec 12 §4), costruito da calcolatore-tempo.js con t(): non
// compaiono nel markup statico, li' l'aria-label e' gia' scritto per
// intero (valori a 120 BPM/ms, criterio di accettazione 1).
export default {
    it: {
        'calc-title': 'Calcolatore tempo',
        'calc-tab-delay': 'Delay e riverbero',
        'calc-tab-note': 'Nota e frequenza',
        'calc-tab-sidechain': 'Sidechain',

        'calc-bpm-aria': 'Tempo in battiti al minuto',
        'calc-bpm-input-aria': 'BPM, modifica il valore',

        'calc-unit-aria': 'Unità, millisecondi o Hz',
        'calc-unit-ms': 'ms',
        'calc-unit-hz': 'Hz',

        'calc-div': 'Suddivisione',
        'calc-straight': 'Normale',
        'calc-dotted': 'Puntata',
        'calc-triplet': 'Terzina',
        'calc-ms-full': 'millisecondi',
        'calc-hz-full': 'Hertz',
        'calc-copy-action': 'copia',

        'calc-reverb-title': 'Riverbero',
        'calc-predelay': 'Pre-delay',
        'calc-decay': 'Coda',
        'calc-decay-1': '1 battuta',
        'calc-decay-2': '2 battute',
        'calc-decay-4': '4 battute',

        'calc-dir-aria': 'Direzione',
        'calc-dir-note-hz': 'Nota → Hz',
        'calc-dir-hz-note': 'Hz → Nota',
        'calc-note-aria': 'Nota',
        'calc-octave': 'Ottava',
        'calc-a4': 'Riferimento A4',
        'calc-a4-reset': 'Reimposta 440',
        'calc-a4-info-title': 'Riferimento A4',
        'calc-a4-info-text': 'Le frequenze delle note si calcolano da un La di riferimento: 440 Hz è lo standard. La velocità del suono usata per la lunghezza d\'onda è fissa a 343 m/s (aria a temperatura ambiente).',
        'calc-hz-result': 'Frequenza',
        'calc-hz-input-aria': 'Frequenza in Hz',
        'calc-note-result': 'Nota',
        'calc-wavelength': 'Lunghezza d\'onda',
        'calc-period': 'Periodo',
        'calc-cents-value': '{n} cent',

        'calc-lfo-rate': 'Frequenza LFO',
        'calc-attack': 'Attacco',
        'calc-attack-range': '0,5–5 ms',
        'calc-release-soft': 'Morbido',
        'calc-release-hard': 'Deciso',

        'calc-intro-delay': 'Trova i tempi di delay e riverbero a tempo col brano.',
        'calc-intro-note': 'Converti una nota in frequenza per lavorare con l\'EQ.',
        'calc-intro-sidechain': 'Imposta LFO e sidechain a tempo.',
        'calc-info-delay-title': 'Delay e riverbero',
        'calc-info-delay-text': 'Imposta il BPM del brano con la rotella, poi scegli se leggere i tempi in millisecondi o in Hz. Tocca una cella della tabella per copiarla: ad esempio a 120 BPM l\'ottavo puntato è 375 ms, il valore giusto per il delay time del tuo plugin. Le righe Pre-delay e Coda sotto servono per il riverbero: impostale nello stesso modo nel tuo plugin di riverbero.',
        'calc-info-note-title': 'Nota e frequenza',
        'calc-info-note-text': 'Scegli una nota e un\'ottava (o il senso inverso, da una frequenza in Hz) per sapere a quanti Hz corrisponde. Usa il risultato per centrare un filtro o un EQ su quella nota: ad esempio il La3 (A3) è vicino a 220 Hz, un buon punto di partenza per tagliare o esaltare quella frequenza in un mix.',
        'calc-info-sidechain-title': 'Sidechain',
        'calc-info-sidechain-text': 'Imposta il BPM del brano, poi scegli la suddivisione del tuo LFO o del sidechain (ad esempio 1/4 per un pompaggio a ogni battito). Copia il valore di rilascio morbido o deciso e incollalo nel tempo di rilascio del tuo compressore o del generatore di inviluppo: a 120 BPM un quarto morbido è 300 ms.',

        'calc-copied': 'Copiato',
        'calc-copy-manual': 'Copia a mano'
    },
    en: {
        'calc-title': 'Tempo calculator',
        'calc-tab-delay': 'Delay & reverb',
        'calc-tab-note': 'Note & frequency',
        'calc-tab-sidechain': 'Sidechain',

        'calc-bpm-aria': 'Tempo in beats per minute',
        'calc-bpm-input-aria': 'BPM, edit the value',

        'calc-unit-aria': 'Unit, milliseconds or Hz',
        'calc-unit-ms': 'ms',
        'calc-unit-hz': 'Hz',

        'calc-div': 'Division',
        'calc-straight': 'Straight',
        'calc-dotted': 'Dotted',
        'calc-triplet': 'Triplet',
        'calc-ms-full': 'milliseconds',
        'calc-hz-full': 'Hertz',
        'calc-copy-action': 'copy',

        'calc-reverb-title': 'Reverb',
        'calc-predelay': 'Pre-delay',
        'calc-decay': 'Decay',
        'calc-decay-1': '1 bar',
        'calc-decay-2': '2 bars',
        'calc-decay-4': '4 bars',

        'calc-dir-aria': 'Direction',
        'calc-dir-note-hz': 'Note → Hz',
        'calc-dir-hz-note': 'Hz → Note',
        'calc-note-aria': 'Note',
        'calc-octave': 'Octave',
        'calc-a4': 'A4 reference',
        'calc-a4-reset': 'Reset to 440',
        'calc-a4-info-title': 'A4 reference',
        'calc-a4-info-text': 'Note frequencies are worked out from a reference A: 440 Hz is the standard. The speed of sound used for the wavelength is fixed at 343 m/s (air at room temperature).',
        'calc-hz-result': 'Frequency',
        'calc-hz-input-aria': 'Frequency in Hz',
        'calc-note-result': 'Note',
        'calc-wavelength': 'Wavelength',
        'calc-period': 'Period',
        'calc-cents-value': '{n} cents',

        'calc-lfo-rate': 'LFO rate',
        'calc-attack': 'Attack',
        'calc-attack-range': '0.5–5 ms',
        'calc-release-soft': 'Soft',
        'calc-release-hard': 'Hard',

        'calc-intro-delay': 'Find delay and reverb times that lock to the track.',
        'calc-intro-note': 'Convert a note to a frequency to work with the EQ.',
        'calc-intro-sidechain': 'Set LFO and sidechain timing to the beat.',
        'calc-info-delay-title': 'Delay & reverb',
        'calc-info-delay-text': 'Set the track\'s BPM with the wheel, then choose whether to read times in milliseconds or Hz. Tap a table cell to copy it: at 120 BPM, for example, a dotted eighth is 375 ms — the value to type into your delay plugin\'s time field. The Pre-delay and Decay rows below are for reverb: set them the same way in your reverb plugin.',
        'calc-info-note-title': 'Note & frequency',
        'calc-info-note-text': 'Pick a note and octave (or go the other way, from a frequency in Hz) to see what Hz it maps to. Use the result to centre a filter or an EQ band on that note: for example A3 sits near 220 Hz, a good starting point to cut or boost that frequency in a mix.',
        'calc-info-sidechain-title': 'Sidechain',
        'calc-info-sidechain-text': 'Set the track\'s BPM, then pick the division for your LFO or sidechain (for example 1/4 for a pump on every beat). Copy the soft or hard release value and paste it into your compressor\'s or envelope generator\'s release time: at 120 BPM a soft quarter is 300 ms.',

        'calc-copied': 'Copied',
        'calc-copy-manual': 'Copy it manually'
    }
};
