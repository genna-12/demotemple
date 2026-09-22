/**
 * Ogni pagina della Toolbox, sui due schermi (spec 18 §8).
 *
 * Per ognuna: console pulita, nessuno scroll orizzontale, bersagli >= 44 px,
 * fuoco da tastiera visibile, `prefers-reduced-motion` rispettato, e la
 * pagina che continua a funzionare offline dopo il primo caricamento.
 *
 * Sono i controlli "di base": se cade uno di questi, cade per tutti gli
 * strumenti insieme, e vale la pena saperlo prima di guardare i flussi.
 */

import {
    test, expect, PAGINE, apri, senzaIntro,
    nessunErroreConsole, nessunoScrollOrizzontale, bersagliMinimi, focusVisibile,
    serviceWorkerPronto
} from '../fixtures.mjs';

/* Rumore di console che NON e' un difetto dell'app:
   - il finto server non manda le intestazioni che il browser si aspetta per
     le richieste annullate dal blocco di rete (ma quelle fanno gia' fallire
     il test da sole, in fixtures.mjs). */
const CONSENTITI = [];

for (const pagina of PAGINE) {
    test.describe(pagina.nome, () => {
        test('console pulita, niente scroll orizzontale, bersagli e fuoco', async ({ page, spia }) => {
            await senzaIntro(page);
            await apri(page, pagina.percorso, { attesa: 600 });

            await expect(page.locator('body')).toBeVisible();
            nessunErroreConsole(spia, CONSENTITI);
            await nessunoScrollOrizzontale(page);
            await bersagliMinimi(page, 44);
            await focusVisibile(page, 8);
        });

        test('prefers-reduced-motion: niente animazioni, pagina usabile', async ({ page, spia }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await apri(page, pagina.percorso, { attesa: 500 });

            /* con le animazioni ridotte l'intro non parte nemmeno: il velo
               non deve restare fra il dito e la pagina (audit §1 causa B) */
            const velo = page.locator('#tb-intro');
            if (await velo.count()) {
                const passa = await velo.evaluate((el) => getComputedStyle(el).pointerEvents === 'none');
                expect(passa, '#tb-intro intercetta i tocchi con reduced-motion').toBe(true);
            }

            const lunghe = await page.evaluate(() => {
                const out = [];
                for (const el of document.querySelectorAll('body *')) {
                    const s = getComputedStyle(el);
                    const dur = (s.transitionDuration + ' ' + s.animationDuration)
                        .split(/[\s,]+/).filter(Boolean)
                        .map((v) => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000));
                    if (dur.some((d) => d > 400)) {
                        out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
                    }
                    if (out.length >= 5) break;
                }
                return out;
            });
            expect(lunghe, 'animazioni lunghe nonostante prefers-reduced-motion').toEqual([]);
            nessunErroreConsole(spia, CONSENTITI);
        });

        test('offline dopo il primo caricamento', async ({ page, context }) => {
            await senzaIntro(page);
            await apri(page, pagina.percorso, { attesa: 400 });

            const pronto = await serviceWorkerPronto(page);
            expect(pronto, 'il service worker non ha preso il controllo').toBe(true);
            /* il precache lavora in sottofondo: un attimo per finire */
            await page.waitForTimeout(1500);

            await context.setOffline(true);
            try {
                await page.reload({ waitUntil: 'load' });
                await page.waitForTimeout(400);
                /* la pagina c'e' e ha contenuto vero, non il foglio d'errore
                   del browser */
                const testo = await page.evaluate(() => document.body.innerText.trim().length);
                expect(testo, 'pagina vuota offline').toBeGreaterThan(20);
                await expect(page.locator('.tb-logo, h1, main').first()).toBeVisible();
            } finally {
                await context.setOffline(false);
            }
        });
    });
}

/**
 * Le intestazioni di `toolbox/_headers` arrivano davvero, e dicono la cosa
 * giusta. `Referrer-Policy: no-referrer` e' il punto 11 della spec 18 §7:
 * con `strict-origin-when-cross-origin` ogni collegamento in uscita
 * (l'informativa, il sito dello studio) racconta da quale strumento e'
 * partito - e con la sincronizzazione accesa quella e' un'informazione che
 * non deve uscire dal dispositivo (rischio della spec 17 §7).
 */
test('le intestazioni di sicurezza sono quelle di _headers', async ({ page }) => {
    const risposta = await page.goto('/', { waitUntil: 'commit' });
    const h = risposta.headers();

    expect(h['x-frame-options'], 'X-Frame-Options').toBe('DENY');
    expect(h['x-content-type-options'], 'X-Content-Type-Options').toBe('nosniff');
    expect(h['content-security-policy'], 'CSP: niente terzi').toContain("default-src 'self'");
    expect(h['content-security-policy'], 'CSP: niente inline script').not.toContain("'unsafe-inline'");
    expect(h['permissions-policy'], 'il microfono resta a casa nostra').toContain('microphone=(self)');
    expect(
        h['referrer-policy'],
        'Referrer-Policy: i collegamenti in uscita raccontano ancora da dove partono'
    ).toBe('no-referrer');
});
