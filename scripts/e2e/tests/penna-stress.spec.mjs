/**
 * Penna sotto sforzo: testi strani, lunghi, in altre lingue e scritture.
 *
 * Il contratto che si prova e' quello di spec 16 §4: la textarea, il mirror
 * #pen-lines (colori di rima e lettere) e la colonna #pen-gutter devono
 * restare allineati riga per riga, senza scroll orizzontale, qualunque cosa
 * si scriva e qualunque interruttore si tocchi.
 *
 * Alcuni test fissano difetti trovati nel collaudo del 23/09 e sono ROSSI
 * finche' il difetto c'e' (lo dice il nome: "[difetto 23/09]"):
 *   - l'altezza della textarea non scende mai (misuraRighe legge l'altezza
 *     di #pen-lines, che la griglia stira all'altezza della textarea);
 *   - Monospazio spento: i numeri restano con l'altezza vecchia;
 *   - la lettera di rima copre la fine dei versi lunghi;
 *   - la barra colorata copre il primo carattere del verso;
 *   - cambiare la lingua del testo non ricolora le rime.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
    test, expect, apri, senzaIntro, nessunoScrollOrizzontale, nessunErroreConsole
} from '../fixtures.mjs';

const PROVA = fs.readFileSync(
    fileURLToPath(new URL('../../../docs/toolbox/contenuti/testo-prova-canto.txt', import.meta.url)),
    'utf8'
).replace(/\r\n/g, '\n').replace(/\n+$/, '');

const PAROLA_80 = 'a'.repeat(40) + 'more' + 'x'.repeat(36);
const VERSO_200 = Array.from({ length: 40 }, (_, i) => ['cuore', 'amore', 'sole', 'mare', 'notte'][i % 5])
    .join(' ').slice(0, 200);

const TESTI = {
    prova: PROVA,
    lunghi: [PAROLA_80, 'amore mio ' + PAROLA_80, VERSO_200 + ' amore', VERSO_200 + ' cuore',
        'breve amore', 'X'.repeat(80) + ' dolore'].join('\n'),
    segni: ['', '', '   spazi davanti e dietro amore   ', '\tcon un tab\tdentro cuore', '...', '…',
        '!!! ??? ;;; ,,,', '«virgolette» “tipografiche” amore', 'l’amore e l\'amore',
        'parola – trattino — lungo (parentesi) [quadre] {graffe}', '', '   ', '\t\t', 'fine cuore'].join('\n'),
    maiuscole: ['AMORE CUORE DOLORE', 'IL MARE E IL SOLE', '123 456 7890', 'amore amore amore amore',
        'cuore dentro il cuore del cuore', 'SOLE sole Sole', 'dolore'].join('\n'),
    scritture: ['ti amo ❤️ amore', 'مرحبا بالعالم amore', '你好世界 cuore 👩‍👩‍👧‍👦', 'Привет мир dolore',
        '🎵🎶🎤🎸🥁🎹 sole', 'mare 🇮🇹 mare', 'ありがとう 家族 sole'].join('\n'),
    spagnolo: ['El niño soñaba con la mañana', 'Y la canción caía en la ventana',
        'Pingüino en el año de la pasión'].join('\n').normalize('NFD'),
    separatori: ['primo amore stessa riga cuore', 'nbsp   amore', 'zero​width dolore',
        'soft­hyphen­parola­lunghissima­che­va­a­capo sole'].join('\n')
};

const TRECENTO = Array.from({ length: 300 }, (_, i) => PROVA.split('\n')[i % 55]
    + (i % 7 === 0 ? ' e ancora una volta ci penso ma non mi fermo mai più' : '')).join('\n');

/* tempi dei callback di requestIdleCallback (render di numeri e colori) e
   di requestAnimationFrame (misuraRighe) */
function spiaTempi() {
    window.__tempi = [];
    const ric = window.requestIdleCallback;
    if (ric) {
        window.requestIdleCallback = (cb, o) => ric.call(window, (d) => {
            const t0 = performance.now(); cb(d);
            window.__tempi.push({ k: 'idle', ms: performance.now() - t0 });
        }, o);
    }
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => raf.call(window, (ts) => {
        const t0 = performance.now(); cb(ts);
        window.__tempi.push({ k: 'raf', ms: performance.now() - t0 });
    });
}

