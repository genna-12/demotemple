/**
 * Tiny Temple Toolbox - inglese: chiavi di rima (spec 14b, ricerca §2).
 *
 * Stesse firme dell'italiano, ma in inglese la chiave VERA viene dalla
 * pronuncia, non dalla scrittura: sta nel pacchetto, ricavata dal CMU
 * Pronouncing Dictionary (ARPAbet con la cifra d'accento sulle vocali:
 * "LOVE -> L AH1 V" da chiave "ahv", "ABOVE -> AH0 B AH1 V" la stessa).
 *
 * Qui dentro c'e' quello che serve quando la pronuncia non c'e':
 *   - `chiaveDaArpabet` costruisce la chiave dal CMU (la usa il build);
 *   - `chiavi` da' una chiave DI RIPIEGO dalla scrittura, che serve solo a
 *     non restare senza niente: la strada buona per una parola sconosciuta
 *     e' l'ANALOGIA ORTOGRAFICA (il Worker cerca la parola nota col
 *     suffisso scritto piu' lungo in comune e ne presta la chiave), e in
 *     quel caso il risultato porta il badge "rima per analogia".
 */

import { sillabe, contaSillabe, accento, normalizza, isVocale, CLASSI } from './sillabe.js';

const VOCALE = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u' };
/* vocali ARPAbet: portano sempre la cifra d'accento */
const ARPA_VOCALI = new Set(['aa', 'ae', 'ah', 'ao', 'aw', 'ay', 'eh', 'er', 'ey', 'ih', 'iy', 'ow', 'oy', 'uh', 'uw']);
/* Un carattere per fonema: le chiavi scendono a meta' e il pacchetto con
   loro (1,6 MB -> 1,2 MB compressi). Le vocali stanno nella prima riga. */
const SIMBOLO = {
    aa: 'A', ae: 'a', ah: '^', ao: 'O', aw: 'W', ay: 'Y', eh: 'E', er: 'R', ey: 'e',
    ih: 'i', iy: 'I', ow: 'o', oy: 'y', uh: 'u', uw: 'U',
    b: 'b', ch: 'c', d: 'd', dh: 'D', f: 'f', g: 'g', hh: 'h', jh: 'j', k: 'k', l: 'l',
    m: 'm', n: 'n', ng: 'N', p: 'p', r: 'r', s: 's', sh: 'S', t: 't', th: 'T', v: 'v',
    w: 'w', y: 'J', z: 'z', zh: 'Z'
};
const sim = (f) => SIMBOLO[f] || f;

/**
 * Da "L AH1 V" alla chiave "ahv": si taglia all'ultima vocale con accento
 * primario e si tiene la coda. -> { rima, vocali, consonanti, sillabe, tonica }
 */
export function chiaveDaArpabet(trascrizione) {
    const fonemi = String(trascrizione || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!fonemi.length) return null;
    const base = fonemi.map((f) => f.replace(/\d/g, ''));
    const accenti = fonemi.map((f) => (/(\d)/.exec(f) || [])[1] || null);
    const vocali = [];
    base.forEach((f, i) => { if (ARPA_VOCALI.has(f)) vocali.push(i); });
    if (!vocali.length) return null;
    let tonica = vocali.findIndex((i) => accenti[i] === '1');
    if (tonica < 0) tonica = 0;
    const da = vocali[tonica];
    const coda = base.slice(da);
    return {
        rima: coda.map(sim).join(''),
        vocali: coda.filter((f) => ARPA_VOCALI.has(f)).map(sim).join(''),
        consonanti: base.slice(Math.max(0, da - 1)).filter((f) => !ARPA_VOCALI.has(f)).map(sim).join(''),
        multi: vocali.slice(Math.max(0, vocali.length - 3)).map((i) => sim(base[i])).join(''),
        sillabe: vocali.length,
        tonica,
        classe: CLASSI[Math.min(3, Math.max(0, vocali.length - 1 - tonica))]
    };
}

/** Chiave di ripiego dalla scrittura: l'ultimo gruppo vocalico piu' la coda. */
export function chiaveRima(parola) {
    const p = normalizza(parola).replace(/'/g, '');
    if (!p) return '';
    let ultima = -1;
    for (let i = p.length - 1; i >= 0; i--) {
        if (isVocale(p[i])) { ultima = i; break; }
    }
    if (ultima < 0) return p.slice(-2);
    let inizio = ultima;
    while (inizio > 0 && isVocale(p[inizio - 1])) inizio--;
    return p.slice(inizio);
}

export function scheletroVocalico(parola) {
    return [...chiaveRima(parola)].filter((c) => VOCALE[c]).join('');
}

export function scheletroConsonantico(parola) {
    const p = normalizza(parola).replace(/'/g, '');
    const chiave = chiaveRima(parola);
    const da = Math.max(0, p.length - chiave.length - 2);
    return [...p.slice(da)].filter((c) => !VOCALE[c]).join('');
}

export function chiaveMulti(parola, quante = 3) {
    const parti = sillabe(parola);
    return parti.slice(Math.max(0, parti.length - quante))
        .map((s) => { const v = [...s].filter((c) => VOCALE[c]); return v.length ? v[v.length - 1] : ''; })
        .join('');
}

export { CLASSI };

export function chiavi(parola, { forza = null, arpabet = null } = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    if (arpabet) {
        const k = chiaveDaArpabet(arpabet);
        if (k) return { parola: piatta, sillabe: sillabe(piatta), esito: 'esatto', ...k };
    }
    const parti = sillabe(piatta);
    const acc = accento(piatta, { sillabe: parti, forza });
    return {
        parola: piatta,
        sillabe: parti,
        classe: acc.classe,
        esito: 'stimato',            // senza CMU la chiave e' una supposizione
        tonica: acc.sillaba,
        rima: chiaveRima(piatta),
        vocali: scheletroVocalico(piatta),
        consonanti: scheletroConsonantico(piatta),
        multi: chiaveMulti(piatta, 3),
        conta: contaSillabe(piatta)
    };
}
