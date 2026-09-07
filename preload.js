/**
 * Tiny Temple - Preload dell'immagine hero (solo Home)
 * Le altre pagine non hanno più immagini di sfondo.
 */
(function () {
    /* Il sito puo' essere servito da una sottocartella (es. /demotemple/ su GitHub
       Pages), quindi non basta confrontare il percorso con '/': guardiamo l'ultimo
       segmento, che e' vuoto sulla home e vale '<pagina>.html' su tutte le altre. */
    const file = window.location.pathname.split('/').pop();
    const isHome = file === '' || file === 'index.html';
    if (!isHome) return;

    const folder = 'home_main';
    const maxImages = 3;
    const isMobile = window.innerWidth <= 768;
    const prefix = isMobile ? 'mobile_' : 'desktop_';

    let randomNum = sessionStorage.getItem('heroImgNum_' + folder);
    if (!randomNum) {
        randomNum = Math.floor(Math.random() * maxImages) + 1;
        sessionStorage.setItem('heroImgNum_' + folder, randomNum);
    }

    const imgUrl = `assets/${folder}/${prefix}${randomNum}.jpg`;

    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = imgUrl;
    document.head.appendChild(preloadLink);

    document.documentElement.style.setProperty('--hero-bg', `url('${imgUrl}')`);
})();
