/**
 * DNA «completo» (spec 20): i criteri del §6, mobile e desktop.
 *
 *   A = fixtures/prova-120.wav (120 BPM, do maggiore = 8B), analizzato davvero
 *   S = 7 voci scritte con archivio.scrivi (nessuna analisi): 8B «Perché»
 *       (128 BPM, -9,3 LUFS), 8B, 9B, 7B (124 BPM, -14,1 LUFS), 8A (70 BPM
 *       con l'alternativa 140), 3A «=SOMMA(1)», 5A dal microfono.
 *
 * Nota sul §6.4: la voce aperta RESTA nell'elenco (evidenziata, senza
 * «Confronta»: spec §3 e §6.1 «una riga»); il filtro per tonalita' la
 * esclude. Quindi «×» riporta a sette righe, non sei (vedi report).
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    test, expect, apri, senzaIntro, BASE, nessunoScrollOrizzontale, bersagliMinimi
} from '../fixtures.mjs';

const file = (nome) => fileURLToPath(new URL('../fixtures/' + nome, import.meta.url));

/* ---------------- le sette voci di S ---------------- */

const ORA = Date.parse('2026-09-20T10:00:00.000Z');
const idDi = (i) => new Date(ORA + i * 60000).toISOString();

function record(i, v) {
    return {
        at: idDi(i), name: v.name, renamed: true, source: v.source || 'file',
        title: '', artist: '', album: '', year: '',
        seconds: v.seconds || 222, sampleRate: 44100, channels: 2,
        bpm: v.bpm, bpmConfidence: 0.8, bpmAlternatives: v.alt || [],
        tonic: v.tonic, mode: v.mode, camelot: v.camelot, keyConfidence: 0.2,
        lufs: v.lufs, truePeak: v.tp === undefined ? -1 : v.tp, lra: v.lra === undefined ? 5 : v.lra,
        uncertain: false
    };
}

const S = {
    perche: [7, { name: 'Perché', bpm: 128, tonic: 'C', mode: 'major', camelot: '8B', lufs: -9.3, tp: -0.8, lra: 6.1, seconds: 222 }],
    otto: [6, { name: 'Secondo in otto', bpm: 120, tonic: 'C', mode: 'major', camelot: '8B', lufs: -10 }],
    nove: [5, { name: 'Nove B', bpm: 100, tonic: 'G', mode: 'major', camelot: '9B', lufs: -11 }],
    sette: [4, { name: 'Sette B', bpm: 124, tonic: 'F', mode: 'major', camelot: '7B', lufs: -14.1 }],
    minore: [3, { name: 'Otto A', bpm: 70, alt: [140], tonic: 'A', mode: 'minor', camelot: '8A', lufs: -12 }],
    formula: [2, { name: '=SOMMA(1)', bpm: 90, tonic: 'A#', mode: 'minor', camelot: '3A', lufs: -13 }],
    mic: [1, { name: 'Registrazione 20 set 10:01', source: 'mic', bpm: 110, tonic: 'C', mode: 'minor', camelot: '5A', lufs: -20, lra: null }]
};
const ID = Object.fromEntries(Object.entries(S).map(([k, [i]]) => [k, idDi(i)]));
const hashDi = (id) => '#r=' + encodeURIComponent(id);

/** Esegue `corpo` nella pagina con `m` = archivio, `s` = sync, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

/** Scrive S nell'archivio (la pagina deve essere gia' sul sito). */
async function semina(page, quali = Object.keys(S)) {
    const voci = quali.map((k) => ({ id: idDi(S[k][0]), dati: record(S[k][0], S[k][1]) }));
    await modulo(page, 'for (const v of arg) await m.scrivi(\'dna\', v.id, v.dati);', voci);
}

/**
 * Caricamento vero di `percorso`: da /dna/ a /dna/#r=... il browser farebbe
 * solo un cambio di hash, e lo storico in memoria sarebbe quello di prima
 * della semina (le scritture di questa scheda non ridisegnano, spec 18 §4).
 */
