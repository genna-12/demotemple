/**
 * Metronomo «completo» (spec 21): criteri del §6 per M, mobile e desktop.
 *
 * L = i `detail` dell'evento `met-prenotato` su #met, raccolti in pagina:
 * sono i tempi CALCOLATI e passati allo scheduler (orologio dell'
 * AudioContext), non misurati. Percio' i confronti sono esatti (1e-6).
 *
 * I preset stanno nell'archivio (collezione `metronomo-preset`): la semina
 * passa da /shared/archivio.js come nei test del DNA (§6.12, due contesti).
 */

import {
    test, expect, apri, senzaIntro, BASE, bersagliMinimi, nessunoScrollOrizzontale, nessunErroreConsole
} from '../fixtures.mjs';

const COLL = 'metronomo-preset';
const EPS = 1e-6;

/** Esegue `corpo` nella pagina con `m` = archivio, `s` = sync, `arg`. */
function modulo(page, corpo, arg = null) {
    return page.evaluate('(async (arg) => { '
        + 'const m = await import(\'/shared/archivio.js\'); const s = await import(\'/shared/sync.js\'); '
        + corpo + '\n})(' + JSON.stringify(arg) + ')');
}

/** Preset di prova: id `p<n>` in ordine, dati completi. */
const preset = (n, nome, bpm, meter = '4/4', subdiv = 1, sound = 'legno', volume = 85) => ({
    id: 'p' + (1700000000000 + n), dati: { nome, bpm, meter, subdiv, sound, volume }
});

async function semina(page, voci) {
    await modulo(page, 'for (const v of arg) await m.scrivi(\'' + COLL + '\', v.id, v.dati);', voci);
}

const vivi = (page) => modulo(page, 'return (await m.elenca(\'' + COLL + '\')).map((r) => ({ id: r.id, ...r.dati }));');

/** Da qui in poi ogni `met-prenotato` finisce in `window.__prenotati` (solo nel test). */
async function raccogli(page) {
    await page.evaluate(() => {
        window.__prenotati = [];
        document.getElementById('met').addEventListener('met-prenotato', (e) => {
            window.__prenotati.push(e.detail);
        });
    });
}
const L = (page) => page.evaluate(() => (window.__prenotati || []).slice());
const azzeraL = (page) => page.evaluate(() => { window.__prenotati = []; });
async function aspettaL(page, n, timeout = 8000) {
    await expect.poll(async () => (await L(page)).length, { timeout }).toBeGreaterThanOrEqual(n);
    return L(page);
}

const righe = (page) => page.locator('#met-preset-list .met-preset');
const riga = (page, id) => page.locator('#met-preset-list .met-preset[data-met-preset="' + id + '"]');
const bpm = (page) => page.locator('#met-bpm').textContent().then((t) => Number(t.trim()));

/** BPM dalla tastiera della rotella (PageUp/Down = 5, frecce = 1). */
async function impostaBpm(page, n) {
    const wheel = page.locator('#met-wheel');
    await wheel.focus();
    let d = n - await bpm(page);
    while (Math.abs(d) >= 5) { await page.keyboard.press(d > 0 ? 'PageUp' : 'PageDown'); d += d > 0 ? -5 : 5; }
    while (d !== 0) { await page.keyboard.press(d > 0 ? 'ArrowUp' : 'ArrowDown'); d += d > 0 ? -1 : 1; }
    await expect(page.locator('#met-bpm')).toHaveText(String(n));
}

/** Prefs del metronomo (JSON in localStorage), poi un caricamento pulito. */
async function conPrefs(page, valori) {
    await page.evaluate((v) => {
        Object.entries(v).forEach(([k, x]) => window.localStorage.setItem('tt.metronomo.' + k, JSON.stringify(x)));
    }, valori);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
}

async function attaccoAcceso(page, tocco, on = true) {
    const b = page.locator('#met-countin');
    if ((await b.getAttribute('aria-checked')) !== String(on)) await tocco.elemento(b);
    await expect(b).toHaveAttribute('aria-checked', String(on));
}

async function avvia(page, tocco) {
    await tocco.elemento(page.locator('#met-toggle'));
    await expect(page.locator('#met-toggle')).toHaveAttribute('aria-pressed', 'true');
}
async function ferma(page, tocco) {
    await tocco.elemento(page.locator('#met-toggle'));
    await expect(page.locator('#met-toggle')).toHaveAttribute('aria-pressed', 'false');
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/metronomo/', { attesa: 500 });
});

