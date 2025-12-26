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
            
            // SVELAMENTO UI
            navbar.classList.remove('hidden-nav');
            navbar.classList.add('nav-visible');
            
            // Svela pulsanti fluttuanti
            document.querySelectorAll('.floating-btn').forEach(btn => {
                btn.classList.remove('hidden-nav');
                btn.classList.add('nav-visible');
            });

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
        const totalImages = 3; 
        // ----------------------

        // 1. Rileva dispositivo
        const isMobile = window.innerWidth <= 768;
        
        // 2. Scegli prefisso file
        const prefix = isMobile ? 'mobile_' : 'desktop_';

        // 3. Genera numero casuale
        let randomNum = sessionStorage.getItem('heroImgNum');
        if (!randomNum) {
            randomNum = Math.floor(Math.random() * totalImages) + 1; 
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

    // 5. GESTIONE TRADUZIONE (IT <-> EN)
    const initTranslation = () => {
        const langBtn = document.getElementById('lang-btn');
        const langIcon = langBtn.querySelector('.lang-icon');
        let currentLang = 'it'; 

        const translations = {
            'en': {
                'nav-portfolio': 'Portfolio',
                'nav-servizi': 'Services',
                'nav-contatti': 'Contact',
                'hero-title': 'Sound is a Ritual.',
                'story1-title': 'The Origin',
                'story1-text': 'Tiny Temple was not born as a studio, but as a necessity. In a screaming world, we sought a corner of silence where sound could become sacred again. Here, walls breathe and technology bows to human expression.',
                'story2-title': 'The Alchemy',
                'story2-text': 'We don\'t just capture frequencies. We seek the imperfection that makes a performance unrepeatable. Warm light, living wood, and an analog approach to time: this is our space, suspended between classic and avant-garde.',
                'connect-title': 'Every track is born from collaboration.'
            },
            'it': {
                'nav-portfolio': 'Portfolio',
                'nav-servizi': 'Servizi',
                'nav-contatti': 'Contatti',
                'hero-title': 'Il Suono è un Rituale.',
                'story1-title': 'L\'Origine',
                'story1-text': 'Tiny Temple non è nato come uno studio, ma come una necessità. In un mondo che urla, abbiamo cercato un angolo di silenzio dove il suono potesse tornare ad essere sacro. Qui, le pareti respirano e la tecnologia si inchina all\'espressione umana.',
                'story2-title': 'L\'Alchimia',
                'story2-text': 'Non catturiamo solo frequenze. Cerchiamo l\'imperfezione che rende una performance irripetibile. Luce calda, legno vivo e un approccio analogico al tempo: questo è il nostro spazio, sospeso tra il classico e l\'avanguardia.',
                'connect-title': 'Ogni brano nasce da una collaborazione.'
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
                    el.style.transition = 'opacity 0.3s ease';
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
