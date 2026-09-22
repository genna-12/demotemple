/**
 * Accordatore: lo strumento scelto e l'accordatura di riferimento restano.
 *
 * Niente microfono: il permesso e' un gesto esplicito dell'utente (CLAUDE.md,
 * spec 11) e in un test finirebbe per provare il browser, non l'app. Qui si
 * prova la meta' che vive senza permessi: la scelta dello strumento, le corde
 * che ne discendono e il riferimento A4 - tutte cose che devono sopravvivere
 * al ricaricamento, perche' chi accorda una chitarra ci torna ogni giorno.
 *
 * Nell'elenco c'e' anche un difetto di etichetta: `#acc-instrument` senza
 * `aria-label` (spec 18 §7.10). Lo si verifica qui, che e' casa sua.
 */

import {
    test, expect, apri, senzaIntro, persistenza, nessunErroreConsole
} from '../fixtures.mjs';

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/accordatore/', { attesa: 500 });
});

/** Sceglie uno strumento dal `.tb-select` migliorato (pillola + pannello). */
async function scegli(page, tocco, valore) {
    await tocco.elemento(page.locator('#acc-instrument-trigger'));
    const opzione = page.locator('#acc-instrument-panel [data-value="' + valore + '"]');
    await expect(opzione).toBeVisible();
    /* sotto i 480 px il pannello e' un foglio che sale da sotto
       (shared/select.js, SHEET_MAX): prima che smetta di muoversi, il centro
       dell'opzione non e' dove sembra */
    await page.waitForTimeout(450);
    await tocco.elemento(opzione);
    await page.waitForTimeout(350);
}

test('lo strumento scelto sopravvive al ricaricamento', async ({ page, tocco, spia }) => {
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'guitar');

    await persistenza(
        page,
        async () => {
            await scegli(page, tocco, 'dadgad');
            await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'dadgad');
        },
        async (p) => p.locator('#acc').getAttribute('data-acc-instrument'),
        'dadgad'
    );
    nessunErroreConsole(spia);
});

test('cambiando strumento cambiano le corde mostrate', async ({ page, tocco }) => {
    const corde = page.locator('#acc-strings button, #acc-strings .acc-string');
    const chitarra = (await corde.allTextContents()).join(' ').replace(/\s+/g, ' ').trim();
    expect(chitarra.length, '#acc-strings e’ vuoto: le corde non sono state costruite').toBeGreaterThan(0);

    await scegli(page, tocco, 'ukulele');
    await expect(page.locator('#acc')).toHaveAttribute('data-acc-instrument', 'ukulele');
    const ukulele = (await corde.allTextContents()).join(' ').replace(/\s+/g, ' ').trim();
    expect(ukulele, 'le corde non sono cambiate cambiando strumento').not.toBe(chitarra);
});

test('il riferimento A4 sopravvive al ricaricamento', async ({ page }) => {
    await persistenza(
        page,
        async (p) => {
            await p.locator('#acc-a4').focus();
            for (let i = 0; i < 2; i++) await p.keyboard.press('ArrowRight');
            await expect(p.locator('#acc-a4-value')).toHaveText('442 Hz');
        },
        async (p) => (await p.locator('#acc-a4-value').textContent()).trim(),
        '442 Hz'
    );
});

test('la scelta dello strumento ha un nome accessibile (spec 18 §7.10)', async ({ page }) => {
    const nome = await page.locator('#acc-instrument').evaluate((el) => {
        const aria = el.getAttribute('aria-label');
        if (aria && aria.trim()) return aria.trim();
        const by = el.getAttribute('aria-labelledby');
        if (by) {
            const rif = document.getElementById(by);
            if (rif && rif.textContent.trim()) return rif.textContent.trim();
        }
        const lab = el.id ? document.querySelector('label[for="' + el.id + '"]') : null;
        if (lab && lab.textContent.trim()) return lab.textContent.trim();
        const dentro = el.closest('label');
        return dentro && dentro.textContent.trim() ? dentro.textContent.trim() : '';
    });
    expect(nome, '#acc-instrument non ha nome: chi usa uno screen reader sente solo "menu"').not.toBe('');
});