async function carica(page, percorso, attesa = 700) {
    await page.goto('about:blank');
    await apri(page, percorso, { attesa });
}

/** /dna/ con S nell'archivio, poi la pagina richiesta. */
async function conS(page, percorso = '/dna/') {
    await apri(page, '/dna/', { attesa: 300 });
    await semina(page);
    await carica(page, percorso);
}

const righe = (page) => page.locator('#dna-history .dna-history-row');
const riga = (page, id) => page.locator('#dna-history .dna-history-row', {
    has: page.locator('[data-dna-id="' + id + '"]')
});
/** Apre una voce toccando la parte dei numeri (il nome rinomina). */
const apriRiga = (page, id) => riga(page, id).locator('.dna-history-meta').click();
const ultimo = (page) => page.evaluate(() => window.localStorage.getItem('tt.dna.ultimo'));
const meno = (s) => String(s || '').replace(/−/g, '-').replace(/\s+/g, ' ').trim();

async function analizzaA(page) {
    await apri(page, '/dna/', { attesa: 500 });
    await page.locator('#dna-file').setInputFiles(file('prova-120.wav'));
    await expect(page.locator('#dna-result')).toBeVisible({ timeout: 90000 });
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
});

/* ---------------- §6.1 salvato, #r=, riapertura ---------------- */

