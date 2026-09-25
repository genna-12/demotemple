/**
 * Tiny Temple Toolbox - dalla forma scritta al suono, per le rime (spec 14 §4).
 *
 * Modulo PURO (solo sillabe.js). La rima italiana parte dalla VOCALE TONICA:
 * la chiave di rima e' la trascrizione da li' alla fine, con le
 * normalizzazioni ortografia -> suono della ricerca §2:
 *   c/g + i,e -> C/J (/tʃ/, /dʒ/)     ci/gi + vocale -> stesso suono, i muta
 *   gli -> L (/ʎ/)   gn -> N (/ɲ/)    sc + i,e -> S (/ʃ/)
 *   ch/gh -> k/g     qu -> kw         z -> z (sorda e sonora insieme)
 *   s sorda e sonora insieme          h non suona
 * Le DOPPIE restano ("notte" != "note"); gli accenti grafici cadono e
 * e/ɛ, o/ɔ si accorpano (senza IPA non si distinguono, e cantate sono rima).
 *
 * Tre chiavi per tre tipi di somiglianza:
 *   chiaveRima      dalla tonica in poi, tutto        -> rima perfetta
 *   scheletroVocalico  solo le vocali dalla tonica    -> assonanza
 *   scheletroConsonantico solo le consonanti          -> consonanza
 *   chiaveMulti     vocali delle ultime 2-3 sillabe   -> multisillabica
 */

import { sillabe, accento, normalizza, isVocale, isForte, isAccentata, senzaAccento } from './sillabe.js';

const VOCALE_PIANA = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u' };

/**
 * Trascrizione "alla buona" di una stringa gia' pulita: un carattere per
 * suono, doppie comprese. Non e' IPA, e' una chiave stabile.
 */
