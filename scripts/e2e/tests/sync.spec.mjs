/**
 * Sincronizzazione generalizzata (spec 18 §4, criteri §10.2-4).
 *
 * Tutto passa dalla Pages Function VERA montata da `serve.mjs` su un finto
 * D1 in memoria: niente rete, niente database. Ogni test crea il SUO codice,
 * quindi il suo quaderno: i test non si pestano i piedi anche in parallelo.
 *
 *   due contesti, un codice: testi, piani, accordature e preferenze vanno e
 *     vengono; una lapide (piano eliminato) arriva dall'altra parte
 *   interruttore di una collezione spento: quella collezione non parte
 *   il codice della Penna di prima (`penna-sync`) si ritrova in `sync`
 *   nessuna richiesta a /api/ senza codice, da nessuna pagina
 *   25 testi = 2 PUT a lotti, non 25 PUT
 *   "Scollega ed elimina" svuota il server
 *   il server in errore non rompe l'editor
 *   25 testi arrivano con 2 GET a gruppi; un 429 si aspetta e si riprova
 *   server svuotato da un altro dispositivo: niente reinvio automatico
 *
 * Il codice si crea e si collega dall'interfaccia di Impostazioni dove conta
 * (primo test, scollega ed elimina, interruttore); altrove dal modulo, che
 * e' lo stesso che usa la pagina: un PBKDF2 in meno da aspettare.
 */

import { test, expect, apri, senzaIntro, BASE } from '../fixtures.mjs';

/** Esegue `corpo` nella pagina con `m` = archivio, `s` = sync, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

/** Un secondo "dispositivo": contesto nuovo, rete fuori sede bloccata, niente intro. */
async function dispositivo(browser) {
    const contesto = await browser.newContext({ locale: 'it-IT' });
    const page = await contesto.newPage();
    const fuori = [];
    await page.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        fuori.push(url);
        return route.abort();
    });
    await page.addInitScript(() => {
        try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ }
    });
    return { contesto, page, fuori };
}

