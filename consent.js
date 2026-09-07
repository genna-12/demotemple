/**
 * Tiny Temple - Gestione del consenso per i contenuti di terze parti (Spotify)
 *
 * Regola: nessuna richiesta verso Spotify finche' l'utente non ha acconsentito.
 * Due strade, entrambe valide:
 *   1. il CMP (Iubenda) registra il consenso per la finalita' 3 (targeting/terze parti);
 *   2. click-to-load: l'utente attiva esplicitamente il player dal riquadro segnaposto.
 * In entrambi i casi il consenso e' revocabile: dalle preferenze cookie del footer,
 * o svuotando i dati del sito.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'tinyTempleSpotifyConsent';
    const PURPOSE_THIRD_PARTY = 3;
    const listeners = [];

    function iubendaConsent() {
        try {
            const cs = window._iub && window._iub.cs;
            if (!cs || !cs.consent) return null;
            const purposes = cs.consent.purposes;
            if (purposes && typeof purposes[PURPOSE_THIRD_PARTY] !== 'undefined') {
                return purposes[PURPOSE_THIRD_PARTY] === true;
            }
            if (typeof cs.consent.consent === 'boolean') return cs.consent.consent;
            return null;
        } catch (e) {
            return null;
        }
    }

    function localConsent() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === 'granted';
        } catch (e) {
            return false;
        }
    }

    function isGranted() {
        const fromCmp = iubendaConsent();
        if (fromCmp === true) return true;
        return localConsent();
    }

    function notify() {
        if (!isGranted()) return;
        while (listeners.length) {
            const cb = listeners.shift();
            try { cb(); } catch (e) { console.warn('[consenso] callback fallita', e); }
        }
    }

    const TinyConsent = {
        isGranted: isGranted,

        /* Esegue la callback subito se il consenso c'e' gia', altrimenti quando arriva. */
        onGrant: function (cb) {
            if (typeof cb !== 'function') return;
            if (isGranted()) { cb(); return; }
            listeners.push(cb);
        },

        /* Consenso esplicito dato dall'utente sul singolo contenuto (click-to-load). */
        grant: function () {
            try { window.localStorage.setItem(STORAGE_KEY, 'granted'); } catch (e) {}
            notify();
        },

        revoke: function () {
            try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        },

        /* Apre il pannello preferenze del CMP, quando e' installato. */
        openPreferences: function () {
            try {
                if (window._iub && window._iub.cs && window._iub.cs.api &&
                    typeof window._iub.cs.api.openPreferences === 'function') {
                    window._iub.cs.api.openPreferences();
                    return true;
                }
            } catch (e) {}
            return false;
        },

        hasCmp: function () {
            return !!(window._iub && window._iub.cs && window._iub.cs.api);
        }
    };

    window.TinyConsent = TinyConsent;

    /* Il CMP puo' caricarsi dopo di noi: ricontrolliamo per un po'. */
    let checks = 0;
    const poll = setInterval(function () {
        checks++;
        if (isGranted()) { notify(); clearInterval(poll); }
        if (checks > 40) clearInterval(poll);
    }, 500);

    /* Iubenda espone questi eventi quando l'utente si esprime sul banner. */
    document.addEventListener('iubenda-consent-given', notify);
    document.addEventListener('iubenda-preference-expressed', notify);

    /* Link "Preferenze cookie" del footer.
       Con il CMP installato apre il suo pannello; finche' non c'e', revoca il
       consenso dato al lettore Spotify - la revoca deve restare sempre possibile. */
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.iubenda-cs-preferences-link');
        if (!link) return;
        e.preventDefault();
        if (TinyConsent.openPreferences()) return;
        TinyConsent.revoke();
        window.location.reload();
    });
})();
