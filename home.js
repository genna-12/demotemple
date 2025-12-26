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


    // 2. HERO IMAGE - SMART LOAD (Mobile/Desktop + Random N)
    const loadHeroImageAsync = () => {
        const heroContainer = document.getElementById('hero-image-container');
        
        // --- CONFIGURAZIONE ---
        const totalImages = 3; // <--- CAMBIA QUESTO NUMERO se aggiungi foto (es. 5, 10)
        // ----------------------

        // 1. Rileva dispositivo
        const isMobile = window.innerWidth <= 768;
        
        // 2. Scegli prefisso file
        // Se mobile: "mobile_1.jpg", Se desktop: "desktop_1.jpg"
        const prefix = isMobile ? 'mobile_' : 'desktop_';

        // 3. Genera numero casuale tra 1 e totalImages
        // Utilizziamo sessionStorage per mantenere la stessa immagine durante la navigazione
        // finché non si chiude il browser.
        let randomNum = sessionStorage.getItem('heroImgNum');
        
        if (!randomNum) {
            randomNum = Math.floor(Math.random() * totalImages) + 1; // Genera da 1 a N
            sessionStorage.setItem('heroImgNum', randomNum);
        }

        // Costruisci il percorso
        const imageUrl = `assets/home_main/${prefix}${randomNum}.jpg`;

        // 4. Preload e Visualizzazione
        const imgPreloader = new Image();
        
        imgPreloader.onload = () => {
            requestAnimationFrame(() => {
                heroContainer.style.backgroundImage = `url('${imageUrl}')`;
                heroContainer.style.opacity = '0.6'; 
            });
        };

        imgPreloader.onerror = () => {
            console.error(`Impossibile caricare: ${imageUrl}. Verifica che il file esista.`);
            // Fallback di sicurezza: carica la numero 1 desktop se tutto fallisce
            heroContainer.style.backgroundImage = `url('assets/home_main/desktop_1.jpg')`;
             heroContainer.style.opacity = '0.6';
        };

        imgPreloader.src = imageUrl;
    };

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