/** Il manifest del quaderno di questa pagina, letto dallo stub. */
function manifest(page) {
    return page.evaluate(async () => {
        const st = await import('/shared/storage.js');
        const q = await st.get('sync', 'quaderno');
        if (!q) return null;
        const r = await fetch('/api/quaderno/' + q.id);
        return { id: q.id, voci: (await r.json()).voci || [] };
    });
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

test('due dispositivi con lo stesso codice si scambiano testi, piani, accordature e preferenze', async ({ page, browser }) => {
    test.setTimeout(180000);
    const altro = await dispositivo(browser);
    try {
        /* B esiste gia' e ha una sua preferenza, piu' vecchia di quella di A:
           stessa chiave = stesso documento (sid di chiave), vince l'ultima */
        await apri(altro.page, BASE + '/metronomo/');
        await modulo(altro.page, 'await m.impostaPref(\'tt.shared.a4\', 440);');
        await altro.page.waitForTimeout(50);

        /* A: dati in quattro collezioni, poi il codice dall'interfaccia */
        await apri(page, '/impostazioni/');
        await modulo(page, `
            await m.scrivi('penna', 't1', { titolo: 'Andata', testo: 'uno\\ndue', modificato: new Date().toISOString() });
            await m.scrivi('uscite', 'p1', { titolo: 'Singolo', data: '2026-12-01', tappe: [] });
            await m.scrivi('uscite', 'p2', { titolo: 'Da eliminare', data: '2026-12-02', tappe: [] });
            await m.scrivi('accordature', 'c1700000000000', { name: 'Drop C', strings: [
                { note: 'C', oct: 2 }, { note: 'G', oct: 2 }, { note: 'C', oct: 3 },
                { note: 'F', oct: 3 }, { note: 'A', oct: 3 }, { note: 'D', oct: 4 }] });
            await m.impostaPref('tt.shared.a4', 442);
            await m.impostaPref('tt.metronomo.bpm', 133);
        `);
        await page.locator('#imp-sync-create').click();
        await expect(page.locator('#imp-sync-code')).not.toBeEmpty({ timeout: 30000 });
        const codice = (await page.locator('#imp-sync-code').textContent()).trim();
        await page.locator('#imp-sync-activate').click();
        await expect(page.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-done', { timeout: 60000 });
        await expect(page.locator('#imp-sync-last')).not.toBeEmpty();

        const perColl = (await manifest(page)).voci.reduce((a, v) => { a[v.collezione] = (a[v.collezione] || 0) + 1; return a; }, {});
        expect(perColl.penna).toBe(1);
        expect(perColl.uscite).toBe(2);
        expect(perColl.accordature).toBe(1);
        expect(perColl.impostazioni).toBeGreaterThanOrEqual(2);

        /* B collega lo stesso codice dall'interfaccia */
        await apri(altro.page, BASE + '/impostazioni/');
        await altro.page.locator('#imp-sync-have').click();
        await altro.page.locator('#imp-sync-input').fill(codice.toUpperCase().replace(/ /g, ' - '));
        await altro.page.locator('#imp-sync-link').click();
        await expect(altro.page.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-done', { timeout: 60000 });

        const arrivati = await modulo(altro.page, `
            const titoli = async (c) => (await m.elenca(c)).map((r) => r.dati.titolo || r.dati.name).sort();
            return {
                penna: await titoli('penna'), uscite: await titoli('uscite'), accordature: await titoli('accordature'),
                a4: localStorage.getItem('tt.shared.a4'), bpm: localStorage.getItem('tt.metronomo.bpm'),
                a4record: (await m.elenca('impostazioni')).filter((r) => r.id === 'tt.shared.a4').length
            };
        `);
        expect(arrivati.penna).toEqual(['Andata']);
        expect(arrivati.uscite).toEqual(['Da eliminare', 'Singolo']);
        expect(arrivati.accordature).toEqual(['Drop C']);
        expect(arrivati.bpm, 'la preferenza arrivata non e’ finita nella copia veloce').toBe('133');
        expect(arrivati.a4).toBe('442');
        expect(arrivati.a4record).toBe(1);
        /* sul server la chiave e' UN documento solo, anche dopo il giro di B */
        const doppie = (await manifest(altro.page)).voci.filter((v) => v.collezione === 'impostazioni');
        expect(new Set(doppie.map((v) => v.doc)).size).toBe(doppie.length);

        /* l'accordatura compare col suo nome nell'Accordatore di B */
        await apri(altro.page, BASE + '/accordatore/', { attesa: 800 });
        await expect(altro.page.locator('#acc-instrument option', { hasText: 'Drop C' })).toHaveCount(1);

        /* A elimina un piano: la lapide arriva a B, che lo toglie */
        await modulo(page, `
            await m.elimina('uscite', 'p2');
            const e = await s.sincronizza();
            if (e.esito !== 'ok' || e.perCollezione.uscite.eliminati !== 1) throw new Error(JSON.stringify(e));
        `);
        await apri(altro.page, BASE + '/pianificatore-uscita/', { attesa: 300 });
        await expect.poll(() => modulo(altro.page, 'return (await m.elenca(\'uscite\')).map((r) => r.dati.titolo);'),
            { timeout: 20000 }).toEqual(['Singolo']);
        const lapide = await modulo(altro.page, 'return (await m.leggiRecord(\'uscite\', \'p2\'));');
        expect(lapide.cancellato).toBe(1);

        /* e il viaggio di ritorno: B scrive un testo, A lo riceve */
        await modulo(altro.page, `
            await m.scrivi('penna', 'dal-b', { titolo: 'Ritorno', testo: 'tre', modificato: new Date().toISOString() });
            await s.sincronizza();
        `);
        const ritorno = await modulo(page, 'await s.sincronizza(); return (await m.elenca(\'penna\')).map((r) => r.dati.titolo).sort();');
        expect(ritorno).toEqual(['Andata', 'Ritorno']);
        expect(altro.fuori).toEqual([]);
    } finally {
        await altro.contesto.close();
    }
});

test('un interruttore spento tiene quella collezione fuori dal giro', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    await modulo(page, 'await s.collega(await s.creaCodice());');
    const dna = page.locator('#imp-sync-coll-dna');
    await expect(dna).toBeVisible();
    await expect(dna).toHaveAttribute('aria-checked', 'true');
    await dna.click();
    await expect(dna).toHaveAttribute('aria-checked', 'false');

    const esito = await modulo(page, `
        await m.scrivi('dna', 1700000000000, { name: 'analisi', bpm: 120 });
        await m.scrivi('penna', 't', { titolo: 'Si', testo: 'x' });
        return s.sincronizza();
    `);
    expect(esito.esito).toBe('ok');
    const colls = (await manifest(page)).voci.map((v) => v.collezione);
    expect(colls).toContain('penna');
    expect(colls, 'la collezione spenta e’ partita lo stesso').not.toContain('dna');

    /* l'interruttore e' locale e resta dopo il ricaricamento */
    await apri(page, '/impostazioni/');
    await expect(page.locator('#imp-sync-coll-dna')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#imp-sync-coll-penna')).toHaveAttribute('aria-checked', 'true');

    /* riaccesa, parte al giro dopo */
    await page.locator('#imp-sync-coll-dna').click();
    await modulo(page, 'await s.sincronizza();');
    expect((await manifest(page)).voci.map((v) => v.collezione)).toContain('dna');
});

test('il codice attivato dalla Penna di prima (penna-sync) passa alla Toolbox', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    const id = await modulo(page, `
        const st = await import('/shared/storage.js');
        const codice = await s.creaCodice();
        const d = await s.deriva(codice);
        await st.put('penna-sync', 'quaderno', { codice, id: d.id });
        await st.put('penna-sync', 'ultima', { quando: 1700000000000 });
        return d.id;
    `);
    await apri(page, '/impostazioni/', { attesa: 600 });
    await expect(page.locator('#imp-sync-now'), 'la sezione non si e’ accesa col codice di prima').toBeVisible();
    const dopo = await page.evaluate(async () => {
        const st = await import('/shared/storage.js');
        return {
            nuovo: await st.get('sync', 'quaderno'),
            vecchio: (await st.get('penna-sync', 'quaderno')) || null
        };
    });
    expect(dopo.nuovo.id).toBe(id);
    expect(dopo.vecchio).toBeNull();
});

test('senza codice nessuna pagina chiama /api/, nemmeno dopo un salvataggio', async ({ page }) => {
    test.setTimeout(90000);
    const chiamate = [];
    page.on('request', (r) => { if (r.url().includes('/api/')) chiamate.push(r.method() + ' ' + r.url()); });
    for (const percorso of ['/', '/penna/', '/dna/', '/pianificatore-uscita/', '/accordatore/', '/metronomo/', '/impostazioni/']) {
        await apri(page, percorso, { attesa: 400 });
    }
    await modulo(page, `
        await m.scrivi('penna', 't', { titolo: 'Senza codice', testo: 'x' });
        await m.impostaPref('tt.shared.a4', 441);
    `);
    await page.waitForTimeout(3800);
    expect(chiamate, 'la sincronizzazione spenta ha chiamato il server').toEqual([]);
});

test('25 testi viaggiano in 2 PUT a lotti, non in 25', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    const put = [];
    page.on('request', (r) => { if (r.method() === 'PUT' && r.url().includes('/api/quaderno/')) put.push(new URL(r.url()).pathname); });
    const esito = await modulo(page, `
        await s.collega(await s.creaCodice());
        for (let i = 0; i < 25; i++) await m.scrivi('penna', 'lotto-' + i, { titolo: 'Testo ' + i, testo: 'verso ' + i });
        return s.sincronizza();
    `);
    expect(esito.esito).toBe('ok');
    expect(esito.perCollezione.penna.inviati).toBe(25);
    const diPenna = put.filter((p) => /\/api\/quaderno\/[0-9a-f]{32}\/penna$/.test(p));
    expect(diPenna, 'i testi non sono partiti a lotti').toHaveLength(2);
    expect(put.filter((p) => /\/penna\/[0-9a-f]{16}$/.test(p)), 'un PUT singolo per testo').toEqual([]);
    expect((await manifest(page)).voci.filter((v) => v.collezione === 'penna')).toHaveLength(25);
    /* e il giro dopo non ha piu' niente da mandare */
    const secondo = await modulo(page, 'return s.sincronizza();');
    expect(secondo.inviati).toBe(0);
    expect(secondo.richieste).toBe(1);
});

test('"Scollega ed elimina" svuota il server e spegne la sezione', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    await modulo(page, `
        await m.scrivi('penna', 't', { titolo: 'Sparira', testo: 'x' });
        await s.collega(await s.creaCodice());
        await s.sincronizza();
    `);
    const prima = await manifest(page);
    expect(prima.voci.length).toBeGreaterThan(0);
    await expect(page.locator('#imp-sync-wipe')).toBeVisible();
    await page.locator('#imp-sync-wipe').click();
    await page.locator('#imp-sync-wipe-yes').click();
    await expect(page.locator('#imp-sync-create')).toBeVisible({ timeout: 20000 });
    const voci = await page.evaluate(async (id) => (await (await fetch('/api/quaderno/' + id)).json()).voci.length, prima.id);
    expect(voci).toBe(0);
    /* i dati restano sul dispositivo */
    expect(await modulo(page, 'return (await m.elenca(\'penna\')).length;')).toBe(1);
});

