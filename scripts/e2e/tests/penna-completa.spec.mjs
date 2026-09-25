/**
 * Penna «completa» (spec 19): i criteri del §6 uno per uno, col testo di
 * prova del progetto (`docs/toolbox/contenuti/testo-prova-canto.txt`, 55
 * righe, numerate da 1 come nella spec).
 *
 *   §6.1-6   lettere e livelli delle coppie di versi indicate, nel mirror
 *   §6.7     invariante dello schema su tutte le righe (Node, schemaRime)
 *   §6.8     marcatore [Ritornello]: niente numero ne' lettera, «55 versi»
 *   §6.9     modalita' prova: versi, corpo, A+, reload, indietro, Esc, wake lock
 *   §6.10    Elimina -> Annulla: stesso id e testo, vivo anche dopo la sync
 *   §6.11    Duplica
 *   §6.12    filtri e parola del rimario ricordati
 *   §6.13    titolo automatico e verso trovato nella ricerca
 *   §6.14    esporta tutti i testi in .txt
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect, apri, senzaIntro, BASE, nessunErroreConsole } from '../fixtures.mjs';

/* schema.js e' un ES module in una cartella senza package.json: dentro
   Playwright passerebbe dal suo trasformatore (CommonJS) e non si carica.
   Lo si prova in un Node a parte, com'e' nel sito: niente browser. */
const SCHEMA_URL = new URL('../../../toolbox/shared/testo/schema.js', import.meta.url).href;

/**
 * Esegue schemaRime/isSezione in un processo Node pulito. -> { schemi, sezioni }
 * `note[i]`, se c'e', e' quello che "sa il rimario" per il testo i:
 * { parola: { rima, classe, sillabe } } (l'opzione `nota` di schemaRime).
 */
function schemaInNode(testi, righe, note = []) {
    const codice = 'import { schemaRime, isSezione } from ' + JSON.stringify(SCHEMA_URL) + ';\n'
        + 'const d = JSON.parse(process.argv[1]);\n'
        + 'const schemi = d.testi.map((t, i) => { const n = d.note[i]; '
        + 'return schemaRime(t, n ? { nota: (p) => n[p] || null } : {}); });\n'
        + 'process.stdout.write(JSON.stringify({ schemi, sezioni: d.righe.map(isSezione) }));';
    const env = { ...process.env };
    delete env.NODE_OPTIONS;             // niente caricatori di Playwright
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', codice, JSON.stringify({ testi, righe, note })],
        { env, encoding: 'utf8' });
    return JSON.parse(out);
}

const TESTO = fs.readFileSync(
    fileURLToPath(new URL('../../../docs/toolbox/contenuti/testo-prova-canto.txt', import.meta.url)),
    'utf8'
).replace(/\r\n/g, '\n').replace(/\n+$/, '');
const RIGHE = TESTO.split('\n');

/* Le attese della spec §6.1-6: riga (da 1) -> [lettera mostrata, livello, colore] */
const ATTESE = {
    1: ['A', 'rima', 0], 3: ['A', 'rima', 0], 24: ['A', 'rima', 0],
    22: ['A', 'assonanza', 0], 26: ['A', 'assonanza', 0],
    5: ['A2', 'rima', 0], 28: ['A2', 'rima', 0],
    21: ['A3', 'rima', 0], 42: ['A3', 'rima', 0], 55: ['A3', 'rima', 0],
    45: ['H', 'assonanza', 7], 48: ['H', 'assonanza', 7],
    11: ['E', 'rima', 4], 32: ['E', 'rima', 4], 14: ['E2', 'rima', 4], 35: ['E2', 'rima', 4],
    43: ['G', 'rima', 6], 46: ['G', 'rima', 6],
    2: ['B', 'rima', 1], 4: ['B', 'rima', 1], 6: ['B', 'rima', 1], 23: ['B', 'rima', 1]
};
const SENZA_LETTERA = [7, 44, 47];

/* Iati finali (validator): "mio"/"Dio" non rimano con "no"/"però", "via" e
   "mia" si', e col rimario "poesia"/"follia"/"magia" sono una rima sola. */
const IATI = ['Scrivo una poesia', 'Nella mia follia', 'Cerco la magia', 'sei solo mio', 'dimmi di no',
    'cerca Dio', 'lo so però', 'per la via', 'sempre mia'].join('\n');
