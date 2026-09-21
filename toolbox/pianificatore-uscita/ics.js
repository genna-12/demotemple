/**
 * Tiny Temple Toolbox - Pianificatore di uscita: export iCalendar (spec 15 §4).
 *
 * MODULO PURO: nessun DOM, nessuna rete, nessun i18n. Riceve testi GIA'
 * tradotti da `pianificatore.js` e restituisce una stringa `.ics`.
 *
 * RFC 5545, nel dettaglio che conta:
 * - righe separate da CRLF (`\r\n`), anche l'ultima. E' l'UNICA eccezione alla
 *   regola "tutto LF" del progetto: il file nasce a runtime da un Blob,
 *   `scripts/check.mjs` non lo vede mai (spec §4).
 * - "content line" piegata a 75 OTTETTI: le righe successive iniziano con uno
 *   spazio, e non si spezza mai in mezzo a un carattere multi-byte.
 * - eventi di una giornata intera: `DTSTART;VALUE=DATE:YYYYMMDD` e
 *   `DTEND;VALUE=DATE:<giorno dopo>` (DTEND e' esclusivo). Niente ora, niente
 *   fuso: il giorno resta quello ovunque nel mondo.
 * - TEXT: si proteggono `\` `;` `,` e gli a capo (che diventano `\n`).
 * - `UID` stabile `<idPiano>-<idTappa>@toolbox.tinytemplestudio.it`: reimportare
 *   lo stesso piano aggiorna gli eventi invece di duplicarli.
 *
 * API
 *   icsDaPiano(piano, opzioni?) -> string
 *   icsDaPiani([piano], opzioni?) -> string
 *   nomeFile(piano) -> 'piano-<titolo>.ics'
 *   escapeTesto(s), piega(riga), ottetti(s)   (esportate per i test)
 *
 * `piano` atteso:
 *   { id, titolo, tappe: [{ id, titolo, testo, data }] }   date 'YYYY-MM-DD'
 * `opzioni`: { dominio, prodid, dtstamp }  (dtstamp: Date o ms, per i test)
 */

export const DOMINIO = 'toolbox.tinytemplestudio.it';
export const PRODID = '-//Tiny Temple Studio//Toolbox Pianificatore di uscita//IT';

const CRLF = '\r\n';
const LIMITE = 75;      // ottetti della prima riga
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Lunghezza in ottetti UTF-8 (non in caratteri: "é" pesa 2). */
export function ottetti(s) {
    const str = String(s == null ? '' : s);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(str).length;
    let n = 0;
    for (const ch of str) {
        const c = ch.codePointAt(0);
        n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    return n;
}

/** Protegge un valore TEXT della RFC 5545. L'ordine conta: prima la barra. */
export function escapeTesto(s) {
    return String(s == null ? '' : s)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Piega una content line a 75 ottetti; le righe successive iniziano con uno
 * spazio (che conta come ottetto, quindi hanno 74 ottetti di contenuto).
 * Non spezza mai un carattere: si conta per code point.
 */
export function piega(riga) {
    const testo = String(riga == null ? '' : riga);
    if (ottetti(testo) <= LIMITE) return testo;
    const fuori = [];
    let corrente = '';
    let peso = 0;
    let max = LIMITE;
    for (const ch of testo) {
        const w = ottetti(ch);
        if (peso + w > max) {
            fuori.push(corrente);
            corrente = '';
            peso = 0;
            max = LIMITE - 1;   // lo spazio iniziale occupa un ottetto
        }
        corrente += ch;
        peso += w;
    }
    if (corrente) fuori.push(corrente);
    return fuori.map((r, i) => (i === 0 ? r : ' ' + r)).join(CRLF);
}

/** 'YYYY-MM-DD' -> '20261106'; '' se la data non e' utilizzabile. */
function compatta(iso) {
    const m = ISO.exec(String(iso || ''));
    return m ? m[1] + m[2] + m[3] : '';
}

/** Giorno dopo, per il DTEND esclusivo. Aritmetica a mezzogiorno UTC. */
function giornoDopo(iso) {
    const m = ISO.exec(String(iso || ''));
    if (!m) return '';
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) + 86400000;
    const d = new Date(t);
    const due = (n) => (n < 10 ? '0' + n : String(n));
    return String(d.getUTCFullYear()) + due(d.getUTCMonth() + 1) + due(d.getUTCDate());
}

/** DTSTAMP: sempre in UTC, con la Z. */
function stampa(quando) {
    const d = quando instanceof Date ? quando : new Date(quando == null ? Date.now() : quando);
    const due = (n) => (n < 10 ? '0' + n : String(n));
    return String(d.getUTCFullYear()) + due(d.getUTCMonth() + 1) + due(d.getUTCDate())
        + 'T' + due(d.getUTCHours()) + due(d.getUTCMinutes()) + due(d.getUTCSeconds()) + 'Z';
}

/* L'UID deve restare lo stesso fra un export e l'altro: si ripuliscono solo
   i caratteri che romperebbero la riga, senza accorciare. */
function pulisciUid(s) {
    return String(s == null ? '' : s).replace(/[\s;,:"']/g, '-');
}

function vevento(piano, tappa, { dominio, dtstamp }) {
    const giorno = compatta(tappa.data);
    if (!giorno) return [];
    const titoloPiano = String(piano.titolo || '').trim();
    const titoloTappa = String(tappa.titolo || '').trim();
    const sommario = titoloPiano ? titoloPiano + ' — ' + titoloTappa : titoloTappa;
    const righe = [
        'BEGIN:VEVENT',
        'UID:' + pulisciUid(piano.id) + '-' + pulisciUid(tappa.id) + '@' + dominio,
        'DTSTAMP:' + dtstamp,
        'DTSTART;VALUE=DATE:' + giorno,
        'DTEND;VALUE=DATE:' + giornoDopo(tappa.data),
        'SUMMARY:' + escapeTesto(sommario)
    ];
    if (tappa.testo) righe.push('DESCRIPTION:' + escapeTesto(tappa.testo));
    righe.push('TRANSP:TRANSPARENT', 'END:VEVENT');
    return righe;
}

/** Un `.ics` con gli eventi di piu' piani (la vista Prossime li unisce). */
export function icsDaPiani(piani, { dominio = DOMINIO, prodid = PRODID, dtstamp } = {}) {
    const quando = stampa(dtstamp);
    const righe = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:' + prodid,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];
    (piani || []).forEach((piano) => {
        if (!piano) return;
        (piano.tappe || []).forEach((tappa) => {
            if (!tappa) return;
            righe.push(...vevento(piano, tappa, { dominio, dtstamp: quando }));
        });
    });
    righe.push('END:VCALENDAR');
    /* CRLF anche in fondo: la RFC vuole che ogni content line finisca cosi' */
    return righe.map(piega).join(CRLF) + CRLF;
}

/** Il caso normale: il piano aperto. */
export function icsDaPiano(piano, opzioni) {
    return icsDaPiani([piano], opzioni);
}

/** Nome del file scaricato: minuscolo, senza accenti ne' spazi. */
export function nomeFile(piano) {
    const base = String((piano && piano.titolo) || 'piano')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return (base || 'piano') + '.ics';
}
