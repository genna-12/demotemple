/**
 * Tiny Temple Toolbox - inglese: sillabe e accento (spec 14b, ricerca §2).
 *
 * Modulo PURO, stesse firme dell'italiano. In inglese la scrittura non
 * dice il suono: la verita' sta nel CMU Pronouncing Dictionary, che viaggia
 * dentro il pacchetto (sillabe e accento gia' pronti, un byte per parola).
 * Qui c'e' il ripiego per quando il pacchetto non c'e' o la parola non c'e'
 * dentro: si contano i GRUPPI VOCALICI con le eccezioni note
 *   - "e" finale muta ("love" = 1, non 2)
 *   - "-le" sillabico dopo consonante ("table" = 2)
 *   - "-es"/"-ed" contano solo dopo sibilante o t/d ("wanted" = 2, "loved" = 1)
 * e l'accento si dichiara STIMATO (default sulla prima sillaba, che in
 * inglese e' la scelta piu' probabile per le parole corte).
 */

export const VOCALI = 'aeiouy';
export const ACCENTATE = '';

export const isVocale = (c) => !!c && VOCALI.indexOf(c) !== -1;
export const isAccentata = () => false;
export const senzaAccento = (c) => c;

export function normalizza(parola) {
    /* in inglese l'accento non conta: si scompone e si buttano i segni,
       cosi' "cafe'" resta "cafe" e non "caf". */
    return String(parola || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[^a-z']/g, '');
}

const SIBILANTI = ['s', 'z', 'x', 'ch', 'sh', 'ge', 'ce', 'se'];

/** Quante sillabe ha (conteggio dei gruppi vocalici, con le eccezioni). */
export function contaSillabe(parola) {
    const p = normalizza(parola).replace(/'/g, '');
    if (!p) return 0;
    if (p.length <= 3) return 1;
    let gruppi = 0;
    let dentro = false;
    for (let i = 0; i < p.length; i++) {
        const v = isVocale(p[i]);
        if (v && !dentro) gruppi++;
        dentro = v;
    }
    /* "e" finale muta, ma non in "-le" sillabico ne' dopo una sola lettera */
    if (/e$/.test(p) && !/[aeiouy]e$/.test(p)) {
        if (/[^aeiouy]le$/.test(p)) { /* "table", "little": la e resta */ }
        else gruppi--;
    }
    if (/(?:[^aeiouy])ed$/.test(p) && !/(?:[td])ed$/.test(p)) gruppi--;       // "loved" = 1
    if (/(?:[^aeiouy])es$/.test(p) && !SIBILANTI.some((s) => p.slice(0, -2).endsWith(s))) gruppi--;
    return Math.max(1, gruppi);
}

/** Sillabe "a occhio": servono solo per mostrarle, il numero e' contaSillabe. */
export function sillabe(parola) {
    const p = normalizza(parola).replace(/'/g, '');
    if (!p) return [];
    const quante = contaSillabe(p);
    if (quante <= 1) return [p];
    /* taglio ingenuo: dopo ogni gruppo vocalico, portando avanti una consonante */
    const out = [];
    let cur = '';
    let gruppi = 0;
    for (let i = 0; i < p.length; i++) {
        cur += p[i];
        const v = isVocale(p[i]);
        const prossimaV = isVocale(p[i + 1]);
        if (v && !prossimaV) gruppi++;
        if (v && !prossimaV && gruppi < quante && i + 2 < p.length && !isVocale(p[i + 1])) {
            out.push(cur);
            cur = '';
        }
    }
    if (cur) out.push(cur);
    return out.length ? out : [p];
}

export const CLASSI = ['tronca', 'piana', 'sdrucciola', 'bisdrucciola'];
export function classeDi(indice, totale) {
    const indietro = totale - 1 - indice;
    return CLASSI[Math.min(CLASSI.length - 1, Math.max(0, indietro))];
}

/** Senza CMU l'accento e' una stima dichiarata: prima sillaba. */
export function accento(parola, { sillabe: sill = null, forza = null } = {}) {
    const parti = sill || sillabe(parola);
    const n = parti.length || 1;
    if (forza) {
        const indietro = CLASSI.indexOf(forza);
        const idx = Math.max(0, n - 1 - (indietro < 0 ? 1 : indietro));
        return { sillaba: idx, classe: classeDi(idx, n), esito: 'stimato' };
    }
    if (n === 1) return { sillaba: 0, classe: 'tronca', esito: 'esatto' };
    return { sillaba: 0, classe: classeDi(0, n), esito: 'stimato' };
}

export function analizza(parola) {
    const parti = sillabe(parola);
    const acc = accento(parola, { sillabe: parti });
    return { parola: normalizza(parola), sillabe: parti, ...acc };
}