/* quello che il rimario italiano (chiavi-v3) dice di quelle tre parole:
   magia vi e' "tronca" di due sillabe, ma la chiave e' la stessa */
const NOTE_IATI = {
    poesia: { rima: 'ia', classe: 'piana', sillabe: 4 },
    follia: { rima: 'ia', classe: 'piana', sillabe: 3 },
    magia: { rima: 'ia', classe: 'tronca', sillabe: 2 }
};

/** Da uno schema (righe da 0) a { riga da 1: [lettera, livello] }. */
const perRigaDi = (schema) => Object.fromEntries(schema.map((g) => [g.riga + 1, [g.lettera, g.livello, g.indice]]));

/** Esegue `corpo` nella pagina con `m` = archivio, `s` = sync, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

/** Un testo scritto direttamente nell'archivio (come farebbe l'editor). */
function scriviTesto(page, id, titolo, testo = TESTO) {
    return modulo(page, `await m.scrivi('penna', arg.id, {
        titolo: arg.titolo, testo: arg.testo, creato: new Date().toISOString(),
        modificato: new Date().toISOString(), dialefe: {}, lingua: 'it', emuet: false });`,
    { id, titolo, testo });
}

/** Apre un testo nell'editor e aspetta un numero e una riga di mirror per verso. */
async function apriTesto(page, id, righe = RIGHE.length) {
    await apri(page, '/penna/#t=' + encodeURIComponent(id), { attesa: 400 });
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await expect(page.locator('#pen-gutter > *')).toHaveCount(righe);
    await expect(page.locator('#pen-lines > .pen-line')).toHaveCount(righe);
}

