/**
 * Tiny Temple - Main JavaScript
 * Gestione globale: Navigazione, Menu Overlay, Scroll UI
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFullscreenMenu();
});

function initNavigation() {
    const navbar = document.getElementById('navbar');
    // Pulsanti fluttuanti (Lingua / WhatsApp)
    const floatBtns = document.querySelectorAll('.floating-btn');
    
    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        // Se il menu è aperto, ignora la logica di scroll
        if (document.body.classList.contains('menu-open')) return;

        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;

                // Gestione visibilità UI
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                    navbar.classList.add('nav-hidden-scroll');
                    floatBtns.forEach(btn => btn.classList.add('nav-hidden-scroll'));
                } else {
                    navbar.classList.remove('nav-hidden-scroll');
                    floatBtns.forEach(btn => btn.classList.remove('nav-hidden-scroll'));
                }

                if (currentScrollY > 10) {
                   // Logica sfondo opzionale
                } else {
                    navbar.style.background = 'transparent';
                }

                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    });
}

function initFullscreenMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuOverlay = document.getElementById('fullscreen-menu');

    if (menuToggle && menuOverlay) {
        // Questa funzione funge sia da Apri che da Chiudi (Exit)
        menuToggle.addEventListener('click', () => {
            document.body.classList.toggle('menu-open');
        });
    }

    // Chiudi il menu se si clicca un link
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            document.body.classList.remove('menu-open');
        });
    });
    
    // Chiudi il menu se si clicca sul logo dentro il menu
    const menuLogo = document.querySelector('.menu-logo');
    if(menuLogo) {
        menuLogo.addEventListener('click', () => {
             document.body.classList.remove('menu-open');
             // Se sei già in home, fa scroll top, altrimenti va alla home (handled by <a> tag usually)
             window.location.href = 'index.html';
        });
    }
}
