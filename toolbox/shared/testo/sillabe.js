/**
 * Tiny Temple Toolbox - sillabazione italiana e accento tonico (spec 14 §4).
 *
 * Modulo PURO: niente DOM, niente import, si usa in Node, in un Worker e
 * nella pagina. Le regole sono quelle della ricerca del 19 settembre 2026
 * (§2), applicate in due passaggi:
 *   1. i NUCLEI: ogni vocale e' un nucleo, salvo i semiconsonantici. Una
 *      `i`/`u` atona seguita da un'altra vocale scivola in avanti (`iuo` di
 *      "aiuola" e' un nucleo solo), una `i`/`u` atona finale di gruppo
 *      scende sul nucleo di prima ("mai"), due vocali forti o una debole
 *      con l'accento grafico fanno iato ("pa-u-ra" -> "pa-ù-ra").
 *      `qu`/`gu` + vocale: la `u` non e' un nucleo. La `i` muta di
 *      `ci/gi/sci/gli` + vocale nemmeno.
 *   2. le CONSONANTI fra due nuclei: una sola va avanti ("ca-sa"); i
 *      digrammi non si spezzano; la `s` impura va tutta avanti
 *      ("fi-ne-stra"); muta + liquida resta unita ("so-pra"); le doppie e
 *      `cq` si spezzano ("not-te", "ac-qua"); negli altri gruppi la prima
 *      resta e il resto va avanti ("al-to", "tem-po").
 *
 * L'accento: se c'e' un accento grafico e' ESATTO, altrimenti si stima
 * (monosillabo, suffissi sdruccioli, default piana) e chi usa il dato lo
 * dice all'utente ("accento stimato").
 */

export const VOCALI = 'aeiouàèéìíîòóùúäëïöü';
const FORTI = 'aeoàèéòó';
const DEBOLI = 'iuìíîùú';
export const ACCENTATE = 'àèéìíîòóùú';
const SENZA_ACCENTO = { à: 'a', è: 'e', é: 'e', ì: 'i', í: 'i', î: 'i', ò: 'o', ó: 'o', ù: 'u', ú: 'u', ä: 'a', ë: 'e', ï: 'i', ö: 'o', ü: 'u' };

/* `!!c` non e' pignoleria: ''.indexOf('') vale 0, e senza questo la fine
   della parola passava per vocale (la "i" di "oggi" spariva). */
export const isVocale = (c) => !!c && VOCALI.indexOf(c) !== -1;
export const isForte = (c) => !!c && FORTI.indexOf(c) !== -1;
export const isDebole = (c) => !!c && DEBOLI.indexOf(c) !== -1;
export const isAccentata = (c) => !!c && ACCENTATE.indexOf(c) !== -1;
export const senzaAccento = (c) => SENZA_ACCENTO[c] || c;

/** Minuscolo, apostrofi normalizzati, via tutto quello che non e' lettera. */
export function normalizza(parola) {
    /* NFC prima del filtro: su macOS e iOS l'accento puo' arrivare come
       segno combinante, e "citta'" perderebbe l'accento (tronca -> piana). */
    return String(parola || '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[^a-zàèéìíîòóùúäëïöü']/g, '');
}

