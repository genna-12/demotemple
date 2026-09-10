/**
 * Tiny Temple - registrazione del service worker
 *
 * Poche righe, volutamente silenziose: nessun pulsante, nessun avviso.
 * Il sito continua a funzionare esattamente com'e' anche se il browser non
 * supporta i service worker o se la registrazione fallisce.
 *
 * Effetto: il sito si puo' installare come app (Android, Chrome, Edge:
 * "Installa"; iPhone: Condividi -> Aggiungi alla schermata Home) e da quel
 * momento si apre a schermo intero e funziona anche senza rete.
 */
(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) return;

    /* Registrato a pagina caricata: cosi' non ruba banda al primo caricamento. */
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function (err) {
            console.warn('[pwa] service worker non registrato:', err);
        });
    });
})();
