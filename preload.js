/**
 * Tiny Temple - Immagine hero della Home
 *
 * Una sola immagine per formato, decisa a monte: niente rotazione casuale,
 * cosi' la prima schermata e' sempre la stessa per tutti.
 * Il preload parte prima del CSS, quindi l'immagine e' gia' in arrivo quando
 * il browser incontra la regola di sfondo.
 */
(function () {
    /* Il sito puo' essere servito da una sottocartella (es. /demotemple/ su GitHub
       Pages), quindi non basta confrontare il percorso con '/': guardiamo l'ultimo
       segmento, che e' vuoto sulla home e vale '<pagina>.html' su tutte le altre. */
    const file = window.location.pathname.split('/').pop();
    const isHome = file === '' || file === 'index.html';
    if (!isHome) return;

    const imgUrl = window.innerWidth <= 768
        ? 'assets/home_main/mobile_1.jpg'
        : 'assets/home_main/desktop_3.jpg';

    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = imgUrl;
    document.head.appendChild(preloadLink);

    document.documentElement.style.setProperty('--hero-bg', `url('${imgUrl}')`);
})();
