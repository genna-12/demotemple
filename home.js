/**
 * Tiny Temple - Home Page JavaScript
 * Ottimizzato per performance e caricamento asincrono
 */

document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const introLayer = document.getElementById('intro-layer');
    const navbar = document.getElementById('navbar');
    const heroTitle = document.querySelector('.hero-content h1');

    // 1. GESTIONE INTRO (Priorità Assoluta)
    const runIntro = () => {
        const hasVibrated = sessionStorage.getItem('hasVibrated');

        // Start Pulsazione
        logoWrapper.classList.add('pulse-anim');

        if (!hasVibrated && navigator.vibrate) {
            setTimeout(() => { navigator.vibrate(15); }, 400);
            sessionStorage.setItem('hasVibrated', 'true');
        }

        // Transizione (Sincronizzata a 900ms)
        setTimeout(() => {
            logoWrapper.classList.remove('pulse-anim');
            void logoWrapper.offsetWidth; // Force Reflow
            logoWrapper.classList.add('in-nav');
            introLayer.classList.add('intro-complete');
            navbar.classList.remove('hidden-nav');
            navbar.classList.add('nav-visible');

            if(heroTitle) {
                heroTitle.classList.add('is-visible');
            }

            logoWrapper.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            document.body.classList.remove('loading-state');

        }, 900); 
    };

    // Avvia intro immediatamente
    runIntro();


    // 2. HERO IMAGE - CARICAMENTO INTELLIGENTE (Non bloccante)
    const loadHeroImageAsync = () => {
        const heroContainer = document.getElementById('hero-image-container');
        
        // Elenco immagini
        const images = [
            'assets/home_main/foto1.jpg',
            'assets/home_main/foto2.jpg',
            'assets/home_main/foto3.jpg'
        ];

        // Selezione Random
        let selectedIndex = sessionStorage.getItem('heroImageIndex');
        if (selectedIndex === null) {
            selectedIndex = Math.floor(Math.random() * images.length);
            sessionStorage.setItem('heroImageIndex', selectedIndex);
        }
        const imageUrl = images[selectedIndex];

        // --- TECNICA PRELOADER JS ---
        // Creiamo un oggetto immagine in memoria. 
        // Il browser scaricherà i dati senza bloccare l'interfaccia.
        const imgPreloader = new Image();
        
        imgPreloader.onload = () => {
            // Questo codice viene eseguito SOLO quando l'immagine è pronta (scaricata)
            // Usiamo requestAnimationFrame per sincronizzarci col refresh rate dello schermo ed evitare scatti
            requestAnimationFrame(() => {
                heroContainer.style.backgroundImage = `url('${imageUrl}')`;
                // Ora possiamo fare il fade-in sicuro
                heroContainer.style.opacity = '0.6'; 
            });
        };

        imgPreloader.onerror = () => {
            console.error("Errore caricamento immagine Hero");
            // Fallback: mostra almeno un colore di sfondo se l'immagine fallisce
            heroContainer.style.backgroundColor = '#1a1a1a';
        };

        // Avvia il download
        imgPreloader.src = imageUrl;
    };

    // Chiamiamo la funzione. Il download avverrà in parallelo all'intro.
    loadHeroImageAsync();


    // 3. SCROLL REVEAL (Observer)
    const observerOptions = {
        threshold: 0.1,
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

    // 4. PARALLAX (SOLO DESKTOP & MOBILE SAFE)
    if (window.matchMedia("(min-width: 769px)").matches) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            // Eseguiamo i calcoli solo se necessario usando requestAnimationFrame se possibile,
            // ma per semplicità qui manteniamo il controllo del buffer
            document.querySelectorAll('.detail-img').forEach((img) => {
                const parentBox = img.parentElement;
                const parentTop = parentBox.offsetTop;
                const parentHeight = parentBox.offsetHeight;
                const windowHeight = window.innerHeight;

                if (scrolled + windowHeight > parentTop && scrolled < parentTop + parentHeight) {
                    const rate = (scrolled - parentTop) * 0.15;
                    const limitedRate = Math.max(Math.min(rate, 40), -40);
                    img.style.transform = `translateY(${limitedRate}px)`;
                }
            });
        });
    }
});
