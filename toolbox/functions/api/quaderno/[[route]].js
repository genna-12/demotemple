/**
 * Tiny Temple Toolbox - il quaderno della Toolbox sul server (spec 17 §4, 18 §4).
 *
 * Pages Function del progetto Pages della Toolbox (Root directory `toolbox/`,
 * quindi questa cartella `functions/` e' li' dentro). Il doppio parentesi
 * cattura ogni profondita': `context.params.route` e' un array di segmenti.
 *
 * Lo SCHEMA e' quello definitivo della spec 18 §4: `voci` ha una colonna
 * `collezione` e la chiave primaria e' (quaderno, collezione, doc). Un solo
 * quaderno cifrato tiene i testi di Penna, le uscite, le impostazioni... e
 * la sincronizzazione (`shared/sync.js`) le scorre tutte con un manifest solo.
 *
 *   GET    /api/quaderno/<id>                -> { ora, voci:[{collezione, doc, aggiornato, cancellato}] }
 *   GET    /api/quaderno/<id>/<coll>/<doc>   -> { collezione, doc, aggiornato, cancellato, blob }
 *   GET    /api/quaderno/<id>/<coll>?doc=a,b -> { collezione, voci:[{doc, aggiornato, cancellato, blob}] }
 *                                            (<= 20 documenti, una query IN; quelli che non ci sono mancano)
 *   PUT    /api/quaderno/<id>/<coll>         <- { voci:[{doc, aggiornato, blob} | {doc, aggiornato, cancellato:1}] }
 *                                            -> { ok, voci:[{doc, applicato, aggiornato} | {doc, errore:"pieno"}] }
 *   PUT    /api/quaderno/<id>/<coll>/<doc>   <- { aggiornato, blob }   -> { ok, applicato, aggiornato }
 *   DELETE /api/quaderno/<id>/<coll>/<doc>   <- { aggiornato }          lapide -> { ok, applicato, aggiornato }
 *   DELETE /api/quaderno/<id>                                          svuota il quaderno
 *
 * `applicato` dice se la scrittura e' entrata davvero: vince l'ultimo
 * salvataggio, quindi una versione piu' vecchia di quella sul server non
 * entra, e allora `aggiornato` e' quello del SERVER (il client lo scarichera').
 *
 * LAPIDI. Una lapide aggiorna solo un documento che il server ha gia' (una
 * lapide di un documento mai visto non serve a nessuno: il client non la
 * manda, e se arriva non si scrive, `applicato:false`). Il tetto per
 * collezione conta solo le righe VIVE. Le lapidi piu' vecchie di 90 giorni
 * si potano, per quaderno, all'inizio di ogni finestra del rate limit (al
 * massimo una query ogni minuto di attivita' di quel quaderno, niente cron):
 * come nell'archivio del client (spec 18 §3).
 *
 * Il PUT a LOTTI (spec 18 §4) e' la via normale della sincronizzazione: fino
 * a 20 voci, stessi controlli del PUT singolo voce per voce (una voce storta
 * rifiuta tutto il lotto: e' un difetto del client, non un caso da gestire),
 * una sola query per sapere quali documenti sono nuovi, il conteggio solo se
 * ce n'e' uno, e tutte le scritture in UN `env.QUADERNO.batch()` (una
 * transazione). Una voce puo' anche essere una lapide (`cancellato:1`, senza
 * blob). Il rate limit conta la richiesta, non le voci. Il tetto dei
 * documenti VIVI per collezione e' quello di `LIMITI_SERVER` (= shared/limiti.js;
 * 1000 per le collezioni che non conosce); oltre, la voce che porterebbe
 * un documento in piu' torna con `errore:"pieno"` e le altre passano.
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

/*
 * Copia di shared/limiti.js: check.mjs verifica che coincidano.
 * La Function resta autonoma (nessun import fuori da functions/, che il
 * bundler di Pages potrebbe non seguire). `voci` e' il tetto di documenti
 * VIVI per collezione sul server; `byte` e' qui solo per restare identica.
 * Anche MAX_BLOB e MAX_CORPO, qui sotto, sono copie di limiti.js.
 */
const KB = 1024;
const LIMITI_SERVER = Object.freeze({
    penna: Object.freeze({ voci: 1000, byte: 256 * KB }),
    uscite: Object.freeze({ voci: 500, byte: 64 * KB }),
    dna: Object.freeze({ voci: 2000, byte: 8 * KB }),
    accordature: Object.freeze({ voci: 200, byte: 4 * KB }),
    'metronomo-preset': Object.freeze({ voci: 200, byte: 4 * KB }),
    impostazioni: Object.freeze({ voci: 50, byte: 16 * KB })
});

