/**
 * Penna: il giro completo di un testo, dalla pagina vuota all'importazione.
 *
 *   elenco vuoto -> nuovo -> si incolla un testo vero (55 versi) -> il
 *   contatore dei versi li conta tutti -> si ricarica e il testo e' ancora
 *   li' -> si sincronizza con un secondo dispositivo attraverso lo stub del
 *   quaderno -> si esporta, si cancella tutto, si reimporta.
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

test('due dispositivi con lo stesso codice vedono lo stesso testo', async ({ page, browser }) => {
    /* PBKDF2 a 200 000 giri, due volte, piu' due giri di sincronizzazione */
    test.setTimeout(180000);

    /* --- dispositivo 1: scrive, crea il codice, attiva, sincronizza --- */
    await scriviTesto(page);
    await page.goto('/penna/', { waitUntil: 'load' });
    await page.waitForTimeout(800);

    await page.locator('#pen-settings-open').click();
    await expect(page.locator('#pen-sync-create')).toBeVisible();
    await page.locator('#pen-sync-create').click();

    /* creaCodice() e' asincrona (importa il dizionario delle parole):
       il riquadro resta vuoto per un istante */
    await expect(page.locator('#pen-sync-code')).not.toBeEmpty({ timeout: 30000 });
    const codice = (await page.locator('#pen-sync-code').textContent()).trim();
    expect(codice.split(/\s+/).length, 'il codice non e’ di sei parole: "' + codice + '"').toBe(6);

    await page.locator('#pen-sync-activate').click();
    await expect(page.locator('#pen-sync-now')).toBeVisible({ timeout: 60000 });
    await page.locator('#pen-sync-now').click();
    await expect(page.locator('#pen-sync-state')).not.toBeEmpty({ timeout: 60000 });
    await page.waitForTimeout(3000);

    /* il quaderno cifrato e' davvero finito sullo stub: l'id del quaderno sta
       in IndexedDB (tool `penna-sync`, documento `quaderno`), e il manifest
       del §4 risponde con almeno una voce */
    const voci = await page.evaluate(() => new Promise((ok) => {
        const req = indexedDB.open('tiny-temple-toolbox');
        req.onsuccess = () => {
            const db = req.result;
            const q = db.transaction('records', 'readonly').objectStore('records').getAll();
            q.onsuccess = async () => {
                const riga = (q.result || []).find((r) => r && r.tool === 'penna-sync' && r.id === 'quaderno');
                db.close();
                const id = riga && riga.value ? riga.value.id : '';
                if (!/^[0-9a-f]{32}$/.test(id || '')) return ok(-1);
                try {
                    const r = await fetch('/api/quaderno/' + id);
                    const j = await r.json();
                    ok((j.voci || []).length);
                } catch (e) { ok(-2); }
            };
            q.onerror = () => { db.close(); ok(-3); };
        };
        req.onerror = () => ok(-4);
    }));
    expect(
        voci,
        'il manifest dello stub non ha nessuna voce: la sincronizzazione non ha scritto niente'
    ).toBeGreaterThan(0);

    /* --- dispositivo 2: collega lo stesso codice e sincronizza --- */
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

        await due.locator('#pen-settings-open').click();
        await due.locator('#pen-sync-have').click();
        await due.locator('#pen-sync-input').fill(codice);
        await due.locator('#pen-sync-link').click();
        await expect(due.locator('#pen-sync-now')).toBeVisible({ timeout: 60000 });
        await due.locator('#pen-sync-now').click();
        await due.waitForTimeout(6000);
        await due.keyboard.press('Escape');

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
