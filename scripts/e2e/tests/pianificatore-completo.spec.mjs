/**
 * Pianificatore «completo» (spec 22): criteri §6.1-4 e §6.7, mobile e desktop.
 *
 *   §6.1 bozza di «Nuovo piano»: sopravvive al reload; Salva e Annulla la tolgono
 *   §6.2 bozza di «Modifica»: ripresa sul piano giusto; piano eliminato da un
 *        altro contesto (sync) -> bozza scartata, nessun errore
 *   §6.3 #pia-profile-hint: {n} = righe che il piano mostra davvero
 *   §6.4 lista piani: badge per piano e ordine ritardo -> scadenza -> uscito
 *
 * Contratto col markup (spec §3-4): #pia-form, #pia-profile-hint, la riga
 * `.tb-status` «Bozza ripresa» dentro il modulo; la bozza e' la pref locale
 * `tt.pianificatore-uscita.bozza`. Nella lista, il badge di una riga e'
 * `.pia-plan-badge` (lo scrive pianificatore.js).
 */

import {
    test, expect, apri, senzaIntro, BASE, nessunErroreConsole
} from '../fixtures.mjs';

const BOZZA = 'tt.pianificatore-uscita.bozza';

/** «Oggi» per l'app: la data LOCALE del browser (vedi pianificatore.spec.mjs). */
async function oggi(page) {
    return page.evaluate(() => {
        const d = new Date();
        const z = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    });
}

function piuGiorni(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d, 12));
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
}

const fraGiorni = async (page, n) => piuGiorni(await oggi(page), n);
const bozza = (page) => page.evaluate((k) => window.localStorage.getItem(k), BOZZA);
const ultimo = (page) => page.evaluate(() => JSON.parse(window.localStorage.getItem('tt.pianificatore.ultimo') || 'null'));
const ripresa = (page, testo = 'Bozza ripresa') => page.locator('#pia-form .tb-status', { hasText: testo });

/** `corpo` nella pagina con `m` = archivio, `s` = sync, `tl` = timeline, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + 'const tl = await import(\'/pianificatore-uscita/timeline.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

async function ricarica(page, attesa = 800) {
    await page.goto('about:blank');
    await apri(page, '/pianificatore-uscita/', { attesa });
}

/** Crea un piano dal modulo e aspetta che si apra. */
async function creaPiano(page, { titolo = 'Prova', data, tipo = 'singolo', profilo } = {}) {
    await page.locator('#pia-new').click();
    await expect(page.locator('#pia-form')).toBeVisible();
    await page.locator('#pia-title').fill(titolo);
    await page.locator('[data-pia-type="' + tipo + '"]').click();
    if (profilo) await page.locator('[data-pia-profile="' + profilo + '"]').click();
    await page.locator('#pia-date').fill(data);
    await page.locator('#pia-save').click();
    await expect(page.locator('#pia-plan')).toBeVisible();
    await page.waitForTimeout(400);
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/pianificatore-uscita/', { attesa: 500 });
});

/* ---------------- §6.1 bozza di un piano nuovo ---------------- */

