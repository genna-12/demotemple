/**
 * Metronomo: la rotella, l'avvio e la memoria (audit §2.1, spec 18 §7.6).
 *
 * Il difetto: `shared/bpm-control.js:164-168` esce se il `pointerdown` cade
 * su `.met-wheel-edge` o sul valore. Col mouse non succede mai (il puntatore
 * e' un punto); col dito, il raggio di 12 px e l'aggiustamento del bersaglio
 * di Chromium agganciano quei due `<button>` invisibili molto oltre i loro
 * 44 px, e circa il 40 % della rotella non risponde. Percio' si trascina dal
 * 5 % e dal 95 % della larghezza: i due punti morti misurati nell'audit.
 */

import {
    test, expect, apri, senzaIntro, persistenza, nessunErroreConsole
} from '../fixtures.mjs';

const bpm = (page) => page.locator('#met-bpm').textContent().then((t) => Number(t.trim()));

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/metronomo/', { attesa: 500 });
});

for (const [nome, frazione, dx] of [
    ['dal bordo sinistro (5 %)', 0.05, 140],
    /* il 25 % e' il controllo: li' la rotella ha sempre funzionato, anche
       col dito. Il centro NON va usato: e' occupato dal valore, che apre
       l'editor numerico apposta (bpm-control.js:167). */
    ['da un punto qualunque (25 %)', 0.25, 140],
    ['dal bordo destro (95 %)', 0.95, -140]
]) {
    test('la rotella BPM risponde al trascinamento ' + nome, async ({ page, tocco }) => {
        const prima = await bpm(page);
        expect(prima).toBe(120);
        await tocco.trascinaDa(page.locator('#met-wheel'), frazione, dx);
        await page.waitForTimeout(600);        // l'inerzia si ferma e il valore si aggancia
        const dopo = await bpm(page);
        expect(
            Math.abs(dopo - prima),
            'la rotella non si e’ mossa partendo ' + nome + ': '
            + prima + ' -> ' + dopo + ' (un trascinamento di ' + dx + ' px vale ~'
            + Math.round(Math.abs(dx) / 8) + ' BPM)'
        ).toBeGreaterThan(4);
        /* e si e' mossa nel verso giusto */
        expect(Math.sign(dopo - prima)).toBe(Math.sign(dx));
    });
}

test('avvio e arresto', async ({ page, tocco, spia }) => {
    const toggle = page.locator('#met-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await tocco.elemento(toggle);
    await expect(toggle, 'il metronomo non e’ partito').toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(600);

    await tocco.elemento(toggle);
    await expect(toggle, 'il metronomo non si e’ fermato').toHaveAttribute('aria-pressed', 'false');
    nessunErroreConsole(spia);
});

test('i BPM sopravvivono al ricaricamento', async ({ page, tocco }) => {
    await persistenza(
        page,
        async () => {
            for (let i = 0; i < 4; i++) {
                await tocco.elemento(page.locator('[data-met-step="+5"]'));
                await page.waitForTimeout(120);
            }
            await expect(page.locator('#met-bpm')).toHaveText('140');
        },
        async (p) => Number((await p.locator('#met-bpm').textContent()).trim()),
        140
    );
});

test('battuta e suddivisione sopravvivono al ricaricamento', async ({ page, tocco }) => {
    await persistenza(
        page,
        async () => {
            await tocco.elemento(page.locator('[data-met-meter="6/8"]'));
            await page.waitForTimeout(150);
        },
        async (p) => p.locator('[data-met-meter="6/8"]').getAttribute('aria-checked'),
        'true'
    );
});
