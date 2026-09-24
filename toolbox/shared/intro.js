// Tiny Temple Toolbox - intro del logo (spec 02 §2, ritocco Genna:
// identica a quella della vetrina, home.js righe 1-40).
// ES module puro: nessun effetto all'import. Uso: startIntro() dalla dashboard.
//
// CONTRATTO CON IL MARKUP (index.html) e con base.css:
//   <div id="tb-intro" class="tb-intro"></div>   solo sfondo pieno
//   <a class="tb-logo" href="/">                 IL LOGO DELL'INTRO E QUELLO
//     IN ALTO A SINISTRA SONO LO STESSO ELEMENTO: a riposo sta al centro
//     dello schermo, con .in-nav si aggancia all'angolo (1.2s).
//   <button class="tb-menu-toggle">              compare con .is-visible
//   Classi usate: .tb-logo.is-pulse (battito 0.8s), .tb-logo.in-nav,
//   .tb-logo.is-flying (dura quanto l'aggancio: il logo in volo non e'
//   cliccabile, spec 18 §7.1),
//   .tb-intro.is-complete (sfondo trasparente in 1.5s, pointer-events:none),
//   .tb-menu-toggle.is-visible. Su <body> si toglie 'loading-state' (se c'e').
//
// Sequenza (come la vetrina): is-pulse subito; vibrazione di 15ms a 400ms
// (solo se il dispositivo la supporta, c'e' gia' stata un'interazione
// dell'utente - navigator.userActivation.hasBeenActive - e non e' gia'
// avvenuta in questa sessione); a 900ms via is-pulse, reflow, poi in-nav + is-complete +
// is-visible; l'overlay ormai trasparente e non cliccabile esce dal DOM a
// fine transizione (ripiego: 1.6s dopo). Non blocca mai nulla: sotto e'
// tutto gia' montato.
//
// Si salta (stato finale applicato subito, nessuna animazione) quando:
// <html> ha la classe 'tb-no-intro' (la mette shared/lang-boot.js prima del
// primo paint, cosi' il logo non parte dal centro),
// l'intro e' gia' stata vista in questa sessione (sessionStorage.tbIntro),
// prefers-reduced-motion, "Animazioni ridotte" o "Salta l'intro" nelle
// Impostazioni (spec 18 §5: `tt.shared.animazioni-ridotte`,
// `tt.shared.salta-intro`; lang-boot.js mette gia' 'tb-ridotte' e
// 'tb-no-intro', qui si rilegge per chi non passa da li'),
// pagina diversa dalla dashboard o overlay assente
// (es. 404.html, dove il logo parte gia' 'in-nav' nell'HTML statico).

const KEY = 'tbIntro';
const VIBRATED_KEY = 'tbVibrated';
const PULSE_MS = 900;
const VIBRATE_MS = 400;
const FADE_MS = 1600; // 1.5s di dissolvenza + margine
const DOCK_MS = 1300; // 1.2s di aggancio del logo + margine

function session(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function markSession(key) {
    try {
        window.sessionStorage.setItem(key, '1');
    } catch (e) { /* storage bloccato: al massimo l'intro si ripete */ }
}

function reducedMotion() {
    return document.documentElement.classList.contains('tb-ridotte')
        || (typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/** Preferenza booleana delle Impostazioni (copia veloce in localStorage). */
function preferenza(key) {
    try {
        return window.localStorage.getItem(key) === 'true';
    } catch (e) {
        return false;
    }
}

function saltaIntro() {
    return preferenza('tt.shared.salta-intro') || preferenza('tt.shared.animazioni-ridotte');
}

/** Stato finale: logo in alto a sinistra, hamburger visibile, sfondo via. */
function dock(logo, toggle, layer) {
    if (logo) logo.classList.add('in-nav');
    if (toggle) toggle.classList.add('is-visible');
    if (layer) layer.classList.add('is-complete');
    document.body.classList.remove('loading-state');
}

/** Avvia l'intro se e' il caso; ritorna true se e' partita l'animazione. */
export function startIntro({ isHome = true } = {}) {
    const layer = document.getElementById('tb-intro');
    const logo = document.querySelector('.tb-logo');
    const toggle = document.querySelector('.tb-menu-toggle');

    const noIntro = document.documentElement.classList.contains('tb-no-intro'); // deciso da lang-boot.js
    if (!layer || !isHome || noIntro || session(KEY) || reducedMotion() || saltaIntro()) {
        dock(logo, toggle, layer);
        markSession(KEY);
        if (layer) layer.remove();
        return false;
    }

    markSession(KEY);
    if (logo) logo.classList.add('is-pulse');

    /* vibrate() fuori da un gesto dell'utente viene bloccata (avviso in console) */
    const canVibrate = typeof navigator.vibrate === 'function'
        && !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
    if (!session(VIBRATED_KEY) && canVibrate) {
        markSession(VIBRATED_KEY);
        setTimeout(() => {
            try { navigator.vibrate(15); } catch (e) { /* vibrazione negata */ }
        }, VIBRATE_MS);
    }

    let done = false;
    const drop = () => {
        if (done) return;
        done = true;
        layer.remove();
    };

    /* il logo in volo non deve prendersi i tocchi destinati alle tile
       (spec 18 §7.1, audit §1 causa B): finche' l'aggancio non e' finito
       porta 'is-flying', che in base.css lo rende non cliccabile */
    const land = () => { if (logo) logo.classList.remove('is-flying'); };

    setTimeout(() => {
        if (logo) {
            logo.classList.remove('is-pulse');
            logo.classList.add('is-flying');
            void logo.offsetWidth; // reflow: il battito non si somma all'aggancio
        }
        dock(logo, toggle, layer);
        if (logo) logo.addEventListener('transitionend', land, { once: true });
        setTimeout(land, DOCK_MS); // ripiego se la transizione non parte
        layer.addEventListener('transitionend', drop);
        setTimeout(drop, FADE_MS);
    }, PULSE_MS);

    /* uscendo dalla pagina (o tornando dal bfcache) non deve restare niente a mezzo */
    const finish = () => {
        if (logo) logo.classList.remove('is-pulse');
        dock(logo, toggle, layer);
        land();
        drop();
    };
    window.addEventListener('pagehide', finish);
    window.addEventListener('pageshow', (e) => { if (e.persisted) finish(); });
    return true;
}
