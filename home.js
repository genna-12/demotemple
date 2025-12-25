/**
 * Tiny Temple - Home Page JavaScript
 * Gestione Intro, Fix Titolo, Parallax Mobile-Safe
 */

document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const introLayer = document.getElementById('intro-layer');
    const navbar = document.getElementById('navbar');
    // Selettore del titolo Hero
    const heroTitle = document.querySelector('.hero-content h1');

    // 1. GESTIONE INTRO & TRANSIZIONE CINEMATOGRAFICA
    const runIntro = () => {
        const hasVibrated = sessionStorage.getItem('hasVibrated');

        // Fase 1: Inizio Pulsazione
        logoWrapper.classList.add('pulse-anim');

        // Vibrazione (Android Only) - iOS blocca navigator.vibrate
        if (!hasVibrated && navigator.vibrate) {
            setTimeout(() => { navigator.vibrate(15); }, 400);
            sessionStorage.setItem('hasVibrated', 'true');
        }

        // Fase 2: Movimento e Svelamento (Timing 900ms dopo inizio pulsazione)
        setTimeout(() => {
            // STEP ANTI-SCATTO:
            // Rimuoviamo l'animazione pulsazione. L'elemento torna al suo stato base (scale: 1, center).
            logoWrapper.classList.remove('pulse-anim');

            // Forziamo il reflow per pulire lo stato dell'animazione
            void logoWrapper.offsetWidth; 

            // Applichiamo la classe di movimento.
            // Il CSS ora gestisce: top, left, e scale (da 1 a 0.5) in un'unica transizione fluida.
            logoWrapper.classList.add('in-nav');

            // Fade out dello sfondo nero
            introLayer.classList.add('intro-complete');

            // Mostra Navbar
            navbar.classList.remove('hidden-nav');
            navbar.classList.add('nav-visible');

            // Attiviamo esplicitamente il titolo H1 ora
            if(heroTitle) {
                heroTitle.classList.add('is-visible');
            }

            // Abilita click Home
            logoWrapper.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            document.body.classList.remove('loading-state');

        }, 900); 
    };

    runIntro();


    // 2. HERO IMAGE RANDOMICA
    const loadHeroImage = () => {
        const heroContainer = document.getElementById('hero-image-container');
        const images = [
            'assets/home_main/foto1.jpg',
            'assets/home_main/foto2.jpg',
            'assets/home_main/foto3.jpg'
        ];

        let selectedIndex = sessionStorage.getItem('heroImageIndex');
        if (selectedIndex === null) {
            selectedIndex = Math.floor(Math.random() * images.length);
            sessionStorage.setItem('heroImageIndex', selectedIndex);
        }

        heroContainer.style.backgroundImage = `url('${images[selectedIndex]}')`;
        setTimeout(() => { heroContainer.style.opacity = '0.6'; }, 100);
    };

    loadHeroImage();


    // 3. SCROLL REVEAL (Observer)
    const observerOptions = {
        threshold: 0.1, // Attiva leggermente prima su mobile
        rootMargin: "0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });

    // 4. PARALLAX (SOLO DESKTOP)
    // Disattivato su mobile (< 769px) per performance e stabilità visiva
    if (window.matchMedia("(min-width: 769px)").matches) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            document.querySelectorAll('.detail-img').forEach((img) => {
                const parentBox = img.parentElement;
                const parentTop = parentBox.offsetTop;
                const parentHeight = parentBox.offsetHeight;
                const windowHeight = window.innerHeight;

                // Calcolo solo se l'immagine è nel viewport
                if (scrolled + windowHeight > parentTop && scrolled < parentTop + parentHeight) {
                    const rate = (scrolled - parentTop) * 0.15;
                    // Limitiamo il movimento (clamping) tra -40px e +40px
                    // Questo assicura che l'immagine (che ha 10% di sbordo) non esca mai dal box
                    const limitedRate = Math.max(Math.min(rate, 40), -40);
                    
                    img.style.transform = `translateY(${limitedRate}px)`;
                }
            });
        });
    }
});