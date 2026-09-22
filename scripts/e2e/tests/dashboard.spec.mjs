/**
 * La dashboard: i primi dieci secondi (audit §1, spec 18 §7.1-§7.5).
 *
 * «Da telefono la dashboard si impalla» sono tre difetti diversi che
 * all'utente sembrano uno solo. Qui ognuno ha il suo test:
 *
 *   A - la Modifica e' un vicolo cieco: il tocco su una tile non fa NIENTE
 *       e non lo dice (dash.js:221-223).
 *   B - il velo dell'intro mangia i tocchi per circa un secondo, e poi ci
 *       passa sopra il logo (base.css:351-365, intro.js:97-105).
 *   C - un trascinamento che finisce fuori dalla griglia lascia una tile
 *       fantasma addosso alla vicina (dash.js:425, 192-204).
 *
 * I test di B e C NON aspettano: toccano quando toccherebbe una persona.
 */

import {
    test, expect, apri, senzaIntro, nessunErroreConsole
} from '../fixtures.mjs';

const PRIMA_TILE = '#tb-tiles li:first-child a.tb-tile';

/**
 * Apre la dashboard e tocca la prima tile a `ms` DALL'INIZIO DELL'INTRO.
 *
 * L'istante si conta dal battito del logo (`.tb-logo.is-pulse`, intro.js),
 * non dalla navigazione: e' quello il momento in cui l'app comincia a
 * esistere per chi guarda, ed e' l'unico riferimento che non si sposta
 * quando la macchina e' carica. Cosi' «a 300 ms» vuol dire sempre «mentre
 * l'intro sta ancora facendo il suo giro», su qualunque macchina.
 *
 * Tutto cio' che si puo' fare prima si fa prima: l'ascoltatore che registra
 * il tocco va in `addInitScript`, e l'attesa piu' la misura del riquadro
 * stanno in una chiamata sola, che ritorna esattamente al momento giusto.
 *
 * -> l'istante vero, contato dall'inizio dell'intro, in cui il dito e' sceso.
 */
async function toccaDopo(page, tocco, ms) {
    /* in sessionStorage, non in una variabile: se il tocco apre lo strumento
       la pagina cambia, e una variabile sparirebbe proprio nel caso che conta */
    await page.addInitScript(() => {
        const segna = () => {
            try {
                if (!sessionStorage.getItem('e2e-tocco')) {
                    sessionStorage.setItem('e2e-tocco', String(Math.round(performance.now())));
                }
            } catch (e) { /* niente */ }
        };
        addEventListener('touchstart', segna, { capture: true });
        addEventListener('mousedown', segna, { capture: true });
    });

    await page.goto('/', { waitUntil: 'commit' });

    const misura = await page.evaluate(async ({ sel, quando }) => {
        const attendi = (prova) => new Promise((ok) => {
            const giro = () => {
                const v = prova();
                if (v) return ok(v);
                requestAnimationFrame(giro);
            };
            giro();
        });
        /* il battito del logo e' l'inizio dell'intro; se l'intro non parte
           (reduced-motion, gia' vista) si ripiega sull'apertura della pagina */
        const scadenza = performance.now() + 5000;
        const via = await attendi(() => (document.querySelector('.tb-logo.is-pulse')
            ? performance.now()
            : (performance.now() > scadenza ? 0.001 : null)));
        const inizio = via === 0.001 ? 0 : via;
        await attendi(() => (performance.now() - inizio >= quando ? true : null));
        const el = await attendi(() => document.querySelector(sel));
        const r = el.getBoundingClientRect();
        return { inizio, x: r.left, y: r.top, width: r.width, height: r.height };
    }, { sel: PRIMA_TILE, quando: ms });
    expect(misura && misura.width, 'la prima tile non ha un riquadro').toBeTruthy();

    await tocco.punto(misura.x + misura.width / 2, misura.y + misura.height / 2);

    const segnato = await page
        .evaluate(() => {
            try { return Number(sessionStorage.getItem('e2e-tocco')); } catch (e) { return 0; }
        })
        .catch(() => 0);
    return Number.isFinite(segnato) && segnato > 0 ? Math.round(segnato - misura.inizio) : -1;
}

