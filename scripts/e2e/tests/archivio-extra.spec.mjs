/**
 * Archivio unico (spec 18 §3): casi limite trovati dalla validazione del
 * giro 1. Ogni test qui sotto riproduce un difetto; deve fallire finche' il
 * difetto c'e' e passare dopo la correzione.
 */

import { test, expect, senzaIntro } from '../fixtures.mjs';

const DB = 'tiny-temple-toolbox';

async function semina(page, { records = [], locale = {} } = {}) {
    await page.goto('/robots.txt', { waitUntil: 'load' });
    await page.evaluate(({ db, records, locale }) => new Promise((ok, ko) => {
        for (const [k, v] of Object.entries(locale)) window.localStorage.setItem(k, v);
        const r = indexedDB.open(db, 1);
        r.onupgradeneeded = () => {
            const s = r.result.createObjectStore('records', { keyPath: ['tool', 'id'] });
            s.createIndex('tool', 'tool');
        };
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
            const conn = r.result;
            const tx = conn.transaction('records', 'readwrite');
            const s = tx.objectStore('records');
            records.forEach((x) => s.put(x));
            tx.oncomplete = () => { conn.close(); ok(); };
            tx.onerror = () => ko(tx.error);
        };
    }), { db: DB, records, locale });
}

function archivio(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { const m = await import(\'/shared/archivio.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

const doc = (titolo, sid) => ({
    titolo, testo: titolo + '\nverso', creato: '2026-01-01T10:00:00.000Z',
    modificato: '2026-01-02T10:00:00.000Z', dialefe: {}, lingua: 'it', emuet: false, ...(sid ? { sid } : {})
});

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

/* (c)+(e) due testi vecchi con lo stesso `sid` (es. un documento copiato con
   la 17): la migrazione tiene il sid doppio, e un giro esporta -> svuota ->
   importa "unisci" ne perde uno (il secondo sovrascrive il primo per sid). */
test('sid duplicato nel profilo vecchio: esporta/importa non perde un testo', async ({ page }) => {
    const SID = 'abcdefabcdef0001';
    await semina(page, {
        records: [
            { tool: 'penna', id: 'a', updated: 1767261600000, value: doc('Originale', SID) },
            { tool: 'penna', id: 'b', updated: 1767261600000, value: doc('Copia modificata', SID) }
        ]
    });
    await page.goto('/penna/', { waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);
    const esito = await archivio(page, `
        const vivi = await m.elenca('penna');
        const file = await m.esportaTutto();
        await m.svuota();
        await m.importaTutto(file, { strategia: 'unisci' });
        const dopo = await m.elenca('penna');
        return { sidDistinti: new Set(vivi.map((r) => r.sid)).size, dopo: dopo.map((r) => r.dati.titolo).sort() };
    `);
    expect.soft(esito.sidDistinti, 'dopo la migrazione due record hanno lo stesso sid').toBe(2);
    expect(esito.dopo, 'un testo e’ sparito nel giro esporta/importa').toEqual(['Copia modificata', 'Originale']);
});

/* (a) una migrazione che non riesce (es. disco pieno su iPhone: la
   transazione abortisce, i dati restano intatti) non deve svuotare lo
   schermo: il commento di comeRecord promette "non si perde niente a video",
   ma leggi/elenca fanno `await pronto()` che rigetta, e Penna mostra 0 testi. */
test('migrazione fallita: i testi vecchi restano a video', async ({ page }) => {
    await page.addInitScript(() => {
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (v, ...resto) {
            if (v && v.tool === 'penna' && v.value && v.value.v === 1) {
                throw new DOMException('disco pieno (simulato)', 'QuotaExceededError');
            }
            return put.call(this, v, ...resto);
        };
    });
    await semina(page, {
        records: [
            { tool: 'penna', id: 'a', updated: 1767261600000, value: doc('Primo') },
            { tool: 'penna', id: 'b', updated: 1767261600000, value: doc('Secondo') }
        ]
    });
    await page.goto('/penna/', { waitUntil: 'load' });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);
});

/* (b) due schede sull'Accordatore: la scheda A ha in memoria la lista di
   quando si e' aperta; la scheda B salva un'accordatura nuova. Quando A
   elimina (o salva) un'accordatura qualsiasi, storeCustom mette la lapide a
   tutto cio' che l'archivio ha e la lista di A no: quella di B sparisce. */
test('accordatore in due schede: eliminare in A non cancella quella creata in B', async ({ page }) => {
    const CORDE = [{ note: 'E', oct: 2 }, { note: 'A', oct: 2 }, { note: 'D', oct: 3 },
        { note: 'G', oct: 3 }, { note: 'B', oct: 3 }, { note: 'E', oct: 4 }];
    await page.goto('/accordatore/', { waitUntil: 'load' });
    await page.evaluate(async (corde) => {
        const a = await import('/accordatore/accordatore.js');
        await a.writeCustom([{ id: 'c1', name: 'Prima', strings: corde }]);
    }, CORDE);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#acc-instrument option[value="custom:c1"]')).toHaveCount(1);

    const b = await page.context().newPage();
    try {
        await b.goto('/accordatore/', { waitUntil: 'load' });
        await b.evaluate(async (corde) => {
            const a = await import('/accordatore/accordatore.js');
            await a.writeCustom([{ id: 'c1', name: 'Prima', strings: corde }, { id: 'c2', name: 'Da B', strings: corde }]);
        }, CORDE);
    } finally {
        await b.close();
    }

    /* in A: si sceglie la c1 e la si elimina dall'interfaccia */
    await page.locator('#acc-instrument').selectOption('custom:c1', { force: true });
    await page.locator('#acc-custom-remove').click();
    await page.locator('#acc-custom-confirm-yes').click();
    await page.waitForTimeout(500);
    const vive = await archivio(page, 'return (await m.elenca(\'accordature\')).map((r) => r.id);');
    expect(vive, 'l’accordatura creata nell’altra scheda e’ stata cancellata').toEqual(['c2']);
});
