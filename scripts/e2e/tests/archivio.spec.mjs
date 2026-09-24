/**
 * Archivio unico (spec 18 §3): migrazioni, esporta/importa, limiti, schede.
 *
 * Ogni profilo "vecchio" si semina PRIMA che la Toolbox apra la sua pagina:
 * si passa da `/robots.txt` (stesso origin, nessun modulo che parta) e si
 * scrivono IndexedDB e localStorage nel formato di prima dell'archivio:
 *   - `penna` con i documenti nudi (uno col `sid` della 17), `penna-tomb`
 *   - `dna` con lo storico, `pianificatore` coi piani
 *   - `tt.accordatore.custom` e le preferenze `tt.*` in localStorage
 * Poi si apre /penna/ e si guarda dentro: tutto c'e', lo schema e' 6, e
 * ricaricando non si migra una seconda volta.
 */

import { test, expect, senzaIntro, nessunErroreConsole } from '../fixtures.mjs';

const DB = 'tiny-temple-toolbox';

/** Scrive un profilo nel formato vecchio, senza caricare la Toolbox. */
async function semina(page, { records = [], locale = {}, penneNuove = 0 } = {}) {
    await page.goto('/robots.txt', { waitUntil: 'load' });
    await page.evaluate(({ db, records, locale, penneNuove }) => new Promise((ok, ko) => {
        for (const [k, v] of Object.entries(locale)) window.localStorage.setItem(k, v);
        const r = indexedDB.open(db, 1);
        r.onupgradeneeded = () => {
            const s = r.result.createObjectStore('records', { keyPath: ['tool', 'id'] });
            s.createIndex('tool', 'tool');
        };
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
            const conn = r.result;
            const tx = conn.transaction('records', 'readwrite');
            const s = tx.objectStore('records');
            records.forEach((x) => s.put(x));
            if (penneNuove) {
                /* un quaderno gia' migrato e pieno: schema 6 e N testi nell'involucro */
                const adesso = Date.now();
                s.put({ tool: 'impostazioni', id: 'schema', updated: adesso,
                    value: { v: 1, sid: 'aaaaaaaaaaaaaaaa', modificato: adesso, cancellato: 0, dati: { versione: 6 } } });
                for (let i = 0; i < penneNuove; i++) {
                    s.put({ tool: 'penna', id: 'riempi-' + String(i).padStart(4, '0'), updated: adesso,
                        value: { v: 1, sid: ('0000000000000000' + i.toString(16)).slice(-16), modificato: adesso - i,
                            cancellato: 0, dati: { titolo: 'Testo ' + i, testo: 'verso ' + i, creato: '', modificato: '', dialefe: {}, lingua: 'it', emuet: false } } });
                }
            }
            tx.oncomplete = () => { conn.close(); ok(); };
            tx.onerror = () => ko(tx.error);
        };
    }), { db: DB, records, locale, penneNuove });
}

/** Tutti i record grezzi di IndexedDB. */
function grezzi(page) {
    return page.evaluate((db) => new Promise((ok, ko) => {
        const r = indexedDB.open(db);
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
            const conn = r.result;
            const q = conn.transaction('records', 'readonly').objectStore('records').getAll();
            q.onsuccess = () => { conn.close(); ok(q.result || []); };
            q.onerror = () => { conn.close(); ko(q.error); };
        };
    }), DB);
}

/**
 * Esegue `corpo` nella pagina con `m` = il modulo dell'archivio (lo stesso
 * che usa la pagina) e `arg`. Si passa un'espressione in testo, non
 * `new Function`: la CSP della Toolbox non ha 'unsafe-eval'.
 */