/* ---------------- §6.1 salva, rinomina alla nascita, applica ---------------- */

test('§6.1 96, ottavi, «Salva preset» -> «Prove lente»; reload; 140 e tocco -> 96, ottavi, .is-current', async ({ page, tocco, spia }) => {
    await impostaBpm(page, 96);
    await tocco.elemento(page.locator('[data-met-sub="2"]'));
    await tocco.elemento(page.locator('#met-preset-save'));

    const input = page.locator('#met-preset-list .met-preset-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('96 · 4/4');
    await expect(input).toBeFocused();
    const tutto = await input.evaluate((el) => el.selectionStart === 0 && el.selectionEnd === el.value.length);
    expect(tutto, 'il nome proposto non e’ selezionato').toBe(true);
    await input.fill('Prove lente');
    await input.press('Enter');

    await expect(righe(page)).toHaveCount(1);
    await expect(righe(page).locator('.met-preset-name')).toHaveText('Prove lente');
    await expect(righe(page).locator('.met-preset-sum')).toHaveText('96 BPM · 4/4 · ottavi');
    await expect.poll(async () => (await vivi(page)).map((p) => p.nome)).toEqual(['Prove lente']);
    await page.waitForTimeout(500);   // le prefs del metronomo si scrivono dopo 400 ms

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(righe(page)).toHaveCount(1);
    await expect(righe(page).locator('.met-preset-name')).toHaveText('Prove lente');
    await expect(righe(page)).toHaveClass(/is-current/);

    await impostaBpm(page, 140);
    await tocco.elemento(page.locator('[data-met-sub="1"]'));
    await expect(righe(page)).not.toHaveClass(/is-current/);
    await tocco.elemento(righe(page).locator('.met-preset-apply'));
    await expect(page.locator('#met-bpm')).toHaveText('96');
    await expect(page.locator('[data-met-sub="2"]')).toHaveAttribute('aria-checked', 'true');
    await expect(righe(page)).toHaveClass(/is-current/);
    nessunErroreConsole(spia);
});

/* ---------------- §6.2 rinomina ---------------- */

test('§6.2 rinomina -> reload -> nome nuovo; Esc e vuoto non cambiano', async ({ page, tocco }) => {
    const p = preset(1, 'Strofa', 100);
    await semina(page, [p]);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const r = riga(page, p.id);
    const input = r.locator('.met-preset-input');

    await tocco.elemento(r.locator('.met-preset-rename'));
    await expect(input).toBeFocused();
    await input.fill('Ritornello');
    await input.press('Enter');
    await expect(r.locator('.met-preset-name')).toHaveText('Ritornello');
    await expect.poll(async () => (await vivi(page))[0].nome).toBe('Ritornello');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(r.locator('.met-preset-name')).toHaveText('Ritornello');

    /* Esc: niente cambia */
    await tocco.elemento(r.locator('.met-preset-rename'));
    await input.fill('Da buttare');
    await input.press('Escape');
    await expect(input).toHaveCount(0);
    await expect(r.locator('.met-preset-name')).toHaveText('Ritornello');

    /* vuoto: resta il nome di prima */
    await tocco.elemento(r.locator('.met-preset-rename'));
    await input.fill('   ');
    await input.press('Enter');
    await expect(r.locator('.met-preset-name')).toHaveText('Ritornello');
    await page.waitForTimeout(300);
    expect((await vivi(page))[0].nome).toBe('Ritornello');
});

test('§6.2 rinomina aperta e preset eliminato altrove: Invio non lo resuscita', async ({ page, tocco }) => {
    const p = preset(1, 'Strofa', 100);
    await semina(page, [p]);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const r = riga(page, p.id);
    await tocco.elemento(r.locator('.met-preset-rename'));
    const input = r.locator('.met-preset-input');
    await expect(input).toBeFocused();
    /* come se l'avesse eliminato un altro dispositivo (la sincronizzazione) */
    await modulo(page, 'await m.elimina(\'' + COLL + '\', arg, { origine: \'sync\' });', p.id);
    await input.fill('Ritornello');
    await input.press('Enter');
    await expect(righe(page)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await vivi(page)).toEqual([]);
});

test('§6.2 rinomina aperta, tocco su un’altra riga: applica e × fanno la loro azione', async ({ page, tocco }) => {
    const voci = [preset(1, 'Uno', 90), preset(2, 'Due', 150), preset(3, 'Tre', 70)];
    await semina(page, voci);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);

    await tocco.elemento(riga(page, voci[0].id).locator('.met-preset-rename'));
    await riga(page, voci[0].id).locator('.met-preset-input').fill('Primo');
    await tocco.elemento(riga(page, voci[1].id).locator('.met-preset-apply'));
    await expect(page.locator('#met-bpm')).toHaveText('150');
    await expect(riga(page, voci[1].id)).toHaveClass(/is-current/);
    await expect(riga(page, voci[0].id).locator('.met-preset-name')).toHaveText('Primo');

    await tocco.elemento(riga(page, voci[0].id).locator('.met-preset-rename'));
    await riga(page, voci[0].id).locator('.met-preset-input').fill('Primo bis');
    await tocco.elemento(riga(page, voci[2].id).locator('.met-preset-del'));
    await expect(righe(page)).toHaveCount(2);
    await expect(riga(page, voci[2].id)).toHaveCount(0);
    await expect(riga(page, voci[0].id).locator('.met-preset-name')).toHaveText('Primo bis');
    await expect.poll(async () => (await vivi(page)).map((x) => x.nome)).toEqual(['Primo bis', 'Due']);
});