test('§6.1 A: «Salvato nei Recenti», #r=, una riga; reload -> risultato', async ({ page }) => {
    test.setTimeout(150000);
    await analizzaA(page);
    await expect(page.locator('.tb-toast', { hasText: 'Salvato nei Recenti' })).toBeVisible();
    await expect(page).toHaveURL(/#r=/);
    await expect(righe(page)).toHaveCount(1);
    await expect(page.locator('#dna-history-wrap')).toBeVisible();
    const hash = new URL(page.url()).hash;

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await expect(page.locator('#dna-result')).toBeVisible();
    expect(new URL(page.url()).hash).toBe(hash);
    await expect(righe(page)).toHaveCount(1);
});

/* ---------------- §6.2 indietro, avanti, ultimo ---------------- */

test('§6.2 S: indietro -> vuoto e ultimo tolto; avanti -> risultato; /dna/ riapre l’ultimo', async ({ page }) => {
    await conS(page);
    await expect(page.locator('#dna-drop')).toBeVisible();
    await apriRiga(page, ID.perche);
    await expect(page.locator('#dna-result')).toBeVisible();
    expect(new URL(page.url()).hash).toBe(hashDi(ID.perche));
    expect(await ultimo(page)).toBe(JSON.stringify(ID.perche));

    await page.goBack();
    await expect(page.locator('#dna-drop')).toBeVisible();
    await expect(page.locator('#dna-result')).toBeHidden();
    expect(await ultimo(page), '`ultimo` non e’ stato tolto').toBeNull();

    await page.goForward();
    await expect(page.locator('#dna-result')).toBeVisible();
    await expect(page.locator('#dna-bpm')).toHaveText('128');

    await apri(page, '/dna/', { attesa: 800 });
    await expect(page.locator('#dna-result')).toBeVisible();
    expect(new URL(page.url()).hash).toBe(hashDi(ID.perche));
});

/* ---------------- §6.3 id sconosciuto ---------------- */

test('§6.3 #r=x -> «Analisi non trovata», vuoto, hash pulito', async ({ page }) => {
    await apri(page, '/dna/#r=x', { attesa: 800 });
    await expect(page.locator('.tb-toast', { hasText: 'Analisi non trovata' })).toBeVisible();
    await expect(page.locator('#dna-drop')).toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
});

/* ---------------- §6.4 compatibili ---------------- */

test('§6.4 chip dei compatibili: filtro, «×», stato vuoto, niente filtro dopo il reload', async ({ page }) => {
    await conS(page, '/dna/' + hashDi(ID.perche));
    await expect(page.locator('#dna-result')).toBeVisible();
    const chip = page.locator('#dna-key-compat button.dna-compat-chip');
    await expect(chip).toHaveText(['8B', '7B', '9B', '8A']);
    await expect(chip.first()).toHaveClass(/\bis-self\b/);
    await expect(page.locator('#dna-key-compat .is-self')).toHaveCount(1);
    /* sotto il risultato: 5 voci + «Mostra tutte», che espande per la sessione */
    await expect(righe(page)).toHaveCount(5);
    await expect(page.locator('#dna-history-wrap #dna-history-more')).toBeVisible();
    await page.locator('#dna-history-more').click();
    await expect(righe(page)).toHaveCount(7);
    await expect(page.locator('#dna-history-more')).toBeHidden();
    /* la voce aperta (senza ⇄) e' larga come le altre */
    const larghezze = await page.$$eval('#dna-history .dna-history-item', (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(new Set(larghezze).size, 'righe di larghezza diversa: ' + larghezze.join(', ')).toBe(1);

    await page.locator('#dna-key-compat [data-dna-camelot="9B"]').click();
    await expect(righe(page)).toHaveCount(1);
    await expect(riga(page, ID.nove)).toHaveCount(1);
    await expect(page.locator('#dna-key-compat [data-dna-camelot="9B"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dna-key-compat [data-dna-camelot="9B"]')).toHaveClass(/is-active/);
    await expect(page.locator('#dna-filter')).toBeVisible();
    await expect(page.locator('#dna-filter')).toContainText('Brani in 9B');

    await page.locator('#dna-filter-clear').click();
    await expect(page.locator('#dna-filter')).toBeHidden();
    await expect(righe(page)).toHaveCount(7);

    /* 8B filtra l'ALTRA 8B: la voce aperta resta fuori */
    await page.locator('#dna-key-compat [data-dna-camelot="8B"]').click();
    await expect(righe(page)).toHaveCount(1);
    await expect(riga(page, ID.otto)).toHaveCount(1);
    await page.locator('#dna-key-compat [data-dna-camelot="8B"]').click();   // stesso chip = togli
    await expect(righe(page)).toHaveCount(7);

    /* 3A: nessun altro brano in 3A */
    await carica(page, '/dna/' + hashDi(ID.formula));
    /* la voce aperta e' la sesta: resta comunque fra le cinque mostrate */
    await expect(righe(page)).toHaveCount(5);
    await expect(riga(page, ID.formula)).toHaveCount(1);
    await page.locator('#dna-key-compat [data-dna-camelot="3A"]').click();
    await expect(righe(page)).toHaveCount(0);
    await expect(page.locator('#dna-history .dna-history-none')).toHaveText('Nessun altro brano in 3A nei Recenti');

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    await expect(page.locator('#dna-result')).toBeVisible();
    await expect(righe(page)).toHaveCount(5);
    await expect(page.locator('#dna-history-more')).toBeVisible();
    await expect(page.locator('#dna-filter')).toBeHidden();
    await expect(page.locator('#dna-key-compat [aria-pressed="true"]')).toHaveCount(0);
});

/* ---------------- §6.5 ricerca ---------------- */

test('§6.5 ricerca senza accenti; con cinque voci sparisce', async ({ page }) => {
    await conS(page);
    await expect(page.locator('#dna-search')).toBeVisible();
    await page.locator('#dna-search').fill('perche');
    await expect(righe(page)).toHaveCount(1);
    await expect(righe(page).locator('.dna-history-name')).toHaveText('Perché');
    await page.locator('#dna-search').fill('');
    await expect(righe(page)).toHaveCount(7);

    await modulo(page, 'await m.elimina(\'dna\', arg[0]); await m.elimina(\'dna\', arg[1]);', [ID.mic, ID.formula]);
    await apri(page, '/dna/', { attesa: 700 });
    await expect(righe(page)).toHaveCount(5);
    await expect(page.locator('#dna-search')).toBeHidden();
});

/* ---------------- §6.6 confronto ---------------- */

test('§6.6 confronto 8B/7B: -4 BPM, +5 semitoni, compatibile, -4,8 LU; indietro lo chiude', async ({ page }) => {
    await conS(page);
    await apriRiga(page, ID.perche);
    await expect(page.locator('#dna-result')).toBeVisible();
    /* niente «Confronta» sulla voce aperta */
    await expect(riga(page, ID.perche).locator('.dna-history-compare')).toHaveCount(0);
    await riga(page, ID.sette).locator('.dna-history-compare').click();
    await expect(page.locator('#dna-compare')).toBeVisible();
    const delta = (k) => page.locator('#dna-compare-table tr[data-dna-row="' + k + '"] .dna-compare-delta');
    expect(meno(await delta('bpm').textContent())).toBe('-4');
    const cam = meno(await delta('camelot').textContent());
    expect(cam).toContain('+5 semitoni');
    expect(cam).toMatch(/ compatibile$/);   /* «meno» comprime l'a capo in spazio; niente « · » */
    expect(meno(await delta('lufs').textContent())).toBe('-4,8 LU');

    await page.goBack();
    await expect(page.locator('#dna-compare')).toBeHidden();
    await expect(page.locator('#dna-drop')).toBeVisible();
});

/* ---------------- §6.7 CSV ---------------- */

async function scaricaCsv(page) {
    await expect(page.locator('#dna-export')).toBeVisible();
    const scarico = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('#dna-export').click();
    const download = await scarico;
    expect(download.suggestedFilename()).toMatch(/^dna-storico-\d{4}-\d{2}-\d{2}\.csv$/);
    return fs.readFileSync(await download.path());
}

test('§6.7 CSV: BOM, 8 righe, «;» e «-9,3» in italiano, apostrofo; in inglese «,» e «-9.3»', async ({ page }) => {
    await conS(page);
    const it = await scaricaCsv(page);
    expect([...it.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const testo = it.toString('utf8').replace(/^﻿/, '');
    const righeCsv = testo.split('\r\n').filter((r) => r !== '');
    expect(righeCsv).toHaveLength(8);
    expect(testo).not.toMatch(/[^\r]\n/);
    expect(righeCsv[0].split(';')).toHaveLength(10);
    expect(righeCsv[1].startsWith('Perché;')).toBe(true);        // la piu' recente prima
    expect(righeCsv[1]).toContain(';-9,3;');
    expect(testo).toContain("'=SOMMA(1)");

    await apri(page, '/dna/?lang=en', { attesa: 700 });
    const en = (await scaricaCsv(page)).toString('utf8').replace(/^﻿/, '');
    const righeEn = en.split('\r\n').filter((r) => r !== '');
    expect(righeEn).toHaveLength(8);
    expect(righeEn[0].split(',')).toHaveLength(10);
    expect(righeEn[1]).toContain(',-9.3,');
    expect(en).not.toContain(';');
});

/* ---------------- §6.8 condividi e copia ---------------- */

const TESTO_PERCHE = ['Perché', 'BPM 128 · C maggiore (8B)', '-9,3 LUFS · -0,8 dBTP · LRA 6,1 LU', '3:42 · File'].join('\n');

test('§6.8 navigator.share riceve le 4 righe; Copia copia lo stesso testo', async ({ page }) => {
    await page.addInitScript(() => {
        window.__condiviso = null;
        window.__copiato = null;
        Object.defineProperty(Navigator.prototype, 'share', {
            configurable: true,
            value: function (d) { window.__condiviso = d; return Promise.resolve(); }
        });
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => false });
        const appunti = { writeText: (s) => { window.__copiato = s; return Promise.resolve(); } };
        Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => appunti });
    });
    await conS(page, '/dna/' + hashDi(ID.perche));
    await expect(page.locator('#dna-share')).toBeVisible();
    await page.locator('#dna-share').click();
    await expect.poll(() => page.evaluate(() => window.__condiviso && window.__condiviso.text)).toBe(TESTO_PERCHE);
    await page.locator('#dna-copy').click();
    await expect.poll(() => page.evaluate(() => window.__copiato)).toBe(TESTO_PERCHE);
});

test('§6.8 senza navigator.share «Condividi» non c’e’', async ({ page }) => {
    await page.addInitScript(() => {
        try { delete Navigator.prototype.share; } catch (e) { /* niente */ }
        try { Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined }); } catch (e) { /* niente */ }
    });
    await conS(page, '/dna/' + hashDi(ID.perche));
    await expect(page.locator('#dna-result')).toBeVisible();
    await expect(page.locator('#dna-share')).toHaveCount(1);
    await expect(page.locator('#dna-share')).toBeHidden();
});