test.beforeEach(async ({ page }) => {
    await senzaIntro(page);
    await page.addInitScript(spiaTempi);
    await apri(page, '/penna/', { attesa: 600 });
    const vuoto = page.locator('#pen-list-empty-new');
    await (await vuoto.isVisible() ? vuoto : page.locator('#pen-new')).click();
    await expect(page.locator('#pen-text')).toBeVisible();
});

async function scrivi(page, testo) {
    await page.evaluate((v) => {
        const ta = document.getElementById('pen-text');
        ta.value = v;
        window.__tempi = [];
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, testo);
    await expect(page.locator('#pen-gutter > *')).toHaveCount(testo.split(/\r\n|\r|\n/).length);
    await page.waitForTimeout(350);
}

async function interruttore(page, id, acceso) {
    await page.evaluate(([i, on]) => {
        const c = document.getElementById(i);
        c.checked = on;
        c.dispatchEvent(new Event('change', { bubbles: true }));
    }, [id, acceso]);
    await page.waitForTimeout(400);
}

/** Tutte le misure del contratto spec 16 §4, in una volta. */
function misura(page) {
    return page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const lines = q('#pen-lines'), gut = q('#pen-gutter'), ta = q('#pen-text'),
            wrap = q('.pen-text-wrap'), body = q('.pen-body');
        const n = Math.min(lines.children.length, gut.children.length);
        let scarto = 0, dove = -1;
        for (let i = 0; i < n; i++) {
            const d = Math.abs(gut.children[i].getBoundingClientRect().top
                - lines.children[i].getBoundingClientRect().top);
            if (d > scarto) { scarto = d; dove = i; }
        }
        /* la textarea va a capo come il mirror? un clone per verso */
        const cs = getComputedStyle(ta);
        const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const clone = ta.cloneNode(false);
        clone.removeAttribute('id');
        Object.assign(clone.style, {
            height: '0px', visibility: 'hidden', position: 'absolute', top: '0', left: '0',
            width: ta.getBoundingClientRect().width + 'px'
        });
        wrap.appendChild(clone);
        const righe = ta.value.split('\n');
        const diverse = [];
        for (let i = 0; i < Math.min(righe.length, lines.children.length); i++) {
            clone.value = righe[i];
            const hT = clone.scrollHeight - pad;
            const hM = lines.children[i].getBoundingClientRect().height;
            if (Math.abs(hT - hM) > 2) diverse.push(i);
        }
        clone.value = ta.value;
        const contenuto = clone.scrollHeight;          // altezza "giusta" della textarea
        clone.remove();
        /* lettere di rima sopra al testo */
        const coperte = [];
        for (const L of lines.querySelectorAll('.pen-line')) {
            const lt = L.querySelector('.pen-lettera');
            if (!lt || getComputedStyle(lt).display === 'none' || !L.firstChild || L.firstChild.nodeType !== 3) continue;
            const lr = lt.getBoundingClientRect();
            const rg = document.createRange();
            rg.selectNodeContents(L.firstChild);
            if ([...rg.getClientRects()].some((r) => r.width >= 1 && r.left < lr.right && r.right > lr.left
                && r.top < lr.bottom && r.bottom > lr.top)) coperte.push(L.firstChild.data.slice(-20));
        }
        return {
            versi: righe.length, mirror: lines.children.length, numeri: gut.children.length,
            scarto, dove, diverse, coperte,
            altezzaTextarea: ta.getBoundingClientRect().height, contenuto,
            body: { sw: body.scrollWidth, cw: body.clientWidth },
            tempi: window.__tempi || []
        };
    });
}