test('§6.1 «Nuovo piano» interrotto: reload -> stesso modulo e «Bozza ripresa»; Salva la toglie', async ({ page, spia }) => {
    const data = await fraGiorni(page, 40);
    await page.locator('#pia-new').click();
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(ripresa(page), 'un modulo nuovo senza bozza non e’ «ripreso»').toBeHidden();
    await page.locator('#pia-title').fill('Prova');
    await page.locator('[data-pia-type="ep"]').click();
    await page.locator('#pia-date').fill(data);
    await page.locator('#pia-notes').fill('Mix da rivedere');
    await page.waitForTimeout(500);                  // debounce <= 300 ms
    expect(await bozza(page), 'la bozza non e’ stata scritta').not.toBeNull();

    await ricarica(page);
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(page.locator('#pia-title')).toHaveValue('Prova');
    await expect(page.locator('[data-pia-type="ep"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#pia-date')).toHaveValue(data);
    await expect(page.locator('#pia-notes')).toHaveValue('Mix da rivedere');
    await expect(ripresa(page)).toBeVisible();

    await page.locator('#pia-save').click();
    await expect(page.locator('#pia-plan')).toBeVisible();
    await expect(page.locator('#pia-plan-title')).toHaveText('Prova');
    await page.waitForTimeout(500);
    expect(await bozza(page), 'Salva non ha tolto la bozza').toBeNull();

    await ricarica(page);
    await expect(page.locator('#pia-plan'), 'dopo il salvataggio si riapre il piano').toBeVisible();
    await expect(page.locator('#pia-form')).toBeHidden();
    nessunErroreConsole(spia);
});

test('§6.1 Annulla toglie la bozza: reload -> stato vuoto, nessun modulo', async ({ page, spia }) => {
    await page.locator('#pia-new').click();
    await page.locator('#pia-title').fill('Da buttare');
    await page.locator('#pia-notes').fill('niente');
    await page.waitForTimeout(500);
    expect(await bozza(page)).not.toBeNull();
    await page.locator('#pia-cancel').click();
    expect(await bozza(page), 'Annulla non ha tolto la bozza').toBeNull();

    await ricarica(page);
    await expect(page.locator('#pia-form')).toBeHidden();
    await expect(page.locator('#pia-empty')).toBeVisible();
    expect(await bozza(page)).toBeNull();
    nessunErroreConsole(spia);
});

test('§6.1 un modulo tornato ai valori di partenza non lascia bozza', async ({ page }) => {
    await page.locator('#pia-new').click();
    await page.locator('#pia-title').fill('x');
    await page.waitForTimeout(500);
    expect(await bozza(page)).not.toBeNull();
    await page.locator('#pia-title').fill('');
    await page.waitForTimeout(500);
    expect(await bozza(page), 'bozza vuota scritta (o non tolta)').toBeNull();
});

/* ---------------- §6.2 bozza di una modifica ---------------- */

test('§6.2 «Modifica» interrotta: reload -> modulo di modifica ripreso su quel piano', async ({ page, spia }) => {
    await creaPiano(page, { titolo: 'Originale', data: await fraGiorni(page, 50) });
    const id = await ultimo(page);
    await page.locator('#pia-edit').click();
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(ripresa(page)).toBeHidden();
    await page.locator('#pia-title').fill('Titolo nuovo');
    await page.waitForTimeout(500);
    expect(JSON.parse(await bozza(page)).modifica).toBe(id);

    await ricarica(page);
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(page.locator('#pia-title')).toHaveValue('Titolo nuovo');
    await expect(ripresa(page)).toBeVisible();

    /* e' la modifica di QUEL piano: Salva lo aggiorna, non ne crea un altro */
    await page.locator('#pia-save').click();
    await expect(page.locator('#pia-plan-title')).toHaveText('Titolo nuovo');
    await page.waitForTimeout(500);
    expect(await ultimo(page)).toBe(id);
    expect(await modulo(page, 'return (await m.elenca(\'uscite\')).length;')).toBe(1);
    expect(await bozza(page)).toBeNull();
    nessunErroreConsole(spia);
});