const ID_RE = /^[0-9a-f]{32}$/;
const DOC_RE = /^[0-9a-f]{16}$/;
/* nome di collezione: minuscole, cifre e trattini, iniziale di lettera
   (spec 18 §4; qui la forma stretta concordata, max 32 caratteri) */
const COLL_RE = /^[a-z][a-z0-9-]{1,31}$/;

const MAX_BLOB = 384 * KB;         // caratteri base64 (copia di limiti.js)
const MAX_CORPO = 400 * KB;        // Content-Length (copia di limiti.js)
const VITA_LAPIDE = 90 * 24 * 60 * 60 * 1000;   // poi la lapide si pota
const MAX_DOC = 1000;             // documenti per collezione (se limiti.js non la conosce)
const MAX_LOTTO = 20;             // voci per PUT a lotti
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
 * Alla prima scrittura di una finestra nuova si potano anche le lapidi
 * scadute di quel quaderno: una query in piu' al massimo una volta al minuto.
 */
async function limite(db, quaderno, adesso) {
    const riga = await db.prepare(
        'INSERT INTO limiti (quaderno, finestra, colpi) VALUES (?1, ?2, 1) '
        + 'ON CONFLICT(quaderno) DO UPDATE SET '
        + 'finestra = CASE WHEN ?2 - limiti.finestra >= ?3 THEN ?2 ELSE limiti.finestra END, '
        + 'colpi = CASE WHEN ?2 - limiti.finestra >= ?3 THEN 1 ELSE limiti.colpi + 1 END '
        + 'RETURNING finestra, colpi'
    ).bind(quaderno, adesso, FINESTRA).first();
    if (riga && Number(riga.colpi) === 1) {
        await db.prepare('DELETE FROM voci WHERE quaderno = ?1 AND cancellato = 1 AND aggiornato < ?2')
            .bind(quaderno, adesso - VITA_LAPIDE).run();
    }
    if (!riga || riga.colpi <= COLPI) return null;
    return Math.max(1, Math.ceil((Number(riga.finestra) + FINESTRA - adesso) / 1000));
}

/** Il tetto di documenti VIVI di una collezione. */
function tettoDi(coll) {
    const lim = Object.prototype.hasOwnProperty.call(LIMITI_SERVER, coll) ? LIMITI_SERVER[coll] : null;
    return lim && Number.isFinite(lim.voci) ? lim.voci : MAX_DOC;
}

/* RETURNING: una riga se la scrittura e' entrata, nessuna se il server
   aveva gia' una versione uguale o piu' recente */
const SQL_PUT = 'INSERT INTO voci (quaderno, collezione, doc, aggiornato, cancellato, blob) '
    + 'VALUES (?1, ?2, ?3, ?4, 0, ?5) '
    + 'ON CONFLICT(quaderno, collezione, doc) DO UPDATE SET '
    + 'aggiornato = excluded.aggiornato, cancellato = excluded.cancellato, blob = excluded.blob '
    + 'WHERE excluded.aggiornato > voci.aggiornato '
    + 'RETURNING aggiornato';

/* la lapide tocca solo un documento che c'e' gia' */
const SQL_LAPIDE = 'UPDATE voci SET aggiornato = ?4, cancellato = 1, blob = \'\' '
    + 'WHERE quaderno = ?1 AND collezione = ?2 AND doc = ?3 AND aggiornato < ?4 '
    + 'RETURNING aggiornato';

/** La versione del server di un documento: -> { aggiornato, cancellato } | null. */
function remotoDi(db, id, coll, doc) {
    return db.prepare('SELECT aggiornato, cancellato FROM voci WHERE quaderno = ?1 AND collezione = ?2 AND doc = ?3')
        .bind(id, coll, doc).first();
}

/** Il db del binding, o un 500 pulito se il binding manca (deploy senza bindings). */
function database(context) {
    const db = context && context.env ? context.env.QUADERNO : null;
    if (!db || typeof db.prepare !== 'function') { const e = new Error('db'); e.codice = 'db'; e.stato = 500; throw e; }
    return db;
}

