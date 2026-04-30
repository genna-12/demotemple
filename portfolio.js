/**
 * Tiny Temple - Portfolio Page JavaScript (Refactored)
 */
document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.portfolio-hero h1');

    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (heroTitle) heroTitle.classList.add('is-visible');
    }, 200);
});