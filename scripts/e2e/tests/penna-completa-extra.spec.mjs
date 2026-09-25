/**
 * Penna completa (spec 19): difetti trovati dal validator, un test per
 * difetto. Rossi finche' il difetto c'e'.
 *
 *   1. Prova, wake lock: si esce dalla prova PRIMA che la richiesta del
 *      wake lock abbia risposto (su iPhone la risposta non e' istantanea):
 *      il sentinel arriva dopo il rilascio e resta acceso per sempre,
 *      cioe' lo schermo resta sempre acceso anche nell'editor
 *      (shared/ui.js wakeLock: `await request()` senza ricontrollare).
 */

import { test, expect, apri, senzaIntro } from '../fixtures.mjs';

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

test('Prova: uscendo subito il wake lock non resta acceso', async ({ page }) => {
    await page.addInitScript(() => {
        window.__wl = { accesi: 0 };
        const lock = {
            /* una richiesta che risponde dopo 300 ms, come un telefono lento */
            request: () => new Promise((ok) => setTimeout(() => {
                window.__wl.accesi++;
                const s = new EventTarget();
                s.released = false;
                s.release = async () => {
                    if (s.released) return;
                    s.released = true;
                    window.__wl.accesi--;
                };
                ok(s);
            }, 300))
        };
        Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => lock });
    });
    await apri(page, '/penna/', { attesa: 300 });
    await page.evaluate(async () => {
        const m = await import('/shared/archivio.js');
        await m.scrivi('penna', 'canto-wl', {
            titolo: 'Palco', testo: 'Primo verso\nSecondo verso', creato: new Date().toISOString(),
            modificato: new Date().toISOString(), dialefe: {}, lingua: 'it', emuet: false
        });
    });
    await apri(page, '/penna/#t=canto-wl', { attesa: 500 });
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');

    await page.locator('#pen-prova-open').click();
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'prova');
    await page.keyboard.press('Escape');
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__wl.accesi), 'wake lock ancora acceso nell’editor').toBe(0);
});