/** Le chiavi del percorso, gia' validate: <id> oppure <id>/<coll>/<doc>. */
function chiavi(parti, { conDoc }) {
    const id = parti[0] || '';
    if (!ID_RE.test(id)) { const e = new Error('id'); e.codice = 'id'; e.stato = 400; throw e; }
    if (!conDoc) return { id, coll: null, doc: null };
    const coll = parti[1] || '';
    if (!COLL_RE.test(coll)) { const e = new Error('collezione'); e.codice = 'collezione'; e.stato = 400; throw e; }
    const doc = parti[2] || '';
    if (!DOC_RE.test(doc)) { const e = new Error('doc'); e.codice = 'doc'; e.stato = 400; throw e; }
    return { id, coll, doc };
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
            /* il manifest di TUTTE le collezioni in una query sola: il
               client filtra quella che gli interessa (spec 18 §4) */
            const res = await db.prepare(
                'SELECT collezione, doc, aggiornato, cancellato FROM voci WHERE quaderno = ?1'
            ).bind(id).all();
            const voci = ((res && res.results) || []).map((r) => ({
                collezione: r.collezione,
                doc: r.doc,
                aggiornato: Number(r.aggiornato) || 0,
                cancellato: Number(r.cancellato) ? 1 : 0
            }));
            return risposta({ ora: adesso, voci });
        }
        if (parti.length === 2) {
            /* piu' documenti in una query: la ricezione della sincronizzazione */
            const id = parti[0] || '';
            if (!ID_RE.test(id)) return errore('id', 400);
            const coll = parti[1] || '';
            if (!COLL_RE.test(coll)) return errore('collezione', 400);
            let url;
            try { url = new URL(context.request.url); } catch (e) { return errore('doc', 400); }
            const docs = [...new Set(String(url.searchParams.get('doc') || '').split(',').filter(Boolean))];
            if (!docs.length || docs.length > MAX_LOTTO || !docs.every((d) => DOC_RE.test(d))) return errore('doc', 400);
            const res = await db.prepare(
                'SELECT doc, aggiornato, cancellato, blob FROM voci '
                + 'WHERE quaderno = ?1 AND collezione = ?2 AND doc IN (' + docs.map((_, i) => '?' + (i + 3)).join(', ') + ')'
            ).bind(id, coll, ...docs).all();
            const voci = ((res && res.results) || []).map((r) => ({
                doc: r.doc,
                aggiornato: Number(r.aggiornato) || 0,
                cancellato: Number(r.cancellato) ? 1 : 0,
                blob: Number(r.cancellato) ? '' : String(r.blob || '')
            }));
            return risposta({ collezione: coll, voci });
        }
        if (parti.length === 3) {
            const { id, coll, doc } = chiavi(parti, { conDoc: true });
            const r = await db.prepare(
                'SELECT collezione, doc, aggiornato, cancellato, blob FROM voci '
                + 'WHERE quaderno = ?1 AND collezione = ?2 AND doc = ?3'
            ).bind(id, coll, doc).first();
            if (!r) return errore('assente', 404);
            return risposta({
                collezione: r.collezione,
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
        if (parti.length === 2) return putLotto(context, db, parti);
        if (parti.length !== 3) return errore('rotta', 404);
        const { id, coll, doc } = chiavi(parti, { conDoc: true });
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

        /* il conteggio costa: si fa solo quando il documento vivo sarebbe
           uno in piu' (nuovo, o una lapide che torna viva); il tetto e' PER
           COLLEZIONE e conta solo i documenti vivi (spec 18 §4) */
        const c = await remotoDi(db, id, coll, doc);
        if (!c || Number(c.cancellato)) {
            const n = await db.prepare(
                'SELECT count(*) AS n FROM voci WHERE quaderno = ?1 AND collezione = ?2 AND cancellato = 0'
            ).bind(id, coll).first();
            if (Number((n && n.n) || 0) >= tettoDi(coll)) return errore('pieno', 413);
        }

        /* vince l'ultimo salvataggio, per documento: nessuna fusione, mai */
        const fatto = await db.prepare(SQL_PUT).bind(id, coll, doc, aggiornato, blob).first();
        if (fatto) return risposta({ ok: true, applicato: true, aggiornato });
        return risposta({ ok: true, applicato: false, aggiornato: c ? Number(c.aggiornato) || 0 : aggiornato });
    });
}

/* Un errore di validazione di una voce del lotto: rifiuta tutto il lotto. */
function rifiuta(codice, stato = 400) {
    const e = new Error(codice); e.codice = codice; e.stato = stato; throw e;
}

/**
 * `PUT /<id>/<coll>`: il lotto della spec 18 §4. Stesso ordine del PUT
 * singolo (tetto del Content-Length, rate limit, e solo allora il corpo),
 * poi: validazione di ogni voce, UNA query per i documenti gia' presenti,
 * il conteggio solo se c'e' un documento nuovo, UN batch per le scritture.
 */