const MUTA_LIQUIDA = new Set(['bl', 'br', 'cl', 'cr', 'dl', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tl', 'tr', 'vl', 'vr']);
const DIGRAMMI = new Set(['ch', 'gh', 'gn', 'gl', 'sc', 'ci', 'gi', 'qu']);

/**
 * Posizioni delle lettere che NON aprono un nucleo pur essendo vocali:
 * la `u` di `qu`/`gu` + vocale e la `i` muta di `ci/gi/sci/gli` + vocale.
 */
function mute(chars) {
    const mute = new Set();
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        const next = chars[i + 1] || '';
        const prev = chars[i - 1] || '';
        if (c === 'u' && (prev === 'q' || prev === 'g') && isVocale(next)) mute.add(i);
        if (c === 'i' && isVocale(next) && !isAccentata(next)) {
            const due = prev + '';
            const tre = (chars[i - 2] || '') + prev;
            if (due === 'c' || due === 'g') mute.add(i);           // bacio, giorno
            if (tre === 'sc' || tre === 'gl') mute.add(i);         // sciopero, figlio
        }
    }
    return mute;
}

/**
 * Divide la parola in sillabe. -> ['a', 'mo', 're']
 * L'apostrofo tiene unite le parole elise ("tant'era" = tan-te-ra).
 */
export function sillabe(parola) {
    const pulita = normalizza(parola).replace(/'/g, '');
    if (!pulita) return [];
    const chars = [...pulita];
    const muteSet = mute(chars);

    /* --- 1. nuclei: [inizio, fine) di ogni gruppo vocalico che conta --- */
    const nuclei = [];
    let i = 0;
    while (i < chars.length) {
        if (!isVocale(chars[i]) || muteSet.has(i)) { i++; continue; }
        /* tutto il gruppo di vocali (comprese le mute, che restano dentro) */
        let end = i;
        while (end < chars.length && isVocale(chars[end])) end++;
        let cur = null;
        for (let k = i; k < end; k++) {
            if (muteSet.has(k)) { if (cur) cur.fine = k + 1; continue; }
            const c = chars[k];
            const altraDopo = k + 1 < end && !muteSet.has(k + 1);
            const debole = isDebole(c) && !isAccentata(c);
            if (debole && altraDopo) {
                /* semiconsonante: scivola sul nucleo che viene dopo */
                if (cur && cur.forte) { nuclei.push(cur); cur = null; }
                if (!cur) cur = { inizio: k, fine: k + 1, forte: false };
                else cur.fine = k + 1;
                continue;
            }
            if (!cur) { cur = { inizio: k, fine: k + 1, forte: !debole }; continue; }
            if (!cur.forte && !isAccentata(c)) { cur.fine = k + 1; cur.forte = !debole; continue; }
            if (debole && !altraDopo && cur.forte && !isAccentata(chars[cur.fine - 1])) {
                /* dittongo discendente: "mai", "pausa" */
                cur.fine = k + 1;
                nuclei.push(cur);
                cur = null;
                continue;
            }
            nuclei.push(cur);
            cur = { inizio: k, fine: k + 1, forte: !debole };
        }
        if (cur) nuclei.push(cur);
        i = end;
    }
    if (!nuclei.length) return [pulita];

    /* --- 2. dove si taglia fra un nucleo e il successivo --- */
    const tagli = [];
    for (let k = 0; k + 1 < nuclei.length; k++) {
        const da = nuclei[k].fine;
        const a = nuclei[k + 1].inizio;
        const gruppo = chars.slice(da, a).join('');
        tagli.push(da + puntoDiTaglio(gruppo));
    }
    const out = [];
    let start = 0;
    tagli.forEach((t) => { out.push(chars.slice(start, t).join('')); start = t; });
    out.push(chars.slice(start).join(''));
    return out.filter(Boolean);
}

/** Quante consonanti del gruppo restano con la sillaba di prima. */
function puntoDiTaglio(gruppo) {
    const n = gruppo.length;
    if (n === 0) return 0;                      // iato: si taglia fra le vocali
    if (n === 1) return 0;                      // "ca-sa"
    const primi2 = gruppo.slice(0, 2);
    if (n === 2) {
        if (gruppo[0] === gruppo[1]) return 1;  // doppie: "not-te"
        if (primi2 === 'cq') return 1;          // "ac-qua"
        if (DIGRAMMI.has(primi2)) return 0;     // "ma-gni", "pe-sce"
        if (MUTA_LIQUIDA.has(primi2)) return 0; // "so-pra"
        if (gruppo[0] === 's') return 0;        // s impura: "pa-sta"
        return 1;                               // "al-to", "tem-po"
    }
    /* tre o piu': si taglia dopo la prima, salvo il gruppo che comincia per s */
    if (gruppo[0] === 's') return 0;            // "fi-ne-stra"
    const dopo = gruppo.slice(1, 3);
    if (gruppo[0] === gruppo[1]) return 1;      // "ab-bra-ccio"
    if (DIGRAMMI.has(primi2) || MUTA_LIQUIDA.has(primi2)) {
        /* il digramma non si spezza: il taglio va prima */
        return 0;
    }
    if (dopo[0] === 's') return 1;
    return 1;
}

/* Suffissi che tirano l'accento indietro di due (ricerca §2). */
const SDRUCCIOLE = [
    'abile', 'abili', 'ibile', 'ibili', 'evole', 'evoli', 'ico', 'ica', 'ici', 'iche',
    'udine', 'udini', 'aggine', 'aggini', 'logo', 'loga', 'logi', 'loghe', 'grafo', 'grafa',
    'grafi', 'metro', 'metri', 'fobo', 'foba', 'voro', 'vora', 'tesi',
    'ssimo', 'ssima', 'ssimi', 'ssime'
];
/* Piane che finiscono come una sdrucciola: poche, ma comunissime. */
const NON_SDRUCCIOLE = new Set(['amico', 'amica', 'amici', 'amiche', 'antico', 'antica', 'antichi', 'antiche', 'pudico', 'mendico', 'nemico', 'nemica', 'nemici', 'nemiche']);

export const CLASSI = ['tronca', 'piana', 'sdrucciola', 'bisdrucciola'];

/**
 * Accento tonico. -> { sillaba, classe, esito }
 *   sillaba = indice (da 0) della sillaba tonica
 *   classe  = 'tronca' | 'piana' | 'sdrucciola' | 'bisdrucciola'
 *   esito   = 'esatto' (accento grafico o monosillabo) | 'stimato'
 * `forza` impone la classe (serve al pannello "piana/sdrucciola" della
 * parola sconosciuta, spec §3).
 */
export function accento(parola, { sillabe: sill = null, forza = null } = {}) {
    const parti = sill || sillabe(parola);
    const n = parti.length;
    if (!n) return { sillaba: 0, classe: 'piana', esito: 'stimato' };
    if (forza) {
        const indietro = CLASSI.indexOf(forza);
        const idx = Math.max(0, n - 1 - (indietro < 0 ? 1 : indietro));
        return { sillaba: idx, classe: classeDi(idx, n), esito: 'stimato' };
    }
    /* accento grafico: e' la fonte piu' sicura che abbiamo */
    for (let k = n - 1; k >= 0; k--) {
        if ([...parti[k]].some(isAccentata)) return { sillaba: k, classe: classeDi(k, n), esito: 'esatto' };
    }
    if (n === 1) return { sillaba: 0, classe: 'tronca', esito: 'esatto' };
    const piatta = normalizza(parola).replace(/'/g, '');
    if (n >= 3 && !NON_SDRUCCIOLE.has(piatta) && SDRUCCIOLE.some((suf) => piatta.endsWith(suf))) {
        return { sillaba: n - 3, classe: 'sdrucciola', esito: 'stimato' };
    }
    return { sillaba: n - 2, classe: 'piana', esito: 'stimato' };
}

export function classeDi(indice, totale) {
    const indietro = totale - 1 - indice;
    return CLASSI[Math.min(CLASSI.length - 1, Math.max(0, indietro))];
}

/** Comodo: sillabe + accento in un colpo solo. */
export function analizza(parola) {
    const parti = sillabe(parola);
    const acc = accento(parola, { sillabe: parti });
    return { parola: normalizza(parola), sillabe: parti, ...acc };
}