test('il server in errore non rompe l’editor di Penna', async ({ page, spia }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    await modulo(page, 'await s.collega(await s.creaCodice());');
    await page.route('**/api/**', (route) => route.fulfill({
        status: 500, contentType: 'application/json', body: '{"errore":"server"}'
    }));
    await apri(page, '/penna/', { attesa: 600 });
    const vuoto = page.locator('#pen-list-empty-new');
    await ((await vuoto.isVisible()) ? vuoto : page.locator('#pen-new')).click();
    await page.locator('#pen-text').fill('primo verso\nsecondo verso');
    await page.locator('#pen-text').dispatchEvent('input');
    await page.waitForTimeout(4500);                 // salvataggio + giro 3 s dopo
    await page.locator('#pen-text').press('End');
    await page.locator('#pen-text').type('\nterzo');
    await expect(page.locator('#pen-gutter > *')).toHaveCount(3);
    await expect.poll(() => modulo(page, 'return (await m.elenca(\'penna\')).map((r) => r.dati.testo);'),
        { timeout: 10000 }).toEqual(['primo verso\nsecondo verso\nterzo']);
    const s = await modulo(page, 'return s.stato();');
    expect(s.attivo).toBe(true);
    expect(s.esito).toBe('server');
    const errori = spia.filtrati([/status of 500/, /Failed to load resource/]);
    expect(errori, 'errori in console oltre alle risposte 500').toEqual([]);
});

