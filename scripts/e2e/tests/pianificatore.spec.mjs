/**
 * Pianificatore di uscita: un piano, le sue tappe, il calendario e la
 * memoria. Piu' il difetto di lingua della spec 18 §7.8.
 *
 * «fra 1 giorni» e «1 giorni fa»: `pianificatore-uscita/i18n.js:56-57` ha
 * solo la forma plurale (`pia-in-days`, `pia-days-ago`) e
 * `pianificatore.js:281-282` la usa anche per n = 1. Serve il singolare
 * (`pia-in-day` / `pia-day-ago`). E' una riga sola, ma e' la riga che una
 * persona legge ogni volta che apre il piano il giorno prima della consegna.
 */

import fs from 'node:fs';
import { test, expect, apri, senzaIntro, nessunErroreConsole } from '../fixtures.mjs';

/**
 * «Oggi» per l'app, non per il container: `timeline.js` usa `oggiIso()`, cioe'
 * la data LOCALE del browser. A cavallo della mezzanotte di Roma le due non
 * coincidono, e un test che sbaglia giorno non dimostra niente.
 */
async function oggi(page) {
    return page.evaluate(() => {
        const d = new Date();
        const z = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    });
}

/** 'YYYY-MM-DD' spostata di n giorni (mezzogiorno UTC, come fa timeline.js). */
function piuGiorni(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d, 12));
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
}

/** n giorni dall'oggi dell'app. */
async function fraGiorni(page, n) {
    return piuGiorni(await oggi(page), n);
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/pianificatore-uscita/', { attesa: 500 });
});

/** Crea un piano con la data indicata e apre la sua pagina. */
async function creaPiano(page, { titolo = 'Prova', data, tipo = 'singolo' } = {}) {
    await page.locator('#pia-new').click();
    await expect(page.locator('#pia-form')).toBeVisible();
    await page.locator('#pia-title').fill(titolo);
    await page.locator('[data-pia-type="' + tipo + '"]').click();
    await page.locator('#pia-date').fill(data);
    await page.locator('#pia-save').click();
    await expect(page.locator('#pia-plan')).toBeVisible();
    await page.waitForTimeout(500);
}

/** Aggiunge una tappa personale con nome e data. */
async function aggiungiTappa(page, nome, data) {
    await page.locator('#pia-add').click();
    await expect(page.locator('#pia-sheet-nome')).toBeVisible();
    await page.locator('#pia-sheet-nome').fill(nome);
    await page.locator('#pia-sheet-data').fill(data);
    await page.locator('#pia-sheet-body .tb-btn--primary').click();
    await page.waitForTimeout(500);
}

test('un piano nuovo nasce con le sue tappe', async ({ page, spia }) => {
    await expect(page.locator('#pia-empty')).toBeVisible();
    await creaPiano(page, { titolo: 'Brano di prova', data: await fraGiorni(page, 70) });

    await expect(page.locator('#pia-plan-title')).toHaveText('Brano di prova');
    const tappe = page.locator('#pia-list > li');
    await expect(tappe, 'il piano non ha generato nessuna tappa').not.toHaveCount(0);
    expect(await tappe.count(), 'troppe poche tappe per un singolo completo').toBeGreaterThan(5);
    nessunErroreConsole(spia);
});

test('il piano sopravvive al ricaricamento', async ({ page }) => {
    await creaPiano(page, { titolo: 'Ricordami', data: await fraGiorni(page, 50) });
    const quante = await page.locator('#pia-list > li').count();

    await page.goto('/pianificatore-uscita/', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    /* il titolo e' scritto in maiuscoletto dal CSS: `innerText` restituisce
       il testo COME SI VEDE, quindi il confronto e' senza maiuscole */
    const testo = (await page.locator('body').innerText()).toLowerCase();
    expect(testo, 'il piano salvato non si ritrova dopo il ricaricamento').toContain('ricordami');
    await expect(page.locator('#pia-list > li')).toHaveCount(quante);
});

test('il calendario si scarica come .ics', async ({ page }) => {
    await creaPiano(page, { titolo: 'Calendario', data: await fraGiorni(page, 40) });

    const scarico = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('#pia-ics').click();
    const download = await scarico;
    expect(download.suggestedFilename(), 'il file scaricato non e’ un .ics').toMatch(/\.ics$/);

    const percorso = await download.path();
    const testo = fs.readFileSync(percorso, 'utf8');
    expect(testo, 'il file non ha la forma di un calendario').toContain('BEGIN:VCALENDAR');
    expect(testo).toContain('BEGIN:VEVENT');
});

test('si puo’ aggiungere una tappa a mano', async ({ page }) => {
    await creaPiano(page, { titolo: 'Con aggiunta', data: await fraGiorni(page, 45) });
    const prima = await page.locator('#pia-list > li').count();

    await aggiungiTappa(page, 'Girare il video', await fraGiorni(page, 20));

    await expect(page.locator('#pia-list > li')).toHaveCount(prima + 1);
    expect((await page.locator('#pia-list').innerText()).toLowerCase()).toContain('girare il video');
});

test('un giorno solo si dice al singolare (spec 18 §7.8)', async ({ page }) => {
    await creaPiano(page, { titolo: 'Singolare', data: await fraGiorni(page, 30) });
    await aggiungiTappa(page, 'Domani', await fraGiorni(page, 1));
    await aggiungiTappa(page, 'Ieri', await fraGiorni(page, -1));

    const elenco = await page.locator('#pia-list').innerText();
    /* senza queste due tappe il test non proverebbe niente */
    expect(elenco.toLowerCase(), 'la tappa di domani non c’e’').toContain('domani');
    expect(elenco.toLowerCase(), 'la tappa di ieri non c’e’').toContain('ieri');

    expect(
        elenco,
        'il piano dice «fra 1 giorni»: manca il singolare (chiave pia-in-day)'
    ).not.toMatch(/fra\s+1\s+giorni/i);
    expect(
        elenco,
        'il piano dice «1 giorni fa»: manca il singolare (chiave pia-day-ago)'
    ).not.toMatch(/(^|[^0-9])1\s+giorni\s+fa/i);
});

test('in inglese, un giorno solo si dice al singolare', async ({ page }) => {
    await page.addInitScript(() => {
        try { window.localStorage.setItem('tinyTempleLang', 'en'); } catch (e) { /* niente */ }
    });
    await page.goto('/pianificatore-uscita/', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await creaPiano(page, { titolo: 'Singular', data: await fraGiorni(page, 30) });
    await aggiungiTappa(page, 'Tomorrow', await fraGiorni(page, 1));
    await aggiungiTappa(page, 'Yesterday', await fraGiorni(page, -1));

    const elenco = await page.locator('#pia-list').innerText();
    expect(elenco.toLowerCase()).toContain('tomorrow');
    expect(elenco, 'the plan says "in 1 days"').not.toMatch(/in\s+1\s+days/i);
    expect(elenco, 'the plan says "1 days ago"').not.toMatch(/(^|[^0-9])1\s+days\s+ago/i);
});
