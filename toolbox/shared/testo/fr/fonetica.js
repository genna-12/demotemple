/**
 * Tiny Temple Toolbox - francese: dalla forma scritta al suono (spec 14b).
 *
 * Stesse firme dell'italiano. In francese l'accento e' fisso sull'ultima
 * sillaba piena, quindi la rima parte dall'ULTIMA VOCALE PRONUNCIATA:
 * "amour", "toujours" e "jour" condividono /uʁ/ e rimano.
 *
 * La pronuncia vera sta nel pacchetto (IPA gia' sillabata del Wikizionario
 * FR). Qui c'e' la conversione di ripiego dalla scrittura, che serve a due
 * cose: alle parole fuori dizionario e al conteggio senza pacchetto. Le
 * chiavi usano simboli ASCII (nessun IPA nei file): E = è aperta, 2 = eu,
 * A = an/en nasale, O = on, I = in, U = un, S = ch, Z = j/ge, N = gn,
 * R = r, y = ill/y semivocale.
 *
 * Prima di tutto cadono le lettere mute finali: -e, -es, -ent verbale e le
 * consonanti finali che non si dicono (s, t, d, x, z, p, g). Senza questo
 * "toujours" non rimerebbe con "jour".
 */

import { sillabe, accento, normalizza, isVocale, senzaAccento, femminile } from './sillabe.js';

/* la y qui e' la SEMIVOCALE di "fille"/"soleil": non apre una rima, la
   chiude (altrimenti "soleil" avrebbe chiave "y" invece di "Ey") */
const VOCALE = { a: 'a', e: 'e', E: 'E', i: 'i', o: 'o', u: 'u', 9: '9', 2: '2', A: 'A', O: 'O', I: 'I', U: 'U' };
const MUTE_FINALI = 'stdxzpg';

