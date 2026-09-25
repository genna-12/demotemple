/**
 * Tiny Temple Toolbox - lo schema delle rime di un testo (spec 19 §3-4).
 *
 * Modulo PURO (niente DOM, niente rete): si prova in Node.
 *
 *   isSezione(riga)  una riga che e' solo `[qualcosa]` (1-40 caratteri,
 *                    spazi ai lati ammessi) e' un MARCATORE di sezione:
 *                    niente numero, niente lettera, non e' un verso.
 *   schemaRime(testo, { chiavi, pulisci, classe, nota })
 *                    -> [{ riga, famiglia, rima, colore, lettera, indice,
 *                          livello: 'rima' | 'assonanza' }]
 *                    solo per i versi che hanno una lettera, per riga.
 *
 * Due livelli, sull'ULTIMA parola di ogni verso:
 *   FAMIGLIA = vocali dalla tonica + classe dell'accento (assonanza a
 *     parita' di sillabe dopo la tonica: "mai" tronca != "balli" piana).
 *     Le famiglie con almeno due versi prendono una lettera (A, B... in
 *     ordine di primo verso) e un colore (indice % 8).
 *   RIMA PERFETTA = dentro la famiglia, versi con la stessa chiave di rima
 *     (almeno due): lettera piena, indice 1, 2, 3... (A, A2, A3) in ordine
 *     di primo verso. Gli altri versi della famiglia sono ASSONANZE:
 *     lettera vuota, indice 0.
 * Consonanze, multisillabiche e rime interne restano fuori (stanno nel
 * rimario). Invariante: stessa famiglia <=> stessa lettera; stessa rima <=>
 * stesso indice (e livello 'rima').
 *
 * `chiavi(parola, { forza, conteggio })` e `pulisci(parola)` sono quelli
 * della lingua del testo (shared/testo/<lingua>/): di default l'italiano.
 * `classe(parola)` da' la classe VERA dell'accento se il rimario la conosce
 * (stessa fonte del gutter), altrimenti null: allora decidono le regole.
 * `nota(parola)` -> { rima, classe, sillabe } | null: quello che il rimario
 * caricato sa della parola. La sua `rima` (indice inverso: Wikizionario,
 * CMU, IPA) vince sulle regole, che dalla scrittura sbagliano gli iati
 * ("follìa" non e' "stòria"); `sillabe` e `classe` guidano le regole quando
 * la chiave non c'e'. Parola ignota: solo regole.
 */

import { chiavi as chiaviIt } from './fonetica.js';
import { ultimaParola } from './metrica.js';

export const COLORI = 8;
const LETTERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOCALI = 'aeiou';
const soloVocali = (k) => [...String(k)].filter((c) => VOCALI.indexOf(c) !== -1).join('');

/* `[Ritornello]`, ` [Strofa 2] `: dentro almeno un carattere visibile */
const SEZIONE = /^\s*\[([^\[\]\n]{1,40})\]\s*$/;

/** true se la riga e' un marcatore di sezione (`[Strofa]`, `[Ritornello]`). */
export function isSezione(riga) {
    const m = SEZIONE.exec(String(riga == null ? '' : riga));
    return !!(m && /\S/.test(m[1]));
}

/** 0 -> A, 25 -> Z, 26 -> AA: una lettera per famiglia, mai riciclata. */
export function letteraDi(n) {
    let i = n + 1;
    let s = '';
    while (i > 0) {
        i -= 1;
        s = LETTERE[i % 26] + s;
        i = Math.floor(i / 26);
    }
    return s;
}

/**
 * Lo schema delle rime di un testo (vedi in testa). Non butta mai: una
 * parola che le regole non sanno leggere resta senza lettera.
 */
export function schemaRime(testo, { chiavi = chiaviIt, pulisci = null, classe = null, nota = null } = {}) {
    const righe = String(testo == null ? '' : testo).split('\n');
    const versi = [];
    /* stessa rima => stessa famiglia, anche se una lingua desse classi
       diverse a due parole con la stessa chiave: la famiglia di una rima
       e' quella del suo primo verso */
    const famigliaDiRima = new Map();
    righe.forEach((riga, i) => {
        if (!riga || !riga.trim() || isSezione(riga)) return;
        const parola = pulisci ? ultimaParola(riga, pulisci) : ultimaParola(riga);
        if (!parola) return;
        let k = null;
        try {
            const n = typeof nota === 'function' ? nota(parola) : null;
            const forza = (n && n.classe) || (typeof classe === 'function' ? (classe(parola) || null) : null) || null;
            const conteggio = n && Number.isInteger(n.sillabe) ? n.sillabe : null;
            k = chiavi(parola, conteggio ? { forza, conteggio } : { forza });
            /* la chiave del rimario, se c'e', e' la fonte migliore */
            if (k && n && typeof n.rima === 'string' && n.rima) k = { ...k, rima: n.rima, vocali: soloVocali(n.rima) };
        } catch (e) {
            k = null;
        }
        if (!k || !k.rima) return;
        const rima = String(k.rima);
        let famiglia = famigliaDiRima.get(rima);
        if (famiglia === undefined) {
            famiglia = String(k.vocali || '') + '|' + String(k.classe || '');
            famigliaDiRima.set(rima, famiglia);
        }
        versi.push({ riga: i, rima, famiglia });
    });

    /* famiglie in ordine di primo verso (le Map tengono l'ordine d'ingresso) */
    const perFamiglia = new Map();
    versi.forEach((v) => {
        const arr = perFamiglia.get(v.famiglia);
        if (arr) arr.push(v); else perFamiglia.set(v.famiglia, [v]);
    });

    const out = [];
    let n = 0;
    perFamiglia.forEach((membri, famiglia) => {
        if (membri.length < 2) return;           // un verso da solo non rima
        const lettera = letteraDi(n);
        const colore = n % COLORI;
        n++;
        const perRima = new Map();
        membri.forEach((v) => {
            const arr = perRima.get(v.rima);
            if (arr) arr.push(v); else perRima.set(v.rima, [v]);
        });
        let gruppo = 0;
        perRima.forEach((stessi, rima) => {
            const perfetta = stessi.length >= 2;
            const indice = perfetta ? ++gruppo : 0;
            stessi.forEach((v) => out.push({
                riga: v.riga,
                famiglia,
                rima,
                colore,
                lettera,
                indice,
                livello: perfetta ? 'rima' : 'assonanza'
            }));
        });
    });
    return out.sort((a, b) => a.riga - b.riga);
}
