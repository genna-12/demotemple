/**
 * Tiny Temple Toolbox - spagnolo: dalla forma scritta al suono (spec 14b).
 *
 * Stesse firme di shared/testo/fonetica.js. La rima spagnola parte dalla
 * vocale tonica, come in italiano, e l'accento si calcola con le regole
 * RAE: quindi la chiave si ottiene SENZA dizionario, ed e' per questo che
 * il pacchetto spagnolo non spedisce chiavi ne' tratti (il Worker li
 * ricostruisce al caricamento).
 *
 * Normalizzazioni ortografia -> suono: c/z + e,i -> s (seseo: "corazón" e
 * "canción" devono rimare), qu -> k, gu + e,i -> g, g/j + e,i -> x,
 * ll -> y, v -> b, h muta, x -> ks, rr resta doppia.
 */

import { sillabe, accento, normalizza, isVocale, isAperta, isAccentata, senzaAccento } from './sillabe.js';

const VOCALE = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u' };

export function suoni(testo) {
    const chars = [...normalizza(testo).replace(/'/g, '')].map(senzaAccento);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        const next = chars[i + 1] || '';
        const dolce = next === 'e' || next === 'i';
        if (c === 'h') continue;
        if (VOCALE[c]) { out += VOCALE[c]; continue; }
        if (c === 'c') {
            if (next === 'h') { out += 'C'; i += 1; continue; }     // "ch"
            out += dolce ? 's' : 'k';
            continue;
        }
        if (c === 'z') { out += 's'; continue; }
        if (c === 'q') { out += 'k'; if (next === 'u') i += 1; continue; }
        if (c === 'g') {
            if (dolce) { out += 'x'; continue; }
            if (next === 'u' && (chars[i + 2] === 'e' || chars[i + 2] === 'i')) { out += 'g'; i += 1; continue; }
            out += 'g';
            continue;
        }
        if (c === 'j') { out += 'x'; continue; }
        if (c === 'l' && next === 'l') { out += 'y'; i += 1; continue; }
        if (c === 'v') { out += 'b'; continue; }
        if (c === 'x') { out += 'ks'; continue; }
        if (c === 'ñ') { out += 'N'; continue; }
        out += c;
    }
    return out;
}

/** Indice, nella parola piatta, della vocale tonica. */
export function inizioRima(parola, { sillabe: sill = null, accento: acc = null } = {}) {
    const parti = sill || sillabe(parola);
    if (!parti.length) return 0;
    const a = acc || accento(parola, { sillabe: parti });
    const prima = parti.slice(0, a.sillaba).join('').length;
    const chars = [...(parti[a.sillaba] || '')];
    let scelta = -1;
    for (let i = 0; i < chars.length; i++) {
        if (!isVocale(chars[i])) continue;
        if (isAccentata(chars[i])) { scelta = i; break; }
        if (scelta < 0) scelta = i;
        else if (isAperta(chars[i]) && !isAperta(chars[scelta])) scelta = i;
    }
    if (scelta < 0) scelta = 0;
    /* la u muta di que/gui non apre la rima */
    if (chars[scelta] === 'u' && (chars[scelta - 1] === 'q' || chars[scelta - 1] === 'g') && isVocale(chars[scelta + 1])) scelta++;
    return prima + scelta;
}

export function chiaveRima(parola, opts = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    return suoni(piatta.slice(inizioRima(piatta, opts)));
}

export function scheletroVocalico(parola, opts = {}) {
    return [...chiaveRima(parola, opts)].filter((c) => VOCALE[c]).join('');
}

/** Consonanti dalla SILLABA tonica (come in italiano). */
export function scheletroConsonantico(parola, opts = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    const parti = opts.sillabe || sillabe(piatta);
    const acc = opts.accento || accento(piatta, { sillabe: parti });
    const da = parti.slice(0, acc.sillaba).join('').length;
    return [...suoni(piatta.slice(da))].filter((c) => !VOCALE[c]).join('');
}

export function chiaveMulti(parola, quante = 3) {
    const parti = sillabe(parola);
    if (!parti.length) return '';
    return parti.slice(Math.max(0, parti.length - quante)).map((s) => {
        const v = [...suoni(s)].filter((c) => VOCALE[c]);
        return v.length ? v[v.length - 1] : '';
    }).join('');
}

export function chiavi(parola, { forza = null } = {}) {
    const piatta = normalizza(parola).replace(/'/g, '');
    const parti = sillabe(piatta);
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
        vocali: [...rima].filter((c) => VOCALE[c]).join(''),
        consonanti: scheletroConsonantico(piatta, opts),
        multi: chiaveMulti(piatta, 3)
    };
}
