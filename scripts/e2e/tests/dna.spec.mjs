/**
 * DNA del brano: l'errore che non deve svuotare la pagina, e l'analisi che
 * deve dare il numero giusto (audit §2.2, spec 18 §7.7).
 *
 * Il difetto: `dna/dna.js:317` nasconde ogni sezione che non sia lo stato
 * corrente, e `fail()` (337-340) porta allo stato `error`. Con un file
 * illeggibile restano il titolo e «Formato non letto»: spariscono «Scegli
 * file», «Registra», la zona di rilascio e tutto lo storico. Chi ha sbagliato
 * file si ritrova davanti una pagina vuota e non ha nemmeno come riprovare.
 *
 * Il brano di prova e' `fixtures/prova-120.wav`: 40 secondi a 120 BPM in do
 * maggiore, generati con lo stesso sintetizzatore del banco `scripts/eval-dna`
 * (mono 22 050 Hz, 1,7 MB: sta nel repository senza appesantirlo).
 */

import { fileURLToPath } from 'node:url';
import { test, expect, apri, senzaIntro } from '../fixtures.mjs';

const file = (nome) => fileURLToPath(new URL('../fixtures/' + nome, import.meta.url));

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/dna/', { attesa: 500 });
});

test('un file che non si legge non svuota la pagina', async ({ page }) => {
    await expect(page.locator('#dna-drop')).toBeVisible();

    await page.locator('#dna-file').setInputFiles(file('finto.mp3'));
    await page.waitForTimeout(2500);

    /* 1) l'errore si vede */
    const messaggio = await page.evaluate(() => {
        const nodi = [...document.querySelectorAll('#dna-error, #dna-status, [role="status"], [role="alert"]')];
        return nodi.filter((el) => {
            if (el.hasAttribute('hidden')) return false;
            const s = getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && el.textContent.trim();
        }).map((el) => el.textContent.trim()).join(' | ');
    });
    expect(messaggio, 'nessun messaggio d’errore visibile').not.toBe('');

    /* 2) ...e la pagina resta usabile: si puo' riprovare subito */
    await expect(
        page.locator('#dna-drop'),
        'la zona di rilascio e i pulsanti sono spariti: non si puo’ riprovare'
    ).toBeVisible();
    await expect(page.locator('label[for="dna-file"]')).toBeVisible();
    await expect(
        page.locator('#dna-history'),
        '«Recenti» e’ sparito insieme al resto'
    ).toBeVisible();
});

test('un brano a 120 BPM viene letto a 120 BPM', async ({ page }) => {
    test.setTimeout(120000);

    await page.locator('#dna-file').setInputFiles(file('prova-120.wav'));

    await expect(page.locator('#dna-result')).toBeVisible({ timeout: 90000 });
    const bpm = Number((await page.locator('#dna-bpm').textContent()).trim().replace(',', '.'));
    expect(bpm, 'BPM letto: ' + bpm).toBeGreaterThanOrEqual(118);
    expect(bpm, 'BPM letto: ' + bpm).toBeLessThanOrEqual(122);
});

test('l’analisi finisce nello storico e lo storico sopravvive', async ({ page }) => {
    test.setTimeout(120000);

    await page.locator('#dna-file').setInputFiles(file('prova-120.wav'));
    await expect(page.locator('#dna-result')).toBeVisible({ timeout: 90000 });
    await page.waitForTimeout(600);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await expect(page.locator('#dna-drop')).toBeVisible();
    await expect(
        page.locator('#dna-history li'),
        'l’analisi non e’ finita in «Recenti»'
    ).toHaveCount(1);
});