test('§6.2 piano eliminato da un altro contesto (sync) -> bozza scartata, nessun errore', async ({ page, browser, spia }) => {
    test.setTimeout(120000);
    const contesto = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
    const due = await contesto.newPage();
    await due.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await due.addInitScript(() => { try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ } });
    try {
        const codice = await modulo(page, 'const c = await s.creaCodice(); await s.collega(c); return c;');
        await creaPiano(page, { titolo: 'Condiviso', data: await fraGiorni(page, 60) });
        const id = await ultimo(page);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');

        await apri(due, BASE + '/pianificatore-uscita/', { attesa: 300 });
        await modulo(due, 'await s.collega(arg); await s.sincronizza();', codice);
        expect(await modulo(due, 'return !!(await m.leggi(\'uscite\', arg));', id)).toBe(true);

        await page.locator('#pia-edit').click();
        await page.locator('#pia-title').fill('Modifica a meta’');
        await page.waitForTimeout(500);
        expect(await bozza(page)).not.toBeNull();

        await modulo(due, 'await m.elimina(\'uscite\', arg); await s.sincronizza();', id);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await expect.poll(() => bozza(page), { message: 'la bozza del piano eliminato e’ rimasta' }).toBeNull();

        await ricarica(page);
        await expect(page.locator('#pia-form')).toBeHidden();
        await expect(page.locator('#pia-empty')).toBeVisible();
        expect(await bozza(page)).toBeNull();
        nessunErroreConsole(spia);
    } finally {
        await contesto.close();
    }
});

test('§6.2 bozza di modifica di un piano che non c’e’ piu’: all’avvio si scarta', async ({ page, spia }) => {
    await page.evaluate((k) => window.localStorage.setItem(k, JSON.stringify({
        titolo: 'Fantasma', tipo: 'singolo', data: '2030-01-01', profilo: 'completa',
        distributore: '', note: '', modifica: 'non-esiste'
    })), BOZZA);
    await ricarica(page);
    await expect(page.locator('#pia-form')).toBeHidden();
    await expect(page.locator('#pia-empty')).toBeVisible();
    expect(await bozza(page)).toBeNull();
    nessunErroreConsole(spia);
});

/* ---------------- bozza di piano nuovo contro `ultimo` (2 ore) ---------------- */

const ORA_MS = 3600 * 1000;
const bozzaNuova = (page, quando, data) => page.evaluate(([k, v]) => window.localStorage.setItem(k, JSON.stringify(v)), [BOZZA, {
    titolo: 'Vecchia bozza', tipo: 'ep', data, profilo: 'completa',
    distributore: '', note: 'appunto', modifica: null, quando
}]);

test('bozza di piano nuovo vecchia (3 h) con `ultimo`: si apre il piano, «Riprendi» riapre il modulo', async ({ page, spia }) => {
    await creaPiano(page, { titolo: 'Aperto', data: await fraGiorni(page, 50) });
    const data = await fraGiorni(page, 70);
    await bozzaNuova(page, Date.now() - 3 * ORA_MS, data);

    await ricarica(page);
    await expect(page.locator('#pia-plan')).toBeVisible();
    await expect(page.locator('#pia-plan-title')).toHaveText('Aperto');
    const riga = page.locator('#pia-draft-resume');
    await expect(riga).toBeVisible();
    await expect(riga).toHaveClass(/tb-status/);
    await expect(riga).toContainText('Hai una bozza di un nuovo piano');
    await expect(page.locator('#pia-draft-open')).toHaveText('Riprendi');

    await page.locator('#pia-draft-open').click();
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(page.locator('#pia-title')).toHaveValue('Vecchia bozza');
    await expect(page.locator('[data-pia-type="ep"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#pia-date')).toHaveValue(data);
    await expect(page.locator('#pia-notes')).toHaveValue('appunto');
    await expect(ripresa(page)).toBeVisible();

    /* Annulla la toglie: tornando al piano la riga non c'e' piu' */
    await page.locator('#pia-cancel').click();
    await expect(page.locator('#pia-plan')).toBeVisible();
    await expect(riga).toBeHidden();
    expect(await bozza(page)).toBeNull();
    nessunErroreConsole(spia);
});