for (const [nome, testo] of Object.entries(TESTI)) {
    test(`testo "${nome}": niente scroll orizzontale, numeri sui versi, textarea = mirror`, async ({ page, spia }) => {
        await scrivi(page, testo);
        const m = await misura(page);
        await nessunoScrollOrizzontale(page);
        expect(m.body.sw, 'il riquadro dell’editor scorre di lato').toBeLessThanOrEqual(m.body.cw + 1);
        expect([m.mirror, m.numeri], 'un verso senza riga nel mirror o senza numero').toEqual([m.versi, m.versi]);
        expect(m.scarto, `numero ${m.dove + 1} sfasato di ${m.scarto.toFixed(1)} px dal suo verso`).toBeLessThanOrEqual(2);
        expect(m.diverse, 'versi che nella textarea vanno a capo diversamente dal mirror').toEqual([]);
        nessunErroreConsole(spia);
    });
}

test('300 versi: allineati fino in fondo, render e misura veloci', async ({ page, spia }) => {
    await scrivi(page, TRECENTO);
    await page.waitForTimeout(400);
    const m = await misura(page);
    expect(m.numeri).toBe(300);
    expect(m.scarto, `numero ${m.dove + 1} sfasato di ${m.scarto.toFixed(1)} px`).toBeLessThanOrEqual(2);
    expect(Math.abs(m.altezzaTextarea - m.contenuto), 'textarea piu’ alta o piu’ bassa del testo').toBeLessThanOrEqual(2);
    const render = Math.max(0, ...m.tempi.filter((x) => x.k === 'idle').map((x) => x.ms));
    const misuraMs = Math.max(0, ...m.tempi.filter((x) => x.k === 'raf').map((x) => x.ms));
    test.info().annotations.push({ type: 'tempi', description: `render ${render.toFixed(1)} ms, misura ${misuraMs.toFixed(1)} ms` });
    /* 23/09: ~15-34 ms di render e ~2 ms di misura senza rallentamento
       della CPU; il margine e' largo apposta per le macchine lente */
    expect(render, 'renderGutter+renderColori troppo lenti a 300 versi').toBeLessThan(150);
    expect(misuraMs, 'misuraRighe troppo lenta a 300 versi').toBeLessThan(30);
    nessunErroreConsole(spia);
});

test('una modifica in mezzo al testo sposta numeri e colori con lei', async ({ page }) => {
    await scrivi(page, PROVA);
    const ta = page.locator('#pen-text');
    await ta.click();
    await page.evaluate(() => {
        const t = document.getElementById('pen-text');
        const p = t.value.split('\n').slice(0, 20).join('\n').length;
        t.setSelectionRange(p, p);
    });
    await page.keyboard.press('Enter');
    await page.keyboard.type('un verso nuovo per il cuore');
    await page.waitForTimeout(500);
    const esito = await page.evaluate(() => {
        const righe = document.getElementById('pen-text').value.split('\n');
        const L = [...document.getElementById('pen-lines').children];
        return {
            versi: righe.length,
            numeri: document.getElementById('pen-gutter').children.length,
            diversi: righe.filter((r, i) => !L[i] || (L[i].firstChild ? L[i].firstChild.data : '') !== r).length
        };
    });
    expect(esito).toEqual({ versi: 56, numeri: 56, diversi: 0 });
    const m = await misura(page);
    expect(m.scarto).toBeLessThanOrEqual(2);
});

test('incolla da Windows (\\r\\n) e da vecchio Mac (\\r): un numero per verso', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4321' });
    await page.locator('#pen-text').focus();
    await page.evaluate(() => navigator.clipboard.writeText('uno amore\r\ndue cuore\r\ntre\rquattro dolore'));
    await page.keyboard.press('Control+V');
    await page.waitForTimeout(500);
    await expect(page.locator('#pen-text')).toHaveValue('uno amore\ndue cuore\ntre\nquattro dolore');
    await expect(page.locator('#pen-gutter > *')).toHaveCount(4);
});

test('[difetto 23/09] cancellato il testo, la textarea torna corta (niente pagina vuota da scorrere)', async ({ page }) => {
    await scrivi(page, TRECENTO);
    await page.locator('#pen-text').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(700);
    const m = await misura(page);
    const schermo = await page.evaluate(() => ({
        alto: window.innerHeight, pagina: document.documentElement.scrollHeight
    }));
    /* 23/09: textarea e pagina restano alte 8-10 000 px (.pen-body cresce
       con la textarea, quindi la sua clientHeight non e' un riferimento) */
    expect(m.altezzaTextarea, 'la textarea resta alta come il testo di prima')
        .toBeLessThanOrEqual(Math.max(m.contenuto, schermo.alto) + 2);
    expect(schermo.pagina, 'la pagina scorre su migliaia di pixel vuoti').toBeLessThanOrEqual(schermo.alto * 2);
});

