/**
 * Aiuto in-app uniforme (spec 18 §6): shared/aiuto.js su ogni strumento.
 *
 *  - «Come funziona»: il pulsante `.tb-help` apre il foglio con le voci di
 *    `/<slug>/aiuto.js` nella lingua giusta (IT e ?lang=en); Esc lo chiude e
 *    il fuoco torna al pulsante.
 *  - Primo avvio: la riga `#tb-hint` si vede, la «×» la chiude, e dopo un
 *    ricaricamento resta chiusa (`tt.<slug>.hint`, locale: non nell'archivio).
 *  - `[data-tip]`: al dito il tocco lungo mostra il popover e NON fa
 *    l'azione, il tocco breve fa l'azione e non mostra il popover; col mouse
 *    il popover arriva con l'hover e col fuoco da tastiera, Esc lo chiude.
 *
 * L'"azione" di un pulsante si conta con un ascoltatore `click` messo dal
 * test sul pulsante stesso: e' quello che l'app ascolta.
 */

import {
    test, expect, apri, senzaIntro,
    nessunErroreConsole, nessunoScrollOrizzontale, bersagliMinimi
} from '../fixtures.mjs';

const STRUMENTI = [
    { slug: 'metronomo', percorso: '/metronomo/' },
    { slug: 'accordatore', percorso: '/accordatore/' },
    { slug: 'calcolatore-tempo', percorso: '/calcolatore-tempo/' },
    { slug: 'dna', percorso: '/dna/' },
    { slug: 'penna', percorso: '/penna/' },
    { slug: 'pianificatore-uscita', percorso: '/pianificatore-uscita/' },
    { slug: 'impostazioni', percorso: '/impostazioni/' }
];

/** I contenuti veri dello strumento, letti dal modulo che l'app importa. */
const contenuti = (page, slug) => page.evaluate(
    (s) => import('/' + s + '/aiuto.js').then((m) => m.default), slug
);

/** Il primo elemento visibile di un selettore (le pagine ne hanno anche di nascosti). */
async function primoVisibile(page, selettore) {
    const tutti = page.locator(selettore);
    const n = await tutti.count();
    for (let i = 0; i < n; i++) {
        const el = tutti.nth(i);
        if (await el.isVisible()) return el;
    }
    return null;
}

/**
 * Un punto della finestra senza niente di toccabile nel raggio di 24 px (il
 * dito di Chromium aggancia i bersagli vicini): li' un tocco non fa niente.
 */
const puntoVuoto = (page) => page.evaluate(() => {
    const COMANDI = 'button, a[href], input, select, textarea, label, summary, [role], [tabindex], [data-tip], .tb-tip';
    const R = 24;
    const libero = (x, y) => {
        for (const [dx, dy] of [[0, 0], [-R, 0], [R, 0], [0, -R], [0, R], [-R, -R], [R, R], [-R, R], [R, -R]]) {
            const el = document.elementFromPoint(x + dx, y + dy);
            if (!el || el.closest(COMANDI)) return false;
        }
        return true;
    };
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    for (let y = 120; y < h - 40; y += 20) {
        for (let x = 30; x < w - 30; x += 20) {
            if (libero(x, y)) return { x, y };
        }
    }
    return null;
});

/** Un dito fermo per `ms` (CDP), poi sollevato. */
async function toccoLungo(page, locator, ms = 700) {
    const box = await locator.boundingBox();
    expect(box, 'pulsante senza riquadro').not.toBeNull();
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height / 2);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x, y, radiusX: 12, radiusY: 12, force: 1, id: 1 }]
    });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach().catch(() => { /* niente */ });
}

/** Conta i click che arrivano al pulsante (= le volte che l'azione partirebbe). */
async function contaAzioni(locator) {
    await locator.evaluate((el) => {
        window.__azioni = 0;
        el.addEventListener('click', () => { window.__azioni += 1; });
    });
}
const azioni = (page) => page.evaluate(() => window.__azioni || 0);

/**
 * Un [data-tip] visibile il cui click NON porta via dalla pagina (un
 * collegamento cambierebbe pagina e il conteggio si perderebbe).
 */
async function pulsanteConTip(page) {
    const tutti = page.locator('button[data-tip], [role="button"][data-tip]');
    const n = await tutti.count();
    for (let i = 0; i < n; i++) {
        const el = tutti.nth(i);
        if (!(await el.isVisible())) continue;
        if (await el.isDisabled().catch(() => false)) continue;
        return el;
    }
    return null;
}