/* ---------------- §6.9 ÷2/×2 nel record ---------------- */

test('§6.9 ×2 resta dopo il reload, con segment e spiegazione', async ({ page }) => {
    await conS(page, '/dna/' + hashDi(ID.minore));
    await expect(page.locator('#dna-bpm')).toHaveText('70');
    await expect(page.locator('#dna-bpm-alt')).toBeVisible();
    /* finche' c'e' la riga del primo avvio, la spiegazione del ÷2/×2 aspetta */
    await expect(page.locator('#tb-hint')).toBeVisible();
    await expect(page.locator('#dna-fold-hint')).toBeHidden();
    await page.locator('#tb-hint .tb-hint-close').click();
    await expect(page.locator('#tb-hint')).toBeHidden();
    await expect(page.locator('#dna-fold-hint')).toBeVisible();
    await page.locator('#dna-bpm-alt [data-dna-fold="2"]').click();
    await expect(page.locator('#dna-bpm')).toHaveText('140');
    await expect.poll(() => modulo(page, 'return (await m.leggi(\'dna\', arg)).bpm;', ID.minore)).toBe(140);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(800);
    await expect(page.locator('#dna-bpm')).toHaveText('140');
    await expect(page.locator('#dna-bpm-alt')).toBeVisible();
    await expect(page.locator('#dna-fold-hint')).toBeVisible();
});