/** Per ogni riga del mirror: lettera mostrata (A, A2...), livello, colore, sezione. */
function lettere(page) {
    return page.evaluate(() => [...document.querySelectorAll('#pen-lines > .pen-line')].map((l) => {
        const i = l.querySelector('.pen-lettera');
        const n = i ? i.querySelector('.pen-lettera-n') : null;
        const colore = (l.className.match(/\bpen-rima-(\d+)\b/) || [])[1];
        return {
            lettera: i ? i.firstChild.data + (n ? n.textContent : '') : '',
            livello: l.classList.contains('is-rima') ? 'rima' : (l.classList.contains('is-assonanza') ? 'assonanza' : ''),
            colore: colore === undefined ? null : Number(colore),
            sezione: l.classList.contains('pen-sezione')
        };
    }));
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

/* ---------------- §6.7 (e §6.1-6) in Node ---------------- */

test('§6.7 schemaRime in Node: stessa famiglia <=> stessa lettera, stessa rima <=> piena e stesso indice', () => {
    const conMarcatore = [...RIGHE.slice(0, 8), '[Ritornello]', ...RIGHE.slice(8)].join('\n');
    const SEZIONI = ['[Ritornello]', '  [Strofa 2]  ', '[]', 'Canto [piano]', '[' + 'x'.repeat(41) + ']'];
    const node = schemaInNode([TESTO, conMarcatore, IATI, IATI, 'Poesia\nFollia'], SEZIONI,
        [null, null, null, NOTE_IATI, { poesia: { sillabe: 4, classe: 'piana' }, follia: { sillabe: 3, classe: 'piana' } }]);
    const schema = node.schemi[0];
    const perRiga = new Map(schema.map((g) => [g.riga + 1, g]));
    for (const [riga, [lettera, livello, colore]] of Object.entries(ATTESE)) {
        const g = perRiga.get(Number(riga));
        expect(g, 'riga ' + riga + ' senza lettera').toBeTruthy();
        expect([g.lettera + (g.indice >= 2 ? g.indice : ''), g.livello, g.colore], 'riga ' + riga)
            .toEqual([lettera, livello, colore]);
    }
    SENZA_LETTERA.forEach((r) => expect(perRiga.has(r), 'riga ' + r + ' con una lettera').toBe(false));

    /* invariante su tutte le 55 righe */
    for (const a of schema) {
        for (const b of schema) {
            expect(a.famiglia === b.famiglia, `famiglia/lettera ${a.riga + 1}-${b.riga + 1}`).toBe(a.lettera === b.lettera);
            if (a.rima === b.rima) {
                expect([a.lettera, a.indice, a.livello], `rima ${a.riga + 1}-${b.riga + 1}`).toEqual([b.lettera, b.indice, b.livello]);
            }
            if (a.lettera === b.lettera && a.indice > 0 && a.indice === b.indice) expect(a.rima).toBe(b.rima);
        }
        expect(a.livello === 'rima', 'indice e livello discordi alla riga ' + (a.riga + 1)).toBe(a.indice > 0);
    }
    /* nessuna famiglia con due versi resta senza lettera */
    const famiglie = new Map();
    schema.forEach((g) => famiglie.set(g.famiglia, (famiglie.get(g.famiglia) || 0) + 1));
    famiglie.forEach((n) => expect(n).toBeGreaterThanOrEqual(2));

    /* iati, solo regole: mio/Dio fra loro e non con no/però; via/mia insieme */
    const regole = perRigaDi(node.schemi[2]);
    expect(regole[4]).toEqual(regole[6]);
    expect(regole[5]).toEqual(regole[7]);
    expect(regole[4][0], 'mio/Dio nella famiglia di no/però').not.toBe(regole[5][0]);
    expect(regole[8]).toEqual(regole[9]);
    expect(regole[8][1]).toBe('rima');
    /* col rimario: poesia/follia/magia famiglia A, piena, un gruppo solo */
    const conRimario = perRigaDi(node.schemi[3]);
    [1, 2, 3].forEach((r) => expect(conRimario[r], 'riga ' + r).toEqual(['A', 'rima', 1]));
    expect(conRimario[4][0]).not.toBe(conRimario[5][0]);
    expect(conRimario[8]).toEqual(conRimario[9]);
    /* senza chiave ma col conteggio vero: lo iato si spezza lo stesso */
    expect(perRigaDi(node.schemi[4])).toEqual({ 1: ['A', 'rima', 1], 2: ['A', 'rima', 1] });

    /* i marcatori */
    expect(node.sezioni).toEqual([true, true, false, false, false]);
    const dopo = node.schemi[1];
    expect(dopo.some((g) => g.riga === 8), 'il marcatore ha una lettera').toBe(false);
    expect(dopo.map((g) => [g.riga < 8 ? g.riga : g.riga - 1, g.lettera, g.indice, g.livello]))
        .toEqual(schema.map((g) => [g.riga, g.lettera, g.indice, g.livello]));
});

/* ---------------- §6.1-6 nel mirror ---------------- */

test('§6.1-6 le lettere del mirror: piena = rima, vuota = assonanza, colore = famiglia', async ({ page, spia }) => {
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-colori', 'Canto');
    await apriTesto(page, 'canto-colori');
    await expect(page.locator('#penna')).toHaveClass(/\bis-colori\b/);
    const L = await lettere(page);
    for (const [riga, [lettera, livello, colore]] of Object.entries(ATTESE)) {
        const r = L[Number(riga) - 1];
        expect([r.lettera, r.livello, r.colore], 'riga ' + riga + ' «' + RIGHE[riga - 1] + '»').toEqual([lettera, livello, colore]);
    }
    SENZA_LETTERA.forEach((r) => expect(L[r - 1].lettera, 'riga ' + r + ' con una lettera').toBe(''));
    /* il pedice solo dal secondo gruppo perfetto */
    await expect(page.locator('#pen-lines > .pen-line').nth(0).locator('.pen-lettera-n')).toHaveCount(0);
    await expect(page.locator('#pen-lines > .pen-line').nth(4).locator('.pen-lettera-n')).toHaveText('2');
    /* il testo del mirror resta il verso (righello di misuraRighe) */
    const primo = await page.evaluate(() => document.querySelector('#pen-lines > .pen-line').firstChild.data);
    expect(primo).toBe(RIGHE[0]);
    nessunErroreConsole(spia);
});

test('iati finali nel mirror: mio/Dio ≠ no/però, via/mia insieme; col rimario poesia/follia/magia A piena', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-iati', 'Iati', IATI);
    await apriTesto(page, 'canto-iati', 9);
    let L = await lettere(page);
    expect(L[3].lettera).toBe(L[5].lettera);
    expect(L[4].lettera).toBe(L[6].lettera);
    expect(L[3].lettera, 'mio/Dio nella famiglia di no/però').not.toBe(L[4].lettera);
    expect([L[7].lettera, L[7].livello]).toEqual([L[8].lettera, 'rima']);

    /* il rimario (la cache del browser, nessuna rete fuori sede) si prepara
       aprendo il pannello: le lettere passano alle sue chiavi */
    await page.evaluate(() => {
        const c = document.getElementById('pen-rhyme-toggle');
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect.poll(async () => (await lettere(page)).slice(0, 3).map((r) => r.lettera + ':' + r.livello),
        { timeout: 45000, message: 'col rimario poesia/follia/magia non sono una rima A' })
        .toEqual(['A:rima', 'A:rima', 'A:rima']);
    L = await lettere(page);
    expect(L[3].lettera).toBe(L[5].lettera);
    expect(L[3].lettera).not.toBe(L[4].lettera);
    expect(L[7].lettera).toBe(L[8].lettera);
});

/* ---------------- §6.8 sezioni ---------------- */

test('§6.8 [Ritornello]: niente numero, niente lettera, le altre invariate, card «55 versi»', async ({ page }) => {
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-sezioni', 'Sezioni');
    await apriTesto(page, 'canto-sezioni');
    const prima = await lettere(page);

    const conMarcatore = [...RIGHE.slice(0, 8), '[Ritornello]', ...RIGHE.slice(8)].join('\n');
    await page.locator('#pen-text').fill(conMarcatore);
    await page.locator('#pen-text').dispatchEvent('input');
    await expect(page.locator('#pen-gutter > *')).toHaveCount(56);
    await expect(page.locator('#pen-lines > .pen-line').nth(8)).toHaveClass(/\bpen-sezione\b/);
    await expect(page.locator('#pen-gutter > *').nth(8)).toHaveText('');
    await expect(page.locator('#pen-gutter > *').nth(7)).not.toHaveText('');
    const dopo = await lettere(page);
    expect(dopo[8].lettera).toBe('');
    expect(dopo.filter((_, i) => i !== 8).map((r) => [r.lettera, r.livello, r.colore]))
        .toEqual(prima.map((r) => [r.lettera, r.livello, r.colore]));

    /* salvato: la card conta 55 versi, il marcatore no */
    await page.waitForTimeout(900);
    await page.locator('#pen-back').click();
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'elenco');
    await expect(page.locator('#pen-list-grid .pen-card .pen-card-verses')).toHaveText(/\b55\b/);
});

/* ---------------- §6.9 prova ---------------- */

test('§6.9 Prova: 55 versi a 28 px, A+ ricordato, indietro ed Esc tornano all’editor, wake lock', async ({ page, spia }) => {
    await page.addInitScript(() => {
        window.__wakeLock = 0;
        const lock = {
            request: async () => {
                window.__wakeLock++;
                const s = new EventTarget();
                s.released = false;
                s.release = async () => { s.released = true; };
                return s;
            }
        };
        try { Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => lock }); }
        catch (e) { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: lock }); }
    });
    await apri(page, '/penna/', { attesa: 300 });
    await modulo(page, 'localStorage.removeItem(\'tt.penna.provaCorpo\');');
    await scriviTesto(page, 'canto-prova', 'Sul palco');
    await apriTesto(page, 'canto-prova');

    await page.locator('#pen-prova-open').click();
    await expect(page).toHaveURL(/#t=canto-prova&prova$/);
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'prova');
    await expect(page.locator('#pen-prova')).toBeVisible();
    await expect(page.locator('#pen-prova-title')).toHaveText('Sul palco');
    const versi = page.locator('#pen-prova-body .pen-prova-verso');
    await expect(versi).toHaveCount(55);
    await expect(versi.first()).toHaveText(RIGHE[0]);
    await expect(versi.first()).toHaveCSS('font-size', '28px');
    await expect(page.locator('#pen-prova .pen-lettera, #pen-prova .pen-n')).toHaveCount(0);
    await expect(page.locator('#pen-gutter')).toBeHidden();
    await expect(page.locator('#pen-lines')).toBeHidden();
    expect(await page.evaluate(() => window.__wakeLock), 'wakeLock.request non chiamato').toBeGreaterThan(0);

    await page.locator('#pen-prova-bigger').click();
    await expect(versi.first()).toHaveCSS('font-size', '34px');
    await page.waitForTimeout(200);
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'prova');
    await expect(page.locator('#pen-prova-body .pen-prova-verso').first()).toHaveCSS('font-size', '34px');

    /* «indietro» esce dalla prova */
    await page.goBack();
    await expect(page).toHaveURL(/#t=canto-prova$/);
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await expect(page.locator('#pen-prova')).toBeHidden();

    /* Esc anche */
    await page.locator('#pen-prova-open').click();
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'prova');
    await page.keyboard.press('Escape');
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await expect(page).toHaveURL(/#t=canto-prova$/);

    /* e «Fine» */
    await page.locator('#pen-prova-open').click();
    await page.locator('#pen-prova-exit').click();
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await expect(page.locator('body')).not.toHaveClass(/\bpen-prova-attiva\b/);
    nessunErroreConsole(spia);
});