test('bozza di piano nuovo recente (< 2 h) o senza `ultimo` valido: si riapre il modulo', async ({ page }) => {
    await creaPiano(page, { titolo: 'Aperto', data: await fraGiorni(page, 50) });
    await bozzaNuova(page, Date.now() - 10 * 60 * 1000, await fraGiorni(page, 70));
    await ricarica(page);
    await expect(page.locator('#pia-form'), 'bozza di 10 minuti: deve vincere su `ultimo`').toBeVisible();
    await expect(page.locator('#pia-title')).toHaveValue('Vecchia bozza');

    await page.evaluate(() => window.localStorage.setItem('tt.pianificatore.ultimo', JSON.stringify('non-esiste')));
    await bozzaNuova(page, Date.now() - 3 * ORA_MS, await fraGiorni(page, 70));
    await ricarica(page);
    await expect(page.locator('#pia-form'), 'bozza vecchia ma `ultimo` non valido: si riapre il modulo').toBeVisible();
    await expect(page.locator('#pia-title')).toHaveValue('Vecchia bozza');
});

/* ---------------- §6.3 Veloce / Completa ---------------- */

for (const tipo of ['singolo', 'album']) {
    for (const profilo of ['veloce', 'completa']) {
        test('§6.3 #pia-profile-hint ' + profilo + ' / ' + tipo + ': {n} = righe del piano', async ({ page }) => {
            await page.locator('#pia-new').click();
            await page.locator('[data-pia-type="' + tipo + '"]').click();
            await page.locator('[data-pia-profile="' + profilo + '"]').click();
            const hint = page.locator('#pia-profile-hint');
            await expect(hint).toBeVisible();
            await expect(hint).toHaveClass(/pia-field-hint/);
            const testo = (await hint.textContent()).trim();
            expect(testo).toContain(profilo === 'veloce' ? 'Veloce' : 'Completa');
            expect(testo, 'segnaposto {n} non sostituito').not.toContain('{n}');
            const n = Number((testo.match(/\d+/) || [])[0]);
            expect(n).toBeGreaterThan(0);

            await page.locator('#pia-title').fill('Conta');
            await page.locator('#pia-date').fill(await fraGiorni(page, 200));
            await page.locator('#pia-save').click();
            await expect(page.locator('#pia-plan')).toBeVisible();
            await expect(page.locator('#pia-list > li.pia-step'), 'il piano non mostra {n} tappe').toHaveCount(n);
        });
    }
}

test('§6.3 l’hint cambia con profilo e tipo, e in inglese', async ({ page }) => {
    await page.locator('#pia-new').click();
    const hint = page.locator('#pia-profile-hint');
    await page.locator('[data-pia-type="singolo"]').click();
    await page.locator('[data-pia-profile="completa"]').click();
    const singolo = await hint.textContent();
    await page.locator('[data-pia-type="album"]').click();
    const album = await hint.textContent();
    expect(album, 'l’album aggiunge i singoli di lancio: il numero deve cambiare').not.toBe(singolo);
    await page.locator('[data-pia-profile="veloce"]').click();
    expect(await hint.textContent()).not.toBe(album);

    /* il modulo a meta' e' una bozza: in inglese si riapre com'era (album, Veloce) */
    await page.waitForTimeout(500);
    await apri(page, '/pianificatore-uscita/?lang=en', { attesa: 500 });
    await expect(page.locator('#pia-form')).toBeVisible();
    await expect(ripresa(page, 'Draft restored')).toBeVisible();
    await expect(page.locator('[data-pia-profile="veloce"]')).toHaveAttribute('aria-checked', 'true');
    await expect(hint).toContainText('Fast');
    await expect(hint).not.toContainText('{n}');
});

/* ---------------- §6.4 piu' uscite in parallelo ---------------- */

/**
 * Cinque piani, uno per gruppo (piu' un secondo «in scadenza»):
 *   Ritardo     uscita +90, una tappa a -2 non spunta        -> gruppo 1
 *   Scadenza A  uscita +20, due tappe a +3 e +5              -> gruppo 2
 *   Scadenza B  uscita +40, una tappa a +6                   -> gruppo 2
 *   Futuro      uscita +12, tappe oltre i 7 giorni           -> gruppo 3
 *   Uscito      uscita -10, tappe passate tutte spunte       -> gruppo 4
 * Futuro esce PRIMA delle Scadenza: un ordine per sola data lo metterebbe
 * sopra; B ha l'id piu' recente: nell'ordine di prima starebbe sopra A.
 */
