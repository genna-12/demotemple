/**
 * Tiny Temple Toolbox - aritmetica del tempo (spec 12 §4).
 *
 * Modulo puro: nessun DOM, nessun import, nessun effetto. Restituisce
 * numeri; la formattazione (virgole, cifre, lingua) sta nella pagina.
 * Le "regole" del riverbero e del sidechain sono convenzioni diffuse fra
 * chi mixa, non leggi fisiche: servono a partire da un valore sensato.
 */

/** Durata di un movimento (1/4) in millisecondi. */
export function msPerBeat(bpm) {
    return 60000 / bpm;
}

/* Normale = il valore; puntata = una volta e mezza; terzina = due terzi. */
const MODS = { straight: 1, dotted: 1.5, triplet: 2 / 3 };

/** Suddivisioni della tabella: 1/1, 1/2, ... 1/64 (il denominatore). */
export const DIVISIONS = [1, 2, 4, 8, 16, 32, 64];
export const MODS_ORDER = ['straight', 'dotted', 'triplet'];

/**
 * Millisecondi di una suddivisione: `den` e' il denominatore (4 = 1/4),
 * `mod` e' 'straight' | 'dotted' | 'triplet'.
 */
export function divisionMs(bpm, den, mod = 'straight') {
    const factor = MODS[mod] || 1;
    return msPerBeat(bpm) * (4 / den) * factor;
}

/** Tabella 7 x 3 in millisecondi: [{ den, straight, dotted, triplet }]. */
export function tempoTable(bpm) {
    return DIVISIONS.map((den) => ({
        den,
        straight: divisionMs(bpm, den, 'straight'),
        dotted: divisionMs(bpm, den, 'dotted'),
        triplet: divisionMs(bpm, den, 'triplet')
    }));
}

/** Da millisecondi a Hz (un delay di 500 ms e' 2 Hz). */
export function hzFromMs(ms) {
    return 1000 / ms;
}

export function msFromHz(hz) {
    return 1000 / hz;
}

/**
 * Riverbero: pre-delay corto (1/64 e 1/128) e coda lunga 1, 2 o 4
 * battute in 4/4 (4, 8, 16 movimenti).
 */
export function reverb(bpm) {
    const beat = msPerBeat(bpm);
    return {
        predelay64: divisionMs(bpm, 64),
        predelay128: divisionMs(bpm, 128),
        decay1: beat * 4,
        decay2: beat * 8,
        decay4: beat * 16
    };
}

export const SIDECHAIN_RATES = [1, 2, 4, 8, 16];
/** Attacco consigliato: sempre corto, si regola a orecchio. */
export const SIDECHAIN_ATTACK = { min: 0.5, max: 5 };

/**
 * Sidechain: per ogni suddivisione la frequenza dell'LFO e il rilascio
 * consigliato, morbido (60% dell'intervallo) o deciso (35%).
 */
export function sidechain(bpm) {
    return {
        attack: { ...SIDECHAIN_ATTACK },
        rates: SIDECHAIN_RATES.map((den) => {
            const ms = divisionMs(bpm, den);
            return {
                den,
                ms,
                hz: hzFromMs(ms),
                releaseSoft: ms * 0.6,
                releaseHard: ms * 0.35
            };
        })
    };
}

/** Lunghezza d'onda in metri (aria a 343 m/s: vedi spec 12 §7). */
export function wavelength(hz, c = 343) {
    return c / hz;
}

/** Periodo di un'oscillazione, in millisecondi. */
export function periodMs(hz) {
    return 1000 / hz;
}

/** Riporta un numero dentro i limiti (i valori fuori scala rientrano). */
export function clamp(v, min, max) {
    const n = Number(v);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
}
