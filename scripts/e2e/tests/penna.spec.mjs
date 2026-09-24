/**
 * Penna: il giro completo di un testo, dalla pagina vuota all'importazione.
 *
 *   elenco vuoto -> nuovo -> si incolla un testo vero (55 versi) -> il
 *   contatore dei versi li conta tutti -> si ricarica e il testo e' ancora
 *   li' -> si sincronizza con un secondo dispositivo attraverso lo stub del
 *   quaderno (il codice si attiva da Impostazioni: Penna ha solo il link)
 *   -> si esporta, si cancella tutto, si reimporta. Il resto della
 *   sincronizzazione (tutte le collezioni, lotti, lapidi) sta in sync.spec.mjs.
 *
 * Il testo e' quello di prova del progetto
 * (`docs/toolbox/contenuti/testo-prova-canto.txt`, 55 righe): un testo vero,
 * con accenti e apostrofi, non un "lorem ipsum" che non somiglia a niente.
 *
 * La sincronizzazione passa dal finto D1 di `serve.mjs`, che monta la Pages
 * Function vera: e' la prova che il contratto del §4 della spec 18 regge,
 * senza un database e senza toccare la rete.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, apri, senzaIntro, BASE, nessunErroreConsole } from '../fixtures.mjs';

const TESTO = fs.readFileSync(
    fileURLToPath(new URL('../../../docs/toolbox/contenuti/testo-prova-canto.txt', import.meta.url)),
    'utf8'
).replace(/\r\n/g, '\n').replace(/\n+$/, '');

const VERSI = TESTO.split('\n').length;        // 55

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/penna/', { attesa: 600 });
});

/**
 * Il pulsante «Nuovo» vero: col quaderno vuoto la barra sparisce e il
 * comando e' quello dentro lo stato vuoto (`#pen-list-empty-new`).
 */
async function nuovo(page) {
    const dentroIlVuoto = page.locator('#pen-list-empty-new');
    if (await dentroIlVuoto.isVisible()) return dentroIlVuoto;
    return page.locator('#pen-new');
}

/**
 * Nuovo testo + incolla, e non si torna finche' il testo non e' DAVVERO
 * nell'archivio. `penna.js` salva dopo 600 ms di quiete (`SALVA_DOPO`):
 * aspettare "abbastanza tempo" e' una gara che su una macchina carica si
 * perde, quindi si guarda dentro IndexedDB.
 */
async function scriviTesto(page, testo = TESTO) {
    await (await nuovo(page)).click();
    await expect(page.locator('#pen-text')).toBeVisible();
    await page.locator('#pen-text').fill(testo);
    await page.locator('#pen-text').dispatchEvent('input');
    /* la colonna dei conteggi e' la prova che l'input e' stato digerito */
    await expect(page.locator('#pen-gutter > *')).toHaveCount(testo.split('\n').length);

    const primoVerso = testo.split('\n')[0];
    await expect.poll(
        async () => page.evaluate((ago) => new Promise((ok) => {
            const req = indexedDB.open('tiny-temple-toolbox');
            req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('records')) { db.close(); return ok(0); }
                const q = db.transaction('records', 'readonly').objectStore('records').getAll();
                q.onsuccess = () => {
                    const n = (q.result || [])
                        .filter((r) => JSON.stringify(r && r.value).includes(ago)).length;
                    db.close();
                    ok(n);
                };
                q.onerror = () => { db.close(); ok(0); };
            };
            req.onerror = () => ok(0);
        }), primoVerso),
        { message: 'il testo non risulta salvato nell\u2019archivio', timeout: 15000 }
    ).toBeGreaterThan(0);
}

test('il quaderno vuoto lo dice, e un testo nuovo conta i suoi versi', async ({ page, spia }) => {
    await expect(page.locator('#pen-list-empty')).toBeVisible();
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(0);

    await scriviTesto(page);

    await expect(
        page.locator('#pen-gutter > *'),
        'la colonna dei conteggi non ha un numero per verso'
    ).toHaveCount(VERSI);
    expect(VERSI).toBe(55);
    nessunErroreConsole(spia);
});

test('il testo sopravvive al ricaricamento e compare nell’elenco', async ({ page }) => {
    await scriviTesto(page);

    await page.goto('/penna/', { waitUntil: 'load' });
    await page.waitForTimeout(800);

    const card = page.locator('#pen-list-grid .pen-card');
    await expect(card, 'la card del testo non c’e’ dopo il ricaricamento').toHaveCount(1);
    await expect(page.locator('#pen-list-empty')).toBeHidden();

    await card.locator('.pen-card-open').click();
    await expect(page.locator('#pen-text')).toHaveValue(TESTO);
});