/* ---------------- §6.10 glossario ---------------- */

test('§6.10 A: riga del glossario, niente foglio; «×» la ricorda; la «i» la chiude', async ({ page }) => {
    test.setTimeout(150000);
    await analizzaA(page);
    await expect(page.locator('#dna-lufs-hint')).toBeVisible();
    await expect(page.locator('.tb-sheet:not([hidden])')).toHaveCount(0);
    await page.locator('#dna-lufs-hint-close').click();
    await expect(page.locator('#dna-lufs-hint')).toBeHidden();

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await expect(page.locator('#dna-result')).toBeVisible();
    await expect(page.locator('#dna-lufs-hint')).toBeHidden();

    await page.evaluate(() => window.localStorage.removeItem('tt.dna.glossario-visto'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await expect(page.locator('#dna-lufs-hint')).toBeVisible();
    await page.locator('.tb-info[aria-controls="dna-lufs-info"]').click();
    await expect(page.locator('#dna-lufs-hint')).toBeHidden();
    expect(await page.evaluate(() => window.localStorage.getItem('tt.dna.glossario-visto'))).toBe('true');
});

/* ---------------- §6.11 tip sulle icone ---------------- */

test('§6.11 tocco lungo (mobile) / hover (desktop) su matita, confronta, elimina: tip e nessuna azione', async ({ page, tocco }) => {
    await conS(page, '/dna/' + hashDi(ID.perche));
    await expect(page.locator('#dna-result')).toBeVisible();
    const r = riga(page, ID.sette);
    for (const cls of ['.dna-history-rename', '.dna-history-compare', '.dna-history-del']) {
        const icona = r.locator(cls);
        await icona.scrollIntoViewIfNeeded();
        const box = await icona.boundingBox();
        expect(box, cls + ' senza riquadro').not.toBeNull();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        if (tocco.mobile) {
            await tocco.trascina(x, y, x, y, 32);   // ~500 ms fermi sul pulsante
        } else {
            await page.mouse.move(x, y);
            await page.waitForTimeout(600);
        }
        await expect(page.locator('.tb-tip'), 'nessun tip su ' + cls).toBeVisible();
        await expect(page.locator('.tb-tip')).not.toHaveText('');
        if (!tocco.mobile) await page.mouse.move(2, 2);
        await page.waitForTimeout(250);
    }
    await expect(righe(page)).toHaveCount(5);   // sotto il risultato: 5 + «Mostra tutte»
    await expect(page.locator('#dna-compare')).toBeHidden();
    await expect(page.locator('#dna-history .dna-history-input')).toHaveCount(0);
    expect(await modulo(page, 'return (await m.elenca(\'dna\')).length;')).toBe(7);
});

/* ---------------- §6.12 due dispositivi ---------------- */

test('§6.12 due contesti: la voce si apre sull’altro con #r=; eliminata li’ -> «Analisi non trovata» qui', async ({ page, browser }) => {
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
        await apri(page, '/dna/', { attesa: 300 });
        const codice = await modulo(page, 'const c = await s.creaCodice(); await s.collega(c); return c;');
        await semina(page);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');

        await apri(due, BASE + '/dna/', { attesa: 300 });
        await modulo(due, 'await s.collega(arg); await s.sincronizza();', codice);
        expect(await modulo(due, 'return !!(await m.leggi(\'dna\', arg));', ID.perche)).toBe(true);
        await carica(due, BASE + '/dna/' + hashDi(ID.perche));
        await expect(due.locator('#dna-result')).toBeVisible();
        await expect(due.locator('#dna-bpm')).toHaveText('128');
        expect(new URL(due.url()).hash).toBe(hashDi(ID.perche));

        await carica(page, '/dna/' + hashDi(ID.perche));
        await expect(page.locator('#dna-result')).toBeVisible();

        await modulo(due, 'await m.elimina(\'dna\', arg); await s.sincronizza();', ID.perche);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await expect(page.locator('.tb-toast', { hasText: 'Analisi non trovata' })).toBeVisible();
        await expect(page.locator('#dna-drop')).toBeVisible();
        expect(new URL(page.url()).hash).toBe('');
        await expect(righe(page)).toHaveCount(6);
    } finally {
        await contesto.close();
    }
});

/* ---------------- correzioni del validator ---------------- */

test('hash cambiato durante l’analisi, poi «Annulla»: niente #r= sopra la vista vuota', async ({ page }) => {
    test.setTimeout(120000);
    await conS(page);
    await page.locator('#dna-file').setInputFiles(file('prova-120.wav'));
    await expect(page.locator('#dna')).toHaveAttribute('data-dna-state', 'working');
    await page.evaluate((h) => { window.location.hash = h; }, hashDi(ID.perche));
    await page.waitForTimeout(300);
    await expect(page.locator('#dna')).toHaveAttribute('data-dna-state', 'working');
    await page.locator('#dna-cancel').click();
    await expect(page.locator('#dna-drop')).toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
    expect(await ultimo(page)).toBeNull();
});

test('÷2/×2 toccato mentre il primo salvataggio e’ in corso: resta dopo il reload', async ({ page }) => {
    test.setTimeout(150000);
    await apri(page, '/dna/', { attesa: 500 });
    await page.locator('#dna-file').setInputFiles(file('prova-120.wav'));
    await expect(page.locator('#dna')).toHaveAttribute('data-dna-state', 'working');
    /* una transazione readwrite tenuta aperta ferma il put del salvataggio */
    await page.evaluate(() => new Promise((ok, ko) => {
        const r = indexedDB.open('tiny-temple-toolbox');
        r.onerror = () => ko(r.error);
        r.onsuccess = () => {
            const os = r.result.transaction('records', 'readwrite').objectStore('records');
            const giro = () => { if (!window.__lascia) os.get(['x', 'y']).onsuccess = giro; };
            giro();
            ok();
        };
    }));
    await expect(page.locator('#dna-result')).toBeVisible({ timeout: 90000 });
    const prima = Number((await page.locator('#dna-bpm').textContent()).trim().replace(',', '.'));
    expect(new URL(page.url()).hash, 'il salvataggio non doveva essere gia’ finito').toBe('');
    await page.evaluate(() => document.querySelector('#dna-bpm-alt [data-dna-fold="2"]').click());
    const dopo = Number((await page.locator('#dna-bpm').textContent()).trim().replace(',', '.'));
    expect(Math.abs(dopo - prima * 2)).toBeLessThanOrEqual(1);
    await page.evaluate(() => { window.__lascia = true; });
    await expect(page).toHaveURL(/#r=/);
    const id = decodeURIComponent(new URL(page.url()).hash.slice(3));
    await expect.poll(() => modulo(page, 'return Math.round((await m.leggi(\'dna\', arg)).bpm);', id)).toBe(dopo);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(900);
    await expect(page.locator('#dna-bpm')).toHaveText(String(dopo));
});

test('durata mancante o 0: CSV vuoto, testo «—»', async ({ page }) => {
    await apri(page, '/dna/', { attesa: 300 });
    const esito = await page.evaluate(async () => {
        const s = await import('/dna/storico.js');
        const base = { id: '2026-09-20T10:00:00.000Z', at: '2026-09-20T10:00:00.000Z', name: 'Vecchia', renamed: true,
            bpm: 100, tonic: 'C', mode: 'major', camelot: '8B', lufs: -10, truePeak: -1, lra: null, source: 'file' };
        return [0, undefined].map((seconds) => ({
            csv: s.csv([{ ...base, seconds }], { lingua: 'it' }).split('\r\n')[1].split(';')[8],
            testo: s.testoVoce({ ...base, seconds }).split('\n')[3]
        }));
    });
    esito.forEach((e) => {
        expect(e.csv).toBe('');
        expect(e.testo.startsWith('— · ')).toBe(true);
    });
});

/* ---------------- §6.13 impaginazione e inglese ---------------- */

test('§6.13 niente scroll orizzontale, bersagli >= 44 px, inglese senza chiavi crude', async ({ page }) => {
    await conS(page, '/dna/?lang=en' + hashDi(ID.perche));
    await expect(page.locator('#dna-result')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await nessunoScrollOrizzontale(page);
    await bersagliMinimi(page);

    const crude = await page.evaluate(() => {
        const out = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
            const el = n.parentElement;
            if (!el || el.closest('[hidden], script, style, template')) continue;
            if (/\b(dna|tb|mic)-[a-z0-9]+(-[a-z0-9]+)+\b/.test(n.data)) out.push(n.data.trim());
        }
        document.querySelectorAll('[aria-label], [placeholder], [data-tip]').forEach((el) => {
            ['aria-label', 'placeholder'].forEach((a) => {
                const v = el.getAttribute(a);
                if (v && /^(dna|tb|mic)-[a-z0-9-]+$/.test(v)) out.push(a + '=' + v);
            });
        });
        return out;
    });
    expect(crude, 'chiavi i18n mostrate crude').toEqual([]);
    await expect(page.locator('#dna-share')).toHaveCount(1);

    /* anche il confronto, aperto, sta nella pagina */
    await riga(page, ID.sette).locator('.dna-history-compare').click();
    await expect(page.locator('#dna-compare')).toBeVisible();
    await nessunoScrollOrizzontale(page);
    await expect(page.locator('#dna-compare-table tr[data-dna-row="camelot"] .dna-compare-delta')).toContainText('compatible');

    await page.keyboard.press('Escape');
    await expect(page.locator('#dna-compare')).toBeHidden();

    /* e lo stato vuoto */
    await page.locator('#dna-again').click();
    await expect(page.locator('#dna-drop')).toBeVisible();
    await nessunoScrollOrizzontale(page);
    await bersagliMinimi(page);
});
