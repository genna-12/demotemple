/**
 * Tiny Temple Toolbox - francese: sillabe e "e muet" (spec 14b, ricerca §2).
 *
 * Modulo PURO, stesse firme dell'italiano. Due cose sole, in francese:
 *
 * 1. L'ACCENTO E' FISSO: cade sull'ultima sillaba piena (l'ultima vocale
 *    che non sia uno schwa). Non c'e' niente da indovinare, quindi l'esito
 *    e' sempre 'esatto' e la classe e' sempre 'tronca' nel senso
 *    italiano del termine (la rima parte dall'ultima vocale pronunciata).
 *
 * 2. L'E MUET NON SI DECIDE CON UNA REGOLA: nel cantato "petite" fa due
 *    sillabe, nel verso classico tre. E' una scelta di chi scrive, come la
 *    dialefe in italiano: `sillabe(parola, { emuet })` e il conteggio del
 *    verso la espongono, non la impongono. Default: NON conta.
 *
 * Sillabazione: sillaba aperta preferita, consonante singola fra vocali va
 * avanti, ostruente + liquida resta unita, consonante finale chiude.
 */

export const VOCALI = 'aeiouyàâäéèêëïîôöùûüÿœæ';
export const ACCENTATE = 'àâéèêëïîôùûü';
const SENZA = { à: 'a', â: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', ï: 'i', î: 'i', ô: 'o', ö: 'o', ù: 'u', û: 'u', ü: 'u', ÿ: 'y', œ: 'oe', æ: 'ae' };

export const isVocale = (c) => !!c && VOCALI.indexOf(c) !== -1;
export const isAccentata = (c) => !!c && ACCENTATE.indexOf(c) !== -1;
export const senzaAccento = (c) => SENZA[c] || c;

export function normalizza(parola) {
    /* NFC prima del filtro: gli accenti combinanti delle tastiere Apple
       sparirebbero ("é" -> "e") e con loro la vocale giusta. */
    return String(parola || '').normalize('NFC').toLowerCase()
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[^a-zàâäéèêëïîôöùûüÿœæç'-]/g, '');
}

/* Gruppi di lettere che valgono UNA vocale sola. */
const GRUPPI = ['eau', 'eaux', 'aient', 'ai', 'ay', 'ei', 'au', 'ou', 'oy', 'eu', 'oe', 'oi', 'ui', 'ie', 'ia', 'io', 'ue', 'ya', 'ye', 'yo'];
const MUTA_LIQUIDA = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr', 'ch', 'ph', 'th', 'gn']);

/** I nuclei vocalici scritti: [{ inizio, fine, muta }] */
function nuclei(chars, { emuet = false } = {}) {
    const out = [];
    let i = 0;
    while (i < chars.length) {
        if (!isVocale(chars[i])) { i++; continue; }
        let fine = i + 1;
        while (fine < chars.length && isVocale(chars[fine])) fine++;
        /* il gruppo scritto vale un nucleo solo, salvo gli iati noti */
        const gruppo = chars.slice(i, fine).join('');
        if (gruppo.length > 1 && !GRUPPI.includes(gruppo) && !GRUPPI.includes(gruppo.slice(0, 2))) {
            /* "ae", "ao": due nuclei */
            out.push({ inizio: i, fine: i + 1 });
            out.push({ inizio: i + 1, fine });
        } else {
            out.push({ inizio: i, fine });
        }
        i = fine;
    }
    /* e muet: "e" finale (anche in -es, -ent) non conta, salvo scelta
       contraria; "le", "je", "ce" restano una sillaba */
    if (out.length > 1 && !emuet) {
        const ultimo = out[out.length - 1];
        const testo = chars.slice(ultimo.inizio, ultimo.fine).join('');
        const coda = chars.slice(ultimo.fine).join('');
        if (testo === 'e' && (coda === '' || coda === 's' || coda === 'nt')) out.pop();
    }
    return out;
}

/** sillabe('petite') -> ['pe','tit'] (senza e muet), ['pe','ti','te'] con. */
export function sillabe(parola, { emuet = false } = {}) {
    const pulita = normalizza(parola).replace(/['-]/g, '');
    if (!pulita) return [];
    const chars = [...pulita];
    const nn = nuclei(chars, { emuet });
    if (!nn.length) return [pulita];
    const tagli = [];
    for (let k = 0; k + 1 < nn.length; k++) {
        const da = nn[k].fine;
        const a = nn[k + 1].inizio;
        tagli.push(da + puntoDiTaglio(chars.slice(da, a).join('')));
    }
    const out = [];
    let start = 0;
    tagli.forEach((t) => { out.push(chars.slice(start, t).join('')); start = t; });
    out.push(chars.slice(start).join(''));
    return out.filter(Boolean);
}

function puntoDiTaglio(gruppo) {
    const n = gruppo.length;
    if (n <= 1) return 0;
    const due = gruppo.slice(0, 2);
    if (n === 2) {
        if (gruppo[0] === gruppo[1]) return 1;
        if (MUTA_LIQUIDA.has(due)) return 0;
        return 1;
    }
    const ultime = gruppo.slice(n - 2);
    if (MUTA_LIQUIDA.has(ultime)) return n - 2;
    return n - 1;
}

export const CLASSI = ['tronca', 'piana', 'sdrucciola', 'bisdrucciola'];
export function classeDi(indice, totale) {
    const indietro = totale - 1 - indice;
    return CLASSI[Math.min(CLASSI.length - 1, Math.max(0, indietro))];
}

/** In francese l'accento sta sull'ultima sillaba piena: sempre esatto. */
export function accento(parola, { sillabe: sill = null, emuet = false } = {}) {
    const parti = sill || sillabe(parola, { emuet });
    const n = parti.length;
    if (!n) return { sillaba: 0, classe: 'tronca', esito: 'esatto' };
    return { sillaba: n - 1, classe: 'tronca', esito: 'esatto' };
}

/** La parola finisce con una e muta? (rima femminile) */
export function femminile(parola) {
    const p = normalizza(parola).replace(/['-]/g, '');
    return /(?:e|es|ent)$/.test(p) && !/(?:é|ée|ées|és)$/.test(p) && p.length > 2;
}

export function analizza(parola, opts = {}) {
    const parti = sillabe(parola, opts);
    const acc = accento(parola, { sillabe: parti, ...opts });
    return { parola: normalizza(parola), sillabe: parti, ...acc, femminile: femminile(parola) };
}