function archivio(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { const m = await import(\'/shared/archivio.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

const SID17 = '0123456789abcdef';
const SID_TOMBA = 'fedcba9876543210';
/* recente: una lapide di oltre 90 giorni, a sincronizzazione spenta, la poterebbe l'archivio */
const MORTE = Date.now() - 24 * 3600 * 1000;
const OPEN_G = [{ note: 'D', oct: 2 }, { note: 'G', oct: 2 }, { note: 'D', oct: 3 },
    { note: 'G', oct: 3 }, { note: 'B', oct: 3 }, { note: 'D', oct: 4 }];

const PROFILO_VECCHIO = {
    records: [
        { tool: 'penna', id: '2026-01-01T10:00:00.000Z-aaaaa', updated: 1767261600000,
            value: { titolo: 'Primo testo', testo: 'uno\ndue\ntre', creato: '2026-01-01T10:00:00.000Z',
                modificato: '2026-01-02T10:00:00.000Z', dialefe: {}, lingua: 'it', emuet: false } },
        { tool: 'penna', id: '2026-01-03T10:00:00.000Z-bbbbb', updated: 1767434400000,
            value: { titolo: 'Sincronizzato', testo: 'quattro\ncinque', creato: '2026-01-03T10:00:00.000Z',
                modificato: '2026-01-03T12:00:00.000Z', dialefe: {}, lingua: 'it', emuet: false, sid: SID17 } },
        { tool: 'penna-tomb', id: SID_TOMBA, updated: MORTE, value: { aggiornato: MORTE } },
        { tool: 'dna', id: '2026-02-01T10:00:00.000Z', updated: 1769940000000,
            value: { at: '2026-02-01T10:00:00.000Z', name: 'Brano di prova', renamed: true, source: 'file',
                seconds: 180, sampleRate: 44100, channels: 2, bpm: 120, bpmConfidence: 0.9, tonic: 'A',
                mode: 'minor', camelot: '8A', keyConfidence: 0.8, lufs: -9.5, truePeak: -0.8, lra: 6 } },
        { tool: 'pianificatore', id: 'p-singolo', updated: 1770000000000,
            value: { titolo: 'Singolo di prova', tipo: 'singolo', data: '2026-12-04', profilo: 'completa',
                distributore: 'nessuno', note: '', rimosse: [], tappe: [],
                creato: '2026-02-02T10:00:00.000Z', modificato: '2026-02-02T10:00:00.000Z' } }
    ],
    locale: {
        'tt.accordatore.custom': JSON.stringify([{ id: 'c1', name: 'Open G', strings: OPEN_G }]),
        'tt.penna.ordine': JSON.stringify('titolo'),
        'tt.penna.pacchetti': JSON.stringify(['it']),
        'tt.metronomo.bpm': JSON.stringify(97),
        'tt.dash.hidden': JSON.stringify(['dna']),
        'tt.shared.a4': JSON.stringify(442),
        'tt.dna.target': JSON.stringify('apple'),
        tinyTempleLang: 'it',
        tinyTempleMicConsent: 'granted'
    }
};

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

test('un profilo vecchio migra tutto, una volta sola, e i sid restano (spec 18 §10.1)', async ({ page, spia }) => {
    await semina(page, PROFILO_VECCHIO);
    /* il visore di testo di Chromium per /robots.txt ha uno stile inline
       che la CSP rifiuta: non e' la Toolbox, si ricomincia a contare da qui */
    spia.azzera();
    await page.goto('/penna/', { waitUntil: 'load' });

    /* Penna vede i suoi due testi, niente lapidi a video */
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);
    await expect(page.locator('#pen-list-grid')).toContainText('Primo testo');
    await expect(page.locator('#pen-list-grid')).toContainText('Sincronizzato');

    await archivio(page, 'await m.pronto();');
    const tutti = await grezzi(page);
    const di = (tool) => tutti.filter((r) => r.tool === tool);
    const schema = tutti.find((r) => r.tool === 'impostazioni' && r.id === 'schema');
    expect(schema && schema.value.dati.versione, 'versione dello schema').toBe(6);

    /* 1 + 2: penna nell'involucro, il sid della 17 conservato, la lapide dal record */
    const penna = di('penna');
    expect(penna).toHaveLength(3);
    for (const r of penna) {
        expect(r.value.v).toBe(1);
        expect(r.value.sid).toMatch(/^[0-9a-f]{16}$/);
        expect(typeof r.value.modificato).toBe('number');
    }
    const sinc = penna.find((r) => r.id === '2026-01-03T10:00:00.000Z-bbbbb');
    expect(sinc.value.sid).toBe(SID17);
    expect(sinc.value.dati.sid, 'il sid vive nel record, non nel documento').toBeUndefined();
    expect(sinc.value.modificato).toBe(Date.parse('2026-01-03T12:00:00.000Z'));
    const lapide = penna.find((r) => r.value.sid === SID_TOMBA);
    expect(lapide.value.cancellato).toBe(1);
    expect(lapide.value.dati).toBeNull();
    expect(lapide.value.modificato).toBe(MORTE);
    expect(di('penna-tomb'), 'penna-tomb deve sparire').toHaveLength(0);

    /* 3: dna */
    const dna = di('dna');
    expect(dna).toHaveLength(1);
    expect(dna[0].value.dati.name).toBe('Brano di prova');
    expect(dna[0].value.sid).toMatch(/^[0-9a-f]{16}$/);

    /* 4: pianificatore -> uscite */
    expect(di('pianificatore')).toHaveLength(0);
    const uscite = di('uscite');
    expect(uscite).toHaveLength(1);
    expect(uscite[0].id).toBe('p-singolo');
    expect(uscite[0].value.dati.titolo).toBe('Singolo di prova');

    /* 5: accordature; la preferenza resta scritta */
    const acc = di('accordature');
    expect(acc).toHaveLength(1);
    expect(acc[0].id).toBe('c1');
    expect(acc[0].value.dati).toEqual({ name: 'Open G', strings: OPEN_G });
    expect(await page.evaluate(() => window.localStorage.getItem('tt.accordatore.custom'))).not.toBeNull();

    /* 6: preferenze portabili si', locali no */
    const imp = new Map(di('impostazioni').map((r) => [r.id, r.value.dati]));
    expect(imp.get('tt.penna.ordine')).toBe('titolo');
    expect(imp.get('tt.metronomo.bpm')).toBe(97);
    expect(imp.has('tt.dash.hidden'), 'la dashboard e\u2019 locale (giro 3)').toBe(false);
    expect(imp.get('tt.shared.a4')).toBe(442);
    expect(imp.get('tt.dna.target')).toBe('apple');
    expect(imp.get('tinyTempleLang')).toBe('it');
    expect(imp.has('tt.penna.pacchetti'), 'i pacchetti installati sono locali').toBe(false);
    expect(imp.has('tinyTempleMicConsent'), 'il consenso al microfono e’ locale').toBe(false);

    /* rilanciato non cambia nulla; esportaTutto da' gli stessi sid prima e dopo */
    const primaExp = await archivio(page, 'return await m.esportaTutto();');
    const sidDi = (exp) => Object.fromEntries(Object.entries(exp.collezioni)
        .map(([c, rs]) => [c, rs.map((r) => r.id + '=' + r.sid).sort()]));
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);
    await archivio(page, 'await m.pronto();');
    const dopo = await grezzi(page);
    const schemaDopo = dopo.find((r) => r.tool === 'impostazioni' && r.id === 'schema');
    expect(schemaDopo.value, 'lo schema e’ stato riscritto: si e’ migrato due volte').toEqual(schema.value);
    for (const tool of ['penna', 'dna', 'uscite', 'accordature']) {
        expect(dopo.filter((r) => r.tool === tool).map((r) => r.value).sort((a, b) => a.sid.localeCompare(b.sid)))
            .toEqual(tutti.filter((r) => r.tool === tool).map((r) => r.value).sort((a, b) => a.sid.localeCompare(b.sid)));
    }
    const dopoExp = await archivio(page, 'return await m.esportaTutto();');
    expect(sidDi(dopoExp)).toEqual(sidDi(primaExp));
    expect(dopoExp.schema).toBe(6);

    /* anche gli altri strumenti ritrovano i loro dati */
    await page.goto('/dna/', { waitUntil: 'load' });
    await expect(page.locator('#dna-history')).toContainText('Brano di prova');
    await page.goto('/accordatore/', { waitUntil: 'load' });
    await expect(page.locator('#acc-instrument option[value="custom:c1"]')).toHaveCount(1);
    await page.goto('/pianificatore-uscita/', { waitUntil: 'load' });
    await expect(page.locator('#pia-plans-list')).toContainText('Singolo di prova');

    nessunErroreConsole(spia);
});

test('un’accordatura che sta solo nell’archivio compare comunque (l’archivio e’ la verita’)', async ({ page }) => {
    await page.goto('/accordatore/', { waitUntil: 'load' });
    await archivio(page, `await m.scrivi('accordature', 'c7', { name: 'Da un altro telefono', strings: arg });`, OPEN_G);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#acc-instrument option[value="custom:c7"]')).toHaveText('Da un altro telefono');
});

test('esporta -> svuota -> importa ricostruisce lo stato identico; sostituisci anche', async ({ page }) => {
    await semina(page, PROFILO_VECCHIO);
    await page.goto('/penna/', { waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);

    const esito = await archivio(page, `
        await m.scrivi('metronomo-preset', 'lento', { bpm: 70 });
        await m.elimina('dna', '2026-02-01T10:00:00.000Z');
        const prima = await m.esportaTutto();
        await m.svuota();
        const vuoto = await m.esportaTutto();
        const imp = await m.importaTutto(JSON.stringify(prima), { strategia: 'unisci' });
        const dopo = await m.esportaTutto();
        await m.svuota('penna');
        await m.scrivi('penna', 'intruso', { titolo: 'Non c\\'era', testo: '' });
        await m.importaTutto(prima, { strategia: 'sostituisci' });
        const sostituito = await m.esportaTutto();
        return { prima, vuoto, imp, dopo, sostituito };
    `);
    const senzaData = (e) => ({ ...e, esportato: '' });
    expect(Object.values(esito.vuoto.collezioni).every((c) => c.length === 0), 'svuota non ha svuotato').toBe(true);
    expect(esito.prima.collezioni.penna.length).toBe(3);
    expect(esito.prima.collezioni.dna[0].cancellato, 'la lapide viaggia nel file').toBe(1);
    expect(senzaData(esito.dopo)).toEqual(senzaData(esito.prima));
    /* sostituisci: tutto come nel file, e l'intruso non sparisce nel nulla
       ma diventa lapide (la sincronizzazione deve poterlo portare altrove) */
    const intruso = esito.sostituito.collezioni.penna.find((r) => r.id === 'intruso');
    expect(intruso && intruso.cancellato, 'l\u2019intruso deve restare come lapide').toBe(1);
    const senzaIntruso = { ...esito.sostituito, collezioni: { ...esito.sostituito.collezioni,
        penna: esito.sostituito.collezioni.penna.filter((r) => r.id !== 'intruso') } };
    expect(senzaData(senzaIntruso)).toEqual(senzaData(esito.prima));

    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);

    /* la Penna importa anche la busta nuova, e ancora la vecchia */
    const letti = await page.evaluate(async (exp) => {
        const f = await import('/penna/file.js');
        const nuova = f.leggiQuaderno(JSON.stringify(exp));
        const vecchia = f.leggiQuaderno(JSON.stringify(f.costruisciQuaderno([{ id: 'x', titolo: 'Vecchio', testo: 'a' }])));
        return { nuova: nuova && nuova.map((d) => d.titolo).sort(), vecchia: vecchia && vecchia.map((d) => d.titolo) };
    }, esito.prima);
    expect(letti.nuova).toEqual(['Primo testo', 'Sincronizzato']);
    expect(letti.vecchia).toEqual(['Vecchio']);
});

test('unisci per sid: niente duplicati e vince il piu’ recente', async ({ page }) => {
    await page.goto('/penna/', { waitUntil: 'load' });
    const esito = await archivio(page, `
        const a = await m.scrivi('penna', 'uno', { titolo: 'Uno', testo: 'a' });
        await m.scrivi('penna', 'due', { titolo: 'Due', testo: 'b' });
        const file = await m.esportaTutto();
        file.collezioni = { penna: file.collezioni.penna };     // solo i testi: le prefs le scrive la pagina
        delete file.preferenze;
        const r1 = await m.importaTutto(file);
        const r2 = await m.importaTutto(JSON.stringify(file), { strategia: 'unisci' });
        await new Promise((r) => setTimeout(r, 5));
        await m.scrivi('penna', 'uno', { titolo: 'Uno cambiato', testo: 'a' });
        const r3 = await m.importaTutto(file);
        /* stesso sid, id diverso sull'altro dispositivo: si riconosce dal sid */
        const altro = JSON.parse(JSON.stringify(file));
        altro.collezioni.penna.forEach((r) => { r.id = 'altrove-' + r.id; r.modificato += 100000; });
        const r4 = await m.importaTutto(altro);
        const elenco = await m.elenca('penna');
        return { r1, r2, r3, r4, elenco: elenco.map((r) => r.id + ':' + r.dati.titolo).sort() };
    `);
    expect(esito.r1).toEqual({ nuovi: 0, aggiornati: 0, ignorati: 2 });
    expect(esito.r2).toEqual({ nuovi: 0, aggiornati: 0, ignorati: 2 });
    expect(esito.r3.aggiornati, 'il file piu’ vecchio ha battuto la modifica locale').toBe(0);
    expect(esito.r4).toEqual({ nuovi: 0, aggiornati: 2, ignorati: 0 });
    expect(esito.elenco).toEqual(['due:Due', 'uno:Uno']);
});

test('il 1001° testo non nasce: lo dice un messaggio, mai un errore silenzioso', async ({ page }) => {
    await semina(page, { penneNuove: 1000 });
    await page.goto('/penna/', { waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(1000, { timeout: 20000 });

    await page.locator('#pen-new').click();
    await expect(page.locator('.tb-toast-msg').filter({ hasText: 'Il quaderno è pieno' })).toBeVisible();
    await expect(page.locator('#pen-text')).toBeHidden();

    const errori = await archivio(page, `
        const out = {};
        try { await m.scrivi('penna', null, { titolo: 'troppo', testo: '' }); } catch (e) { out.voci = e.codice; }
        try { await m.scrivi('penna', 'riempi-0000', { titolo: 'x', testo: 'a'.repeat(300000) }); } catch (e) { out.byte = e.codice; }
        /* modificare un testo che c'e' gia' si puo' sempre */
        await m.scrivi('penna', 'riempi-0001', { titolo: 'ancora qui', testo: '' });
        out.vivi = (await m.elenca('penna')).length;
        return out;
    `);
    expect(errori).toEqual({ voci: 'limite', byte: 'grande', vivi: 1000 });
});

test('onChange avvisa l’altra scheda (BroadcastChannel)', async ({ page }) => {
    await page.goto('/penna/', { waitUntil: 'load' });
    const altra = await page.context().newPage();
    try {
        await altra.goto('/penna/', { waitUntil: 'load' });
        await page.evaluate(async () => {
            const m = await import('/shared/archivio.js');
            window.__cambi = [];
            m.onChange('penna', (c) => window.__cambi.push(c));
        });
        await archivio(altra, `
            const id = await m.scrivi('penna', 'da-altra', { titolo: 'Dall\\'altra scheda', testo: '' });
            await m.scrivi('dna', 'x', { name: 'non interessa' });
            await m.elimina('penna', id);
        `);
        await expect.poll(() => page.evaluate(() => window.__cambi.map((c) => c.coll + '/' + c.id + '/' + c.tipo)))
            .toEqual(['penna/da-altra/scrivi', 'penna/da-altra/elimina']);
    } finally {
        await altra.close();
    }
});

for (const attiva of [false, true]) {
    test('potatura a 90 giorni (sincronizzazione ' + (attiva ? 'attiva' : 'spenta') + '): solo le lapidi gia\u2019 sincronizzate', async ({ page }) => {
        const adesso = Date.now();
        const vecchio = adesso - 100 * 24 * 3600 * 1000;
        const lap = (sid, modificato, sincronizzato) => ({
            tool: 'penna', id: 'l-' + sid, updated: modificato,
            value: { v: 1, sid, modificato, cancellato: 1, dati: null, ...(sincronizzato ? { sincronizzato } : {}) }
        });
        const records = [
            { tool: 'impostazioni', id: 'schema', updated: adesso,
                value: { v: 1, sid: 'bbbbbbbbbbbbbbbb', modificato: adesso, cancellato: 0, dati: { versione: 6 } } },
            lap('1111111111111111', vecchio, vecchio),              // vecchia e sincronizzata: via sempre
            lap('2222222222222222', vecchio),                       // vecchia mai sincronizzata: resta (spec 18 §3)
            lap('3333333333333333', adesso - 1000, adesso - 1000),  // recente: resta
            lap('4444444444444444', adesso - 1000)                  // recente mai sincronizzata: resta
        ];
        /* un codice salvato (non valido per il server: qui non parte nessun giro) */
        if (attiva) records.push({ tool: 'sync', id: 'quaderno', updated: adesso, value: { codice: 'finto', id: 'nessuno' } });
        await semina(page, { records });
        await page.goto('/penna/', { waitUntil: 'load' });
        const attese = ['2222222222222222', '3333333333333333', '4444444444444444'];
        await expect.poll(async () => (await grezzi(page)).filter((r) => r.tool === 'penna').map((r) => r.value.sid).sort())
            .toEqual(attese);
    });
}

test('cancellazione dura (lapide:false) per le potature automatiche, lapide per l\u2019utente', async ({ page }) => {
    await page.goto('/dna/', { waitUntil: 'load' });
    const esito = await archivio(page, `
        await m.scrivi('dna', 'a', { name: 'tagliata dallo storico' });
        await m.scrivi('dna', 'b', { name: 'eliminata a mano' });
        const dura = await m.elimina('dna', 'a', { lapide: false });
        const morbida = await m.elimina('dna', 'b');
        const tutti = await m.elenca('dna', { conCancellati: true });
        return { dura, morbida, tutti: tutti.map((r) => r.id + ':' + r.cancellato) };
    `);
    expect(esito).toEqual({ dura: true, morbida: true, tutti: ['b:1'] });
});

test('la sincronizzazione porta i testi di Penna e le lapidi dal record (niente penna-tomb)', async ({ page, browser }) => {
    const giro = (p, corpo, arg = null) => p.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');

    await page.goto('/penna/', { waitUntil: 'load' });
    const codice = await giro(page, `
        const codice = await s.creaCodice();
        await s.collega(codice);
        await m.scrivi('penna', 't-sync', { titolo: 'Viaggia', testo: 'a\\nb', modificato: new Date().toISOString() });
        const e = await s.sincronizza();
        if (e.esito !== 'ok' || e.perCollezione.penna.inviati !== 1) throw new Error('primo giro: ' + JSON.stringify(e));
        return codice;
    `);

    const contesto = await browser.newContext();
    const due = await contesto.newPage();
    try {
        await due.goto('/penna/', { waitUntil: 'load' });
        const arrivato = await giro(due, `
            await s.collega(arg);
            const e = await s.sincronizza();
            const vivi = await m.elenca('penna');
            return { e, vivi: vivi.map((r) => ({ titolo: r.dati.titolo, sid: r.sid, sinc: r.sincronizzato === r.modificato })) };
        `, codice);
        expect(arrivato.e.perCollezione.penna.ricevuti).toBe(1);
        expect(arrivato.vivi).toHaveLength(1);
        expect(arrivato.vivi[0].titolo).toBe('Viaggia');
        expect(arrivato.vivi[0].sinc, 'un testo ricevuto e’ gia’ sincronizzato').toBe(true);

        /* elimina sul primo: la lapide e' il record, e arriva al secondo */
        const primo = await giro(page, `
            await m.elimina('penna', 't-sync');
            const e = await s.sincronizza();
            const r = await m.leggiRecord('penna', 't-sync');
            return { e, r };
        `);
        expect(primo.e.perCollezione.penna.eliminati).toBe(1);
        expect(primo.r.cancellato).toBe(1);
        expect(primo.r.sincronizzato, 'la lapide inviata va segnata sincronizzata').toBe(primo.r.modificato);

        const secondo = await giro(due, `
            const e = await s.sincronizza();
            return { e, vivi: (await m.elenca('penna')).length, tutti: await m.elenca('penna', { conCancellati: true }) };
        `);
        expect(secondo.e.perCollezione.penna.eliminati).toBe(1);
        expect(secondo.vivi).toBe(0);
        expect(secondo.tutti).toHaveLength(1);
        expect(secondo.tutti[0].sid).toBe(arrivato.vivi[0].sid);
        expect(secondo.tutti[0].sincronizzato).toBe(secondo.tutti[0].modificato);

        /* e nessuna collezione penna-tomb e' mai nata */
        expect((await grezzi(due)).filter((r) => r.tool === 'penna-tomb')).toHaveLength(0);
        await expect(due.locator('#pen-list-grid .pen-card')).toHaveCount(0);
    } finally {
        await contesto.close();
    }
});

test('a schema 6 i record nudi e le penna-tomb di una scheda vecchia si avvolgono all\u2019avvio', async ({ page }) => {
    const adesso = Date.now();
    await semina(page, {
        records: [
            { tool: 'impostazioni', id: 'schema', updated: adesso,
                value: { v: 1, sid: 'cccccccccccccccc', modificato: adesso, cancellato: 0, dati: { versione: 6 } } },
            { tool: 'penna', id: 'nudo', updated: adesso,
                value: { titolo: 'Scritto dal codice vecchio', testo: 'x', modificato: new Date(adesso).toISOString() } },
            { tool: 'penna-tomb', id: '5555555555555555', updated: adesso, value: { aggiornato: adesso } },
            { tool: 'uscite', id: 'p1', updated: adesso,
                value: { v: 1, sid: '6666666666666666', modificato: adesso, cancellato: 0, dati: { titolo: 'Nuovo', tappe: [] } } },
            { tool: 'pianificatore', id: 'p1', updated: adesso, value: { titolo: 'Vecchio, diverso', tappe: [] } }
        ]
    });
    await page.goto('/penna/', { waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(1);
    await archivio(page, 'await m.pronto();');
    const tutti = await grezzi(page);
    const nudo = tutti.find((r) => r.tool === 'penna' && r.id === 'nudo');
    expect(nudo.value.v).toBe(1);
    expect(nudo.value.dati.titolo).toBe('Scritto dal codice vecchio');
    expect(tutti.filter((r) => r.tool === 'penna-tomb')).toHaveLength(0);
    expect(tutti.find((r) => r.tool === 'penna' && r.id === '5555555555555555').value.cancellato).toBe(1);
    /* un piano con lo stesso id e dati diversi: si tengono entrambi */
    expect(tutti.filter((r) => r.tool === 'pianificatore')).toHaveLength(0);
    expect(tutti.filter((r) => r.tool === 'uscite').map((r) => r.value.dati.titolo).sort())
        .toEqual(['Nuovo', 'Vecchio, diverso']);
});
