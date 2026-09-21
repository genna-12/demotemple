/**
 * Tiny Temple Toolbox - il quaderno di Penna sul server (spec 17 §4).
 *
 * Pages Function del progetto Pages della Toolbox (Root directory `toolbox/`,
 * quindi questa cartella `functions/` e' li' dentro). Il doppio parentesi
 * cattura ogni profondita': `context.params.route` e' un array di segmenti.
 *
 *   GET    /api/quaderno/<id>          -> { ora, voci:[{doc, aggiornato, cancellato}] }
 *   GET    /api/quaderno/<id>/<doc>    -> { doc, aggiornato, cancellato, blob }
 *   PUT    /api/quaderno/<id>/<doc>    <- { aggiornato, blob }   -> { ok, aggiornato }
 *   DELETE /api/quaderno/<id>/<doc>    <- { aggiornato }          lapide
 *   DELETE /api/quaderno/<id>                                     svuota il quaderno
 *
 * Il server NON sa leggere niente: `id` e `doc` sono casuali, `blob` e' un
 * AES-GCM che nasce e muore sul dispositivo. Qui si conservano solo un
 * identificatore, una data e un blocco opaco — **e non si scrive mai un blob
 * in un log**, nemmeno in un messaggio d'errore.
 *
 * `_headers` non vale per le risposte delle Functions
 * (developers.cloudflare.com/pages/configuration/headers/): le intestazioni
 * le scrive `risposta()` qui sotto. Nessun cookie, nessun CORS: stesso origin.
 */

const ID_RE = /^[0-9a-f]{32}$/;
const DOC_RE = /^[0-9a-f]{16}$/;

const MAX_BLOB = 262144;          // caratteri base64 (~192 KB cifrati)
const MAX_CORPO = 300 * 1024;     // Content-Length
const MAX_DOC = 1000;             // documenti per quaderno
const AVANTI = 60 * 1000;         // quanto puo' essere avanti l'orologio del client
const FINESTRA = 60 * 1000;       // rate limit: finestra
const COLPI = 60;                 // rate limit: scritture per finestra

function risposta(dati, stato = 200, extra = null) {
    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    };
    if (extra) Object.assign(headers, extra);
    return new Response(JSON.stringify(dati), { status: stato, headers });
}

const errore = (codice, stato, extra) => risposta({ errore: codice }, stato, extra);

/** I segmenti del percorso, comunque li passi Pages. */
function segmenti(context) {
    const r = context && context.params ? context.params.route : null;
    const arr = Array.isArray(r) ? r : (typeof r === 'string' && r ? r.split('/') : []);
    return arr.filter((s) => s !== '');
}

/**
 * Il tetto di `Content-Length`, PRIMA di leggere qualunque byte: una
 * richiesta enorme si rifiuta senza tirarsela dentro (e senza spendere
 * CPU). Si chiama prima del rate limit, che a sua volta viene prima di
 * `corpo()`.
 */
function controllaLunghezza(request) {
    const lungo = Number(request.headers.get('content-length') || 0);
    if (lungo > MAX_CORPO) { const e = new Error('grande'); e.codice = 'grande'; e.stato = 413; throw e; }
}

/** Il corpo JSON. Da chiamare solo dopo controllaLunghezza() e il rate limit. */
async function corpo(request) {
    let testo;
    try { testo = await request.text(); } catch (x) { const e = new Error('corpo'); e.codice = 'corpo'; e.stato = 400; throw e; }
    if (testo.length > MAX_CORPO) { const e = new Error('grande'); e.codice = 'grande'; e.stato = 413; throw e; }
    if (!testo) return {};
    try { return JSON.parse(testo); } catch (x) { const e = new Error('corpo'); e.codice = 'corpo'; e.stato = 400; throw e; }
}

/**
 * Il blob deve essere base64 e basta: il server non lo legge mai, ma nemmeno
 * accetta di conservare una stringa qualunque. Alfabeto standard (niente
 * URL-safe: lo produce `btoa`), lunghezza multipla di 4, padding al massimo
 * di due `=`. Cosi' una riga corrotta si ferma qui invece di tornare al
 * client e fallire in decifratura.
 */
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
function blobValido(blob) {
    return blob.length > 0 && blob.length % 4 === 0 && B64_RE.test(blob);
}

