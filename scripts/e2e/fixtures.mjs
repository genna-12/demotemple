/**
 * Tiny Temple Toolbox - attrezzi comuni dei test end-to-end (spec 18 §8).
 *
 * Tre cose:
 *
 *  1. BLOCCO DI RETE. `page.route('**\/*')` lascia passare solo
 *     `http://127.0.0.1:4321/**` (piu' `data:` e `blob:`, che non sono rete):
 *     qualunque altro host viene fermato e FA FALLIRE il test. E' il modo
 *     meccanico di tenere fede al vincolo "niente terzi" di CLAUDE.md.
 *
 *  2. TOCCO VERO. Nel progetto `mobile` si tocca via CDP
 *     `Input.dispatchTouchEvent` con raggio 12 px - un dito, non un puntatore
 *     ideale: e' l'aggiustamento del bersaglio di Chromium a far emergere i
 *     difetti che `click()` non vede mai (audit §2.1). Nel progetto `desktop`
 *     le stesse chiamate diventano mouse.
 *
 *  3. CONTROLLI RIUSABILI: `nessunErroreConsole`, `nessunoScrollOrizzontale`,
 *     `bersagliMinimi`, `focusVisibile`, `persistenza`.
 *
 * Tutto in italiano, come il resto del progetto.
 */

import { test as base, expect } from '@playwright/test';

export { expect };

export const BASE = 'http://127.0.0.1:4321';

/** Le sette pagine della Toolbox, piu' la 404. */
export const PAGINE = [
    { percorso: '/', nome: 'dashboard' },
    { percorso: '/metronomo/', nome: 'metronomo' },
    { percorso: '/accordatore/', nome: 'accordatore' },
    { percorso: '/calcolatore-tempo/', nome: 'calcolatore-tempo' },
    { percorso: '/dna/', nome: 'dna' },
    { percorso: '/penna/', nome: 'penna' },
    { percorso: '/pianificatore-uscita/', nome: 'pianificatore-uscita' },
    { percorso: '/404', nome: '404', stato404: true }
];

const interna = (url) => url.startsWith(BASE + '/') || url === BASE
    || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:');

/* ============================================================
   Fixtures
   ============================================================ */

export const test = base.extend({
    /**
     * Sempre attiva: blocca la rete verso l'esterno e raccoglie gli errori di
     * console. Le richieste fuori sede fanno fallire il test in uscita, senza
     * che il test debba chiedere niente.
     */
    spia: [async ({ page }, use) => {
        const errori = [];
        const fuori = [];

        page.on('console', (m) => {
            if (m.type() === 'error') errori.push(m.text());
        });
        page.on('pageerror', (e) => {
            errori.push('pageerror: ' + ((e && e.message) || String(e)));
        });
        page.on('requestfailed', (r) => {
            const u = r.url();
            if (interna(u)) return;             // gia' contato come "fuori"
        });

        await page.route('**/*', (route) => {
            const url = route.request().url();
            if (interna(url)) return route.continue();
            fuori.push(url);
            return route.abort();
        });

        const spia = {
            errori,
            fuori,
            /** Gli errori raccolti finora, meno quelli che il test accetta. */
            filtrati(consentiti = []) {
                return errori.filter((e) => !consentiti.some((c) => (
                    c instanceof RegExp ? c.test(e) : e.includes(c)
                )));
            },
            azzera() { errori.length = 0; }
        };

        await use(spia);

        expect(fuori, 'la pagina ha chiamato host fuori da 127.0.0.1:4321').toEqual([]);
    }, { auto: true }],

    /**
     * `tocco.elemento(locator)` e compagnia: dito vero su `mobile`, mouse su
     * `desktop`. Un solo CDPSession per test.
     */
    tocco: async ({ page }, use, testInfo) => {
        const mobile = testInfo.project.name === 'mobile';
        const cdp = mobile ? await page.context().newCDPSession(page) : null;

        const punti = (x, y) => [{
            x: Math.round(x), y: Math.round(y),
            radiusX: 12, radiusY: 12, force: 1, id: 1
        }];

        async function giu(x, y) {
            if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: punti(x, y) });
            else { await page.mouse.move(x, y); await page.mouse.down(); }
        }
        async function muovi(x, y) {
            if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: punti(x, y) });
            else await page.mouse.move(x, y);
        }
        async function su(x, y) {
            if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            else await page.mouse.up();
        }

        const centro = async (locator) => {
            await locator.scrollIntoViewIfNeeded().catch(() => { /* gia' a vista */ });
            const box = await locator.boundingBox();
            expect(box, 'elemento senza riquadro: non si puo' + '’' + ' toccare').not.toBeNull();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        };

        const tocco = {
            mobile,
            /** Un tocco secco alle coordinate della finestra. */
            async punto(x, y) {
                await giu(x, y);
                await page.waitForTimeout(40);
                await su(x, y);
            },
            /** Un tocco secco al centro dell'elemento. */
            async elemento(locator, scarto = { dx: 0, dy: 0 }) {
                const c = await centro(locator);
                await tocco.punto(c.x + (scarto.dx || 0), c.y + (scarto.dy || 0));
            },
            /** Un trascinamento da (x0,y0) a (x1,y1) in `passi` passaggi. */
            async trascina(x0, y0, x1, y1, passi = 12) {
                await giu(x0, y0);
                for (let i = 1; i <= passi; i++) {
                    await muovi(x0 + ((x1 - x0) * i) / passi, y0 + ((y1 - y0) * i) / passi);
                    await page.waitForTimeout(16);
                }
                await su(x1, y1);
            },
            /**
             * Trascinamento che parte da una FRAZIONE della larghezza di un
             * elemento (0 = bordo sinistro, 1 = bordo destro): serve alla
             * rotella BPM, dove il 5 % e il 95 % sono i punti morti
             * dell'audit §2.1.
             */
            async trascinaDa(locator, frazione, dx) {
                const box = await locator.boundingBox();
                expect(box, 'elemento senza riquadro').not.toBeNull();
                const y = box.y + box.height / 2;
                const x0 = box.x + box.width * frazione;
                await tocco.trascina(x0, y, x0 + dx, y);
            }
        };

        await use(tocco);
        if (cdp) await cdp.detach().catch(() => { /* pagina gia' chiusa */ });
    }
});

