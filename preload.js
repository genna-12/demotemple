/**
 * Tiny Temple - Preload Script (Fixato per conteggio foto dinamico)
 */
(function() {
    const path = window.location.pathname;
    let folder = 'home_main';
    let maxImages = 3; // Di default (Home) ne abbiamo 3

    if (path.includes('servizi')) {
        folder = 'services_main';
        maxImages = 2; // FIX: In servizi ce ne sono solo 2!
    } 
    else if (path.includes('contatti')) {
        folder = 'home_main';
        maxImages = 3; // Usiamo le 3 della home per i contatti
    } 
    else if (path.includes('portfolio')) return;

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