/** Un orologio sbagliato non deve vincere per sempre: min(client, adesso+60 s). */
function dataValida(valore, adesso) {
    const n = Number(valore);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
    return Math.min(n, adesso + AVANTI);
}

/**
 * Rate limit sulle sole scritture, per quaderno, in una query sola.
 * -> null se si passa, il numero di secondi da aspettare se no.
 */
async function limite(db, quaderno, adesso) {
    const riga = await db.prepare(
        'INSERT INTO limiti (quaderno, finestra, colpi) VALUES (?1, ?2, 1) '
        + 'ON CONFLICT(quaderno) DO UPDATE SET '
        + 'finestra = CASE WHEN ?2 - limiti.finestra >= ?3 THEN ?2 ELSE limiti.finestra END, '
        + 'colpi = CASE WHEN ?2 - limiti.finestra >= ?3 THEN 1 ELSE limiti.colpi + 1 END '
        + 'RETURNING finestra, colpi'
    ).bind(quaderno, adesso, FINESTRA).first();
    if (!riga || riga.colpi <= COLPI) return null;
    return Math.max(1, Math.ceil((Number(riga.finestra) + FINESTRA - adesso) / 1000));
}

/** Il db del binding, o un 500 pulito se il binding manca (deploy senza bindings). */
function database(context) {
    const db = context && context.env ? context.env.QUADERNO : null;
    if (!db || typeof db.prepare !== 'function') { const e = new Error('db'); e.codice = 'db'; e.stato = 500; throw e; }
    return db;
}

/** Le due chiavi del percorso, gia' validate. */
function chiavi(parti, { conDoc }) {
    const id = parti[0] || '';
    if (!ID_RE.test(id)) { const e = new Error('id'); e.codice = 'id'; e.stato = 400; throw e; }
    if (!conDoc) return { id, doc: null };
    const doc = parti[1] || '';
    if (!DOC_RE.test(doc)) { const e = new Error('doc'); e.codice = 'doc'; e.stato = 400; throw e; }
    return { id, doc };
}

/* Gli handler veri stanno dentro `prova()`: un errore con `.codice` diventa
   la sua risposta, tutto il resto un 500 anonimo. Nel log non finisce mai
   niente che venga dal corpo della richiesta. */
async function prova(fn) {
    try {
        return await fn();
    } catch (e) {
        if (e && e.codice) return errore(e.codice, e.stato || 400, e.extra);
        console.error('[quaderno] errore interno:', (e && e.name) || 'Error');
        return errore('server', 500);
    }
}

export function onRequestGet(context) {
    return prova(async () => {
        const db = database(context);
        const parti = segmenti(context);
        const adesso = Date.now();
        if (parti.length === 1) {
            const { id } = chiavi(parti, { conDoc: false });
            const res = await db.prepare(
                'SELECT doc, aggiornato, cancellato FROM voci WHERE quaderno = ?1'
            ).bind(id).all();
            const voci = ((res && res.results) || []).map((r) => ({
                doc: r.doc,
                aggiornato: Number(r.aggiornato) || 0,
                cancellato: Number(r.cancellato) ? 1 : 0
            }));
            return risposta({ ora: adesso, voci });
        }
        if (parti.length === 2) {
            const { id, doc } = chiavi(parti, { conDoc: true });
            const r = await db.prepare(
                'SELECT doc, aggiornato, cancellato, blob FROM voci WHERE quaderno = ?1 AND doc = ?2'
            ).bind(id, doc).first();
            if (!r) return errore('assente', 404);
            return risposta({
                doc: r.doc,
                aggiornato: Number(r.aggiornato) || 0,
                cancellato: Number(r.cancellato) ? 1 : 0,
                blob: Number(r.cancellato) ? '' : String(r.blob || '')
            });
        }
        return errore('rotta', 404);
    });
}

