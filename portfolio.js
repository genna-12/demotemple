/**
 * Tiny Temple - Portfolio Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const heroTitle = document.querySelector('.portfolio-hero h1');

    // 1. INIT: Rimuovi loader e mostra hero
    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (heroTitle) {
            heroTitle.classList.add('is-visible');
        }
    }, 200);

    // Click Logo -> Scroll Top
    logoWrapper.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. SCROLL REVEAL (Con delay per la griglia)
    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                // Aggiunge un piccolo delay casuale per effetto "naturale" nella griglia
                const delay = entry.target.classList.contains('cover-card') ? Math.random() * 200 : 0;
                
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, delay);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

    // 3. TRADUZIONI PORTFOLIO
    const initTranslation = () => {
        const langBtn = document.getElementById('lang-btn');
        const langIcon = langBtn.querySelector('.lang-icon');
        let currentLang = 'it'; 

        const translations = {
            'en': {
                'nav-home': 'Home',
                'nav-servizi': 'Services',
                'nav-contatti': 'Contact',
                
                'port-hero': 'Some of the worlds we have traversed.',
                'visual-break': 'Every project is a collaboration.',
                'playlist-title': 'Our playlist. No filters.',
                'playlist-btn': 'Listen on Spotify',
                'footer-cta': 'The next project could be yours.'
            },
            'it': {
                'nav-home': 'Home',
                'nav-servizi': 'Servizi',
                'nav-contatti': 'Contatti',
                
                'port-hero': 'Alcuni dei mondi che abbiamo attraversato.',
                'visual-break': 'Ogni progetto è una collaborazione.',
                'playlist-title': 'La nostra playlist. Senza filtri.',
                'playlist-btn': 'Ascolta su Spotify',
                'footer-cta': 'Il prossimo progetto potrebbe essere il tuo.'
            }
        };

        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            langIcon.classList.add('rotate-anim');
            setTimeout(() => langIcon.classList.remove('rotate-anim'), 500);

            currentLang = currentLang === 'it' ? 'en' : 'it';
            const elements = document.querySelectorAll('[data-translate]');
            
            elements.forEach(el => {
                const key = el.getAttribute('data-translate');
                if (translations[currentLang][key]) {
                    el.style.opacity = '0';
                    setTimeout(() => {
                        el.innerHTML = translations[currentLang][key];
                        el.style.opacity = '1';
                    }, 300);
                }
            });
        });
    };

    initTranslation();
});