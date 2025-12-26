/**
 * Tiny Temple - Main JavaScript
 * Gestione globale della navigazione e scroll UI
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

function initNavigation() {
    const navbar = document.getElementById('navbar');
    // Selezioniamo anche i pulsanti fluttuanti
    const floatBtns = document.querySelectorAll('.floating-btn');
    
    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;

                // Gestione visibilità UI (Navbar + Floating Buttons)
                // Nascondi se scorri giù > 50px, Mostra se scorri su
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                    // Nascondi Navbar (sale su)
                    navbar.classList.add('nav-hidden-scroll');
                    // Nascondi Pulsanti (scendono giù)
                    floatBtns.forEach(btn => btn.classList.add('nav-hidden-scroll'));
                } else {
                    // Mostra Navbar
                    navbar.classList.remove('nav-hidden-scroll');
                    // Mostra Pulsanti
                    floatBtns.forEach(btn => btn.classList.remove('nav-hidden-scroll'));
                }

                // Effetto Glass intenso allo scroll
                if (currentScrollY > 10) {
                    navbar.style.background = 'rgba(0,0,0,0.2)';
                    navbar.style.backdropFilter = 'blur(5px)';
                    navbar.style.webkitBackdropFilter = 'blur(5px)';
                } else {
                    navbar.style.background = 'transparent';
                    navbar.style.backdropFilter = 'none';
                    navbar.style.webkitBackdropFilter = 'none';
                }

                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    });
}
