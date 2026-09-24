/**
 * Impostazioni (spec 18 §5): la pagina comune della Toolbox.
 *
 *   lingua        cambia e resta dopo il ricaricamento
 *   aspetto       "Animazioni ridotte" -> html.tb-ridotte dal primo frame e
 *                 intro saltata; "Salta l'intro" da sola salta l'intro
 *   microfono     stato e revoca, con un permesso finto (nessun audio vero)
 *   pacchetti     scaricare l'inglese qui e ritrovarlo installato in Penna;
 *                 il flusso di Penna (EN nel rimario -> foglio -> Scarica)
 *                 funziona ancora e Impostazioni lo vede
 *   dati          esporta -> cancella tutto (CANCELLA) -> importa unisci:
 *                 i testi tornano; la busta vecchia di Penna entra
 *   versione      quella di shared/versione.js (= VERSION di sw.js)
 *   menu          la voce "Impostazioni" c'e', la riga dei pacchetti no
 *
 * Console, scroll orizzontale e bersagli li controlla pagine.spec.mjs
 * (/impostazioni/ e' nell'elenco PAGINE di fixtures.mjs).
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, apri, senzaIntro, nessunErroreConsole, BASE } from '../fixtures.mjs';

const VERSIONE = (fs.readFileSync(
    fileURLToPath(new URL('../../../toolbox/shared/versione.js', import.meta.url)), 'utf8'
).match(/VERSIONE\s*=\s*'([^']+)'/) || [])[1];

/** Record vivi di una collezione, letti dall'archivio vero della pagina. */
function elenco(page, coll) {
    return page.evaluate((c) => import('/shared/archivio.js').then((a) => a.elenca(c)), coll);
}

/** Chiavi di localStorage che iniziano con `tt.`. */
function chiaviTt(page) {
    return page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.indexOf('tt.') === 0));
}

/**
 * Il rimario di Penna a vista: sta nell'editor, quindi prima un testo nuovo;
 * sotto i 900 px e' un foglio che si apre da "Rime", sopra e' gia' aperto.
 */
async function apriRimario(page) {
    const vuoto = page.locator('#pen-list-empty-new');
    await ((await vuoto.isVisible()) ? vuoto : page.locator('#pen-new')).click();
    await expect(page.locator('#pen-text')).toBeVisible();
    const en = page.locator('#pen-lang [data-pen-lang="en"]');
    if (!(await en.isVisible())) await page.locator('label.pen-rhyme-open').first().click();
    await expect(en).toBeVisible();
}

async function stato(page, codice) {
    return page.locator('[data-imp-pack="' + codice + '"]').getAttribute('data-imp-pack-stato');
}