export function suoni(testo) {
    const chars = [...normalizza(testo).replace(/'/g, '')].map(senzaAccento);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        const next = chars[i + 1] || '';
        const next2 = chars[i + 2] || '';
        const next3 = chars[i + 3] || '';
        const dolce = (x) => x === 'i' || x === 'e';
        if (c === 'h') continue;                                  // non suona
        if (VOCALE_PIANA[c]) { out += VOCALE_PIANA[c]; continue; }
        if (c === 'c' || c === 'g') {
            const forte = c === 'c' ? 'k' : 'g';
            const affricata = c === 'c' ? 'C' : 'J';
            if (next === 'h') { out += forte; i += 1; continue; }  // che, chi, ghe, ghi
            if (c === 'g' && next === 'n') { out += 'N'; i += 1; continue; }
            if (c === 'g' && next === 'l' && next2 === 'i') {
                /* gli + vocale: la i e' muta ("figlio"); "gli" finale resta */
                out += 'L';
                i += isVocale(next3) ? 2 : 2;
                continue;
            }
            if (next === c && dolce(next2)) {
                /* doppia affricata: "braccio" = C + C, "oggi" = J + J */
                out += affricata;
                continue;
            }
            if (dolce(next)) {
                out += affricata;
                if (next === 'i' && isVocale(next2)) i += 1;       // bacio, giorno
                continue;
            }
            out += forte;
            continue;
        }
        if (c === 's' && next === 'c' && dolce(next2)) {
            out += 'S';                                           // pesce, sciopero
            i += (next2 === 'i' && isVocale(next3)) ? 2 : 1;
            continue;
        }
        if (c === 'q') { out += 'k'; continue; }                   // qu -> k + u
        if (c === 'z') { out += 'z'; continue; }                   // sorda e sonora insieme
        out += c;
    }
    return out;
}

/*
 * Iato finale dei monosillabi (spec 19, validator): consonante + i/u +
 * a/e/o in fondo a una parola di una sillaba sola. La i/u e' tonica
 * ("mì-o", "vì-a", "tù-o"): la rima e' "io"/"ia"/"uo", non "o"/"a" come
 * "no" e "pero'". Restano fuori la i muta di ci/gi e la u di qu/gu ("qua"
 * rima con "la'"), e "io", che non ha consonante davanti (spec 19 §7: resta
 * com'e', lo sistema il rimario quando c'e').
 */
const IATO_MONOSILLABO = /[bcdfghjklmnpqrstvwxyz][iu][aeo]$/;
function iatoFinale(piatta, { conteggio = false } = {}) {
    if (!IATO_MONOSILLABO.test(piatta)) return false;
    const prima = piatta[piatta.length - 3];
    const debole = piatta[piatta.length - 2];
    /* col conteggio vero la sillaba in piu' dice che la i non e' muta: "bu-gì-a" */
    if (!conteggio && debole === 'i' && (prima === 'c' || prima === 'g')) return false;
    if (debole === 'u' && (prima === 'q' || prima === 'g')) return false;
    return true;
}

/**
 * Dove comincia la rima: indice, nella parola piatta, della vocale tonica.
 * Nel nucleo si prende la vocale accentata, se no la prima forte, se no
 * l'ultima ("cuo-re" -> la o, "mai" -> la a). Monosillabo con iato finale:
 * la i/u ("mio" -> la i).
 */
export function inizioRima(parola, { sillabe: sill = null, accento: acc = null } = {}) {
    const parti = sill || sillabe(parola);
    if (!parti.length) return 0;
    if (parti.length === 1 && iatoFinale(parti[0])) return parti[0].length - 2;
    const a = acc || accento(parola, { sillabe: parti });
    const prima = parti.slice(0, a.sillaba).join('').length;
    const tonica = parti[a.sillaba] || '';
    const chars = [...tonica];
    let scelta = -1;
    for (let i = 0; i < chars.length; i++) {
        if (!isVocale(chars[i])) continue;
        if (isAccentata(chars[i])) { scelta = i; break; }
        if (scelta < 0) scelta = i;
        else if (isForte(chars[i]) && !isForte(chars[scelta])) scelta = i;
    }
    if (scelta < 0) scelta = 0;
    /* la u di "qu"/"gu" non e' un nucleo: la rima parte dalla vocale dopo */
    if (chars[scelta] === 'u' && (chars[scelta - 1] === 'q' || chars[scelta - 1] === 'g') && isVocale(chars[scelta + 1])) scelta++;
    return prima + scelta;
}

/** Chiave di rima perfetta: dalla tonica alla fine, in suoni. */
export function chiaveRima(parola, opts = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    const da = inizioRima(piatta, opts);
    return suoni(piatta.slice(da));
}

/** Solo le vocali dalla tonica: "amore" -> "oe" (assonanza). */
export function scheletroVocalico(parola, opts = {}) {
    const chiave = chiaveRima(parola, opts);
    return [...chiave].filter((c) => VOCALE_PIANA[c]).join('');
}

/**
 * Le consonanti dalla SILLABA tonica (non dalla vocale): "amore" -> "mr".
 * La consonanza si sente sull'appoggio della tonica, che nella chiave di
 * rima non c'e' ("ore" perderebbe la m di "amore").
 */
export function scheletroConsonantico(parola, opts = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    const parti = opts.sillabe || sillabe(piatta);
    const acc = opts.accento || accento(piatta, { sillabe: parti });
    const da = parti.slice(0, acc.sillaba).join('').length;
    return [...suoni(piatta.slice(da))].filter((c) => !VOCALE_PIANA[c]).join('');
}

/**
 * Multisillabica "da rap": le vocali delle ultime `quante` sillabe (2 o 3),
 * comprese quelle prima della tonica. "tavernello" -> "eeo".
 */
export function chiaveMulti(parola, quante = 3, parti0 = null) {
    const parti = parti0 || sillabe(parola);
    if (!parti.length) return '';
    const ultime = parti.slice(Math.max(0, parti.length - quante));
    return ultime.map((s) => {
        const v = [...suoni(s)].filter((c) => VOCALE_PIANA[c]);
        return v.length ? v[v.length - 1] : '';
    }).join('');
}

/**
 * Tutte le chiavi di una parola, in un colpo solo (serve al build).
 * `sillabe`: sillabazione gia' nota (Wikizionario), con la vocale tonica
 * accentata se si conosce ("in","for","mà","ti","ca"); deve ricomporre
 * la parola piatta, altrimenti si ignora e si torna alle regole.
 * `conteggio`: il numero di sillabe VERO (tratti del rimario). Se supera di
 * uno quello delle regole e la parola finisce in consonante + i/u + vocale,
 * il dittongo finale e' uno iato tonico: "fol-lì-a", "po-e-sì-a" (le regole
 * dicono "fol-lia", come "sto-ria"). Senza conteggio restano le regole.
 */
export function chiavi(parola, { forza = null, sillabe: date = null, conteggio = null } = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    let parti = null;
    if (Array.isArray(date) && date.length) {
        const pulite = date.map((s) => normalizza(s).replace(/'/g, ''));
        const senza = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (senza(pulite.join('')) === senza(piatta) && pulite.every((s) => s.length)) parti = pulite;
    }
    if (!parti) parti = sillabe(piatta);
    if (Number.isInteger(conteggio) && conteggio === parti.length + 1 && parti.length >= 1) {
        const ultima = parti[parti.length - 1];
        if (ultima.length >= 3 && iatoFinale(ultima, { conteggio: true })) {
            parti = [...parti.slice(0, -1), ultima.slice(0, -1), ultima.slice(-1)];
            /* la tonica e' la i/u: piana, qualunque cosa dica `forza` */
            forza = 'piana';
        }
    }
    const acc = accento(piatta, { sillabe: parti, forza });
    const opts = { sillabe: parti, accento: acc };
    const rima = chiaveRima(piatta, opts);
    return {
        parola: piatta,
        sillabe: parti,
        classe: acc.classe,
        esito: acc.esito,
        tonica: acc.sillaba,
        rima,
        vocali: [...rima].filter((c) => VOCALE_PIANA[c]).join(''),
        consonanti: scheletroConsonantico(piatta, opts),
        multi: chiaveMulti(piatta, 3)
    };
}
