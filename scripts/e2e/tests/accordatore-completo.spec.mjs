/**
 * Accordatore «completo» (spec 21): criteri del §6 per A, mobile e desktop.
 *
 * Ultima corda: preferenza LOCALE `tt.accordatore.corda` = { <strumento o
 * custom:<id>>: indice }. Si riprende solo in Riferimento e senza suonare:
 * lo dice una spia su `AudioScheduledSourceNode.prototype.start`.
 * Niente microfono (come accordatore.spec.mjs): #tb-mic-live si mostra a
 * mano per provarne il tip.
 */

import {
    test, expect, apri, senzaIntro, BASE, bersagliMinimi, nessunoScrollOrizzontale, nessunErroreConsole
} from '../fixtures.mjs';

/** Esegue `corpo` nella pagina con `m` = archivio, `s` = sync, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

/** Sceglie uno strumento dal `.tb-select` migliorato (come accordatore.spec.mjs). */
async function scegli(page, tocco, valore) {
    await tocco.elemento(page.locator('#acc-instrument-trigger'));
    const opzione = page.locator('#acc-instrument-panel [data-value="' + valore + '"]');
    await expect(opzione).toBeVisible();
    await page.waitForTimeout(450);   // il foglio sotto i 480 px sta ancora salendo
    await tocco.elemento(opzione);
    await page.waitForTimeout(350);
}

const corde = (page) => page.evaluate(() => {
    const v = window.localStorage.getItem('tt.accordatore.corda');
    return v === null ? null : JSON.parse(v);
});
const corda = (page, i) => page.locator('#acc-strings [data-acc-string="' + i + '"]');
const avvii = (page) => page.evaluate(() => window.__avvii);

/** Conta le partenze di ogni sorgente audio (oscillatori, buffer): da installare prima del caricamento. */
async function spia(page) {
    await page.addInitScript(() => {
        window.__avvii = 0;
        const P = window.AudioScheduledSourceNode && window.AudioScheduledSourceNode.prototype;
        if (!P) return;
        const orig = P.start;
        P.start = function (...a) { window.__avvii += 1; return orig.apply(this, a); };
    });
}

async function ricarica(page, attesa = 500) {
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(attesa);
}

/** Nuova accordatura dall'editor: nome e prima corda in D. -> valore del select (custom:<id>). */
async function creaDallEditor(page, tocco, nome) {
    await scegli(page, tocco, '__custom__');
    await expect(page.locator('#acc-custom')).toBeVisible();
    await page.locator('#acc-custom-name').fill(nome);
    await tocco.elemento(page.locator('#acc-custom-strings [data-acc-row="0"] [data-acc-note="D"]'));
    await tocco.elemento(page.locator('#acc-custom-save'));
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'custom');
    const valore = await page.locator('#acc-instrument').inputValue();
    expect(valore).toMatch(/^custom:c\d+$/);
    return valore;
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/accordatore/', { attesa: 500 });
});

/* ---------------- §6.10 ultima corda ---------------- */

test('§6.10 corda 3 -> reload -> .is-target senza suono; basso 4 e ritorno -> corda 3; in Ascolto non scrive', async ({ page, tocco, spia: sp }) => {
    await spia(page);
    await ricarica(page);
    await tocco.elemento(corda(page, 3));
    await expect(corda(page, 3)).toHaveClass(/is-target/);
    expect(await corde(page)).toEqual({ guitar: 3 });

    await ricarica(page, 700);
    await expect(corda(page, 3)).toHaveClass(/is-target/);
    expect(await avvii(page), 'la corda ricordata ha suonato da sola').toBe(0);

    await scegli(page, tocco, 'bass4');
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'bass4');
    await expect(page.locator('#acc-strings .is-target')).toHaveCount(0);
    await scegli(page, tocco, 'guitar');
    await expect(corda(page, 3)).toHaveClass(/is-target/);
    expect(await avvii(page)).toBe(0);

    await tocco.elemento(page.locator('#acc-mode [data-acc-mode="listen"]'));
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-mode', 'listen');
    await tocco.elemento(corda(page, 1));
    await page.waitForTimeout(200);
    expect(await corde(page), 'in Ascolto il tocco ha scritto la corda').toEqual({ guitar: 3 });
    nessunErroreConsole(sp);
});

/* ---------------- §6.11 accordatura personalizzata, due contesti ---------------- */

