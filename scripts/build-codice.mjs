#!/usr/bin/env node
/**
 * Costruisce la lista delle parole del codice del quaderno (spec 17 §4).
 *
 *   node scripts/build-codice.mjs
 *
 * Sorgente: `toolbox/penna/data/parole-v3.txt`, una forma per riga in ordine
 * di FREQUENZA (l'indice e' il rango): le prime che passano i filtri sono
 * anche le piu' comuni, quindi le piu' facili da scrivere a mano e da dettare
 * al telefono.
 *
 * Filtri, nell'ordine:
 *   1. solo `a-z`, 4-8 lettere (niente accenti, apostrofi, maiuscole: il
 *      codice si digita su una tastiera qualunque e si normalizza a minuscole);
 *   2. **ortografia italiana**, perche' il corpus viene dai sottotitoli ed e'
 *      pieno di nomi e parole inglesi (`aaron`, `lloyd`, `world`, `little`):
 *      alfabeto di 21 lettere (niente j k w x y), finale di vocale, `h` solo
 *      in `ch`/`gh` davanti a `e`/`i`, `q` sempre seguita da `u`, niente gruppi
 *      di tre consonanti che non comincino per `s` (`str-`, `spr-` vanno bene,
 *      `mcg-` no);
 *   3. **accento esatto** (bit 0 di `tratti-v3.bin` a zero): la sillabazione
 *      viene dal Wizionario italiano, non dalle regole di ripiego. E' il
 *      filtro che toglie i residui stranieri che l'ortografia lascia passare;
 *   4. niente parole offensive ovvie (STEM e ESATTE qui sotto): il codice si
 *      mostra a schermo e si legge ad alta voce;
 *   5. **prefisso di quattro lettere unico**: quattro lettere bastano a
 *      riconoscere la parola, quindi un refuso nella coda non crea ambiguita'
 *      e una futura correzione automatica resta possibile.
 * Si prendono le prime 2048 (= 11 bit per parola, 66 bit in sei parole) e si
 * ordinano in ALFABETICO: l'ordine del file non porta informazione e quello
 * alfabetico rende leggibile il diff e possibile la ricerca binaria.
 *
 * Scrive `toolbox/penna/parole-codice.js` (export default, fine riga LF).
 * Lo script e' deterministico: due esecuzioni danno lo stesso file.
 *
 * ATTENZIONE — LA LISTA E' CONGELATA (v1).
 * Dal 21/09/2026 la lista e' quella pubblicata: i codici gia' in mano agli
 * utenti valgono solo contro QUESTE 2048 parole. Non la si rigenera, non si
 * tocca un filtro, non si aggiorna `parole-v3.txt` "per migliorarla": una
 * parola che entra o esce sposta tutte le altre e i quaderni gia' creati
 * diventano illeggibili, senza recupero possibile (non c'e' account).
 * Per una lista nuova servono un SALE e una VERSIONE nuovi in `penna/sync.js`
 * (`tt-quaderno-v1` -> `-v2`), e i vecchi codici vanno continuati a
 * supportare. Questo script resta qui per documentare come e' nata la lista
 * e per poterla riprodurre uguale, non per rifarla.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATI = path.join(ROOT, 'toolbox', 'penna', 'data');
const SORGENTE = path.join(DATI, 'parole-v3.txt');
const TRATTI = path.join(DATI, 'tratti-v3.bin');
const USCITA = path.join(ROOT, 'toolbox', 'penna', 'parole-codice.js');

const QUANTE = 2048;
const PREFISSO = 4;
const MIN = 4;
const MAX = 8;

/* Volgarita', insulti e bestemmie: il codice si mostra in grande e si legge
   ad alta voce, non ci devono finire. Gli STEM tagliano anche le forme
   flesse (cazz- prende cazzo, cazzata, cazzate...), le ESATTE valgono per le
   parole il cui prefisso serve anche a parole normali (cessare, penetrare).
   Lista corta e dichiarata: e' un filtro, non una morale. */
const STEM = [
    'cazz', 'minch', 'stronz', 'merd', 'troi', 'puttan', 'zoccol', 'bastard',
    'coglion', 'vaffa', 'scopat', 'scopar', 'sborr', 'pisell', 'incul', 'froci',
    'finocchi', 'ricchion', 'negro', 'negri', 'negra', 'negre', 'stupr', 'pompin',
    'vagin', 'clitorid', 'orgasm', 'erezion', 'sperm', 'prostitut', 'bocchin',
    'sfig', 'porcod', 'diocan', 'dioporc', 'mongoloid', 'handicapp', 'culon', 'checca'
];
const ESATTE = new Set([
    'culo', 'culi', 'figa', 'fighe', 'figo', 'fighi', 'fica', 'fiche', 'fico',
    'sega', 'seghe', 'tetta', 'tette', 'cesso', 'cessi', 'pene', 'peni', 'ano',
    'porno', 'sfigato', 'sfigata', 'ebete', 'idiota', 'idioti', 'cretino',
    'cretini', 'imbecille', 'deficiente', 'mongolo', 'mongoli', 'nazista',
    'nazisti', 'razzista', 'razzisti', 'sfiga'
]);