for (const ms of [300, 1000]) {
    test('una tile toccata a ' + ms + ' ms dall’inizio dell’intro apre lo strumento', async ({ page, tocco }) => {
        const istante = await toccaDopo(page, tocco, ms);
        /* la prima tile e' il Metronomo (shared/tools.js): se il velo
           dell'intro o il logo di passaggio si prendono il tocco, l'indirizzo
           resta la dashboard (o torna a lei) invece di cambiare */
        await expect(page, 'tocco a ' + istante + ' ms dall\u2019inizio dell\u2019intro: '
            + 'non ha aperto lo strumento. '
            + 'Se l’ha preso qualcun altro (velo dell’intro o logo in volo) '
            + 'l’indirizzo resta "/"')
            .toHaveURL(/\/metronomo\/?$/, { timeout: 6000 });
    });
}

/**
 * La stessa cosa dei due test qui sopra, ma misurata invece che toccata: nei
 * primi due secondi, chi c'e' sotto il dito al centro di una tile? Deve
 * esserci la tile. Oggi ci sono, a turno, il velo dell'intro (fino a ~1,1 s)
 * e il logo che attraversa in diagonale l'area delle prime due (fino a
 * ~2,1 s). Questo test non dipende da quanto e' carica la macchina: dice
 * l'istante e dice il colpevole.
 */
test('nei primi due secondi nessuno si mette davanti alle tile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.locator(PRIMA_TILE).waitFor({ state: 'attached', timeout: 10000 });

    const campioni = await page.evaluate(async () => {
        const nome = (el) => (el
            ? el.tagName.toLowerCase()
            + (el.id ? '#' + el.id : '')
            + (typeof el.className === 'string' && el.className.trim()
                ? '.' + el.className.trim().split(/\s+/)[0] : '')
            : 'niente');
        const attendi = (ms) => new Promise((ok) => {
            const giro = () => (performance.now() >= ms ? ok() : requestAnimationFrame(giro));
            giro();
        });
        const out = [];
        for (const istante of [250, 500, 750, 1000, 1250, 1500, 1750, 2000]) {
            await attendi(istante);
            const tiles = [...document.querySelectorAll('#tb-tiles li .tb-tile')];
            if (!tiles.length) { out.push({ istante, chi: 'nessuna tile', ok: false }); continue; }
            tiles.forEach((tile, n) => {
                const r = tile.getBoundingClientRect();
                if (!r.width || !r.height) return;
                const sopra = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                out.push({
                    istante,
                    chi: 'tile ' + (n + 1) + ' coperta da ' + nome(sopra),
                    ok: !!sopra && (sopra === tile || tile.contains(sopra))
                });
            });
        }
        return out;
    });

    const coperti = campioni.filter((c) => !c.ok);
    expect(
        coperti.map((c) => c.istante + ' ms: ' + c.chi),
        'qualcuno sta davanti alle tile nei primi due secondi'
    ).toEqual([]);
});

