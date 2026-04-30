/**
 * Tiny Temple - Contact Page JavaScript (Refactored)
 */
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-content h1');
    const heroSubtitle = document.querySelector('.hero-subtitle');

    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (heroTitle) heroTitle.classList.add('is-visible');
        if (heroSubtitle) {
            heroSubtitle.style.opacity = '0';
            heroSubtitle.style.transform = 'translateY(20px)';
            setTimeout(() => heroSubtitle.classList.add('is-visible'), 300);
        }
    }, 100);
});