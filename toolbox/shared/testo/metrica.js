/**
 * Tiny Temple Toolbox - metrica del verso (spec 14 §4, ricerca §2).
 *
 * Modulo PURO. Due conteggi:
 *   GRAMMATICALE: la somma delle sillabe delle parole, senza figure.
 *   METRICO: si applica la sinalefe (vocale finale di parola + vocale
 *     iniziale della successiva = una sillaba sola) e si normalizza a
 *     "piano" — finale tronca +1, sdrucciola -1, bisdrucciola -2 — perche'
 *     il verso si misura fino alla sillaba dopo l'ultimo accento.
 *
 * La DIALEFE (tenere separate quelle due vocali) non si indovina con una
 * regola: "Tant'era pien di sonno a quel punto" e' un endecasillabo solo
 * con la dialefe fra "sonno" e "a". Per questo ogni sinalefe torna con la
 * sua posizione e si puo' spegnere una per una: la scelta e' dell'autore e
 * si salva nel documento.
 *
 * versoMetrico(verso, { dialefe, classi, tratti }) -> {
 *   parole: [{ testo, sillabe, classe, esito, da, a }],
 *   grammaticale, metrico, sinalefi: [{ indice, prima, dopo, attiva }],
 *   classe, stimato
 * }
 */

import { sillabe, accento, normalizza, isVocale } from './sillabe.js';

/* Qualunque lettera, non solo quelle italiane: con una classe scritta a
   mano "árbol" perdeva la a e "château" si spezzava in due (spec 14b).
   \p{M} tiene dentro i SEGNI COMBINANTI: le tastiere di macOS e iOS
   scrivono "ó" come "o" + U+0301, e senza questo "corazón" si spezzava in
   "corazo" + "n" (4 sillabe invece di 3). Le posizioni `da`/`a` restano
   quelle del testo grezzo — la normalizzazione a NFC avviene parola per
   parola dentro `pulisci`, dove non sposta niente. */
