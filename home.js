/**
 * Tiny Temple - Home Page JavaScript (Refactored)
 */
document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const introLayer = document.getElementById('intro-layer');
    const navbar = document.getElementById('navbar');
    const heroTitle = document.querySelector('.hero-content h1');

    const runIntro = () => {
        const hasVibrated = sessionStorage.getItem('hasVibrated');
        logoWrapper.classList.add('pulse-anim');

        if (!hasVibrated && navigator.vibrate) {
            setTimeout(() => { navigator.vibrate(15); }, 400);
            sessionStorage.setItem('hasVibrated', 'true');
        }

        setTimeout(() => {
            logoWrapper.classList.remove('pulse-anim');
            void logoWrapper.offsetWidth; 
            logoWrapper.classList.add('in-nav');
            introLayer.classList.add('intro-complete');

            navbar.classList.remove('hidden-nav');
            navbar.classList.add('nav-visible');

            document.querySelectorAll('.floating-btn').forEach(btn => {
                btn.classList.remove('hidden-nav');
                btn.classList.add('nav-visible');
            });

            if (heroTitle) heroTitle.classList.add('is-visible');
            document.body.classList.remove('loading-state');
        }, 900);
    };

    runIntro();
});