test('25 testi arrivano con 2 GET a gruppi, non con 25', async ({ page, browser }) => {
    test.setTimeout(120000);
    await apri(page, '/impostazioni/');
    const codice = await modulo(page, `
        const codice = await s.creaCodice();
        await s.collega(codice);
        for (let i = 0; i < 25; i++) await m.scrivi('penna', 'g-' + i, { titolo: 'Arriva ' + i, testo: 'x' });
        await s.sincronizza();
        return codice;
    `);
    const altro = await dispositivo(browser);
    try {
        await apri(altro.page, BASE + '/impostazioni/');
        const get = [];
        altro.page.on('request', (r) => {
            if (r.method() === 'GET' && r.url().includes('/api/quaderno/')) get.push(new URL(r.url()).pathname + new URL(r.url()).search);
        });
        const esito = await modulo(altro.page, 'await s.collega(arg); return s.sincronizza();', codice);
        expect(esito.perCollezione.penna.ricevuti).toBe(25);
        expect(get.filter((u) => /\/penna\?doc=/.test(u)), 'la ricezione non e’ a gruppi').toHaveLength(2);
        expect(get.filter((u) => /\/penna\/[0-9a-f]{16}$/.test(u))).toEqual([]);
    } finally {
        await altro.contesto.close();
    }
});

test('un 429 non ferma il giro: si aspetta il Retry-After e si riprova', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/impostazioni/');
    let rifiutati = 0;
    await page.route('**/api/quaderno/*/penna', (route) => {
        if (route.request().method() === 'PUT' && rifiutati === 0) {
            rifiutati++;
            return route.fulfill({ status: 429, headers: { 'Retry-After': '1' }, contentType: 'application/json', body: '{"errore":"troppi"}' });
        }
        return route.continue();
    });
    const esito = await modulo(page, `
        await s.collega(await s.creaCodice());
        await m.scrivi('penna', 't', { titolo: 'Dopo il 429', testo: 'x' });
        return s.sincronizza();
    `);
    expect(rifiutati).toBe(1);
    expect(esito.esito).toBe('ok');
    expect(esito.perCollezione.penna.inviati).toBe(1);
});

test('server svuotato altrove: niente reinvio automatico, solo con "Reinvia i dati"', async ({ page, browser }) => {
    test.setTimeout(120000);
    await apri(page, '/impostazioni/');
    const codice = await modulo(page, `
        const codice = await s.creaCodice();
        await s.collega(codice);
        await m.scrivi('penna', 't', { titolo: 'Resto qui', testo: 'x' });
        await s.sincronizza();
        return codice;
    `);
    /* B collega lo stesso codice e fa "Scollega ed elimina" */
    const altro = await dispositivo(browser);
    try {
        await apri(altro.page, BASE + '/impostazioni/');
        await modulo(altro.page, 'await s.collega(arg); await s.sincronizza(); await s.scollega({ elimina: true });', codice);
    } finally {
        await altro.contesto.close();
    }
    /* A trova il server vuoto: non rimanda niente, lo dice e offre il bottone */
    const esito = await modulo(page, 'return s.sincronizza();');
    expect(esito.esito).toBe('vuoto-remoto');
    expect(esito.inviati).toBe(0);
    expect((await manifest(page)).voci).toEqual([]);
    await expect(page.locator('#imp-sync-reupload')).toBeVisible();
    await expect(page.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-empty-remote');
    expect(await modulo(page, 'return (await m.elenca(\'penna\')).length;'), 'i dati locali restano').toBe(1);

    await page.locator('#imp-sync-reupload').click();
    await expect(page.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-done', { timeout: 30000 });
    await expect(page.locator('#imp-sync-reupload')).toBeHidden();
    expect((await manifest(page)).voci.filter((v) => v.collezione === 'penna')).toHaveLength(1);
});