test('esporta, cancella, importa: il quaderno torna com’era', async ({ page }) => {
    await scriviTesto(page);
    await page.goto('/penna/', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(1);

    /* --- esporta --- */
    await page.locator('#pen-settings-open').click();
    await expect(page.locator('#pen-export')).toBeVisible();
    const scarico = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('#pen-export').click();
    const download = await scarico;
    const quaderno = await download.path();
    expect(quaderno, 'nessun file esportato').toBeTruthy();
    const contenuto = JSON.parse(fs.readFileSync(quaderno, 'utf8'));
    expect(JSON.stringify(contenuto), 'il testo non e’ dentro il file esportato')
        .toContain(TESTO.split('\n')[0]);

    /* --- cancella --- */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const card = page.locator('#pen-list-grid .pen-card');
    await card.locator('.pen-card-del').click();
    await card.locator('.pen-card-yes').click();
    await page.waitForTimeout(600);
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(0);
    await expect(page.locator('#pen-list-empty')).toBeVisible();

    /* --- importa --- */
    await page.locator('#pen-settings-open').click();
    await page.locator('#pen-import-input').setInputFiles(quaderno);
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');

    await expect(
        page.locator('#pen-list-grid .pen-card'),
        'il quaderno importato non ha rimesso il testo al suo posto'
    ).toHaveCount(1);
    await page.locator('#pen-list-grid .pen-card .pen-card-open').click();
    await expect(page.locator('#pen-text')).toHaveValue(TESTO);
});

test('due dispositivi con lo stesso codice vedono lo stesso testo (codice da Impostazioni)', async ({ page, browser }) => {
    /* PBKDF2 a 200 000 giri, due volte, piu' due giri di sincronizzazione */
    test.setTimeout(180000);

    /* --- dispositivo 1: scrive, e da Penna il foglio porta a Impostazioni --- */
    await scriviTesto(page);
    await page.goto('/penna/', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.locator('#pen-settings-open').click();
    const link = page.locator('#pen-settings a[href="/impostazioni/#imp-sync"]');
    await expect(link, 'il foglio di Penna non porta piu’ alla sincronizzazione').toBeVisible();
    await link.click();
    await page.waitForURL('**/impostazioni/**');

    await page.locator('#imp-sync-create').click();
    /* creaCodice() e' asincrona (importa il dizionario delle parole):
       il riquadro resta vuoto per un istante */
    await expect(page.locator('#imp-sync-code')).not.toBeEmpty({ timeout: 30000 });
    const codice = (await page.locator('#imp-sync-code').textContent()).trim();
    expect(codice.split(/\s+/).length, 'il codice non e’ di sei parole: "' + codice + '"').toBe(6);

    await page.locator('#imp-sync-activate').click();
    await expect(page.locator('#imp-sync-now')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-done', { timeout: 60000 });

    /* il quaderno cifrato e' davvero finito sullo stub: l'id del quaderno sta
       in IndexedDB (tool `sync`, documento `quaderno`), e il manifest del §4
       ha la voce del testo nella collezione `penna` */
    const voci = await page.evaluate(async () => {
        const st = await import('/shared/storage.js');
        const q = await st.get('sync', 'quaderno');
        if (!q || !/^[0-9a-f]{32}$/.test(q.id || '')) return -1;
        const j = await (await fetch('/api/quaderno/' + q.id)).json();
        return (j.voci || []).filter((v) => v.collezione === 'penna').length;
    });
    expect(voci, 'il manifest dello stub non ha il testo: la sincronizzazione non ha scritto niente').toBe(1);

    /* --- dispositivo 2: collega lo stesso codice da Impostazioni --- */
    const contesto = await browser.newContext();
    const due = await contesto.newPage();
    const fuori = [];
    await due.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        fuori.push(url);
        return route.abort();
    });
    try {
        await due.addInitScript(() => {
            try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ }
        });
        await due.goto(BASE + '/penna/', { waitUntil: 'load' });
        await due.waitForTimeout(800);
        await expect(due.locator('#pen-list-empty'), 'il secondo dispositivo non parte vuoto').toBeVisible();

        await due.goto(BASE + '/impostazioni/#imp-sync', { waitUntil: 'load' });
        await due.locator('#imp-sync-have').click();
        await due.locator('#imp-sync-input').fill(codice);
        await due.locator('#imp-sync-link').click();
        await expect(due.locator('#imp-sync-now')).toBeVisible({ timeout: 60000 });
        await expect(due.locator('#imp-sync-state')).toHaveAttribute('data-i18n', 'sync-done', { timeout: 60000 });

        await due.goto(BASE + '/penna/', { waitUntil: 'load' });
        await expect(
            due.locator('#pen-list-grid .pen-card'),
            'il testo non e’ arrivato sul secondo dispositivo'
        ).toHaveCount(1, { timeout: 30000 });
        await due.locator('#pen-list-grid .pen-card .pen-card-open').click();
        await expect(due.locator('#pen-text')).toHaveValue(TESTO);

        expect(fuori, 'il secondo dispositivo ha chiamato host esterni').toEqual([]);
    } finally {
        await contesto.close();
    }
});

test('senza codice attivo nessuna richiesta parte verso /api/ (spec 18 §10.4)', async ({ page }) => {
    const chiamate = [];
    page.on('request', (r) => {
        if (r.url().includes('/api/')) chiamate.push(r.url());
    });
    await scriviTesto(page);
    await page.goto('/penna/', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    expect(chiamate, 'la sincronizzazione spenta ha comunque chiamato il server').toEqual([]);
});