export function onRequestPut(context) {
    return prova(async () => {
        const db = database(context);
        const parti = segmenti(context);
        if (parti.length !== 2) return errore('rotta', 404);
        const { id, doc } = chiavi(parti, { conDoc: true });
        const adesso = Date.now();

        /* ordine: tetto del Content-Length, poi rate limit, e SOLO ALLORA si
           legge il corpo. Chi martella non ci fa nemmeno leggere i byte. */
        controllaLunghezza(context.request);
        const attesa = await limite(db, id, adesso);
        if (attesa !== null) return errore('troppi', 429, { 'Retry-After': String(attesa) });

        const dati = await corpo(context.request);
        const aggiornato = dataValida(dati.aggiornato, adesso);
        if (aggiornato === null) return errore('data', 400);
        const blob = typeof dati.blob === 'string' ? dati.blob : null;
        if (blob === null) return errore('blob', 400);
        if (blob.length > MAX_BLOB) return errore('grande', 413);
        if (!blobValido(blob)) return errore('blob', 400);

        /* il conteggio costa: si fa solo quando il documento e' davvero nuovo */
        const c = await db.prepare('SELECT 1 AS c FROM voci WHERE quaderno = ?1 AND doc = ?2').bind(id, doc).first();
        if (!c) {
            const n = await db.prepare('SELECT count(*) AS n FROM voci WHERE quaderno = ?1').bind(id).first();
            if (Number((n && n.n) || 0) >= MAX_DOC) return errore('pieno', 413);
        }

        /* vince l'ultimo salvataggio, per documento: nessuna fusione, mai */
        await db.prepare(
            'INSERT INTO voci (quaderno, doc, aggiornato, cancellato, blob) VALUES (?1, ?2, ?3, 0, ?4) '
            + 'ON CONFLICT(quaderno, doc) DO UPDATE SET '
            + 'aggiornato = excluded.aggiornato, cancellato = excluded.cancellato, blob = excluded.blob '
            + 'WHERE excluded.aggiornato > voci.aggiornato'
        ).bind(id, doc, aggiornato, blob).run();

        return risposta({ ok: true, aggiornato });
    });
}

export function onRequestDelete(context) {
    return prova(async () => {
        const db = database(context);
        const parti = segmenti(context);
        const adesso = Date.now();

        if (parti.length === 1) {
            const { id } = chiavi(parti, { conDoc: false });
            const attesa = await limite(db, id, adesso);
            if (attesa !== null) return errore('troppi', 429, { 'Retry-After': String(attesa) });
            await db.prepare('DELETE FROM voci WHERE quaderno = ?1').bind(id).run();
            /* "le copie cifrate spariscono subito" (informativa, spec 17 §4):
               anche la riga del rate limit porta l'id del quaderno, quindi
               se ne va con le altre. Il prezzo e' che DELETE del quaderno
               intero si azzera il contatore: sono due query da niente e
               distruggono solo il quaderno di chi chiama. */
            await db.prepare('DELETE FROM limiti WHERE quaderno = ?1').bind(id).run();
            return risposta({ ok: true });
        }
        if (parti.length === 2) {
            const { id, doc } = chiavi(parti, { conDoc: true });
            controllaLunghezza(context.request);
            const attesa = await limite(db, id, adesso);
            if (attesa !== null) return errore('troppi', 429, { 'Retry-After': String(attesa) });

            const dati = await corpo(context.request);
            const aggiornato = dataValida(dati.aggiornato, adesso);
            if (aggiornato === null) return errore('data', 400);

            /* la lapide e' una riga come le altre: cancellato=1, blob vuoto */
            await db.prepare(
                'INSERT INTO voci (quaderno, doc, aggiornato, cancellato, blob) VALUES (?1, ?2, ?3, 1, \'\') '
                + 'ON CONFLICT(quaderno, doc) DO UPDATE SET '
                + 'aggiornato = excluded.aggiornato, cancellato = 1, blob = \'\' '
                + 'WHERE excluded.aggiornato > voci.aggiornato'
            ).bind(id, doc, aggiornato).run();

            return risposta({ ok: true, aggiornato });
        }
        return errore('rotta', 404);
    });
}
