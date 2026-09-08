/**
 * Tiny Temple - Consenso ai contenuti di terze parti (click-to-load)
 *
 * Il sito NON usa un cookie banner, ed e' una scelta deliberata: non ci sono
 * analytics, pixel o profilazione, e l'unico contenuto di terze parti e' il
 * player Spotify nella pagina Portfolio. Il consenso viene quindi raccolto
 * dove serve e quando serve: il riquadro nel portfolio informa l'utente, e il
 * clic su "Attiva il player" E' il consenso. Finche' quel clic non arriva,
 * verso Spotify non parte nulla - nemmeno lo script della iFrame API.
 *
 * ATTENZIONE per chi legge in futuro: questa architettura regge finche' la
 * configurazione resta questa. Aggiungere un analytics, un pixel o un secondo
 * contenuto esterno la fa decadere, e a quel punto serve un CMP vero.
 *
 * Il consenso e' revocabile da qualunque pagina, con il link "Consenso
 * contenuti esterni" nel pie' di pagina.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'tinyTempleSpotifyConsent';
    const listeners = [];

    function isGranted() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === 'granted';
        } catch (e) {
            /* storage non disponibile (navigazione privata, cookie bloccati):
               senza memoria del consenso il player resta spento. */
            return false;
        }
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

        /* Consenso esplicito dell'utente sul contenuto: il clic sul riquadro. */
        grant: function () {
            try { window.localStorage.setItem(STORAGE_KEY, 'granted'); } catch (e) {}
            notify();
        },

        revoke: function () {
            try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        }
    };

    window.TinyConsent = TinyConsent;

    /* Link "Consenso contenuti esterni" nel footer, presente su tutte le pagine.
       Revoca e ricarica: il riquadro torna al suo posto e l'utente vede che e'
       successo qualcosa. */
    document.addEventListener('click', function (e) {
        const link = e.target.closest('.consent-revoke-link');
        if (!link) return;
        e.preventDefault();
        TinyConsent.revoke();
        window.location.reload();
    });
})();