/* ---------------- §6.10 Annulla dopo Elimina ---------------- */

test('§6.10 Elimina dalla card -> Annulla: stesso id e testo, vivo anche sull’altro dispositivo', async ({ page, browser }) => {
    test.setTimeout(150000);
    const contesto = await browser.newContext({ locale: 'it-IT' });
    const due = await contesto.newPage();
    await due.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await due.addInitScript(() => { try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ } });
    try {
        await apri(page, '/impostazioni/');
        const codice = await modulo(page, 'const c = await s.creaCodice(); await s.collega(c); return c;');
        await scriviTesto(page, 'canto-annulla', 'Da non perdere');
        expect((await modulo(page, 'return (await s.sincronizza()).esito;'))).toBe('ok');

        await apri(due, BASE + '/impostazioni/');
        await modulo(due, 'await s.collega(arg); await s.sincronizza();', codice);
        expect(await modulo(due, 'return !!(await m.leggi(\'penna\', \'canto-annulla\'));')).toBe(true);

        /* A elimina dalla card e annulla */
        await apri(page, '/penna/', { attesa: 600 });
        const card = page.locator('#pen-list-grid .pen-card[data-id="canto-annulla"]');
        await expect(card).toHaveCount(1);
        await card.locator('.pen-card-del').click();
        await card.locator('.pen-card-yes').click();
        await expect(page.locator('#pen-list-grid .pen-card[data-id="canto-annulla"]')).toHaveCount(0);
        const annulla = page.locator('.tb-toast .tb-toast-action', { hasText: 'Annulla' });
        await expect(annulla).toBeVisible();
        await annulla.click();
        await expect(page.locator('#pen-list-grid .pen-card[data-id="canto-annulla"]')).toHaveCount(1);
        await expect(page.locator('.tb-toast', { hasText: 'Testo ripristinato' })).toBeVisible();
        const letto = await modulo(page, 'return m.leggi(\'penna\', \'canto-annulla\');');
        expect(letto && letto.testo).toBe(TESTO);
        expect(letto.titolo).toBe('Da non perdere');

        /* la sincronizzazione porta il testo vivo (piu' recente della lapide) */
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await modulo(due, 'await s.sincronizza();');
        const dallAltro = await modulo(due, 'return m.leggi(\'penna\', \'canto-annulla\');');
        expect(dallAltro && dallAltro.testo, 'sul secondo dispositivo il testo non e’ vivo').toBe(TESTO);
    } finally {
        await contesto.close();
    }
});