/* ============================================================
   Controlli riusabili
   ============================================================ */

/**
 * Nessun errore in console (e nessuna eccezione non catturata).
 * `consentiti` accetta stringhe o espressioni regolari.
 */
export function nessunErroreConsole(spia, consentiti = []) {
    expect(spia.filtrati(consentiti), 'errori in console').toEqual([]);
}

/** Niente scroll orizzontale: nessun elemento sborda a destra o a sinistra. */
export async function nessunoScrollOrizzontale(page) {
    const esito = await page.evaluate(() => {
        const doc = document.documentElement;
        const largo = doc.clientWidth;
        const colpevoli = [];
        if (doc.scrollWidth > largo + 1) {
            for (const el of document.querySelectorAll('body *')) {
                const s = getComputedStyle(el);
                if (s.display === 'none' || s.visibility === 'hidden') continue;
                if (s.position === 'fixed') continue;          // le barre fisse non muovono la pagina
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;
                if (r.right > largo + 1 || r.left < -1) {
                    colpevoli.push(
                        (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
                            + (el.className && typeof el.className === 'string'
                                ? '.' + el.className.trim().split(/\s+/).join('.') : ''))
                        + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']'
                    );
                }
                if (colpevoli.length >= 6) break;
            }
        }
        return { scrollWidth: doc.scrollWidth, clientWidth: largo, colpevoli };
    });
    expect(
        esito.scrollWidth,
        'scroll orizzontale (' + esito.scrollWidth + ' > ' + esito.clientWidth + '): '
        + (esito.colpevoli.join(' | ') || 'nessun colpevole individuato')
    ).toBeLessThanOrEqual(esito.clientWidth + 1);
}

/**
 * Ogni bersaglio toccabile visibile misura almeno `min` px per lato
 * (spec 18 §7.9, WCAG 2.5.8 "Target Size (Minimum)"). Si guardano i comandi
 * veri: pulsanti, campi, caselle, voci di elenco con un ruolo.
 *
 * Restano fuori, come la norma stessa prevede:
 *  - i collegamenti scritti DENTRO una frase (il "Privacy" nella riga del
 *    footer e' testo, non un bersaglio: eccezione "inline" di 2.5.8);
 *  - le etichette `<label>` che non fanno da pulsante (il comando vero e'
 *    il campo, e quello si misura per conto suo);
 *  - tutto cio' che e' nascosto, `aria-hidden` o fuori dal giro del Tab.
 */