async function seminaCinque(page) {
    const t0 = await oggi(page);
    const g = (n) => piuGiorni(t0, n);
    const d = {};
    [90, -2, 30, 20, 3, 5, 15, -1, 40, 6, 12, 9, 10, -10, -20, 18].forEach((n) => { d[n] = g(n); });
    await modulo(page, `
        const d = arg;
        const P = (titolo, data, fatta) => ({ ...tl.nuovaPersonale(titolo, data), fatta });
        const piano = (titolo, data, tappe) => ({
            titolo, tipo: 'singolo', data, profilo: 'completa', distributore: '', note: '',
            tappe, rimosse: [], creato: '2026-09-01T10:00:00.000Z', modificato: '2026-09-01T10:00:00.000Z'
        });
        await m.scrivi('uscite', 'p1-ritardo', piano('Ritardo', d[90], [P('a', d[-2], false), P('b', d[30], false)]));
        await m.scrivi('uscite', 'p2-scadenza-a', piano('Scadenza A', d[20], [P('c', d[3], false), P('d', d[5], false), P('e', d[15], false), P('f', d[-1], true)]));
        await m.scrivi('uscite', 'p3-scadenza-b', piano('Scadenza B', d[40], [P('j', d[6], false), P('k', d[30], false)]));
        await m.scrivi('uscite', 'p4-futuro', piano('Futuro', d[12], [P('l', d[9], false), P('m', d[10], false)]));
        await m.scrivi('uscite', 'p5-uscito', piano('Uscito', d[-10], [P('g', d[-20], true), P('h', d[-10], true), P('i', d[18], false)]));
    `, d);
}

for (const [lingua, attese] of [
    ['it', ['1 in ritardo', '2 in scadenza', '1 in scadenza']],
    ['en', ['1 overdue', '2 due soon', '1 due soon']]
]) {
    test('§6.4 badge giusti e ordine ritardo -> scadenza -> futuro -> uscito (' + lingua + ')', async ({ page, spia }) => {
        await seminaCinque(page);
        await apri(page, '/pianificatore-uscita/' + (lingua === 'en' ? '?lang=en' : ''), { attesa: 800 });

        const righe = page.locator('#pia-plans-list > li.pia-plan-row');
        await expect(righe).toHaveCount(5);
        await expect(righe.locator('.pia-plan-name'))
            .toHaveText(['Ritardo', 'Scadenza A', 'Scadenza B', 'Futuro', 'Uscito']);

        for (let i = 0; i < 3; i++) await expect(righe.nth(i).locator('.pia-plan-badge')).toHaveText(attese[i]);
        await expect(righe.nth(3).locator('.pia-plan-badge'), 'badge sul piano senza scadenze').toHaveCount(0);
        await expect(righe.nth(4).locator('.pia-plan-badge'), 'badge sul piano uscito').toHaveCount(0);

        /* il badge sta nel bottone: lo legge anche lo screen reader */
        await expect(righe.nth(0).locator('.pia-plan-open')).toContainText(attese[0]);
        for (let i = 0; i < 5; i++) {
            const box = await righe.nth(i).locator('.pia-plan-open').boundingBox();
            expect(box.height, 'riga ' + i + ' sotto 44 px').toBeGreaterThanOrEqual(44);
        }
        const testo = await page.locator('#pia-plans-list').innerText();
        expect(testo, 'chiave i18n cruda nella lista').not.toMatch(/pia-(overdue|due-soon)|\{n\}/);
        nessunErroreConsole(spia);
    });
}