const righe = fs.readFileSync(SORGENTE, 'utf8').split('\n');
const tratti = fs.readFileSync(TRATTI);

/* Ortografia italiana: quel che il corpus dei sottotitoli non garantisce. */
function italiana(p) {
    if (!/^[abcdefghilmnopqrstuvz]+$/.test(p)) return false;   // niente j k w x y
    if (!/[aeiou]$/.test(p)) return false;                     // finale di vocale
    if (/q(?!u)/.test(p)) return false;                        // q sempre con u
    if (/h/.test(p.replace(/([cg])h(?=[ei])/g, '$1'))) return false; // h solo in che/chi/ghe/ghi
    /* tre consonanti di fila solo dopo una s (strada, spremere, scrivere) */
    for (const m of p.matchAll(/[^aeiou]{3,}/g)) {
        if (m[0].length > 3 || m[0][0] !== 's') return false;
    }
    return true;
}

const pulita = (p) => p.length >= MIN && p.length <= MAX && italiana(p)
    && !ESATTE.has(p) && !STEM.some((s) => p.startsWith(s));

const prefissi = new Set();
const scelte = [];
let esaminate = 0;
let rango = 0;
for (let i = 0; i < righe.length; i++) {
    const parola = righe[i].trim();
    if (!parola) continue;
    esaminate++;
    if (!pulita(parola)) continue;
    if (tratti[i] & 1) continue;                 // accento stimato: parola non nel Wizionario
    const pre = parola.slice(0, PREFISSO);
    if (prefissi.has(pre)) continue;
    prefissi.add(pre);
    scelte.push(parola);
    if (scelte.length === QUANTE) { rango = i; break; }
}

if (scelte.length < QUANTE) {
    console.error(`Solo ${scelte.length} parole ammissibili su ${esaminate}: servono ${QUANTE}.`);
    process.exit(1);
}

scelte.sort();

/* controlli di sanita': se uno salta, il file non si scrive */
const controlli = [
    [new Set(scelte).size === QUANTE, 'parole duplicate'],
    [new Set(scelte.map((p) => p.slice(0, PREFISSO))).size === QUANTE, 'prefissi di 4 lettere duplicati'],
    [scelte.every((p) => pulita(p)), 'una parola non rispetta i filtri'],
    [scelte.every((p, i) => i === 0 || scelte[i - 1] < p), 'ordine alfabetico rotto']
];
for (const [esito, perche] of controlli) {
    if (!esito) { console.error('Controllo fallito: ' + perche); process.exit(1); }
}

/* 8 parole per riga: il file resta leggibile e il diff utile */
const corpo = [];
for (let i = 0; i < scelte.length; i += 8) {
    corpo.push('    ' + scelte.slice(i, i + 8).map((p) => `'${p}'`).join(', ') + (i + 8 < scelte.length ? ',' : ''));
}

const testa = `/**
 * Tiny Temple Toolbox - Penna: le parole del codice del quaderno (spec 17 §4).
 *
 * GENERATO da \`node scripts/build-codice.mjs\` — non si modifica a mano.
 * ${QUANTE} parole italiane comuni, ${MIN}-${MAX} lettere, solo a-z, prefisso di
 * ${PREFISSO} lettere unico, in ordine alfabetico. Sei parole = 2048^6 = 66 bit.
 * LISTA CONGELATA (v1, 21/09/2026). NON si rigenera: una parola che entra o
 * esce sposta tutte le altre e i quaderni gia' creati diventano illeggibili,
 * senza recupero (non c'e' account). Per una lista nuova servono un sale e
 * una versione nuovi in penna/sync.js.
 */

export const PAROLE = [
${corpo.join('\n')}
];

export default PAROLE;
`;

fs.writeFileSync(USCITA, testa.replace(/\r\n/g, '\n'), 'utf8');
const kb = (fs.statSync(USCITA).size / 1024).toFixed(1);
console.log(`${QUANTE} parole (${scelte[0]} ... ${scelte[QUANTE - 1]}), ${kb} KB -> ${path.relative(ROOT, USCITA)}`);
console.log(`lunghezze: ${[...new Set(scelte.map((p) => p.length))].sort((a, b) => a - b).join(', ')}; ${esaminate} righe lette, ultima presa al rango ${rango}`);
