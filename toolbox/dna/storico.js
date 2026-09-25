/**
 * Tiny Temple Toolbox - DNA: lo storico come dati (spec 20 §4).
 *
 * Modulo PURO: niente DOM, niente archivio, niente i18n propria. Le
 * traduzioni arrivano da chi chiama (`t`), la lingua pure (`lingua`), cosi'
 * le funzioni si provano in Node e nel browser allo stesso modo.
 *
 *   idDaHash / hashDiId        l'hash #r=<id>, unica fonte della vista
 *   nomeMostrato(r)            il nome della voce: quello scelto a mano o i tag
 *   normalizza(s)              minuscole senza accenti (ricerca)
 *   filtra(voci, opz)          Camelot + ricerca, in AND; `esclusa` fuori
 *   semitoni(a, b)             da Camelot a Camelot, -6..+5
 *   confronto(a, b)            le righe del confronto (scelta - aperta)
 *   numero(v, cifre, lingua)   "-9,3" in italiano, "-9.3" in inglese, senza migliaia
 *   durata(s)                  "3:42"
 *   csv(voci, { lingua, t })   il file dello storico (BOM, CRLF, RFC 4180)
 *   nomeCsv(data)              dna-storico-AAAA-MM-GG.csv
 *   testoVoce(r, { lingua, t }) il testo di Copia e Condividi (4 righe)
 *
 * Una "voce" e' il record normalizzato di dna.js (`migrate`) con in piu'
 * `id` (l'istante dell'analisi, che e' anche la chiave nell'archivio).
 */

import { compatibleWith } from '../shared/analysis/key.js';

const due = (n) => String(n).padStart(2, '0');
const nessuno = (k) => k;

/* ---------------- hash ---------------- */