const PAROLA = /[\p{L}\p{M}'’]+/gu;

/** Le parole del verso, con dove cominciano e finiscono nel testo. */
export function parole(verso, pulisci = normalizza) {
    const out = [];
    const testo = String(verso || '');
    PAROLA.lastIndex = 0;
    let m = PAROLA.exec(testo);
    while (m) {
        const grezza = m[0];
        const pulita = pulisci(grezza);
        if (pulita.replace(/'/g, '')) out.push({ testo: grezza, pulita, da: m.index, a: m.index + grezza.length });
        m = PAROLA.exec(testo);
    }
    return out;
}

const finisceInVocale = (p, vocale = isVocale) => {
    const senzaApostrofo = p.replace(/'+$/, '');
    return vocale(senzaApostrofo.slice(-1));
};
const iniziaPerVocale = (p, vocale = isVocale) => {
    const chars = p.replace(/^'+/, '');
    /* la h non suona: "che ho" fa sinalefe come "che o" */
    const primo = chars[0] === 'h' ? chars[1] : chars[0];
    return vocale(primo);
};

const PESO = { tronca: 1, piana: 0, sdrucciola: -1, bisdrucciola: -2 };

/**
 * Analisi completa di un verso. `dialefe` e' l'insieme degli indici di
 * sinalefe spenti a mano (indice = posizione della parola di sinistra).
 */
export function versoMetrico(verso, {
    dialefe = null,
    classi = null,
    /* (parola) -> { sillabe, classe, stimato } | null dal rimario in
       memoria: sillabe e accento VERI (Wikizionario, CMU, IPA) al posto
       delle regole. `stimato` = il rimario non ne sa piu' delle regole. */
    tratti = null,
    /* regole di un'altra lingua (spec 14b): stesse firme dell'italiano.
       `sinalefe` e `normalizza` dicono se quella lingua le usa — il
       francese no, e l'inglese conta e basta. */
    moduli = null,
    sinalefe = true,
    normalizza: aPiano = true,
    emuet = false
} = {}) {
    const reg = moduli && moduli.sillabe ? moduli.sillabe : null;
    const dividi = reg ? reg.sillabe : sillabe;
    const accentoDi = reg ? reg.accento : accento;
    /* anche la pulizia e l'alfabeto delle vocali sono della lingua: sono
       loro a decidere che "árbol" comincia per a e "año" tiene la n. */
    const pulisci = reg && reg.normalizza ? reg.normalizza : normalizza;
    const vocale = reg && reg.isVocale ? reg.isVocale : isVocale;
    const spente = dialefe instanceof Set ? dialefe : new Set(Array.isArray(dialefe) ? dialefe : []);
    const lista = parole(verso, pulisci).map((p) => {
        const parti = dividi(p.pulita, { emuet });
        const acc = accentoDi(p.pulita, { sillabe: parti, emuet });
        /* il rimario, quando c'e', sa la classe vera: "sillaba" e'
           sdrucciola, la regola di ripiego la darebbe piana */
        const chiave = p.pulita.replace(/'/g, '');
        const dati = typeof tratti === 'function' ? tratti(chiave) : null;
        const vero = dati && PESO[dati.classe] !== undefined ? dati.classe : (typeof classi === 'function' ? classi(chiave) : null);
        const classe = vero && PESO[vero] !== undefined ? vero : acc.classe;
        /* i tratti FR vengono dall'IPA, che la e muta non la conta mai:
           se l'autore la vuole contata si aggiunge la differenza delle regole */
        const extraMuta = dati && emuet ? Math.max(0, parti.length - dividi(p.pulita, { emuet: false }).length) : 0;
        const conta = dati && dati.sillabe > 0 ? dati.sillabe + extraMuta : parti.length;
        const esito = dati ? (dati.stimato ? 'stimato' : 'esatto') : (vero ? 'esatto' : acc.esito);
        return { ...p, sillabe: conta, parti, classe, esito };
    });
    const grammaticale = lista.reduce((n, p) => n + p.sillabe, 0);
    const sinalefi = [];
    for (let i = 0; sinalefe && i + 1 < lista.length; i++) {
        if (!finisceInVocale(lista[i].pulita, vocale) || !iniziaPerVocale(lista[i + 1].pulita, vocale)) continue;
        sinalefi.push({
            indice: i,
            prima: lista[i].testo,
            dopo: lista[i + 1].testo,
            attiva: !spente.has(i),
            da: lista[i].a - 1,
            a: lista[i + 1].da + 1
        });
    }
    const unite = sinalefi.filter((s) => s.attiva).length;
    const ultima = lista[lista.length - 1];
    const coda = ultima && aPiano ? (PESO[ultima.classe] || 0) : 0;
    const metrico = lista.length ? Math.max(0, grammaticale - unite + coda) : 0;
    return {
        parole: lista,
        grammaticale,
        metrico,
        sinalefi,
        classe: ultima ? ultima.classe : 'piana',
        /* almeno una parola con l'accento indovinato: il numero va in muted */
        stimato: lista.some((p) => p.esito === 'stimato')
    };
}

/** Solo il numero, come lo vuole la colonna a margine. */
export function contaVerso(verso, modo = 'metrico', dialefe = null, classi = null, opts = {}) {
    const a = versoMetrico(verso, { dialefe, classi, ...opts });
    return modo === 'grammaticale' ? a.grammaticale : a.metrico;
}

/**
 * Tutti i versi di un testo, uno per riga. `dialefe` e' una mappa
 * { "<riga>": [indici] } come la salva il documento.
 */
export function contaTesto(testo, modo = 'metrico', dialefe = null, classi = null) {
    return String(testo == null ? '' : testo).split('\n').map((riga, i) => {
        const spente = dialefe ? dialefe[String(i)] : null;
        return contaVerso(riga, modo, spente, classi);
    });
}

/** L'ultima parola del verso: serve ai colori di rima. */
export function ultimaParola(verso, pulisci = normalizza) {
    const lista = parole(verso, pulisci);
    return lista.length ? lista[lista.length - 1].pulita.replace(/'/g, '') : '';
}