/** Via le lettere che a fine parola non si pronunciano. */
export function senzaMute(parola) {
    let p = normalizza(parola).replace(/['-]/g, '');
    if (p.length > 3 && /ent$/.test(p)) p = p.slice(0, -3);          // parlent
    else if (p.length > 2 && /es$/.test(p)) p = p.slice(0, -2);      // petites
    else if (p.length > 2 && /e$/.test(p)) p = p.slice(0, -1);       // petite
    if (p.length > 2 && MUTE_FINALI.indexOf(p.slice(-1)) !== -1) p = p.slice(0, -1);
    /* "toujours" e "amours" perdono la s e rimano con "jour" */
    return p;
}

export function suoni(testo) {
    const chars = [...senzaMute(testo)];
    let out = '';
    for (let i = 0; i < chars.length; i++) {
        const c = senzaAccento(chars[i]);
        const next = senzaAccento(chars[i + 1] || '');
        const next2 = senzaAccento(chars[i + 2] || '');
        const next3 = senzaAccento(chars[i + 3] || '');
        const tre = c + next + next2;
        const due = c + next;
        const nasale = (v) => !isVocale(next2) && (next2 !== 'n' && next2 !== 'm');
        if (c === 'h') continue;
        /* --- vocali e gruppi --- */
        if (tre === 'eau') { out += 'o'; i += 2; continue; }
        /* -eil/-ail/-euil finali: la vocale piu' la semivocale ("soleil") */
        if ((tre === 'eil' || tre === 'ail' || tre === 'oil') && !isVocale(next3)) {
            out += (c === 'e' ? 'E' : c === 'a' ? 'a' : 'wa') + 'y';
            i += 2;
            if (next3 === 'l') i += 1;
            if (chars[i + 1] === 'e') i += 1;
            continue;
        }
        if (tre === 'oeu' || tre === 'œur'.slice(0, 3)) { out += '2'; i += 2; continue; }
        /* -ill- e -il finale dopo vocale: semivocale ("soleil", "fille") */
        if (due === 'il' && next2 === 'l') { out += 'iy'; i += 2; continue; }
        if (due === 'il' && !next2 && isVocale(senzaAccento(chars[i - 1] || ''))) { out += 'y'; i += 1; continue; }
        if (tre === 'ain' || tre === 'ein') { out += 'I'; i += 2; continue; }
        if (due === 'au') { out += 'o'; i += 1; continue; }
        if (due === 'ou') { out += 'u'; i += 1; continue; }
        if (due === 'oi') { out += 'wa'; i += 1; continue; }
        if (due === 'eu' || due === 'oe') { out += '2'; i += 1; continue; }
        if (due === 'ai' || due === 'ei') { out += 'E'; i += 1; continue; }
        if ((due === 'an' || due === 'am' || due === 'en' || due === 'em') && nasale()) { out += 'A'; i += 1; continue; }
        if ((due === 'on' || due === 'om') && nasale()) { out += 'O'; i += 1; continue; }
        if ((due === 'in' || due === 'im' || due === 'yn') && nasale()) { out += 'I'; i += 1; continue; }
        if ((due === 'un' || due === 'um') && nasale()) { out += 'U'; i += 1; continue; }
        if (c === 'e' && (chars[i] === 'é' || chars[i] === 'è' || chars[i] === 'ê')) { out += chars[i] === 'é' ? 'e' : 'E'; continue; }
        /* la u francese da sola e' /y/ ("sur"), non la /u/ di "ou":
           senza questa riga "sur" rimava con "jour" */
        if (c === 'u') { out += '9'; continue; }
        if (VOCALE[c] && c !== 'y') { out += VOCALE[c]; continue; }
        if (c === 'y') { out += isVocale(next) ? 'y' : 'i'; continue; }
        /* --- consonanti --- */
        if (c === 'i' && due === 'il' && next2 === 'l') { out += 'y'; i += 2; continue; }
        if (due === 'ch') { out += 'S'; i += 1; continue; }
        if (due === 'ph') { out += 'f'; i += 1; continue; }
        if (due === 'th') { out += 't'; i += 1; continue; }
        if (due === 'gn') { out += 'N'; i += 1; continue; }
        if (c === 'c') { out += (next === 'e' || next === 'i' || next === 'y') ? 's' : 'k'; continue; }
        if (c === 'ç') { out += 's'; continue; }
        if (c === 'g') {
            if (next === 'e' || next === 'i' || next === 'y') { out += 'Z'; continue; }
            if (next === 'u' && (next2 === 'e' || next2 === 'i')) { out += 'g'; i += 1; continue; }
            out += 'g';
            continue;
        }
        if (c === 'j') { out += 'Z'; continue; }
        if (c === 'q') { out += 'k'; if (next === 'u') i += 1; continue; }
        if (c === 's') { out += (isVocale(next) && isVocale(senzaAccento(chars[i - 1] || ''))) ? 'z' : 's'; continue; }
        if (c === 'x') { out += 'ks'; continue; }
        if (c === 'r') { out += 'R'; continue; }
        out += c;
    }
    /* "ill" dopo vocale: "soleil" -> solEy */
    return out;
}

/** Dalla fine: la chiave e' l'ultima vocale pronunciata piu' la coda. */
export function chiaveRima(parola) {
    const s = suoni(parola);
    for (let i = s.length - 1; i >= 0; i--) {
        if (VOCALE[s[i]]) return s.slice(i);
    }
    return s;
}

export function scheletroVocalico(parola) {
    const s = suoni(parola);
    return [...s].filter((c) => VOCALE[c]).slice(-2).join('');
}

export function scheletroConsonantico(parola) {
    const s = suoni(parola);
    const da = s.length - chiaveRima(parola).length;
    return [...s.slice(Math.max(0, da - 2))].filter((c) => !VOCALE[c]).join('');
}

export function chiaveMulti(parola, quante = 3) {
    const parti = sillabe(parola, { emuet: false });
    if (!parti.length) return '';
    return parti.slice(Math.max(0, parti.length - quante)).map((s) => {
        const v = [...suoni(s)].filter((c) => VOCALE[c]);
        return v.length ? v[v.length - 1] : '';
    }).join('');
}

export const CLASSI = ['tronca', 'piana', 'sdrucciola', 'bisdrucciola'];

export function chiavi(parola, opts = {}) {
    const piatta = normalizza(parola).replace(/['-]/g, '');
    const parti = sillabe(piatta, opts);
    const acc = accento(piatta, { sillabe: parti, ...opts });
    const rima = chiaveRima(piatta);
    return {
        parola: piatta,
        sillabe: parti,
        classe: acc.classe,
        esito: acc.esito,
        tonica: acc.sillaba,
        rima,
        vocali: scheletroVocalico(piatta),
        consonanti: scheletroConsonantico(piatta),
        multi: chiaveMulti(piatta, 3),
        femminile: femminile(piatta)
    };
}