test.describe('Modifica', () => {
    test.beforeEach(async ({ page }) => {
        await senzaIntro(page);
        await apri(page, '/', { attesa: 400 });
    });

    test('toccare una tile in Modifica dice qualcosa (non il silenzio)', async ({ page, tocco }) => {
        const edit = page.locator('#tb-edit');
        await tocco.elemento(edit);
        await expect(edit).toHaveAttribute('aria-pressed', 'true');

        const prima = await page.locator('#tb-dash-live').textContent();
        await tocco.elemento(page.locator(PRIMA_TILE));
        await page.waitForTimeout(500);

        /* la navigazione resta ferma: quello e' voluto */
        await expect(page).toHaveURL(/\/$/);

        /* ...ma qualcosa deve dirlo. Vanno bene entrambe le forme previste
           dalla spec 18 §7.4: un avviso visibile (toast/barra) oppure una
           riga nuova nell'annuncio #tb-dash-live. */
        const esito = await page.evaluate((testoPrima) => {
            const live = document.getElementById('tb-dash-live');
            const nuovo = live && live.textContent.trim() && live.textContent !== testoPrima;
            const avvisi = [...document.querySelectorAll(
                '.tb-toast, [data-tb-toast], .tb-dash-bar, .tb-editing-bar, [role="status"]:not(.sr-only)'
            )].filter((el) => {
                if (el.hasAttribute('hidden')) return false;
                const s = getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden' && el.textContent.trim();
            }).map((el) => el.textContent.trim().slice(0, 40));
            return { nuovo: !!nuovo, avvisi };
        }, prima);

        expect(
            esito.nuovo || esito.avvisi.length > 0,
            'in Modifica il tocco su una tile non produce nessun segnale: '
            + 'niente toast, niente barra, niente annuncio'
        ).toBe(true);
    });

    test('«Fine» riporta la dashboard al lavoro', async ({ page, tocco }) => {
        const edit = page.locator('#tb-edit');
        await tocco.elemento(edit);
        await expect(edit).toHaveAttribute('aria-pressed', 'true');
        await tocco.elemento(edit);
        await expect(edit).toHaveAttribute('aria-pressed', 'false');

        await tocco.elemento(page.locator(PRIMA_TILE));
        await expect(page).toHaveURL(/\/metronomo\/?$/, { timeout: 6000 });
    });

    test('dopo un riordino con la maniglia nessuna tile resta spostata', async ({ page, tocco, spia }) => {
        const edit = page.locator('#tb-edit');
        await tocco.elemento(edit);
        await expect(edit).toHaveAttribute('aria-pressed', 'true');

        const maniglia = page.locator('#tb-tiles li:first-child .tb-tile-grip');
        const box = await maniglia.boundingBox();
        expect(box, 'la maniglia non e’ visibile in Modifica').not.toBeNull();

        const seconda = await page.locator('#tb-tiles li:nth-child(2)').boundingBox();
        /* si trascina oltre la vicina e si lascia andare FUORI dalla griglia,
           come succede col pollice che esce dallo schermo (audit §1 causa C) */
        await tocco.trascina(
            box.x + box.width / 2, box.y + box.height / 2,
            seconda.x + seconda.width / 2 + 10, seconda.y + seconda.height + 120,
            14
        );
        await page.waitForTimeout(700);

        await tocco.elemento(edit);         // Fine
        await page.waitForTimeout(500);

        const residui = await page.evaluate(() => [...document.querySelectorAll('#tb-tiles li')]
            .map((li, i) => ({
                i,
                trasformato: !!li.style.transform && li.style.transform !== 'none',
                dragging: li.classList.contains('is-dragging'),
                z: li.style.zIndex || ''
            }))
            .filter((t) => t.trasformato || t.dragging || t.z));
        expect(residui, 'tile rimaste spostate o "in trascinamento" dopo Fine').toEqual([]);

        /* e la dashboard torna a funzionare: la prima tile apre di nuovo */
        await tocco.elemento(page.locator(PRIMA_TILE));
        await expect(page).toHaveURL(/\/(metronomo|accordatore)\/?$/, { timeout: 6000 });
        nessunErroreConsole(spia);
    });

    test('togliere una tile si puo’ disfare (spec 18 §7.5)', async ({ page, tocco }) => {
        const edit = page.locator('#tb-edit');
        await tocco.elemento(edit);
        await expect(edit).toHaveAttribute('aria-pressed', 'true');

        const quante = await page.locator('#tb-tiles li').count();
        await tocco.elemento(page.locator('#tb-tiles li:first-child .tb-tile-remove'));
        await page.waitForTimeout(600);
        await expect(page.locator('#tb-tiles li')).toHaveCount(quante - 1);

        /* la tile e' sparita: ci vuole un modo per rimetterla senza cercarlo
           nel cassetto. Un avviso con «Annulla», dice la spec 18 §7.5. */
        const annulla = page.locator(
            '.tb-toast button, [data-tb-toast] button, [data-tb-undo], .tb-undo'
        );
        await expect(
            annulla.first(),
            'tolta una tile non compare nessun «Annulla»: chi sbaglia deve andarsela a ripescare'
        ).toBeVisible({ timeout: 4000 });

        await tocco.elemento(annulla.first());
        await page.waitForTimeout(600);
        await expect(page.locator('#tb-tiles li')).toHaveCount(quante);
    });
});

/**
 * Il sottotitolo della dashboard (spec 18 §7.11): oggi sopra le tile c'e'
 * solo un `<h1 class="sr-only">`, cioe' niente, per chi guarda. Una riga che
 * dica di che si tratta e' la differenza fra «una griglia di icone» e
 * «gli strumenti della Toolbox».
 */
test('la dashboard si presenta con una riga leggibile', async ({ page }) => {
    await senzaIntro(page);
    await apri(page, '/', { attesa: 400 });

    const visibile = await page.evaluate(() => {
        const alto = document.querySelector('.tb-dash-top') || document.querySelector('.tb-dash');
        if (!alto) return '';
        return [...alto.querySelectorAll('h1, h2, p, .tb-dash-sub')]
            .filter((el) => {
                if (el.classList.contains('sr-only') || el.closest('.sr-only')) return false;
                const s = getComputedStyle(el);
                return s.display !== 'none' && s.visibility !== 'hidden' && el.textContent.trim();
            })
            .map((el) => el.textContent.trim())
            .join(' | ');
    });
    expect(
        visibile,
        'sopra le tile non c\u2019e\u2019 nessun testo visibile: l\u2019h1 e\u2019 sr-only'
    ).not.toBe('');
});
