/**
 * Calcolatore «completo» (spec 22): criteri §6.5-6, mobile e desktop.
 *
 *   §6.5 ogni .calc-cell ha l'icona di copia (<svg><use href="#tb-icon-copy">),
 *        a 0,6 di opacita'; un tocco copia il valore (navigator.clipboard
 *        finto), la cella ha .is-copied per meno di 1 s, compare il toast;
 *        celle >= 44 px, nessuno scroll orizzontale a 390 px
 *   §6.6 cambiando scheda la riga che dice a cosa serve (la `.calc-intro`
 *        del pannello, UNA sola visibile: niente #calc-tab-hint in piu')
 *        cambia testo, IT ed EN
 */

import {
    test, expect, apri, senzaIntro, nessunoScrollOrizzontale, nessunErroreConsole
} from '../fixtures.mjs';

const TABS = ['delay', 'note', 'sidechain'];
/* i testi di `calc-intro-<scheda>` in calcolatore-tempo/i18n.js */
const INTRO = {
    it: {
        delay: 'Trova i tempi di delay e riverbero a tempo col brano.',
        note: 'Converti una nota in frequenza per lavorare con l’EQ.',
        sidechain: 'Imposta LFO e sidechain a tempo.'
    },
    en: {
        delay: 'Find delay and reverb times that lock to the track.',
        note: 'Convert a note to a frequency to work with the EQ.',
        sidechain: 'Set LFO and sidechain timing to the beat.'
    }
};

/* l'apostrofo dell'IT puo' essere dritto o tipografico: si confronta senza */
const piano = (s) => String(s || '').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

const scheda = (page, tab) => page.locator('#calc-tabs [data-calc-tab="' + tab + '"]');
const celleVisibili = (page) => page.locator('.calc-cell:visible');

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    /* appunti finti: il valore copiato finisce in window.__copiato */
    await page.addInitScript(() => {
        window.__copiato = null;
        try {
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: (s) => { window.__copiato = String(s); return Promise.resolve(); } }
            });
        } catch (e) { /* niente */ }
    });
    await apri(page, '/calcolatore-tempo/', { attesa: 500 });
});

test('§6.5 ogni .calc-cell ha l’icona di copia, decorativa e a 0,6', async ({ page, spia }) => {
    await expect(page.locator('symbol#tb-icon-copy'), 'manca il simbolo nello sprite').toHaveCount(1);
    const celle = page.locator('.calc-cell');
    const quante = await celle.count();
    expect(quante).toBeGreaterThan(10);
    await expect(page.locator('.calc-cell svg[aria-hidden="true"] use[href="#tb-icon-copy"]')).toHaveCount(quante);

    /* l'icona non si porta via il nome: l'aria-label dice ancora «copia» */
    const aria = await celle.first().getAttribute('aria-label');
    expect(aria).toMatch(/copia/i);
    expect(await celle.first().getAttribute('title'), 'title= come unico segnale').toBeNull();

    const icona = page.locator('.calc-cell[data-calc-div="4"][data-calc-mod="straight"] svg');
    await expect.poll(() => icona.evaluate((el) => Number(getComputedStyle(el).opacity)))
        .toBeCloseTo(0.6, 1);
    nessunErroreConsole(spia);
});

for (const tab of ['delay', 'sidechain']) {
    test('§6.5 tocco su una cella (' + tab + '): appunti, .is-copied < 1 s, toast', async ({ page, tocco, spia }) => {
        await tocco.elemento(scheda(page, tab));
        await page.waitForTimeout(200);
        const cella = tab === 'delay'
            ? page.locator('.calc-cell[data-calc-div="4"][data-calc-mod="straight"]')
            : celleVisibili(page).first();
        await expect(cella).toBeVisible();
        const valore = piano(await cella.innerText());
        if (tab === 'delay') expect(valore).toBe('500,00');        // 1/4 a 120 BPM

        await tocco.elemento(cella);
        await expect.poll(() => page.evaluate(() => window.__copiato)).toBe(valore);
        await expect(cella).toHaveClass(/\bis-copied\b/);
        await expect(page.locator('.tb-toast').first()).toBeVisible();
        await expect.poll(
            () => cella.locator('svg').evaluate((el) => Number(getComputedStyle(el).opacity)),
            { message: 'l’icona non diventa piena dopo la copia', timeout: 700 }
        ).toBeGreaterThan(0.95);
        await expect(cella, '.is-copied dura troppo').not.toHaveClass(/\bis-copied\b/, { timeout: 1000 });
        nessunErroreConsole(spia);
    });
}

test('§6.5 celle >= 44 px e nessuno scroll orizzontale, in ogni scheda', async ({ page, tocco }) => {
    for (const tab of TABS) {
        await tocco.elemento(scheda(page, tab));
        await page.waitForTimeout(250);
        const piccole = await celleVisibili(page).evaluateAll((els) => els
            .map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, t: el.textContent.trim() }; })
            .filter((r) => r.w + 0.5 < 44 || r.h + 0.5 < 44)
            .map((r) => r.t + ' ' + Math.round(r.w) + 'x' + Math.round(r.h)));
        expect(piccole, 'celle sotto 44 px nella scheda ' + tab).toEqual([]);
        await nessunoScrollOrizzontale(page);
    }
});

for (const lingua of ['it', 'en']) {
    test('§6.6 la riga della scheda segue la scheda (' + lingua + '), una sola', async ({ page, tocco, spia }) => {
        if (lingua === 'en') await apri(page, '/calcolatore-tempo/?lang=en', { attesa: 500 });
        await expect(page.locator('#calc-tab-hint'), 'riga doppia: #calc-tab-hint ripete la .calc-intro').toHaveCount(0);
        const intro = page.locator('.calc-intro:visible');
        for (const tab of ['note', 'sidechain', 'delay']) {
            await tocco.elemento(scheda(page, tab));
            await expect(intro).toHaveCount(1);
            await expect.poll(async () => piano(await intro.textContent())).toBe(piano(INTRO[lingua][tab]));
        }
        nessunErroreConsole(spia);
    });
}