/** `#r=<id>` -> id (decodificato), altrimenti null. */
export function idDaHash(hash) {
    const m = String(hash == null ? '' : hash).match(/^#?r=([^&]*)(?:&[\s\S]*)?$/);
    if (!m) return null;
    let v = m[1];
    try { v = decodeURIComponent(v); } catch (e) { /* hash malfatto: si usa com'e' */ }
    v = v.trim();
    return v || null;
}

/** id -> `#r=<id>` (gli id sono istanti ISO: ':' e '.' si codificano). */
export function hashDiId(id) {
    return '#r=' + encodeURIComponent(String(id));
}

/* ---------------- nomi e ricerca ---------------- */

/** Il nome scelto a mano vince sui tag del file (stessa regola della riga). */
export function nomeMostrato(r) {
    if (!r) return '';
    if (r.renamed && r.name) return r.name;
    return [r.artist, r.title].filter(Boolean).join(' - ') || r.name || '';
}

/** Minuscole, senza accenti ne' segni diacritici: "Perché" -> "perche". */
export function normalizza(s) {
    return String(s == null ? '' : s)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Le voci da mostrare. `camelot`: solo quelle con quel codice; `q`:
 * sottostringa del nome mostrato (senza maiuscole ne' accenti); i due
 * filtri valgono insieme. `esclusa`: un id da lasciare fuori (la voce
 * aperta, mentre si filtra per tonalita'). L'ordine resta quello dato.
 */
export function filtra(voci, { camelot = null, q = '', esclusa = null } = {}) {
    const ago = normalizza(q);
    return (Array.isArray(voci) ? voci : []).filter((v) => {
        if (!v) return false;
        if (esclusa !== null && esclusa !== undefined && String(v.id) === String(esclusa)) return false;
        if (camelot && v.camelot !== camelot) return false;
        if (ago && !normalizza(nomeMostrato(v)).includes(ago)) return false;
        return true;
    });
}

/* ---------------- Camelot e confronto ---------------- */

/** "8B" -> classe di altezza della tonica (8B = do, 8A = la). null se non e' un codice. */
function altezza(camelot) {
    const m = /^(\d{1,2})([AB])$/.exec(String(camelot || ''));
    if (!m) return null;
    const n = Number(m[1]);
    if (n < 1 || n > 12) return null;
    /* un passo di ruota = una quinta (7 semitoni); il minore sta 3 sotto */
    const base = (n - 8) * 7 + (m[2] === 'A' ? 9 : 0);
    return ((base % 12) + 12) % 12;
}

/**
 * Distanza fra le toniche di due codici Camelot, da `a` a `b`, nell'intervallo
 * -6..+5 (il tritono si scrive -6). null se uno dei due non e' un codice.
 * 8B -> 7B = +5 (do -> fa), 8B -> 9B = -5 (do -> sol).
 */
export function semitoni(a, b) {
    const pa = altezza(a);
    const pb = altezza(b);
    if (pa === null || pb === null) return null;
    let d = ((pb - pa) % 12 + 12) % 12;
    if (d >= 6) d -= 12;
    return d;
}

const finito = (v) => typeof v === 'number' && isFinite(v);
const diff = (a, b) => (finito(a) && finito(b) ? b - a : null);

/**
 * Il confronto della voce aperta `a` con la scelta `b`. Ogni riga ha
 * { chiave, a, b, delta } con delta = scelta - aperta (null se manca un
 * valore); la riga `camelot` ha in piu' `compatibile`.
 */
export function confronto(a, b) {
    const x = a || {};
    const y = b || {};
    const ka = x.camelot || '';
    const kb = y.camelot || '';
    const lra = (v) => (finito(v) ? v : null);
    return [
        { chiave: 'bpm', a: finito(x.bpm) && x.bpm > 0 ? x.bpm : null, b: finito(y.bpm) && y.bpm > 0 ? y.bpm : null,
            delta: finito(x.bpm) && finito(y.bpm) && x.bpm > 0 && y.bpm > 0 ? y.bpm - x.bpm : null },
        { chiave: 'camelot', a: ka || null, b: kb || null, delta: semitoni(ka, kb),
            compatibile: !!(ka && kb && (ka === kb || compatibleWith(ka).includes(kb))) },
        { chiave: 'lufs', a: finito(x.lufs) ? x.lufs : null, b: finito(y.lufs) ? y.lufs : null, delta: diff(x.lufs, y.lufs) },
        { chiave: 'tp', a: finito(x.truePeak) ? x.truePeak : null, b: finito(y.truePeak) ? y.truePeak : null, delta: diff(x.truePeak, y.truePeak) },
        { chiave: 'lra', a: lra(x.lra), b: lra(y.lra), delta: diff(lra(x.lra), lra(y.lra)) },
        { chiave: 'durata', a: finito(x.seconds) ? x.seconds : null, b: finito(y.seconds) ? y.seconds : null, delta: diff(x.seconds, y.seconds) }
    ];
}

/* ---------------- numeri ---------------- */

/**
 * Numero con `cifre` decimali, separatore della lingua (virgola in
 * italiano, punto in inglese), segno meno ASCII, senza separatore delle
 * migliaia: lo leggono Excel/Numbers/Sheets nella loro lingua.
 */
export function numero(v, cifre = 0, lingua = 'it') {
    if (!finito(v)) return '';
    let s = Number(v).toFixed(cifre);
    if (/^-0(?:\.0+)?$/.test(s)) s = s.slice(1);     // niente "-0,0"
    return lingua === 'en' ? s : s.replace('.', ',');
}

/** Secondi -> "3:42" (arrotondati al secondo; col segno se negativi). */
export function durata(s) {
    if (!finito(s)) return '';
    const tot = Math.round(Math.abs(s));
    return (s < 0 && tot ? '-' : '') + Math.floor(tot / 60) + ':' + due(tot % 60);
}

/* ---------------- CSV ---------------- */

/** "2026-09-25 21:34" nell'ora locale di chi esporta. */
function dataOra(at) {
    const d = new Date(at);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate())
        + ' ' + due(d.getHours()) + ':' + due(d.getMinutes());
}

/** Un testo che comincia con = + - @ diventerebbe una formula: apostrofo davanti. */
function disinnesca(s) {
    const v = String(s == null ? '' : s);
    return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/** RFC 4180: tra virgolette se contiene separatore, virgolette o a capo. */
function campo(v, sep) {
    const s = String(v == null ? '' : v);
    if (s.includes(sep) || /["\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
}

/** Chiavi delle colonne, nell'ordine (spec 20 §3). */
export const COLONNE = ['dna-csv-name', 'dna-csv-date', 'dna-csv-bpm', 'dna-csv-key', 'dna-csv-camelot',
    'dna-csv-lufs', 'dna-csv-tp', 'dna-csv-lra', 'dna-csv-duration', 'dna-csv-source'];

/** "C maggiore" / "A minor" (vuoto se la tonalita' manca). */
function tonalita(r, t) {
    if (!r.tonic) return '';
    return r.tonic + ' ' + t(r.mode === 'minor' ? 'dna-minor' : 'dna-major');
}

/**
 * Tutto lo storico in CSV: BOM UTF-8, righe CRLF, prima l'intestazione
 * tradotta, poi le voci dalla piu' recente. In italiano `;` e virgola
 * decimale (Excel italiano lo apre gia' a colonne), in inglese `,` e punto.
 */
export function csv(voci, { lingua = 'it', t = nessuno } = {}) {
    const en = lingua === 'en';
    const sep = en ? ',' : ';';
    const ordinate = (Array.isArray(voci) ? voci : []).filter(Boolean).slice()
        .sort((a, b) => String(b.at || b.id || '').localeCompare(String(a.at || a.id || '')));
    const righe = [COLONNE.map((k) => t(k))];
    ordinate.forEach((r) => {
        righe.push([
            disinnesca(nomeMostrato(r)),
            dataOra(r.at || r.id),
            finito(r.bpm) && r.bpm > 0 ? numero(r.bpm, 0, lingua) : '',
            disinnesca(tonalita(r, t)),
            disinnesca(r.camelot || ''),
            numero(r.lufs, 1, lingua),
            numero(r.truePeak, 1, lingua),
            numero(r.lra, 1, lingua),
            finito(r.seconds) && r.seconds > 0 ? String(Math.round(r.seconds)) : '',
            t(r.source === 'mic' ? 'dna-src-mic' : 'dna-src-file')
        ]);
    });
    return '﻿' + righe.map((cols) => cols.map((c) => campo(c, sep)).join(sep)).join('\r\n');
}

/** dna-storico-AAAA-MM-GG.csv (data locale: e' il nome che vede chi scarica). */
export function nomeCsv(data = new Date()) {
    return 'dna-storico-' + data.getFullYear() + '-' + due(data.getMonth() + 1) + '-' + due(data.getDate()) + '.csv';
}

/* ---------------- testo di una voce ---------------- */

/**
 * Il testo di Copia e Condividi (spec 20 §3), quattro righe:
 *   Nome
 *   BPM 128 · C maggiore (8B)
 *   -9,3 LUFS · -0,8 dBTP · LRA 6,1 LU
 *   3:42 · File
 * Un valore che manca (o una durata 0, delle voci vecchie) diventa "—";
 * senza LRA la parte "LRA" non c'e'.
 */
export function testoVoce(r, { lingua = 'it', t = nessuno } = {}) {
    if (!r) return '';
    const riga2 = 'BPM ' + (finito(r.bpm) && r.bpm > 0 ? numero(r.bpm, 0, lingua) : '—')
        + ' · ' + (r.tonic ? tonalita(r, t) + (r.camelot ? ' (' + r.camelot + ')' : '') : '—');
    const pezzi = [
        finito(r.lufs) ? numero(r.lufs, 1, lingua) + ' LUFS' : '— LUFS',
        finito(r.truePeak) ? numero(r.truePeak, 1, lingua) + ' dBTP' : '— dBTP'
    ];
    if (finito(r.lra)) pezzi.push('LRA ' + numero(r.lra, 1, lingua) + ' LU');
    const riga4 = (finito(r.seconds) && r.seconds > 0 ? durata(r.seconds) : '—')
        + ' · ' + t(r.source === 'mic' ? 'dna-src-mic' : 'dna-src-file');
    return [nomeMostrato(r) || '—', riga2, pezzi.join(' · '), riga4].join('\n');
}
