/**
 * Sincronizzazione generalizzata: i difetti trovati dalla validazione del
 * giro 3 (spec 18 §4, spec 17 §4/§6). Ogni test fallisce sul codice di oggi
 * e deve passare dopo la correzione.
 *
 *   una collezione piena sul server ferma la RICEZIONE di tutte le altre
 *     (precondizione riscritta dall'implementer: con le lapidi fuori dal
 *     tetto la collezione si riempie con documenti vivi, e con le
 *     preferenze, che hanno il tetto piu' basso)
 *   le lapidi di documenti nuovi scavalcano il tetto per collezione
 *   una voce del DNA potata (cancellazione dura) torna dal server al giro dopo
 *   un salvataggio offline lascia un errore di rete in console
 *   "Scollega ed elimina" durante un giro: il giro in volo riscrive il quaderno
 */

import { test, expect, apri, senzaIntro, BASE } from '../fixtures.mjs';

function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

async function dispositivo(browser) {
    const contesto = await browser.newContext({ locale: 'it-IT' });
    const page = await contesto.newPage();
    await page.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await page.addInitScript(() => {
        try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ }
    });
    return { contesto, page };
}

/** `n` lapidi di documenti mai visti, in lotti da 20, direttamente sul server. */
function lapidiFinte(page, id, coll, n) {
    return page.evaluate(async ({ id, coll, n }) => {
        const stati = [];
        for (let i = 0; i < n; i += 20) {
            const voci = [];
            for (let k = i; k < Math.min(n, i + 20); k++) {
                voci.push({ doc: (0xf000000 + k).toString(16).padStart(16, '0'), aggiornato: 1, cancellato: 1 });
            }
            const r = await fetch('/api/quaderno/' + id + '/' + coll, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voci })
            });
            stati.push(r.status);
        }
        return stati;
    }, { id, coll, n });
}

/** `n` documenti VIVI finti (blob illeggibile), in lotti da 20, direttamente sul server. */
function vociFinte(page, id, coll, n) {
    return page.evaluate(async ({ id, coll, n }) => {
        const stati = [];
        for (let i = 0; i < n; i += 20) {
            const voci = [];
            for (let k = i; k < Math.min(n, i + 20); k++) {
                voci.push({ doc: (0xe000000 + k).toString(16).padStart(16, '0'), aggiornato: Date.now(), blob: 'QUJD' });
            }
            const r = await fetch('/api/quaderno/' + id + '/' + coll, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voci })
            });
            stati.push(r.status);
        }
        return stati;
    }, { id, coll, n });
}

const righe = (page, id, coll) => page.evaluate(async ({ id, coll }) => {
    const r = await fetch('/api/quaderno/' + id);
    return (await r.json()).voci.filter((v) => v.collezione === coll).length;
}, { id, coll });

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

test('una collezione piena sul server non ferma la ricezione delle altre', async ({ page, browser }) => {
    test.setTimeout(120000);
    const altro = await dispositivo(browser);
    try {
        await apri(page, '/impostazioni/');
        await apri(altro.page, BASE + '/impostazioni/');
        const codice = await modulo(page, 'return await s.creaCodice();');
        const id = await modulo(page, 'await s.collega(arg); return s.stato().id;', codice);
        await modulo(altro.page, 'await s.collega(arg);', codice);

        /* B manda un'accordatura */
        expect(await modulo(altro.page, `
            await m.scrivi('accordature', 'c1', { name: 'Da B', strings: [] });
            return (await s.sincronizza()).esito;`)).toBe('ok');

        /* le preferenze arrivano al tetto (50 documenti VIVI: le lapidi non
           contano piu' e si potano, spec 18 §4 dopo la validazione); A ne
           scrive una nuova, che non entra */
        await vociFinte(page, id, 'impostazioni', 50);
        const esito = await modulo(page, `
            await m.impostaPref('tt.shared.a4', 443);
            return (await s.sincronizza()).esito;`);
        expect(esito).toBe('pieno');

        /* la preferenza resta fuori, ma l'accordatura di B deve arrivare lo stesso */
        const acc = await modulo(page, 'return (await m.elenca(\'accordature\')).map((r) => r.id);');
        expect(acc, 'Penna piena ha fermato anche la ricezione delle accordature').toContain('c1');
    } finally {
        await altro.contesto.close();
    }
});

test('le lapidi di documenti nuovi non scavalcano il tetto della collezione', async ({ page }) => {
    await apri(page, '/impostazioni/');
    const id = 'e'.repeat(31) + '1';
    /* accordature: tetto 200 (limiti.js); 220 lapidi di documenti mai visti */
    await lapidiFinte(page, id, 'accordature', 220);
    expect(await righe(page, id, 'accordature'), 'righe oltre il tetto della collezione').toBeLessThanOrEqual(200);
    await page.evaluate((id) => fetch('/api/quaderno/' + id, { method: 'DELETE' }), id);
});

test('una voce del DNA potata in locale non torna dal server', async ({ page }) => {
    await apri(page, '/impostazioni/');
    const codice = await modulo(page, 'return await s.creaCodice();');
    await modulo(page, 'await s.collega(arg);', codice);
    await modulo(page, `
        await m.scrivi('dna', '1700000000001', { name: 'vecchia', bpm: 120 });
        await s.sincronizza();
        /* la potatura automatica di dna.js oltre le 200 voci: niente lapide */
        await m.elimina('dna', '1700000000001', { lapide: false });`);
    const dopo = await modulo(page, 'await s.sincronizza(); return (await m.elenca(\'dna\')).map((r) => r.id);');
    expect(dopo, 'la voce potata e\' tornata dal server').toEqual([]);
});

test('un salvataggio offline non lascia errori in console', async ({ page, spia }) => {
    await apri(page, '/impostazioni/');
    const codice = await modulo(page, 'return await s.creaCodice();');
    await modulo(page, 'await s.collega(arg); await s.sincronizza();', codice);
    spia.azzera();
    await page.context().setOffline(true);
    await modulo(page, 'await m.scrivi(\'uscite\', \'off1\', { titolo: \'offline\' });');
    /* il giro "3 s dopo l'ultimo salvataggio" */
    await page.waitForTimeout(4500);
    expect(await modulo(page, 'return s.stato().esito;')).toBe('offline');
    expect(spia.filtrati()).toEqual([]);
    await page.context().setOffline(false);
});

test('"Scollega ed elimina" durante un giro: niente righe ricreate dopo', async ({ page }) => {
    await apri(page, '/impostazioni/');
    /* una rete lenta: il lotto dei testi parte, ma arriva dopo il DELETE */
    await page.route('**/api/quaderno/*/penna', async (route) => {
        await new Promise((r) => setTimeout(r, 400));
        await route.continue();
    });
    await modulo(page, `for (let i = 0; i < 20; i++) await m.scrivi('penna', 't' + i,
        { titolo: 'T' + i, testo: 'x', modificato: new Date().toISOString() });`);
    const codice = await modulo(page, 'return await s.creaCodice();');
    const id = await modulo(page, 'await s.collega(arg); return s.stato().id;', codice);
    const corsa = modulo(page, 'await s.sincronizza();');
    await page.waitForTimeout(250);
    await modulo(page, 'await s.scollega({ elimina: true });');
    await corsa;
    await page.waitForTimeout(500);
    expect(await righe(page, id, 'penna'), 'il giro in volo ha riscritto il quaderno appena eliminato').toBe(0);
});
