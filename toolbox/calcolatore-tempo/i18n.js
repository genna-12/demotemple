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

        'calc-copied': 'Copied',
        'calc-copy-manual': 'Copy it manually'
    }
};