/* ---------------- §6.11 Duplica ---------------- */

test('§6.11 Duplica: nuovo id, titolo «… (copia)», testo identico, hash della copia', async ({ page }) => {
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-originale', 'Canto');
    await apriTesto(page, 'canto-originale');
    await page.locator('#pen-settings-open-editor').click();
    await expect(page.locator('#pen-duplicate')).toBeVisible();
    await page.locator('#pen-duplicate').click();
    await expect(page).not.toHaveURL(/#t=canto-originale$/);
    await expect(page).toHaveURL(/#t=[^&]+$/);
    await expect(page.locator('#pen-title')).toHaveValue('Canto (copia)');
    await expect(page.locator('#pen-text')).toHaveValue(TESTO);
    const tutti = await modulo(page, 'return (await m.elenca(\'penna\')).map((r) => ({ id: r.id, titolo: r.dati.titolo, testo: r.dati.testo }));');
    expect(tutti).toHaveLength(2);
    const copia = tutti.find((r) => r.id !== 'canto-originale');
    expect(copia.titolo).toBe('Canto (copia)');
    expect(copia.testo).toBe(TESTO);
    expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#t=' + copia.id);
    /* in elenco "Duplica" non c'e' */
    await page.keyboard.press('Escape');
    await page.locator('#pen-back').click();
    await page.locator('#pen-settings-open').click();
    await expect(page.locator('#pen-duplicate')).toBeHidden();
});

/* ---------------- §6.12 rimario ---------------- */

async function apriRimario(page) {
    const query = page.locator('#pen-query');
    if (!(await query.isVisible())) await page.locator('.pen-rhyme-open').first().click();
    await expect(query).toBeVisible();
}

async function parole(page) {
    await expect(page.locator('#pen-results .pen-hit').first()).toBeVisible({ timeout: 30000 });
    return page.locator('#pen-results .pen-hit').evaluateAll((b) => b.map((x) => x.getAttribute('data-pen-word')));
}

test('§6.12 rimario: Assonanze + 2 sillabe + «cuore» tornano dopo il ricaricamento', async ({ page }) => {
    test.setTimeout(90000);
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-rimario', 'Rimario');
    await apriTesto(page, 'canto-rimario');
    await apriRimario(page);
    await page.locator('#pen-type [data-pen-type="assonanze"]').click();
    await page.evaluate(() => {
        const s = document.getElementById('pen-syl');
        s.value = '2';
        s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#pen-query').fill('cuore');
    const prima = await parole(page);
    expect(prima.length).toBeGreaterThan(0);
    await page.waitForTimeout(300);

    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('#penna')).toHaveAttribute('data-pen-vista', 'editor');
    await apriRimario(page);
    await expect(page.locator('#pen-query')).toHaveValue('cuore');
    await expect(page.locator('#pen-type [data-pen-type="assonanze"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#pen-type [data-pen-type="rime"]')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#pen-syl')).toHaveValue('2');
    expect(await parole(page)).toEqual(prima);
});

/* ---------------- §6.13 titolo automatico e verso trovato ---------------- */

test('§6.13 senza titolo: il primo verso fa da titolo, la ricerca mostra il verso trovato', async ({ page }) => {
    await apri(page, '/penna/', { attesa: 300 });
    await scriviTesto(page, 'canto-senza', '');
    await apri(page, '/penna/', { attesa: 600 });
    const card = page.locator('#pen-list-grid .pen-card[data-id="canto-senza"]');
    await expect(card.locator('.pen-card-title')).toHaveText('Forse non riesco a spiegarmi');
    await expect(card.locator('.pen-card-verse')).toHaveText('Mai bene però');

    await page.locator('#pen-search').fill('ooo');
    await expect(card.locator('.pen-card-verse')).toHaveText('Ooo-ooo-ooo');
    await expect(card.locator('.pen-card-verse mark')).toHaveCount(1);
    await expect(card.locator('.pen-card-verse mark')).toHaveText('Ooo');
    /* il termine nel titolo mostrato: niente verso trovato */
    await page.locator('#pen-search').fill('spiegarmi');
    await expect(card.locator('.pen-card-verse')).toHaveText('Mai bene però');
    await expect(card.locator('.pen-card-verse mark')).toHaveCount(0);

    /* nell'editor il segnaposto del titolo e' il primo verso, ma non si salva */
    await card.locator('.pen-card-open').click();
    await expect(page.locator('#pen-title')).toHaveAttribute('placeholder', 'Forse non riesco a spiegarmi');
    await expect(page.locator('#pen-title')).toHaveValue('');
});

/* ---------------- §6.14 esporta .txt ---------------- */

test('§6.14 Esporta tutto in .txt: un file con entrambi i titoli e tutti i versi', async ({ page }) => {
    await apri(page, '/penna/', { attesa: 300 });
    const SECONDO = 'Primo verso del secondo\nSecondo verso del secondo';
    await scriviTesto(page, 'canto-uno', 'Il primo');
    await scriviTesto(page, 'canto-due', 'Il secondo', SECONDO);
    await apri(page, '/penna/', { attesa: 600 });
    await expect(page.locator('#pen-list-grid .pen-card')).toHaveCount(2);
    await page.locator('#pen-settings-open').click();
    await expect(page.locator('#pen-export-txt')).toBeVisible();
    const scarico = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('#pen-export-txt').click();
    const download = await scarico;
    expect(download.suggestedFilename()).toMatch(/^penna-testi-\d{4}-\d{2}-\d{2}\.txt$/);
    const contenuto = fs.readFileSync(await download.path(), 'utf8');
    expect(contenuto).toContain('Il primo');
    expect(contenuto).toContain('Il secondo');
    [...RIGHE, ...SECONDO.split('\n')].forEach((r) => expect(contenuto, 'manca «' + r + '»').toContain(r));
    expect(contenuto).toContain('\n\n— — —\n\n');
});
