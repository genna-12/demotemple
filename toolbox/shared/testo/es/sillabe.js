/**
 * Tiny Temple Toolbox - spagnolo: sillabe e accento (spec 14b, ricerca §2).
 *
 * Modulo PURO, stesse firme di shared/testo/sillabe.js.
 * Lo spagnolo e' il caso fortunato: l'accento si CALCOLA, non si cerca.
 * Regole RAE: se c'e' la tilde l'accento sta li'; se no, parola che finisce
 * per vocale, -n o -s e' llana (piana); in ogni altro caso aguda (tronca).
 * Esdrujule e sobresdrujule portano sempre la tilde, quindi le prende la
 * prima regola. Per questo l'esito e' SEMPRE 'esatto', anche su una parola
 * inventata, e il pacchetto spagnolo non spedisce ne' chiavi ne' tratti.
 *
 * Dittonghi e iati (servono al conteggio): aperta + chiusa atona o due
 * chiuse diverse = dittongo ("ai-re", "ciu-dad"); due aperte = iato
 * ("po-e-ta"); chiusa TONICA accanto a un'aperta = iato e porta la tilde
 * ("rí-o", "ra-íz"); aperta fra due chiuse = trittongo ("a-ve-ri-guáis").
 */

/* La y e' vocale SOLO a fine parola ("rey", "muy"): dentro la parola e'
   una consonante ("va-ya"), e trattarla da vocale faceva di "vaya" un
   monosillabo. */
export const VOCALI = 'aeiouáéíóúü';
const APERTE = 'aeoáéó';
const CHIUSE = 'iuíúü';
export const ACCENTATE = 'áéíóú';
const SENZA = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' };

export const isVocale = (c) => !!c && VOCALI.indexOf(c) !== -1;
export const isAperta = (c) => !!c && APERTE.indexOf(c) !== -1;
export const isChiusa = (c) => !!c && CHIUSE.indexOf(c) !== -1;
export const isAccentata = (c) => !!c && ACCENTATE.indexOf(c) !== -1;
export const senzaAccento = (c) => SENZA[c] || c;

/* NFC PRIMA di tutto: le tastiere di macOS e iOS mandano la tilde come
   segno combinante ("o" + U+0301), che il filtro qui sotto butterebbe via —
   "corazón" diventerebbe "corazon", piana invece che aguda. */
export function normalizza(parola) {
    return String(parola || '').normalize('NFC').toLowerCase()
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[^a-záéíóúüñ']/g, '');
}

/* Non si spezzano mai: digrammi e ostruente + liquida. */
const DIGRAMMI = new Set(['ch', 'll', 'rr']);
const MUTA_LIQUIDA = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tl', 'tr']);

/** "corazón" -> ['co','ra','zón'] */
export function sillabe(parola) {
    const pulita = normalizza(parola).replace(/'/g, '');
    if (!pulita) return [];
    const chars = [...pulita];
    /* la u di que/qui/gue/gui non suona (senza dieresi) */
    const muta = new Set();
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === 'u' && (chars[i - 1] === 'q' || chars[i - 1] === 'g') && (chars[i + 1] === 'e' || chars[i + 1] === 'i')) muta.add(i);
    }
    const finaleY = chars.length > 1 && chars[chars.length - 1] === 'y' && isVocale(chars[chars.length - 2]);
    const nuclei = [];
    let i = 0;
    while (i < chars.length) {
        if (!isVocale(chars[i]) || muta.has(i)) { i++; continue; }
        let fine = i;
        while (fine < chars.length && isVocale(chars[fine])) fine++;
        let cur = null;
        for (let k = i; k < fine; k++) {
            if (muta.has(k)) { if (cur) cur.fine = k + 1; continue; }
            const c = chars[k];
            if (!cur) { cur = { inizio: k, fine: k + 1, aperte: isAperta(c) ? 1 : 0 }; continue; }
            const prima = chars[cur.fine - 1];
            const iato = (isAperta(c) && isAperta(prima))                    // po-e-ta
                || (isChiusa(c) && isAccentata(c))                            // ra-íz
                || (isChiusa(prima) && isAccentata(prima))                    // rí-o
                || (isChiusa(c) && isChiusa(prima) && senzaAccento(c) === senzaAccento(prima));
            if (iato) { nuclei.push(cur); cur = { inizio: k, fine: k + 1, aperte: isAperta(c) ? 1 : 0 }; continue; }
            cur.fine = k + 1;
            if (isAperta(c)) cur.aperte++;
        }
        if (cur) nuclei.push(cur);
        i = fine;
    }
    /* la y finale ("rey", "muy") scende sul nucleo di prima */
    if (finaleY && nuclei.length && nuclei[nuclei.length - 1].fine === chars.length - 1) {
        nuclei[nuclei.length - 1].fine = chars.length;
    }
    if (!nuclei.length) return [pulita];
    const tagli = [];
    for (let k = 0; k + 1 < nuclei.length; k++) {
        const da = nuclei[k].fine;
        const a = nuclei[k + 1].inizio;
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
    if (n <= 1) return 0;                          // "ca-sa"
    const due = gruppo.slice(0, 2);
    if (n === 2) {
        if (DIGRAMMI.has(due) || MUTA_LIQUIDA.has(due)) return 0;   // "ca-lle", "o-tro"
        return 1;                                   // "can-to"
    }
    const ultime = gruppo.slice(n - 2);
    if (DIGRAMMI.has(ultime) || MUTA_LIQUIDA.has(ultime)) return n - 2;  // "en-tre"
    return n - 1;                                   // "ins-tan-te"
}

/* Le stesse quattro classi dell'italiano: cosi' metrica.js non cambia
   (aguda = tronca, llana = piana, esdrujula = sdrucciola). */
export const CLASSI = ['tronca', 'piana', 'sdrucciola', 'bisdrucciola'];

export function classeDi(indice, totale) {
    const indietro = totale - 1 - indice;
    return CLASSI[Math.min(CLASSI.length - 1, Math.max(0, indietro))];
}

/** Accento RAE: sempre 'esatto', anche su una parola mai vista. */
export function accento(parola, { sillabe: sill = null, forza = null } = {}) {
    const parti = sill || sillabe(parola);
    const n = parti.length;
    if (!n) return { sillaba: 0, classe: 'piana', esito: 'esatto' };
    if (forza) {
        const indietro = CLASSI.indexOf(forza);
        const idx = Math.max(0, n - 1 - (indietro < 0 ? 1 : indietro));
        return { sillaba: idx, classe: classeDi(idx, n), esito: 'stimato' };
    }
    for (let k = n - 1; k >= 0; k--) {
        if ([...parti[k]].some(isAccentata)) return { sillaba: k, classe: classeDi(k, n), esito: 'esatto' };
    }
    if (n === 1) return { sillaba: 0, classe: 'tronca', esito: 'esatto' };
    const piatta = normalizza(parola).replace(/'/g, '');
    const ultima = piatta.slice(-1);
    /* vocale, -n o -s -> llana; tutto il resto -> aguda */
    const llana = isVocale(ultima) || ultima === 'n' || ultima === 's';
    const idx = llana ? n - 2 : n - 1;
    return { sillaba: idx, classe: classeDi(idx, n), esito: 'esatto' };
}

export function analizza(parola) {
    const parti = sillabe(parola);
    const acc = accento(parola, { sillabe: parti });
    return { parola: normalizza(parola), sillabe: parti, ...acc };
}