test('§6.11 «Open G» dall’editor resta scelta; su 2 c’e’; eliminata su 2 -> sparisce da 1, Chitarra, chiave tolta', async ({ page, tocco, browser }) => {
    test.setTimeout(90000);
    const valore = await creaDallEditor(page, tocco, 'Open G');
    const id = valore.slice('custom:'.length);
    await tocco.elemento(corda(page, 2));
    expect(await corde(page)).toEqual({ [valore]: 2 });
    await expect.poll(() => modulo(page, 'return !!(await m.leggi(\'accordature\', arg));', id)).toBe(true);

    await ricarica(page);
    await expect(page.locator('#acc-instrument')).toHaveValue(valore);
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'custom');
    await expect(corda(page, 2)).toHaveClass(/is-target/);

    const contesto = await browser.newContext({ locale: 'it-IT' });
    const due = await contesto.newPage();
    await due.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await due.addInitScript(() => { try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ } });
    try {
        const codice = await modulo(page, 'const c = await s.creaCodice(); await s.collega(c); return c;');
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');

        await apri(due, BASE + '/accordatore/', { attesa: 400 });
        await modulo(due, 'await s.collega(arg); await s.sincronizza();', codice);
        await expect(due.locator('#acc-instrument option[value="' + valore + '"]')).toHaveCount(1);
        await expect(due.locator('#acc-instrument option[value="' + valore + '"]')).toHaveText('Open G');

        await modulo(due, 'await m.elimina(\'accordature\', arg); await s.sincronizza();', id);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await expect(page.locator('#acc-instrument option[value="' + valore + '"]')).toHaveCount(0);
        await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'guitar');
        await expect.poll(() => corde(page)).toEqual({});
    } finally {
        await contesto.close();
    }
});

/* ---------------- §6.12 limite, nome lungo, tastiera ---------------- */

test('§6.12 200 accordature -> limite nell’editor', async ({ page, tocco }) => {
    test.setTimeout(90000);
    const voci = Array.from({ length: 200 }, (_, i) => ({
        id: 'c' + (1600000000000 + i),
        dati: { name: 'T' + i, strings: [{ note: 'E', oct: 2 }, { note: 'A', oct: 2 }, { note: 'D', oct: 3 }] }
    }));
    await modulo(page, 'for (const v of arg) await m.scrivi(\'accordature\', v.id, v.dati);', voci);
    await ricarica(page, 1000);
    await expect(page.locator('#acc-instrument option[value^="custom:"]')).toHaveCount(200);
    await scegli(page, tocco, '__custom__');
    await expect(page.locator('#acc-custom')).toBeVisible();
    await tocco.elemento(page.locator('#acc-custom-save'));
    await expect(page.locator('#acc-custom-error')).toBeVisible();
    await expect(page.locator('#acc-custom-error')).toContainText('massimo');
    await expect(page.locator('#acc-instrument option[value^="custom:"]')).toHaveCount(200);
});

test('§6.12 nome di 24 caratteri a 390 px senza scroll orizzontale; a 390×420 «Salva» raggiungibile', async ({ page, tocco }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const nome = 'MMMMMMMMMMMM WWWWWWWWWWW';   // 24 caratteri, i piu' larghi
    expect(nome).toHaveLength(24);
    await creaDallEditor(page, tocco, nome);
    await expect(page.locator('#acc-instrument-trigger .tb-select-value')).toHaveText(nome);
    await nessunoScrollOrizzontale(page);

    await page.setViewportSize({ width: 390, height: 420 });   // tastiera aperta
    await page.waitForTimeout(200);
    await tocco.elemento(page.locator('#acc-custom-edit'));
    await expect(page.locator('#acc-custom')).toBeVisible();
    await page.locator('#acc-custom-name').focus();
    const salva = page.locator('#acc-custom-save');
    await salva.scrollIntoViewIfNeeded();
    const box = await salva.boundingBox();
    expect(box, '#acc-custom-save senza riquadro').not.toBeNull();
    expect(box.y, '«Salva» sopra lo schermo').toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, '«Salva» sotto lo schermo a 390×420').toBeLessThanOrEqual(420);
    await tocco.elemento(salva);
    await expect(page.locator('#acc-custom')).toBeHidden();
    await nessunoScrollOrizzontale(page);
});

/* ---------------- §6.13 lingua, tip, bersagli ---------------- */

test('§6.13 ?lang=en completo, tip su #tb-mic-live, bersagli ≥ 44 px', async ({ page, tocco }) => {
    await apri(page, '/accordatore/?lang=en', { attesa: 500 });
    await expect(page.locator('#acc-mode [data-acc-mode="listen"]')).toHaveText('Listen');
    await expect(page.locator('#acc-instrument option[value="__custom__"]')).toHaveText('Make your own tuning…');
    await expect(page.locator('#acc-instrument-panel [data-value="__custom__"]')).toContainText('Make your own tuning…');

    const live = page.locator('#tb-mic-live');
    await expect(live).toHaveAttribute('tabindex', '0');
    await expect(live).toHaveAttribute('data-tip', 'acc-mic-live-tip');
    await page.evaluate(() => { document.getElementById('tb-mic-live').hidden = false; });   // come con il microfono acceso
    const box = await live.boundingBox();
    expect(box, '#tb-mic-live senza riquadro').not.toBeNull();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    if (tocco.mobile) await tocco.trascina(x, y, x, y, 32);
    else { await page.mouse.move(x, y); await page.waitForTimeout(600); }
    await expect(page.locator('.tb-tip')).toBeVisible();
    await expect(page.locator('.tb-tip')).toHaveText('Mic on: audio stays on this device');
    if (!tocco.mobile) await page.mouse.move(2, 2);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.getElementById('tb-mic-live').hidden = true; });

    await bersagliMinimi(page);
    await nessunoScrollOrizzontale(page);
});
