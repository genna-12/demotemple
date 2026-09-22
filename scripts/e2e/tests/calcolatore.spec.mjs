/**
 * Calcolatore di tempo: la stessa rotella del Metronomo, lo stesso difetto
 * (audit §2.1, spec 18 §7.6) - `shared/bpm-control.js` e' un modulo solo, e
 * i due `<button>` invisibili `.tb-wheel-edge` stanno anche qui
 * (`calcolatore-tempo/index.html:250-251`).
 *
 * Piu' le cose che devono continuare a funzionare: la tabella che si
 * ricalcola e la scheda scelta che sopravvive al ricaricamento.
 */

import {
    test, expect, apri, senzaIntro, persistenza, nessunErroreConsole
} from '../fixtures.mjs';

const bpm = (page) => page.locator('#calc-bpm').textContent().then((t) => Number(t.trim()));

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/calcolatore-tempo/', { attesa: 500 });
});

for (const [nome, frazione, dx] of [
    ['dal bordo sinistro (5 %)', 0.05, 140],
    ['da un punto qualunque (25 %)', 0.25, 140],
    ['dal bordo destro (95 %)', 0.95, -140]
]) {
    test('la rotella BPM risponde al trascinamento ' + nome, async ({ page, tocco }) => {
        const prima = await bpm(page);
        expect(prima).toBe(120);
        await tocco.trascinaDa(page.locator('#calc-wheel'), frazione, dx);
        await page.waitForTimeout(600);
        const dopo = await bpm(page);
        expect(
            Math.abs(dopo - prima),
            'la rotella non si e’ mossa partendo ' + nome + ': ' + prima + ' -> ' + dopo
        ).toBeGreaterThan(4);
        expect(Math.sign(dopo - prima)).toBe(Math.sign(dx));
    });
}

test('cambiando i BPM la tabella si ricalcola', async ({ page, tocco, spia }) => {
    const cella = page.locator('.calc-cell[data-calc-div="4"][data-calc-mod="straight"]');
    await expect(cella).toHaveText('500,00');          // 1/4 a 120 BPM
    /* il ±1 dei bordi non e' piu' un <button> nel markup (spec 18 §7.6: i
       due `.tb-wheel-edge` invisibili erano meta' del problema): e' una zona
       della rotella, e vale solo a dito fermo. Un tap secco nell'ultimo
       tratto a destra della rotella fa +1. */
    const rotella = await page.locator('#calc-wheel').boundingBox();
    await tocco.punto(rotella.x + rotella.width - 12, rotella.y + rotella.height / 2);
    await page.waitForTimeout(250);
    await expect(page.locator('#calc-bpm')).toHaveText('121');
    await expect(cella).not.toHaveText('500,00');
    nessunErroreConsole(spia);
});

test('la scheda scelta sopravvive al ricaricamento', async ({ page, tocco }) => {
    await persistenza(
        page,
        async () => {
            await tocco.elemento(page.locator('[data-calc-tab="sidechain"]'));
            await page.waitForTimeout(200);
        },
        async (p) => p.locator('#calc').getAttribute('data-calc-tab'),
        'sidechain'
    );
});
