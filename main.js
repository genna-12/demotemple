/**
 * Tiny Temple - Core JavaScript
 * Gestione globale: Navigazione, Traduzioni, Scroll Reveal, Parallax
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFullscreenMenu();
    initGlobalScrollAnimations();
    initTranslationSystem();
    initLogoClick();
});

// --- 1. NAVIGAZIONE E MENU ---
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const floatBtns = document.querySelectorAll('.floating-btn');
    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (document.body.classList.contains('menu-open')) return;
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;
                if (currentScrollY > lastScrollY && currentScrollY > 50) {
                    floatBtns.forEach(btn => btn.classList.add('nav-hidden-scroll'));
                } else {
                    navbar.classList.remove('nav-hidden-scroll');
                    floatBtns.forEach(btn => btn.classList.remove('nav-hidden-scroll'));
                }
                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

function initFullscreenMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuLinks = document.querySelectorAll('.menu-link');
    const menuLogo = document.querySelector('.menu-logo');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => document.body.classList.toggle('menu-open'));
    }
    menuLinks.forEach(link => {
        link.addEventListener('click', () => document.body.classList.remove('menu-open'));
    });
    if (menuLogo) {
        menuLogo.addEventListener('click', () => {
            document.body.classList.remove('menu-open');
            window.location.href = 'index.html';
        });
    }
}

function initLogoClick() {
    const logoWrapper = document.getElementById('main-logo');
    if (logoWrapper) {
        logoWrapper.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// --- 2. SCROLL REVEAL E PARALLAX OTTIMIZZATO ---
function initGlobalScrollAnimations() {
    // Scroll Reveal (Observer globale)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.classList.contains('cover-card') ? Math.random() * 200 : 0;
                setTimeout(() => entry.target.classList.add('is-visible'), delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px" });

    document.querySelectorAll('.scroll-reveal, .cover-card').forEach(el => observer.observe(el));

    // Parallax Ottimizzato (Solo Desktop)
    const parallaxImages = document.querySelectorAll('.detail-img');
    if (parallaxImages.length > 0 && window.matchMedia("(min-width: 769px)").matches) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    const windowHeight = window.innerHeight;

                    parallaxImages.forEach((img) => {
                        const parentBox = img.closest('.image-box');
                        if (!parentBox) return;

                        const parentTop = parentBox.offsetTop;
                        const parentHeight = parentBox.offsetHeight;

                        if (scrolled + windowHeight > parentTop && scrolled < parentTop + parentHeight) {
                            const rate = (scrolled - parentTop) * 0.15;
                            const limitedRate = Math.max(Math.min(rate, 40), -40);
                            // Uso translate3d per forzare l'accelerazione hardware della GPU ed evitare lag
                            img.style.transform = `translate3d(0, ${limitedRate}px, 0)`;
                        }
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }
}

// --- 3. DIZIONARIO GLOBALE E TRADUZIONI ---
function initTranslationSystem() {
    const langBtn = document.getElementById('lang-btn');
    if (!langBtn) return;
    const langIcon = langBtn.querySelector('.lang-icon');
    let currentLang = localStorage.getItem('tinyTempleLang') || 'it';

    const dict = {
        'en': {
            'nav-home': 'Home', 'nav-servizi': 'Services', 'nav-portfolio': 'Portfolio', 'nav-contatti': 'Contact',
            // HOME
            'hero-title-home': 'Sound is a Ritual.', 'story1-title': 'The Origin', 'story1-text': 'Tiny Temple was not born as a studio, but as a necessity. In a screaming world, we sought a corner of silence where sound could become sacred again. Here, walls breathe and technology bows to human expression.', 'story2-title': 'The Alchemy', 'story2-text': 'We don\'t just capture frequencies. We seek the imperfection that makes a performance unrepeatable. Warm light, living wood, and an analog approach to time: this is our space, suspended between classic and avant-garde.', 'connect-title-home': 'Every track is born from collaboration.',
            // SERVICES
            'hero-title-serv': 'We build sounds together.', 'hero-subtitle-serv': 'Listen &rarr; Build &rarr; Care', 'serv1-title': 'Music Production', 'serv1-text': 'We don\'t impose a sound, we find it inside you. From pre-production to arrangement, we give body to your vision.', 'serv2-title': 'Recording', 'serv2-text': 'We capture the moment. Carefully chosen microphones, warm preamps, and a room treated to enhance every nuance of the performance.', 'serv3-title': 'Mixing & Mastering', 'serv3-text': 'Balance and depth. We sculpt the sound to make it three-dimensional and ready for the world, respecting the original dynamics.', 'serv4-title': 'Art Direction', 'serv4-text': 'Beyond sound, there is identity. We guide you in stylistic choices to create a consistent, authentic, and recognizable project.', 'cta-text-serv': 'If you feel this is the right place, write to us.',
            // CONTACT
            'hero-title-cont': 'Let\'s talk.', 'hero-subtitle-cont': 'Tell us your idea.', 'ponz-role': 'Producer', 'ponz-bio': 'The ear that sees beyond. Specialized in finding the sonic soul of a project before the first note is recorded. He guides the overall vision with an approach that blends technique and instinct.', 'andrea-role': 'Multi-instrumentalist / Arranger', 'andrea-bio': 'Hands that translate ideas into harmony. From piano to synths, strings to electronics. He builds the musical foundations upon which the song can rise and breathe.', 'direct-contact-title': 'Let\'s team up.',
            // PORTFOLIO
            'port-hero': 'Some of the worlds we have traversed.', 'visual-break': 'Every project is a collaboration.', 'playlist-title': 'Our playlist. No filters.', 'playlist-btn': 'Listen on Spotify', 'footer-cta': 'The next project could be yours.'
        },
        'it': {
            'nav-home': 'Home', 'nav-servizi': 'Servizi', 'nav-portfolio': 'Portfolio', 'nav-contatti': 'Contatti',
            // HOME
            'hero-title-home': 'Il Suono è un Rituale.', 'story1-title': 'L\'Origine', 'story1-text': 'Tiny Temple non è nato come uno studio, ma come una necessità. In un mondo che urla, abbiamo cercato un angolo di silenzio dove il suono potesse tornare ad essere sacro. Qui, le pareti respirano e la tecnologia si inchina all\'espressione umana.', 'story2-title': 'L\'Alchimia', 'story2-text': 'Non catturiamo solo frequenze. Cerchiamo l\'imperfezione che rende una performance irripetibile. Luce calda, legno vivo e un approccio analogico al tempo: questo è il nostro spazio, sospeso tra il classico e l\'avanguardia.', 'connect-title-home': 'Ogni brano nasce da una collaborazione.',
            // SERVICES
            'hero-title-serv': 'Costruiamo suoni insieme.', 'hero-subtitle-serv': 'Ascolto &rarr; Costruzione &rarr; Cura', 'serv1-title': 'Produzione Musicale', 'serv1-text': 'Non imponiamo un sound, lo cerchiamo dentro di te. Dalla pre-produzione all\'arrangiamento, diamo corpo alla tua visione.', 'serv2-title': 'Recording', 'serv2-text': 'Catturiamo l\'istante. Microfoni scelti con cura, preamplificatori caldi e un ambiente trattato per esaltare ogni sfumatura della performance.', 'serv3-title': 'Mixing & Mastering', 'serv3-text': 'Equilibrio e profondità. Scolpiamo il suono per renderlo tridimensionale e pronto per il mondo, rispettando la dinamica originale.', 'serv4-title': 'Direzione Artistica', 'serv4-text': 'Oltre il suono, c\'è l\'identità. Ti guidiamo nelle scelte stilistiche per creare un progetto coerente, autentico e riconoscibile.', 'cta-text-serv': 'Se senti che è il posto giusto scrivici.',
            // CONTACT
            'hero-title-cont': 'Parliamo.', 'hero-subtitle-cont': 'Raccontaci la tua idea.', 'ponz-role': 'Produttore', 'ponz-bio': 'L\'orecchio che vede oltre. Specializzato nel trovare l\'anima sonora di un progetto prima ancora che venga registrata la prima nota. Guida la visione d\'insieme con un approccio che fonde tecnica e istinto.', 'andrea-role': 'Polistrumentista / Arrangiatore', 'andrea-bio': 'Le mani che traducono l\'idea in armonia. Dal pianoforte ai synth, dagli archi all\'elettronica. Costruisce le fondamenta musicali su cui il brano può elevarsi e respirare.', 'direct-contact-title': 'Facciamo squadra.',
            // PORTFOLIO
            'port-hero': 'Alcuni dei mondi che abbiamo attraversato.', 'visual-break': 'Ogni progetto è una collaborazione.', 'playlist-title': 'La nostra playlist. Senza filtri.', 'playlist-btn': 'Ascolta su Spotify', 'footer-cta': 'Il prossimo progetto potrebbe essere il tuo.'
        }
    };

    const applyLanguage = (lang, withAnimation = false) => {
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (dict[lang] && dict[lang][key]) {
                if (withAnimation) {
                    el.style.opacity = '0';
                    el.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        el.innerHTML = dict[lang][key];
                        el.style.opacity = '1';
                    }, 300);
                } else {
                    el.innerHTML = dict[lang][key];
                }
            }
        });
    };

    if (currentLang !== 'it') applyLanguage(currentLang, false);

    langBtn.addEventListener('click', (e) => {
        e.preventDefault();
        langIcon.classList.add('rotate-anim');
        setTimeout(() => langIcon.classList.remove('rotate-anim'), 500);
        currentLang = currentLang === 'it' ? 'en' : 'it';
        localStorage.setItem('tinyTempleLang', currentLang);
        applyLanguage(currentLang, true);
    });
}