test.describe('Impostazioni', () => {
    test.beforeEach(async ({ page }) => {
        await senzaIntro(page);
    });

    test('la lingua cambia e resta dopo il ricaricamento', async ({ page, spia }) => {
        await apri(page, '/impostazioni/', { attesa: 400 });
        await expect(page.locator('h1')).toHaveText('Impostazioni');
        await expect(page.locator('#imp-lingua-seg [data-imp-lang="it"]')).toHaveAttribute('aria-checked', 'true');

        await page.locator('#imp-lingua-seg [data-imp-lang="en"]').click();
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(page.locator('h1')).toHaveText('Settings');
        await expect(page.locator('#imp-versione')).toContainText('updated on');

        await page.waitForTimeout(300);
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(300);
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(page.locator('#imp-lingua-seg [data-imp-lang="en"]')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('h1')).toHaveText('Settings');
        /* e' anche nell'archivio (preferenza portabile) */
        const rec = await page.evaluate(() => import('/shared/archivio.js').then((a) => a.leggi('impostazioni', 'tinyTempleLang')));
        expect(rec).toBe('en');
        nessunErroreConsole(spia);
    });

    test('animazioni ridotte: html.tb-ridotte al ricaricamento e intro saltata', async ({ page, context, spia }) => {
        await apri(page, '/impostazioni/', { attesa: 400 });
        const toggle = page.locator('#imp-anim-ridotte');
        await expect(toggle).toHaveAttribute('aria-checked', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('html')).toHaveClass(/tb-ridotte/);
        await page.waitForTimeout(300);

        await page.reload({ waitUntil: 'load' });
        await expect(page.locator('html')).toHaveClass(/tb-ridotte/);
        await expect(page.locator('#imp-anim-ridotte')).toHaveAttribute('aria-checked', 'true');
        const pref = await page.evaluate(() => import('/shared/archivio.js').then((a) => a.leggi('impostazioni', 'tt.shared.animazioni-ridotte')));
        expect(pref, 'la preferenza non e’ nell’archivio').toBe(true);

        /* la dashboard in una scheda nuova, SENZA l'aiuto di senzaIntro: la
           classe c'e' dal primo frame e l'intro non parte */
        const nuova = await context.newPage();
        await nuova.goto('/', { waitUntil: 'domcontentloaded' });
        const primo = await nuova.evaluate(() => ({
            ridotte: document.documentElement.classList.contains('tb-ridotte'),
            noIntro: document.documentElement.classList.contains('tb-no-intro')
        }));
        expect(primo).toEqual({ ridotte: true, noIntro: true });
        await nuova.waitForLoadState('load');
        await nuova.waitForTimeout(200);
        await expect(nuova.locator('#tb-intro')).toHaveCount(0);
        await expect(nuova.locator('.tb-logo')).toHaveClass(/in-nav/);
        await expect(nuova.locator('.tb-logo')).not.toHaveClass(/is-pulse/);
        /* le transizioni sono spente come con prefers-reduced-motion */
        const dur = await nuova.locator('.tb-menu-toggle').evaluate((el) => getComputedStyle(el).transitionDuration);
        expect(dur.split(',').every((d) => parseFloat(d) <= 0.001)).toBe(true);
        await nuova.close();
        nessunErroreConsole(spia);
    });

    test('salta l’intro: la dashboard parte col logo gia’ agganciato', async ({ browser }) => {
        /* contesto pulito: niente sessionStorage.tbIntro */
        const ctx = await browser.newContext({ baseURL: BASE });
        const page = await ctx.newPage();
        await page.goto('/impostazioni/', { waitUntil: 'load' });
        await page.waitForTimeout(300);
        await page.locator('#imp-salta-intro').click();
        await expect(page.locator('#imp-salta-intro')).toHaveAttribute('aria-checked', 'true');
        await page.waitForTimeout(200);

        const dash = await ctx.newPage();
        await dash.goto('/', { waitUntil: 'domcontentloaded' });
        const cls = await dash.evaluate(() => [...document.documentElement.classList]);
        expect(cls).toContain('tb-no-intro');
        expect(cls).not.toContain('tb-ridotte');
        await dash.waitForLoadState('load');
        await dash.waitForTimeout(200);
        await expect(dash.locator('#tb-intro')).toHaveCount(0);
        await expect(dash.locator('.tb-logo')).toHaveClass(/in-nav/);
        await ctx.close();
    });

    test('microfono: stato e revoca del permesso', async ({ page, context, spia }) => {
        await context.grantPermissions(['microphone'], { origin: BASE });
        await apri(page, '/impostazioni/', { attesa: 200 });
        await expect(page.locator('#imp-mic-stato')).toHaveText('Microfono: non richiesto');
        await expect(page.locator('#imp-mic-revoca')).toBeHidden();

        /* il consenso dato in un altro strumento (mic.js: tinyTempleMicConsent) */
        await page.evaluate(() => window.localStorage.setItem('tinyTempleMicConsent', 'granted'));
        await page.reload({ waitUntil: 'load' });
        await page.waitForTimeout(300);
        await expect(page.locator('#imp-mic-stato')).toHaveText('Microfono: consentito');
        await expect(page.locator('#imp-mic-revoca')).toBeVisible();

        await page.locator('#imp-mic-revoca').click();
        await expect(page.locator('#imp-mic-stato')).toHaveText('Microfono: non richiesto');
        await expect(page.locator('#imp-mic-revoca')).toBeHidden();
        expect(await page.evaluate(() => window.localStorage.getItem('tinyTempleMicConsent'))).toBeNull();
        nessunErroreConsole(spia);
    });

    test('pacchetti: scarico l’inglese qui, Penna lo trova installato', async ({ page, spia }) => {
        await apri(page, '/impostazioni/', { attesa: 400 });
        await expect(page.locator('#imp-pacchetti-lista > [data-imp-pack]')).toHaveCount(4);
        await expect(page.locator('#imp-pacchetti-vuoto')).toBeHidden();
        expect(await stato(page, 'en')).toBe('assente');
        /* l'italiano non in cache si prepara da solo alla prima ricerca in Penna */
        await expect(page.locator('[data-imp-pack="it"] .imp-pack-stato')).toHaveText('Si prepara da solo al primo uso');
        await expect(page.locator('[data-imp-pack="en"] .imp-pack-stato')).toHaveText('Non scaricato');
        const riga = page.locator('[data-imp-pack="en"]');
        await expect(riga.locator('.imp-pack-nome')).toHaveText('English');
        await expect(riga.locator('.imp-pack-rimuovi')).toBeHidden();

        await riga.locator('.imp-pack-scarica').click();
        await expect(riga).toHaveAttribute('data-imp-pack-stato', 'installato', { timeout: 20000 });
        await expect(riga.locator('.imp-pack-stato')).toHaveText('Installato');
        await expect(riga.locator('.imp-pack-scarica')).toBeHidden();
        await expect(riga.locator('.imp-pack-rimuovi')).toBeVisible();
        const inCache = await page.evaluate(() => caches.open('toolbox-rimario')
            .then((c) => c.keys()).then((k) => k.map((r) => new URL(r.url).pathname).filter((p) => p.startsWith('/penna/data/en/'))));
        expect(inCache.length, 'i file inglesi non sono in toolbox-rimario').toBe(4);

        await apri(page, '/penna/', { attesa: 600 });
        const pacchetti = await page.evaluate(() => JSON.parse(window.localStorage.getItem('tt.penna.pacchetti') || '[]'));
        expect(pacchetti).toContain('en');
        /* nel rimario EN non e' piu' "da scaricare": il tocco cambia lingua, niente foglio */
        await expect(page.locator('#pen-lang [data-pen-lang="en"]')).not.toHaveClass(/is-missing/);
        await apriRimario(page);
        await page.locator('#pen-lang [data-pen-lang="en"]').click();
        await expect(page.locator('#pen-lang [data-pen-lang="en"]')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#pen-pack-sheet')).toBeHidden();

        /* e da Impostazioni si toglie: Penna torna all'italiano */
        await apri(page, '/impostazioni/', { attesa: 400 });
        await page.locator('[data-imp-pack="en"] .imp-pack-rimuovi').click();
        await expect(page.locator('[data-imp-pack="en"]')).toHaveAttribute('data-imp-pack-stato', 'assente');
        const dopo = await page.evaluate(() => ({
            pacchetti: JSON.parse(window.localStorage.getItem('tt.penna.pacchetti') || '[]'),
            lingua: JSON.parse(window.localStorage.getItem('tt.penna.lingua') || '"it"')
        }));
        expect(dopo.pacchetti).not.toContain('en');
        expect(dopo.lingua).toBe('it');
        nessunErroreConsole(spia);
    });

    test('pacchetti: il flusso di Penna (EN -> foglio -> Scarica) funziona ancora', async ({ page, spia }) => {
        await apri(page, '/penna/', { attesa: 600 });
        await apriRimario(page);
        await expect(page.locator('#pen-lang [data-pen-lang="en"]')).toHaveClass(/is-missing/);
        await page.locator('#pen-lang [data-pen-lang="en"]').click();
        await expect(page.locator('#pen-pack-sheet')).toBeVisible();
        await page.locator('#pen-pack-go').click();
        await expect(page.locator('#pen-pack-sheet')).toBeHidden({ timeout: 20000 });
        await expect(page.locator('#pen-lang [data-pen-lang="en"]')).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#pen-lang [data-pen-lang="en"]')).not.toHaveClass(/is-missing/);

        await apri(page, '/impostazioni/', { attesa: 400 });
        await expect(page.locator('[data-imp-pack="en"]')).toHaveAttribute('data-imp-pack-stato', 'installato');
        nessunErroreConsole(spia);
    });

    test('dati: esporta, cancella tutto (CANCELLA), importa unisci ritrova i testi', async ({ page, spia }) => {
        await apri(page, '/impostazioni/', { attesa: 400 });
        await page.evaluate(() => import('/shared/archivio.js').then(async (a) => {
            const doc = (titolo, testo) => ({ titolo, testo, creato: '2026-09-01T10:00:00.000Z', modificato: '2026-09-01T10:00:00.000Z', dialefe: {}, lingua: 'it', emuet: false });
            await a.scrivi('penna', 'uno', doc('Primo brano', 'verso uno\nverso due'));
            await a.scrivi('penna', 'due', doc('Secondo brano', 'un altro verso'));
            await a.impostaPref('tt.metronomo.bpm', 97);
        }));
        expect((await elenco(page, 'penna')).length).toBe(2);

        /* esporta */
        const scarico = page.waitForEvent('download', { timeout: 15000 });
        await page.locator('#imp-esporta').click();
        const download = await scarico;
        expect(download.suggestedFilename()).toMatch(/^toolbox-\d{4}-\d{2}-\d{2}\.json$/);
        const file = await download.path();
        const dati = JSON.parse(fs.readFileSync(file, 'utf8'));
        expect(dati.app).toBe('tiny-temple-toolbox');
        expect(dati.collezioni.penna.map((r) => r.dati.titolo).sort()).toEqual(['Primo brano', 'Secondo brano']);
        expect(dati.preferenze['tt.metronomo.bpm']).toBe(97);

        /* cancella tutto: il si' resta spento finche' la parola non e' giusta */
        await expect(page.locator('#imp-cancella-box')).toBeHidden();
        await page.locator('#imp-cancella').click();
        await expect(page.locator('#imp-cancella-box')).toBeVisible();
        await expect(page.locator('#imp-cancella-parola')).toHaveText('CANCELLA');
        const si = page.locator('#imp-cancella-si');
        await expect(si).toBeDisabled();
        await page.locator('#imp-cancella-conferma').fill('cancel');
        await expect(si).toBeDisabled();
        await page.locator('#imp-cancella-conferma').fill('cancella');      // maiuscole o minuscole
        await expect(si).toBeEnabled();
        await si.click();
        await expect(page.locator('#imp-dati-status')).toHaveAttribute('data-imp-esito', 'imp-wipe-done');
        await expect(page.locator('#imp-cancella-box')).toBeHidden();
        expect(await elenco(page, 'penna')).toEqual([]);
        expect(await elenco(page, 'impostazioni')).toEqual([]);
        expect(await chiaviTt(page)).toEqual([]);

        /* importa, unisci */
        await expect(page.locator('#imp-importa-modo [data-imp-modo="unisci"]')).toHaveAttribute('aria-checked', 'true');
        await page.locator('#imp-importa-input').setInputFiles(file);
        await expect(page.locator('#imp-dati-status')).toHaveAttribute('data-imp-esito', 'imp-import-done');
        /* 2 testi + la preferenza del metronomo */
        await expect(page.locator('#imp-dati-status')).toHaveText('Importati: 3 nuovi, 0 aggiornati.');
        const tornati = await elenco(page, 'penna');
        expect(tornati.map((r) => r.dati.titolo).sort()).toEqual(['Primo brano', 'Secondo brano']);
        expect(tornati.find((r) => r.id === 'uno').dati.testo).toBe('verso uno\nverso due');
        expect(await page.evaluate(() => window.localStorage.getItem('tt.metronomo.bpm'))).toBe('97');
        nessunErroreConsole(spia);
    });

    test('importa la busta vecchia di Penna', async ({ page, spia }) => {
        await apri(page, '/impostazioni/', { attesa: 400 });
        const vecchio = {
            tipo: 'tiny-temple-penna',
            versione: 1,
            esportato: '2026-08-01T09:00:00.000Z',
            testi: [{
                id: '2026-08-01T08:00:00.000Z-abcde',
                titolo: 'Dal quaderno di prima',
                testo: 'la luna\nla duna',
                creato: '2026-08-01T08:00:00.000Z',
                modificato: '2026-08-01T08:30:00.000Z',
                dialefe: {},
                lingua: 'it',
                emuet: false
            }]
        };
        await page.locator('#imp-importa-input').setInputFiles({
            name: 'quaderno-2026-08-01.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(vecchio))
        });
        await expect(page.locator('#imp-dati-status')).toHaveAttribute('data-imp-esito', 'imp-import-done');
        const testi = await elenco(page, 'penna');
        expect(testi).toHaveLength(1);
        expect(testi[0].id).toBe('2026-08-01T08:00:00.000Z-abcde');
        expect(testi[0].dati.titolo).toBe('Dal quaderno di prima');
        expect(testi[0].sid).toMatch(/^[0-9a-f]{16}$/);

        /* un file qualunque non tocca niente */
        await page.locator('#imp-importa-input').setInputFiles({
            name: 'altro.json', mimeType: 'application/json', buffer: Buffer.from('{"ciao":1}')
        });
        await expect(page.locator('#imp-dati-status')).toHaveAttribute('data-imp-esito', 'imp-import-failed');
        expect(await elenco(page, 'penna')).toHaveLength(1);
        nessunErroreConsole(spia);
    });

    test('la versione mostrata e’ quella dell’app', async ({ page }) => {
        expect(VERSIONE).toMatch(/^tb-v\d+$/);
        await apri(page, '/impostazioni/', { attesa: 300 });
        await expect(page.locator('#imp-versione')).toContainText('Toolbox ' + VERSIONE);
        await expect(page.locator('#imp-versione')).toContainText('aggiornata il');
        /* la stessa del service worker servito */
        const sw = await page.evaluate(() => fetch('/sw.js').then((r) => r.text()));
        expect((sw.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1]).toBe(VERSIONE);
    });

    test('menu: la voce Impostazioni c’e’, la riga dei pacchetti no', async ({ page }) => {
        await apri(page, '/metronomo/', { attesa: 400 });
        await expect(page.locator('#tb-packs-row')).toHaveCount(0);
        await page.locator('.tb-menu-toggle').click();
        const voce = page.locator('#tb-menu .tb-menu-settings');
        await expect(voce).toBeVisible();
        await expect(voce).toHaveAttribute('href', '/impostazioni/');
        await expect(voce).toHaveText('Impostazioni');
        await expect(voce.locator('svg')).toHaveCount(1);
        await voce.click();
        await page.waitForURL('**/impostazioni/');
        await page.waitForTimeout(300);
        await page.locator('.tb-menu-toggle').click();
        await expect(page.locator('#tb-menu .tb-menu-settings')).toHaveAttribute('aria-current', 'page');
    });
});