async function putLotto(context, db, parti) {
    const id = parti[0] || '';
    if (!ID_RE.test(id)) rifiuta('id');
    const coll = parti[1] || '';
    if (!COLL_RE.test(coll)) rifiuta('collezione');
    const adesso = Date.now();

    controllaLunghezza(context.request);
    const attesa = await limite(db, id, adesso);
    if (attesa !== null) return errore('troppi', 429, { 'Retry-After': String(attesa) });

    const dati = await corpo(context.request);
    const voci = dati && Array.isArray(dati.voci) ? dati.voci : null;
    if (!voci || !voci.length) rifiuta('lotto');
    if (voci.length > MAX_LOTTO) rifiuta('lotto', 413);

    const pulite = [];
    const visti = new Set();
    for (const v of voci) {
        if (!v || typeof v !== 'object') rifiuta('lotto');
        const doc = typeof v.doc === 'string' ? v.doc : '';
        if (!DOC_RE.test(doc) || visti.has(doc)) rifiuta('doc');
        visti.add(doc);
        const aggiornato = dataValida(v.aggiornato, adesso);
        if (aggiornato === null) rifiuta('data');
        const cancellato = v.cancellato === 1 || v.cancellato === true;
        let blob = '';
        if (!cancellato) {
            blob = typeof v.blob === 'string' ? v.blob : null;
            if (blob === null) rifiuta('blob');
            if (blob.length > MAX_BLOB) rifiuta('grande', 413);
            if (!blobValido(blob)) rifiuta('blob');
        }
        pulite.push({ doc, aggiornato, cancellato, blob });
    }

    /* com'e' ora sul server: una query, parametri legati (?3, ?4, ...) */
    const segnaposto = pulite.map((_, i) => '?' + (i + 3)).join(', ');
    const gia = await db.prepare(
        'SELECT doc, aggiornato, cancellato FROM voci WHERE quaderno = ?1 AND collezione = ?2 AND doc IN (' + segnaposto + ')'
    ).bind(id, coll, ...pulite.map((v) => v.doc)).all();
    const presenti = new Map(((gia && gia.results) || []).map((r) => [r.doc, r]));

    /* il tetto conta solo i documenti VIVI: una voce viva su un documento
       nuovo (o su una lapide) ne aggiunge uno. Il conteggio solo se serve. */
    const aggiunge = (v) => !v.cancellato && (!presenti.has(v.doc) || Number(presenti.get(v.doc).cancellato) === 1);
    let posto = Infinity;
    if (pulite.some(aggiunge)) {
        const n = await db.prepare(
            'SELECT count(*) AS n FROM voci WHERE quaderno = ?1 AND collezione = ?2 AND cancellato = 0'
        ).bind(id, coll).first();
        posto = tettoDi(coll) - Number((n && n.n) || 0);
    }

    const scritture = [];
    const dove = [];              // indice in `esiti` di ogni scrittura
    const esiti = [];
    for (const v of pulite) {
        if (aggiunge(v)) {
            if (posto <= 0) { esiti.push({ doc: v.doc, errore: 'pieno' }); continue; }
            posto--;
        }
        const prima = presenti.get(v.doc);
        if (v.cancellato && !prima) {
            /* lapide di un documento mai visto: non si scrive */
            esiti.push({ doc: v.doc, applicato: false, aggiornato: 0 });
            continue;
        }
        scritture.push(v.cancellato
            ? db.prepare(SQL_LAPIDE).bind(id, coll, v.doc, v.aggiornato)
            : db.prepare(SQL_PUT).bind(id, coll, v.doc, v.aggiornato, v.blob));
        dove.push(esiti.length);
        esiti.push({ doc: v.doc, applicato: false, aggiornato: prima ? Number(prima.aggiornato) || 0 : 0, voce: v });
    }
    /* vince l'ultimo salvataggio, per documento; tutto o niente */
    const fatti = scritture.length ? await db.batch(scritture) : [];
    dove.forEach((i, k) => {
        const e = esiti[i];
        const r = fatti[k];
        if (r && Array.isArray(r.results) && r.results.length) {
            e.applicato = true;
            e.aggiornato = e.voce.aggiornato;
        }
        delete e.voce;
    });

    return risposta({ ok: true, voci: esiti });
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
        if (parti.length === 3) {
            const { id, coll, doc } = chiavi(parti, { conDoc: true });
            controllaLunghezza(context.request);
            const attesa = await limite(db, id, adesso);
            if (attesa !== null) return errore('troppi', 429, { 'Retry-After': String(attesa) });

            const dati = await corpo(context.request);
            const aggiornato = dataValida(dati.aggiornato, adesso);
            if (aggiornato === null) return errore('data', 400);

            /* la lapide e' la riga stessa: cancellato=1, blob vuoto; solo
               su un documento che il server ha */
            const fatto = await db.prepare(SQL_LAPIDE).bind(id, coll, doc, aggiornato).first();
            if (fatto) return risposta({ ok: true, applicato: true, aggiornato });
            const c = await remotoDi(db, id, coll, doc);
            return risposta({ ok: true, applicato: false, aggiornato: c ? Number(c.aggiornato) || 0 : 0 });
        }
        return errore('rotta', 404);
    });
}