export async function bersagliMinimi(page, min = 44) {
    const piccoli = await page.evaluate((minimo) => {
        const SELETTORE = [
            'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
            '[role="button"]', '[role="radio"]', '[role="option"]', '[role="switch"]',
            '[role="tab"]', 'a[href]', 'label.tb-btn'
        ].join(',');
        const out = [];
        for (const el of document.querySelectorAll(SELETTORE)) {
            if (el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) continue;
            if (el.closest('.sr-only') || el.classList.contains('sr-only')) continue;
            if (el.getAttribute('tabindex') === '-1') continue;
            if (el.disabled) continue;
            const s = getComputedStyle(el);
            if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue;
            /* un collegamento in mezzo al testo e' testo, non un bersaglio */
            if (el.tagName === 'A' && !el.matches('.tb-btn, .tb-tile, .tb-menu-link, .tb-menu-item')) {
                if (s.display === 'inline' || s.display === 'contents') continue;
                const frase = el.closest('p, li, .tb-footer');
                if (frase && frase.textContent.trim().length > el.textContent.trim().length + 3) continue;
            }
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            /* il bersaglio puo' essere allargato dal genitore (padding o ::before) */
            const w = Math.max(r.width, el.offsetWidth || 0);
            const h = Math.max(r.height, el.offsetHeight || 0);
            if (w + 0.5 < minimo || h + 0.5 < minimo) {
                out.push({
                    chi: el.tagName.toLowerCase()
                        + (el.id ? '#' + el.id : '')
                        + (typeof el.className === 'string' && el.className.trim()
                            ? '.' + el.className.trim().split(/\s+/)[0] : ''),
                    testo: (el.textContent || '').trim().slice(0, 20),
                    w: Math.round(w), h: Math.round(h)
                });
            }
        }
        return out;
    }, min);
    expect(
        piccoli.map((p) => p.chi + ' "' + p.testo + '" ' + p.w + 'x' + p.h),
        'bersagli sotto ' + min + ' px'
    ).toEqual([]);
}

/**
 * Il fuoco da tastiera si vede: i primi `quanti` elementi raggiunti con Tab
 * hanno un contorno o un'ombra che li distingue.
 */
export async function focusVisibile(page, quanti = 8) {
    const senza = [];
    const visti = new Set();
    for (let i = 0; i < quanti; i++) {
        await page.keyboard.press('Tab');
        /* `.tb-btn` ha `transition: all .3s`, che anima anche il contorno:
           misurato subito, il contorno e' ancora largo zero. Si aspetta che
           la transizione finisca, altrimenti il controllo e' un lancio di dadi. */
        await page.waitForTimeout(360);
        const info = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const s = getComputedStyle(el);
            const contorno = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
            const ombra = s.boxShadow && s.boxShadow !== 'none';
            const bordo = s.borderColor;
            return {
                chi: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
                visibile: contorno || ombra,
                match: el.matches(':focus-visible'),
                bordo
            };
        });
        if (!info) break;
        if (visti.has(info.chi)) continue;
        visti.add(info.chi);
        if (info.match && !info.visibile) senza.push(info.chi);
    }
    expect(senza, 'elementi col fuoco da tastiera invisibile').toEqual([]);
    expect(visti.size, 'nessun elemento raggiungibile con Tab').toBeGreaterThan(0);
}

/**
 * imposta -> ricarica -> ritrova. `imposta` e `leggi` ricevono la pagina;
 * il valore letto dopo il ricaricamento deve essere quello impostato.
 */
export async function persistenza(page, imposta, leggi, atteso, { primaDi = 800 } = {}) {
    await imposta(page);
    /* quasi tutti gli strumenti scrivono le preferenze con un ritardo
       (il Metronomo 400 ms): ricaricare subito e' una gara persa in partenza */
    await page.waitForTimeout(primaDi);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(250);
    const dopo = await leggi(page);
    expect(dopo, 'valore non sopravvissuto al ricaricamento').toBe(atteso);
    return dopo;
}

/* ============================================================
   Piccoli aiuti
   ============================================================ */

/** Apre una pagina e aspetta che i moduli abbiano montato tutto. */
export async function apri(page, percorso, { attesa = 300 } = {}) {
    const risposta = await page.goto(percorso, { waitUntil: 'load' });
    await page.waitForTimeout(attesa);
    return risposta;
}

/** Salta l'intro (come farebbe la seconda apertura nella stessa sessione). */
export async function senzaIntro(page) {
    await page.addInitScript(() => {
        try { window.sessionStorage.setItem('tbIntro', '1'); } catch (e) { /* niente */ }
    });
}

/** Mette la lingua prima del primo paint, cosi' i testi attesi sono stabili. */
export async function lingua(page, valore = 'it') {
    await page.addInitScript((l) => {
        try { window.localStorage.setItem('tinyTempleLang', l); } catch (e) { /* niente */ }
    }, valore);
}

/** Aspetta che il service worker abbia preso il controllo della pagina. */
export async function serviceWorkerPronto(page, ms = 15000) {
    return page.evaluate(async (limite) => {
        if (!('serviceWorker' in navigator)) return false;
        const scaduto = new Promise((r) => setTimeout(() => r(false), limite));
        const pronto = (async () => {
            await navigator.serviceWorker.ready;
            if (navigator.serviceWorker.controller) return true;
            await new Promise((r) => {
                navigator.serviceWorker.addEventListener('controllerchange', r, { once: true });
            });
            return true;
        })();
        return Promise.race([pronto, scaduto]);
    }, ms);
}

/** Un identificatore diverso per ogni test: i quaderni non si pestano i piedi. */
export const esadecimale = (n) => Array.from({ length: n },
    () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
