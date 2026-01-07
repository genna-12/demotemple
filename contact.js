/**
 * Tiny Temple - Contact Page JavaScript
 * Gestisce caricamento immagini team/hero e traduzioni
 */

document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const heroTitle = document.querySelector('.hero-content h1');
    const heroSubtitle = document.querySelector('.hero-subtitle');


    // 1. INIZIALIZZAZIONE
    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (heroTitle) heroTitle.classList.add('is-visible');
        if (heroSubtitle) {
            heroSubtitle.style.opacity = '0';
            heroSubtitle.style.transform = 'translateY(20px)';
            setTimeout(() => heroSubtitle.classList.add('is-visible'), 300);
        }
    }, 100);

    // Click Logo -> Scroll Top
    logoWrapper.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. HERO IMAGE LOAD (Simile a Services)
    const loadContactHero = () => {
        const heroContainer = document.getElementById('hero-image-container');
        const isMobile = window.innerWidth <= 768;

        // Cerchiamo un'immagine specifica per i contatti, 
        // fallback su home se non esiste (gestito da onerror)
        const imageUrl = isMobile
            ? 'assets/contact_main/mobile_1.jpg'
            : 'assets/contact_main/desktop_1.jpg';

        const imgPreloader = new Image();
        imgPreloader.onload = () => {
            requestAnimationFrame(() => {
                heroContainer.style.backgroundImage = `url('${imageUrl}')`;
                heroContainer.style.opacity = '0.5';
            });
        };
        imgPreloader.onerror = () => {
            console.warn('Fallback contact hero image');
            // Fallback elegante su una delle immagini della home
            heroContainer.style.backgroundImage = `url('assets/home_main/desktop_1.jpg')`;
            heroContainer.style.opacity = '0.5';
        };
        imgPreloader.src = imageUrl;
    };

    loadContactHero();

    // 3. SCROLL REVEAL (Standard)
    const observerOptions = { threshold: 0.1, rootMargin: "0px" };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

    // 4. PARALLAX (Desktop Only)
    if (window.matchMedia("(min-width: 769px)").matches) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            document.querySelectorAll('.detail-img').forEach((img) => {
                const parentBox = img.parentElement; // div.image-box
                if (!parentBox) return;

                const parentTop = parentBox.offsetTop;
                const parentHeight = parentBox.offsetHeight;
                const windowHeight = window.innerHeight;

                if (scrolled + windowHeight > parentTop && scrolled < parentTop + parentHeight) {
                    const rate = (scrolled - parentTop) * 0.1;
                    const limitedRate = Math.max(Math.min(rate, 30), -30);
                    img.style.transform = `translateY(${limitedRate}px)`;
                }
            });
        });
    }

    // 5. TRADUZIONI CONTATTI CON PERSISTENZA
    const initTranslation = () => {
        const langBtn = document.getElementById('lang-btn');
        const langIcon = langBtn.querySelector('.lang-icon');

        // Recupera lingua salvata
        let currentLang = localStorage.getItem('tinyTempleLang') || 'it';

        const translations = {
            'en': {
                'nav-home': 'Home',
                'nav-servizi': 'Services',
                'nav-portfolio': 'Portfolio',
                'nav-contatti': 'Contact',

                'hero-title': 'Let\'s talk.',
                'hero-subtitle': 'Tell us your idea.',

                'ponz-role': 'Producer',
                'ponz-bio': 'The ear that sees beyond. Specialized in finding the sonic soul of a project before the first note is recorded. He guides the overall vision with an approach that blends technique and instinct.',

                'andrea-role': 'Multi-instrumentalist / Arranger',
                'andrea-bio': 'Hands that translate ideas into harmony. From piano to synths, strings to electronics. He builds the musical foundations upon which the song can rise and breathe.',

                'direct-contact-title': 'Write to us anytime.',
                'footer-collab': 'Every track is born from collaboration.'
            },
            'it': {
                'nav-home': 'Home',
                'nav-servizi': 'Servizi',
                'nav-portfolio': 'Portfolio',
                'nav-contatti': 'Contatti',

                'hero-title': 'Parliamo.',
                'hero-subtitle': 'Raccontaci la tua idea.',

                'ponz-role': 'Produttore',
                'ponz-bio': 'L\'orecchio che vede oltre. Specializzato nel trovare l\'anima sonora di un progetto prima ancora che venga registrata la prima nota. Guida la visione d\'insieme con un approccio che fonde tecnica e istinto.',

                'andrea-role': 'Polistrumentista / Arrangiatore',
                'andrea-bio': 'Le mani che traducono l\'idea in armonia. Dal pianoforte ai synth, dagli archi all\'elettronica. Costruisce le fondamenta musicali su cui il brano può elevarsi e respirare.',

                'direct-contact-title': 'Scrivici quando vuoi.',
                'footer-collab': 'Ogni brano nasce da una collaborazione.'
            }
        };

        const applyLanguage = (lang, withAnimation = false) => {
            const elements = document.querySelectorAll('[data-translate]');
            elements.forEach(el => {
                const key = el.getAttribute('data-translate');
                if (translations[lang] && translations[lang][key]) {
                    if (withAnimation) {
                        el.style.opacity = '0';
                        setTimeout(() => {
                            el.innerHTML = translations[lang][key];
                            el.style.opacity = '1';
                        }, 300);
                    } else {
                        el.innerHTML = translations[lang][key];
                    }
                }
            });
        };

        // Applica subito
        if (currentLang !== 'it') {
            applyLanguage(currentLang, false);
        }

        langBtn.addEventListener('click', (e) => {
            e.preventDefault();
            langIcon.classList.add('rotate-anim');
            setTimeout(() => langIcon.classList.remove('rotate-anim'), 500);

            currentLang = currentLang === 'it' ? 'en' : 'it';
            localStorage.setItem('tinyTempleLang', currentLang);

            applyLanguage(currentLang, true);
        });
    };

    initTranslation();
});