test('[difetto 23/09] Monospazio acceso e poi spento: i numeri restano sui loro versi', async ({ page }) => {
    await scrivi(page, TRECENTO);
    await interruttore(page, 'pen-mono', true);
    await interruttore(page, 'pen-mono', false);
    await page.waitForTimeout(300);
    const m = await misura(page);
    /* 23/09: 1191 px di scarto a 390 px, 340 px a 1366 px */
    expect(m.scarto, `numero ${m.dove + 1} sfasato di ${m.scarto.toFixed(1)} px dal suo verso`).toBeLessThanOrEqual(2);
});

test('Rime a colori e Metrico/Grammaticale su un testo lungo: niente sfasamenti', async ({ page }) => {
    await scrivi(page, TRECENTO);
    for (const passo of [
        () => interruttore(page, 'pen-colors', false),
        () => page.locator('[data-pen-count="grammaticale"]').evaluate((b) => b.click()),
        () => page.locator('[data-pen-count="metrico"]').evaluate((b) => b.click()),
        () => interruttore(page, 'pen-colors', true)
    ]) {
        await passo();
        await page.waitForTimeout(400);
        const m = await misura(page);
        expect(m.scarto).toBeLessThanOrEqual(2);
        expect(m.numeri).toBe(300);
    }
});

test('[difetto 23/09] la lettera di rima non copre la fine dei versi lunghi', async ({ page }) => {
    await scrivi(page, TESTI.lunghi);
    const m = await misura(page);
    expect(m.coperte, 'versi con la lettera di rima sopra le ultime lettere').toEqual([]);
});

test('[difetto 23/09] la barra colorata della rima non copre il primo carattere', async ({ page }) => {
    await scrivi(page, 'breve amore\nlieve dolore\nbello il cuore');
    const r = await page.evaluate(() => {
        const L = document.querySelector('#pen-lines .pen-line.pen-rima-0');
        const rg = document.createRange();
        rg.setStart(L.firstChild, 0);
        rg.setEnd(L.firstChild, 1);
        const barra = parseFloat(getComputedStyle(L).boxShadow.match(/(\d+(?:\.\d+)?)px 0px/)?.[1] || '3');
        return { carattere: rg.getBoundingClientRect().left, fineBarra: L.getBoundingClientRect().left + barra };
    });
    /* 23/09: la barra da 3 px sta sopra la "b" di "breve", che si legge "preve" */
    expect(r.carattere, 'il primo carattere sta sotto la barra colorata').toBeGreaterThanOrEqual(r.fineBarra);
});

test('[difetto 23/09] cambiare la lingua del testo ricolora le rime subito', async ({ page }) => {
    await scrivi(page, ['I cannot find the way', 'I walk alone today', 'Through the silent night', 'Searching for the light'].join('\n'));
    await page.evaluate(() => {
        const s = document.getElementById('pen-doc-lang');
        s.value = 'en';
        s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(800);
    const atteso = await page.evaluate(async () => {
        const { gruppiDiRima } = await import('/penna/penna.js');
        const { moduli } = await import('/shared/testo/lingue.js');
        const regole = await moduli('en');
        return gruppiDiRima(document.getElementById('pen-text').value, regole).map((g) => g.riga);
    });
    const colorate = await page.evaluate(() => [...document.querySelectorAll('#pen-lines .pen-line')]
        .map((l, i) => (/pen-rima-\d/.test(l.className) ? i : -1)).filter((i) => i >= 0));
    /* 23/09: con le regole inglesi way/today fanno rima, ma restano senza
       colore finche' non si preme un tasto (caricaRegoleDoc rifa' solo il gutter) */
    expect(colorate).toEqual(atteso);
});