/* ---------------- §6.3 elimina, Annulla, lapide ---------------- */

test('§6.3 × -> toast, «Annulla» -> stessa posizione; × e attesa -> lapide', async ({ page, tocco }) => {
    test.setTimeout(60000);
    const voci = [preset(1, 'Uno', 90), preset(2, 'Due', 100), preset(3, 'Tre', 110)];
    await semina(page, voci);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    const ordine = () => righe(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-met-preset')));
    expect(await ordine()).toEqual(voci.map((v) => v.id));

    await tocco.elemento(riga(page, voci[1].id).locator('.met-preset-del'));
    await expect(righe(page)).toHaveCount(2);
    const t = page.locator('.tb-toast', { hasText: 'Due' });
    await expect(t).toBeVisible();
    await tocco.elemento(t.locator('.tb-toast-action'));
    await expect(righe(page)).toHaveCount(3);
    await expect(t).toHaveCount(0);   // il toast se ne va (e non copre piu' le righe)
    expect(await ordine()).toEqual(voci.map((v) => v.id));
    await expect.poll(async () => (await vivi(page)).map((p) => p.id)).toEqual(voci.map((v) => v.id));
    const tornato = (await vivi(page)).find((p) => p.id === voci[1].id);
    expect(tornato).toEqual({ id: voci[1].id, ...voci[1].dati });

    await tocco.elemento(riga(page, voci[1].id).locator('.met-preset-del'));
    await expect(righe(page)).toHaveCount(2);
    await expect(page.locator('.tb-toast', { hasText: 'Due' })).toBeHidden({ timeout: 10000 });
    const lapide = await modulo(page, 'return (await m.elenca(\'' + COLL + '\', { conCancellati: true }))'
        + '.filter((r) => r.id === arg).map((r) => !!r.cancellato);', voci[1].id);
    expect(lapide).toEqual([true]);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(righe(page)).toHaveCount(2);
});

/* ---------------- §6.4 due contesti ---------------- */

test('§6.4 due contesti: il preset di 1 compare su 2 senza reload; eliminato su 2 sparisce da 1', async ({ page, tocco, browser }) => {
    test.setTimeout(90000);
    const contesto = await browser.newContext({ locale: 'it-IT' });
    const due = await contesto.newPage();
    await due.route('**/*', (route) => {
        const url = route.request().url();
        if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
        return route.abort();
    });
    await due.addInitScript(() => { try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ } });
    try {
        const codice = await modulo(page, 'const c = await s.creaCodice(); await s.collega(c); return c;');
        await apri(due, BASE + '/metronomo/', { attesa: 400 });
        await modulo(due, 'await s.collega(arg); await s.sincronizza();', codice);
        await expect(due.locator('#met-preset-list .met-preset')).toHaveCount(0);

        await tocco.elemento(page.locator('#met-preset-save'));
        await page.locator('#met-preset-list .met-preset-input').fill('Dal primo');
        await page.locator('#met-preset-list .met-preset-input').press('Enter');
        await expect.poll(async () => (await vivi(page)).map((p) => p.nome)).toEqual(['Dal primo']);
        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');

        expect(await modulo(due, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await expect(due.locator('#met-preset-list .met-preset')).toHaveCount(1);
        await expect(due.locator('#met-preset-list .met-preset-name')).toHaveText('Dal primo');

        await due.locator('#met-preset-list .met-preset-del').click();
        await expect(due.locator('#met-preset-list .met-preset')).toHaveCount(0);
        await expect.poll(async () => (await vivi(due)).length).toBe(0);
        expect(await modulo(due, 'return (await s.sincronizza()).esito;')).toBe('ok');

        expect(await modulo(page, 'return (await s.sincronizza()).esito;')).toBe('ok');
        await expect(righe(page)).toHaveCount(0);
    } finally {
        await contesto.close();
    }
});

/* ---------------- §6.5 limite ---------------- */

test('§6.5 200 preset -> «Salva» -> «Sei al massimo…», nessuna riga nuova', async ({ page, tocco }) => {
    test.setTimeout(90000);
    const voci = Array.from({ length: 200 }, (_, i) => preset(i, 'P' + i, 60 + (i % 200)));
    await semina(page, voci);
    await page.reload({ waitUntil: 'load' });
    await expect(righe(page)).toHaveCount(200, { timeout: 15000 });
    await tocco.elemento(page.locator('#met-preset-save'));
    await expect(page.locator('#met-preset-status')).toHaveText('Sei al massimo: eliminane uno per salvarne un altro.');
    await expect(page.locator('#met-preset-list .met-preset-input')).toHaveCount(0);
    await expect(righe(page)).toHaveCount(200);
    expect((await vivi(page)).length).toBe(200);
});

/* ---------------- §6.6-6.8 battuta d'attacco ---------------- */

test('§6.6 120, 4/4, ottavi, attacco: 4 count, poi accent a +2,000 s, sub a +0,25; .is-count solo durante', async ({ page, tocco }) => {
    await conPrefs(page, { bpm: 120, meter: '4/4', subdiv: 2 });
    await attaccoAcceso(page, tocco);
    await raccogli(page);
    await avvia(page, tocco);
    await expect(page.locator('#met-dots')).toHaveClass(/is-count/);
    const l = await aspettaL(page, 6);
    expect(l.slice(0, 4).map((x) => x.kind)).toEqual(['count', 'count', 'count', 'count']);
    expect(l.slice(0, 4).map((x) => x.pulse)).toEqual([0, 1, 2, 3]);
    expect(l[4].kind).toBe('accent');
    expect(l[4].pulse).toBe(0);
    expect(Math.abs(l[4].time - l[0].time - 2)).toBeLessThan(EPS);
    expect(l.slice(0, 4).some((x) => x.kind === 'sub')).toBe(false);
    expect(l[5].kind).toBe('sub');
    expect(Math.abs(l[5].time - l[4].time - 0.25)).toBeLessThan(EPS);
    await expect(page.locator('#met-dots')).not.toHaveClass(/is-count/, { timeout: 4000 });
    await ferma(page, tocco);
});

test('§6.7 +5 dopo L[1]: esattamente 4 count, intervalli 0,5 o 0,48 non crescenti', async ({ page, tocco }) => {
    await conPrefs(page, { bpm: 120, meter: '4/4', subdiv: 1 });
    await attaccoAcceso(page, tocco);
    await raccogli(page);
    await avvia(page, tocco);
    await aspettaL(page, 2);
    await tocco.elemento(page.locator('[data-met-step="+5"]'));
    await expect(page.locator('#met-bpm')).toHaveText('125');
    const l = await aspettaL(page, 7);
    expect(l.filter((x) => x.kind === 'count')).toHaveLength(4);
    expect(l.slice(0, 4).every((x) => x.kind === 'count')).toBe(true);
    const passi = [];
    for (let i = 1; i <= 4; i++) passi.push(l[i].time - l[i - 1].time);
    passi.forEach((p) => {
        expect(Math.abs(p - 0.5) < EPS || Math.abs(p - 0.48) < EPS, 'intervallo ' + p).toBe(true);
    });
    for (let i = 1; i < passi.length; i++) expect(passi[i]).toBeLessThanOrEqual(passi[i - 1] + EPS);
    expect(Math.abs(passi[3] - 0.48), 'il BPM nuovo non vale dal click dopo').toBeLessThan(EPS);
    await ferma(page, tocco);
});

test('§6.8 cambi in corsa senza attacco; stop/avvia -> 4; spento -> accent; la scelta resta', async ({ page, tocco }) => {
    await conPrefs(page, { bpm: 120, meter: '4/4', subdiv: 1 });
    await attaccoAcceso(page, tocco);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(page.locator('#met-countin')).toHaveAttribute('aria-checked', 'true');

    await raccogli(page);
    await avvia(page, tocco);
    await aspettaL(page, 6);
    await tocco.elemento(page.locator('[data-met-step="+5"]'));
    await tocco.elemento(page.locator('[data-met-meter="3/4"]'));
    await tocco.elemento(page.locator('[data-met-sub="2"]'));
    await tocco.elemento(page.locator('[data-met-sound="beep"]'));
    const n = (await L(page)).length;
    await aspettaL(page, n + 4);
    expect((await L(page)).filter((x) => x.kind === 'count')).toHaveLength(4);
    await ferma(page, tocco);

    await azzeraL(page);
    await avvia(page, tocco);
    const l = await aspettaL(page, 5);
    expect(l.slice(0, 3).map((x) => x.kind)).toEqual(['count', 'count', 'count']); // 3/4: tre click
    expect(l[3].kind).toBe('accent');
    await ferma(page, tocco);

    await attaccoAcceso(page, tocco, false);
    await azzeraL(page);
    await avvia(page, tocco);
    const s = await aspettaL(page, 1);
    expect(s[0].kind).toBe('accent');
    await ferma(page, tocco);

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(page.locator('#met-countin')).toHaveAttribute('aria-checked', 'false');
});

/* ---------------- §6.9 scaletta ---------------- */

test('§6.9 tre preset in corsa: «Avanti» -> il primo evento col BPM nuovo e’ il battere; ultimo disabilitato; con uno solo nascosto', async ({ page, tocco }) => {
    const voci = [preset(1, 'Intro', 100), preset(2, 'Strofa', 140, '3/4'), preset(3, 'Coda', 80, '4/4', 2)];
    await semina(page, voci);
    await conPrefs(page, { bpm: 120, meter: '4/4', subdiv: 1, countin: false });
    const next = page.locator('#met-preset-next');
    const sub = page.locator('#met-preset-next-sub');
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    await expect(sub, 'nessun applicato: «Avanti» porta al primo').toHaveText('prossimo: Intro');

    await raccogli(page);
    await avvia(page, tocco);
    await aspettaL(page, 2);
    for (const v of voci) {
        await tocco.elemento(next);
        await expect(page.locator('#met-bpm')).toHaveText(String(v.dati.bpm));
        await expect.poll(async () => (await L(page)).some((x) => x.bpm === v.dati.bpm), { timeout: 6000 }).toBe(true);
        const primo = (await L(page)).find((x) => x.bpm === v.dati.bpm);
        expect(primo.pulse, 'preset ' + v.dati.nome + ' non sul battere').toBe(0);
        expect(primo.kind).toBe('accent');
        await expect(riga(page, v.id)).toHaveClass(/is-current/);
        const dopo = voci[voci.indexOf(v) + 1];
        await expect(sub).toHaveText(dopo ? 'prossimo: ' + dopo.dati.nome : '');
    }
    await expect(next).toBeDisabled();

    /* rinomina ed eliminazione aggiornano il sottotitolo */
    await tocco.elemento(riga(page, voci[1].id).locator('.met-preset-apply'));
    await expect(sub).toHaveText('prossimo: Coda');
    await tocco.elemento(riga(page, voci[2].id).locator('.met-preset-rename'));
    await riga(page, voci[2].id).locator('.met-preset-input').fill('Finale');
    await riga(page, voci[2].id).locator('.met-preset-input').press('Enter');
    await expect(sub).toHaveText('prossimo: Finale');
    await tocco.elemento(riga(page, voci[2].id).locator('.met-preset-del'));
    await expect(next).toBeDisabled();
    await expect(sub).toHaveText('');
    await tocco.elemento(page.locator('.tb-toast .tb-toast-action'));
    await expect(sub).toHaveText('prossimo: Finale');
    await ferma(page, tocco);

    await modulo(page, 'await m.elimina(\'' + COLL + '\', arg[0]); await m.elimina(\'' + COLL + '\', arg[1]);', [voci[0].id, voci[1].id]);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await expect(righe(page)).toHaveCount(1);
    await expect(next).toBeHidden();
});

/* ---------------- §6.13 lingua, tip, bersagli, piega ---------------- */

test('§6.13 ?lang=en completo, tip sulle icone dei preset, bersagli ≥ 44 px, Avvia sopra la piega', async ({ page, tocco }) => {
    await semina(page, [preset(1, 'Slow', 96, '4/4', 2)]);
    await apri(page, '/metronomo/?lang=en', { attesa: 500 });
    await expect(page.locator('#met-countin')).toHaveAttribute('role', 'switch');
    await expect(page.locator('#met-countin')).toHaveAttribute('aria-labelledby', 'met-countin-label');
    await expect(page.locator('#met-countin-label')).toContainText('Count-in');
    await expect(page.locator('#met-countin-label')).toContainText('one bar before the click');
    await expect(page.locator('#met-preset-save')).toHaveText('Save preset');
    await expect(page.locator('#met-preset-next')).toBeHidden();   // un preset solo
    /* completo: ogni [data-i18n] della pagina ha il testo inglese del dizionario */
    const diversi = await page.evaluate(async () => {
        const en = (await import('/metronomo/i18n.js')).default.en;
        const common = (await import('/shared/i18n-common.js')).default.en;
        const out = [];
        document.querySelectorAll('main [data-i18n]').forEach((el) => {
            const k = el.getAttribute('data-i18n');
            const atteso = k in en ? en[k] : common[k];
            if (atteso === undefined || /\{\w+\}/.test(atteso) || el.children.length) return;
            if (el.textContent.trim() !== atteso.trim()) out.push(k + ': ' + el.textContent.trim());
        });
        return out;
    });
    expect(diversi, 'testi non tradotti con ?lang=en').toEqual([]);
    await expect(page.locator('#met-tap .met-btn-sub')).not.toHaveText('');
    await expect(page.locator('#met-count .met-btn-sub')).toHaveText('full screen');
    await expect(page.locator('.met-hint')).toContainText('Spacebar to start');   /* solo desktop; il consiglio sulla rotella e' l'hint di aiuto.js */
    await expect(page.locator('#met-presets h2')).toHaveText('Presets');
    await expect(righe(page).locator('.met-preset-sum')).toHaveText('96 BPM · 4/4 · eighths');
    await expect(righe(page).locator('.met-preset-rename')).toHaveAttribute('aria-label', 'Rename');
    await expect(righe(page).locator('.met-preset-del')).toHaveAttribute('aria-label', 'Delete');

    for (const cls of ['.met-preset-rename', '.met-preset-del']) {
        const icona = righe(page).locator(cls);
        await icona.scrollIntoViewIfNeeded();
        const box = await icona.boundingBox();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        if (tocco.mobile) await tocco.trascina(x, y, x, y, 32);   // ~500 ms fermi: tocco lungo
        else { await page.mouse.move(x, y); await page.waitForTimeout(600); }
        await expect(page.locator('.tb-tip'), 'nessun tip su ' + cls).toBeVisible();
        await expect(page.locator('.tb-tip')).toHaveText(cls === '.met-preset-del' ? 'Delete' : 'Rename');
        if (!tocco.mobile) await page.mouse.move(2, 2);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
    }
    await expect(righe(page)).toHaveCount(1);   // il tocco lungo non ha eliminato niente

    await page.evaluate(() => window.scrollTo(0, 0));
    await bersagliMinimi(page);
    await nessunoScrollOrizzontale(page);

    await apri(page, '/metronomo/', { attesa: 400 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const t = await page.locator('#met-toggle').boundingBox();
    expect(t, '#met-toggle senza riquadro').not.toBeNull();
    expect(t.y + t.height, '#met-toggle sotto la piega a 390×844').toBeLessThanOrEqual(844);
});