for (const s of STRUMENTI) {
    test.describe(s.slug, () => {
        for (const l of ['it', 'en']) {
            test('«Come funziona» apre le voci in ' + l + ', Esc chiude e il fuoco torna', async ({ page, tocco, spia }) => {
                await senzaIntro(page);
                await apri(page, s.percorso + (l === 'en' ? '?lang=en' : ''), { attesa: 500 });
                await expect(page.locator('html')).toHaveAttribute('lang', l);

                const help = await primoVisibile(page, '.tb-help');
                expect(help, 'nessun pulsante .tb-help visibile').not.toBeNull();
                /* etichetta visibile, non solo aria-label */
                expect((await help.innerText()).trim().length, '.tb-help senza etichetta visibile').toBeGreaterThan(2);

                const dati = await contenuti(page, s.slug);
                expect(dati[l].length, 'aiuto.js: meno di 5 voci in ' + l).toBeGreaterThanOrEqual(5);

                await tocco.elemento(help);
                const foglio = page.locator('#tb-help-sheet');
                await expect(foglio).toBeVisible();
                await expect(foglio).toHaveAttribute('role', 'dialog');
                await expect(help).toHaveAttribute('aria-expanded', 'true');
                const voci = foglio.locator('.tb-help-item');
                expect(await voci.count()).toBeGreaterThanOrEqual(5);
                await expect(voci.first().locator('.tb-help-item-title')).toHaveText(dati[l][0].t);
                await expect(voci.last().locator('.tb-help-item-title')).toHaveText(dati[l][dati[l].length - 1].t);

                /* il fuoco e' dentro il foglio */
                expect(await foglio.evaluate((f) => f.contains(document.activeElement))).toBe(true);
                await page.waitForTimeout(350); // fine dell'animazione di apertura
                await nessunoScrollOrizzontale(page);
                await bersagliMinimi(page, 44);

                await page.keyboard.press('Escape');
                await expect(foglio).toBeHidden();
                await expect(help).toHaveAttribute('aria-expanded', 'false');
                expect(await help.evaluate((b) => document.activeElement === b), 'il fuoco non e’ tornato al pulsante').toBe(true);
                nessunErroreConsole(spia);
            });
        }

        test('riga del primo avvio: si vede, la × la chiude e resta chiusa', async ({ page, tocco, spia }) => {
            await senzaIntro(page);
            await apri(page, s.percorso, { attesa: 500 });
            const dati = await contenuti(page, s.slug);
            const riga = page.locator('#tb-hint');
            await expect(riga).toBeVisible();
            await expect(riga).toContainText(dati.hint.it);
            await nessunoScrollOrizzontale(page);
            await bersagliMinimi(page, 44);

            const x = riga.locator('.tb-hint-close');
            await expect(x).toHaveAttribute('aria-label', /\S/);
            await tocco.elemento(x);
            await expect(riga).toBeHidden();
            expect(await page.evaluate((k) => localStorage.getItem(k), 'tt.' + s.slug + '.hint')).toBe('true');

            await page.waitForTimeout(300);
            await page.reload({ waitUntil: 'load' });
            await page.waitForTimeout(600);
            await expect(riga).toBeHidden();
            /* per dispositivo: non finisce nell'archivio (e quindi nemmeno nella sincronizzazione) */
            const inArchivio = await page.evaluate((k) => import('/shared/archivio.js')
                .then((a) => a.leggi('impostazioni', k)), 'tt.' + s.slug + '.hint');
            expect(inArchivio).toBeUndefined();
            nessunErroreConsole(spia);
        });

        test('tip al dito: tocco lungo mostra, tocco breve agisce', async ({ page, tocco, spia }, info) => {
            test.skip(info.project.name !== 'mobile', 'riguarda il dito');
            await senzaIntro(page);
            await apri(page, s.percorso, { attesa: 500 });
            const btn = await pulsanteConTip(page);
            test.skip(!btn, 'nessun pulsante icona con data-tip visibile su ' + s.slug);
            const chiave = await btn.getAttribute('data-tip');
            await contaAzioni(btn);
            const tip = page.locator('#tb-tip');

            await toccoLungo(page, btn);
            await expect(tip).toBeVisible();
            const testo = (await tip.innerText()).trim();
            expect(testo.length).toBeGreaterThan(0);
            expect(testo, 'il tip mostra la chiave, non la traduzione').not.toBe(chiave);
            await page.waitForTimeout(300);
            expect(await azioni(page), 'il tocco lungo ha fatto partire l’azione').toBe(0);
            await nessunoScrollOrizzontale(page);

            /* un tocco fuori lo chiude: in un punto vuoto, lontano da ogni comando */
            const vuoto = await puntoVuoto(page);
            expect(vuoto, 'nessun punto vuoto dove toccare').not.toBeNull();
            await tocco.punto(vuoto.x, vuoto.y);
            await expect(tip).toBeHidden();
            expect(await azioni(page)).toBe(0);

            /* di nuovo, e stavolta Esc */
            await toccoLungo(page, btn);
            await expect(tip).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(tip).toBeHidden();

            /* tocco breve: l'azione parte, il tip no */
            await tocco.elemento(btn);
            await page.waitForTimeout(600);
            expect(await azioni(page), 'il tocco breve non ha fatto l’azione').toBe(1);
            await expect(tip).toBeHidden();
            nessunErroreConsole(spia);
        });

        test('tip col mouse e con la tastiera', async ({ page, spia }, info) => {
            test.skip(info.project.name !== 'desktop', 'riguarda mouse e tastiera');
            await senzaIntro(page);
            await apri(page, s.percorso, { attesa: 500 });
            const btn = await pulsanteConTip(page);
            test.skip(!btn, 'nessun pulsante icona con data-tip visibile su ' + s.slug);
            await contaAzioni(btn);
            const tip = page.locator('#tb-tip');

            await btn.hover();
            await expect(tip).toBeVisible();
            await expect(btn).toHaveAttribute('aria-describedby', /tb-tip/);
            await nessunoScrollOrizzontale(page);
            await page.mouse.move(2, 2);
            await expect(tip).toBeHidden();

            /* col fuoco da tastiera; Esc lo chiude senza spostare il fuoco */
            await page.keyboard.press('Shift');
            await btn.focus();
            await expect(tip).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(tip).toBeHidden();
            expect(await btn.evaluate((b) => document.activeElement === b)).toBe(true);
            await btn.blur();

            /* il click col mouse e' l'azione */
            await btn.click();
            expect(await azioni(page)).toBe(1);
            nessunErroreConsole(spia);
        });
    });
}
