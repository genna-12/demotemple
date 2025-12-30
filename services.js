/**
 * Tiny Temple - Services Page JavaScript
 * Gestisce caricamento immagini servizi, traduzioni e animazioni specifiche
 */

document.addEventListener('DOMContentLoaded', () => {
    const logoWrapper = document.getElementById('main-logo');
    const heroTitle = document.querySelector('.hero-content h1');
    const heroSubtitle = document.querySelector('.hero-subtitle');

    // 1. INIZIALIZZAZIONE LIGHT (Nessuna intro lunga)
    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if(heroTitle) heroTitle.classList.add('is-visible');
        if(heroSubtitle) {
            heroSubtitle.style.opacity = '0';
            heroSubtitle.style.transform = 'translateY(20px)';
            setTimeout(() => heroSubtitle.classList.add('is-visible'), 300);
        }
    }, 100);

    // Click Logo -> Scroll Top
    logoWrapper.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. HERO IMAGE - SMART LOAD (Cartella services_main)
    const loadServicesHero = () => {
        const heroContainer = document.getElementById('hero-image-container');
        
        // --- CONFIGURAZIONE ---
        // Sostituisci 3 con il numero reale di immagini che hai in services_main
        const totalImages = 3; 
        // ----------------------

        const isMobile = window.innerWidth <= 768;
        const prefix = isMobile ? 'mobile_' : 'desktop_';
        
        // Generiamo un numero nuovo a ogni refresh per varietà
        const randomNum = Math.floor(Math.random() * totalImages) + 1; 

        // Percorso specifico per pagina Servizi
        const imageUrl = `assets/services_main/${prefix}${randomNum}.jpg`;

        const imgPreloader = new Image();
        imgPreloader.onload = () => {
            requestAnimationFrame(() => {
                heroContainer.style.backgroundImage = `url('${imageUrl}')`;
                heroContainer.style.opacity = '0.5'; // Opacità leggermente più bassa per leggibilità testo
            });
        };
        imgPreloader.onerror = () => {
            console.warn('Fallback image load');
            heroContainer.style.backgroundImage = `url('assets/services_main/desktop_1.jpg')`;
            heroContainer.style.opacity = '0.5';
        };
        imgPreloader.src = imageUrl;
    };

    loadServicesHero();

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
                const parentBox = img.parentElement.parentElement; // picture -> div
                if(!parentBox) return;
                
                const parentTop = parentBox.offsetTop;
                const parentHeight = parentBox.offsetHeight;
                const windowHeight = window.innerHeight;

                if (scrolled + windowHeight > parentTop && scrolled < parentTop + parentHeight) {
                    const rate = (scrolled - parentTop) * 0.1; // Leggermente più lento della home
                    const limitedRate = Math.max(Math.min(rate, 30), -30);
                    img.style.transform = `translateY(${limitedRate}px)`;
                }
            });
        });
    }

    // 5. TRADUZIONI SERVIZI
    const initTranslation = () => {
        const langBtn = document.getElementById('lang-btn');
        const langIcon = langBtn.querySelector('.lang-icon');
        let currentLang = 'it'; 

        const translations = {
            'en': {
                'nav-home': 'Home',
                'nav-portfolio': 'Portfolio',
                'nav-contatti': 'Contact',
                'hero-title': 'We build sounds together.',
                'hero-subtitle': 'Listen &rarr; Build &rarr; Care',
                //'process-text': 'Listen &rarr; Build &rarr; Care',
                
                'serv1-title': 'Music Production',
                'serv1-text': 'We don\'t impose a sound, we find it inside you. From pre-production to arrangement, we give body to your vision.',
                
                'serv2-title': 'Recording',
                'serv2-text': 'We capture the moment. Carefully chosen microphones, warm preamps, and a room treated to enhance every nuance of the performance.',
                
                'serv3-title': 'Mixing & Mastering',
                'serv3-text': 'Balance and depth. We sculpt the sound to make it three-dimensional and ready for the world, respecting the original dynamics.',
                
                'serv4-title': 'Art Direction',
                'serv4-text': 'Beyond sound, there is identity. We guide you in stylistic choices to create a consistent, authentic, and recognizable project.',
                
                'cta-text': 'If you feel this is the right place, write to us.'
            },
            'it': {
                'nav-home': 'Home',
                'nav-portfolio': 'Portfolio',
                'nav-contatti': 'Contatti',
                'hero-title': 'Costruiamo suoni insieme.',
                'hero-subtitle': 'Dove l\'idea diventa frequenza.',
                'process-text': 'Ascolto &rarr; Costruzione &rarr; Cura',
                
                'serv1-title': 'Produzione Musicale',
                'serv1-text': 'Non imponiamo un sound, lo cerchiamo dentro di te. Dalla pre-produzione all\'arrangiamento, diamo corpo alla tua visione.',
                
                'serv2-title': 'Recording',
                'serv2-text': 'Catturiamo l\'istante. Microfoni scelti con cura, preamplificatori caldi e un ambiente trattato per esaltare ogni sfumatura della performance.',
                
                'serv3-title': 'Mixing & Mastering',
                'serv3-text': 'Equilibrio e profondità. Scolpiamo il suono per renderlo tridimensionale e pronto per il mondo, rispettando la dinamica originale.',
                
                'serv4-title': 'Direzione Artistica',
                'serv4-text': 'Oltre il suono, c\'è l\'identità. Ti guidiamo nelle scelte stilistiche per creare un progetto coerente, autentico e riconoscibile.',
                
                'cta-text': 'Se senti che è il posto giusto, scrivici.'
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

