// Tiny Temple Toolbox - intro del logo (spec 02 §2).
// ES module puro: nessun effetto all'import. Uso: startIntro() dalla dashboard.
//
// CONTRATTO CON IL MARKUP (index.html) e con base.css:
//   <div id="tb-intro" class="tb-intro" hidden><img class="tb-intro-logo" ...></div>
//   Classi usate: .tb-intro-logo.is-pulse (battito 0.8s), poi .tb-intro-logo.is-dock
//   + .tb-intro.is-fading (0.4s). Totale 1.2s, misure fisse: nessun calcolo a runtime.
//
// Si salta (l'overlay resta [hidden]) se: gia' vista in questa sessione
// (sessionStorage.tbIntro), prefers-reduced-motion, pagina diversa dalla
// dashboard, overlay assente. Non blocca mai: sotto e' tutto gia' montato e
// l'overlay non intercetta i tocchi mentre sfuma.

const KEY = 'tbIntro';
const PULSE_MS = 800;
const DOCK_MS = 400;

function seen() {
    try {
        return window.sessionStorage.getItem(KEY) === '1';
    } catch (e) {
        return true; // storage bloccato: meglio niente intro che una a ogni pagina
    }
}

function markSeen() {
    try {
        window.sessionStorage.setItem(KEY, '1');
    } catch (e) { /* storage bloccato: si ripetera' al massimo una volta */ }
}

function reducedMotion() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Avvia l'intro se e' il caso; ritorna true se e' partita. */
export function startIntro({ isHome = true } = {}) {
    const layer = document.getElementById('tb-intro');
    if (!layer) return false;
    if (!isHome || seen() || reducedMotion()) {
        layer.hidden = true;
        markSeen();
        return false;
    }
    const logo = layer.querySelector('.tb-intro-logo');
    markSeen();
    layer.hidden = false;
    if (logo) logo.classList.add('is-pulse');

    const finish = () => {
        layer.hidden = true;
        layer.classList.remove('is-fading');
        if (logo) logo.classList.remove('is-pulse', 'is-dock');
    };

    setTimeout(() => {
        if (logo) {
            logo.classList.remove('is-pulse');
            void logo.offsetWidth; // reflow: il battito non si somma alla discesa
            logo.classList.add('is-dock');
        }
        layer.classList.add('is-fading');
        setTimeout(finish, DOCK_MS);
    }, PULSE_MS);

    /* uscendo dalla pagina (o tornando dal bfcache) l'overlay non deve restare li' */
    window.addEventListener('pagehide', finish);
    window.addEventListener('pageshow', (e) => { if (e.persisted) finish(); });
    return true;
}
