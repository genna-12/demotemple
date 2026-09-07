/**
 * Tiny Temple - Sottopagine statiche (Servizi, Landing servizio)
 * Rivela il titolo di pagina e l'introduzione al caricamento.
 */
document.addEventListener('DOMContentLoaded', () => {
    const title = document.querySelector('.page-header h1, .hero-content h1');
    const intro = document.querySelector('.page-header .page-intro, .hero-subtitle');

    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (title) title.classList.add('is-visible');
        if (intro) setTimeout(() => intro.classList.add('is-visible'), 300);
    }, 100);
});
