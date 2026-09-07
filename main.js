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

// Rimuove il focus dai tasti fluttuanti al termine del tocco su mobile
document.querySelectorAll('.floating-btn').forEach(btn => {
    btn.addEventListener('touchend', () => {
        setTimeout(() => {
            btn.blur();
        }, 100);
    });
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
            "nav-home": "Home",
            "nav-servizi": "Services",
            "nav-portfolio": "Portfolio",
            "nav-contatti": "Contact",
            "connect-tag": "Follow us",
            "cta-discover": "Discover",
            "contact-label": "Let's talk about it",
            "contact-btn": "Write to us",
            "contact-alt": "or email us at",
            "nav-all-services": "All services",
            "hero-title-home": "Tiny Temple Studio",
            "hero-serv-music": "Music Production",
            "hero-serv-artist": "Artist Development",
            "hero-serv-mix": "Mix &amp; Mastering",
            "about-title": "About us",
            "about-text": "Tiny Temple Studio is an independent audio production house. We develop artists and music projects through production, artistic direction and sound work, collaborating with photography and video professionals to build a complete, recognisable project. We start from the artist, from their ideas and from the way they tell their own story. We don't impose formulas: we work to bring out what makes them unique.",
            "connect-title-home": "Every track is born from collaboration.",
            "serv-eyebrow": "Services",
            "serv-title": "What we do",
            "serv-intro": "Three paths that always start from the artist. Pick the one that fits you and go deeper.",
            "card1-title": "Artist Development",
            "card1-text": "We develop the artist and build the project around their identity.",
            "card2-title": "Music Production",
            "card2-text": "From the idea to the finished track, working together with the artist.",
            "card3-title": "Mixing &amp; Mastering",
            "card3-text": "We give your track the sound it deserves.",
            "connect-title-services": "If this feels like the right place, write to us.",
            "ad-lead": "We develop the artist and build the project around their identity.",
            "ad-claim": "Developing an artist means building a project, not imposing an identity.",
            "ad-p1": "Artist Development is Tiny Temple Studio's complete path for artists who want to turn their ideas into a structured, recognisable music project, ready to be presented to the professional world.",
            "ad-p2": "We start from the artist: from their story, their influences, the way they write and interpret music. Through research and conversation, we work to find a stylistic direction consistent with their personality, one that can become the foundation of the project.",
            "ad-p3": "The work is not limited to music. When needed, we involve our network of collaborators to develop photography, video and visual identity as well, so that every element of the project speaks the same language.",
            "ad-s1-h": "What we do",
            "ad-s1-i1": "<strong>Research and artistic direction</strong>We analyse references, influences and the artist's own traits to find an authentic musical and stylistic direction.",
            "ad-s1-i2": "<strong>Musical development</strong>We work on the songs, the production and the arrangements to build a repertoire consistent with that direction.",
            "ad-s1-i3": "<strong>Visual identity</strong>Through our network of collaborators we can develop photography, video and visual materials consistent with the music project.",
            "ad-s1-i4": "<strong>Building the project</strong>We bring music, image and communication together into one organic, recognisable project.",
            "ad-s1-i5": "<strong>Professional materials</strong>We prepare the profiles and professional materials needed to present the artist and the project to labels, publishers and industry professionals.",
            "ad-s2-h": "Working with the industry",
            "ad-s2-p1": "When we believe a project is ready, we can use our network of contacts to present it to labels, publishers and music industry professionals. The goal is to create real opportunities to be heard and evaluated and, when the conditions are there, to open the way to possible collaborations or deals.",
            "ad-s2-note": "Presenting a project to a label or a professional is not a guarantee of a contract. Our job is to prepare the project as solidly as possible and create the conditions for it to be heard by the right people.",
            "ad-outro": "Not building an artist to a formula.<br>Building around the artist a project that truly belongs to them.",
            "mp-lead": "From the idea to the finished track, working together with the artist.",
            "mp-claim": "From the idea to the finished track.",
            "mp-p1": "Music Production is the path dedicated to making the music itself: a single, an EP or an album.",
            "mp-p2": "We start from the artist's idea and work together to turn it into a complete production, stepping in where needed on the structure of the track, the arrangements, the choice of sounds and the overall balance of the production.",
            "mp-p3": "Our goal is not to apply a predefined sound, but to find the one that suits the track and the artist best.",
            "mp-s1-h": "What we do",
            "mp-s1-i1": "<strong>Pre-production</strong>We analyse the track, its structure, its writing and the elements that can be developed before recording.",
            "mp-s1-i2": "<strong>Arrangement and production</strong>We build the arrangement and develop the sound of the track through instruments, electronics, effects and production choices.",
            "mp-s1-i3": "<strong>Recording</strong>We run the recording sessions and work on the performance to get a take that keeps its character and personality.",
            "mp-s1-i4": "<strong>Mixing &amp; mastering</strong>Production can also be followed by the mixing and mastering stages, taking the track all the way to its final version.",
            "mp-s2-h": "How we work",
            "mp-s2-p1": "Every track calls for a different approach. That is why the process always starts with a conversation with the artist. We listen to the references, we analyse what has already been written and produced, and we try to understand what should stay untouched and what can be developed.",
            "mp-s2-p2": "Production should bring out the song, not overpower it.",
            "mp-outro": "A complete track, produced and ready to be released or included in a wider project.",
            "mm-lead": "We give your track the sound it deserves.",
            "mm-claim": "The final sound of your project.",
            "mm-p1": "Mixing &amp; Mastering is the service for artists and producers who already have a production and want to take it to its final version.",
            "mm-p2": "In the mix we work on the balance between vocals, instruments, effects and frequencies, shaping dynamics, space and depth to give the track a coherent sonic image.",
            "mm-p3": "Mastering is the final stage of the process: we work on the overall result to deliver a balanced master, ready for distribution.",
            "mm-s1-h": "Mixing",
            "mm-s1-i1": "Balance between vocals and instruments",
            "mm-s1-i2": "Frequency management",
            "mm-s1-i3": "Dynamics",
            "mm-s1-i4": "Depth and space",
            "mm-s1-i5": "Effects and ambience",
            "mm-s1-i6": "Definition of the overall sound",
            "mm-s2-h": "Mastering",
            "mm-s2-i1": "Optimisation of the final master",
            "mm-s2-i2": "Control of the overall balance",
            "mm-s2-i3": "Dynamics and level",
            "mm-s2-i4": "Preparation of the final file for distribution",
            "mm-s3-h": "Our approach",
            "mm-s3-p1": "We don't try to make every track sound like every other one.",
            "mm-s3-p2": "The mix should start from what has already been built in production and bring out the identity of the track, without changing its character.",
            "cont-eyebrow": "Contact",
            "cont-title": "Let's talk",
            "cont-intro": "Tell us your idea. We answer personally.",
            "ponz-role": "Production, Artistic direction",
            "andrea-role": "Arrangement, Multi-instrumentalist",
            "form-badge": "Direct communication",
            "form-title": "Write to the Temple.",
            "form-subtitle": "Tell us about your project. We usually reply within 24 hours.",
            "form-name-label": "Name / Artist Name *",
            "form-email-label": "Contact Email *",
            "form-service-label": "What are you planning?",
            "opt-artist": "Artist Development",
            "opt-prod": "Music Production",
            "opt-mix": "Mixing &amp; Mastering",
            "opt-other": "Other / General inquiry",
            "form-msg-label": "Share your vision *",
            "form-btn-send": "Send Message",
            "connect-title-contacts": "Let's team up.",
            "connect-title-portfolio": "The next project could be yours."
        },
        'it': {
            "nav-home": "Home",
            "nav-servizi": "Servizi",
            "nav-portfolio": "Portfolio",
            "nav-contatti": "Contatti",
            "connect-tag": "Seguici",
            "cta-discover": "Scopri",
            "contact-label": "Parliamone",
            "contact-btn": "Scrivici",
            "contact-alt": "oppure scrivi a",
            "nav-all-services": "Tutti i servizi",
            "hero-title-home": "Tiny Temple Studio",
            "hero-serv-music": "Music Production",
            "hero-serv-artist": "Artist Development",
            "hero-serv-mix": "Mix &amp; Mastering",
            "about-title": "Chi siamo",
            "about-text": "Tiny Temple Studio è una casa di produzione audio indipendente. Sviluppiamo artisti e progetti musicali attraverso produzione, direzione artistica e lavoro sul suono, collaborando con professionisti di fotografia e video per costruire un progetto completo e riconoscibile. Partiamo dall'artista, dalle sue idee e dal suo modo di raccontarsi. Non imponiamo formule: lavoriamo per valorizzare ciò che lo rende unico.",
            "connect-title-home": "Ogni brano nasce da una collaborazione.",
            "serv-eyebrow": "Servizi",
            "serv-title": "Cosa facciamo",
            "serv-intro": "Tre percorsi che partono sempre dall'artista. Scegli quello che ti riguarda e vai a fondo.",
            "card1-title": "Artist Development",
            "card1-text": "Sviluppiamo l'artista e costruiamo il progetto intorno alla sua identità.",
            "card2-title": "Music Production",
            "card2-text": "Dall'idea al brano finito, lavorando insieme all'artista.",
            "card3-title": "Mixing &amp; Mastering",
            "card3-text": "Diamo al tuo brano il suono che merita.",
            "connect-title-services": "Se senti che è il posto giusto scrivici.",
            "ad-lead": "Sviluppiamo l'artista e costruiamo il progetto intorno alla sua identità.",
            "ad-claim": "Sviluppare un artista significa costruire un progetto, non imporre un'identità.",
            "ad-p1": "Artist Development è il percorso completo di Tiny Temple Studio dedicato agli artisti che vogliono trasformare le proprie idee in un progetto musicale strutturato, riconoscibile e pronto per essere presentato al mondo professionale.",
            "ad-p2": "Partiamo dall'artista: dalla sua storia, dalle sue influenze, dal suo modo di scrivere e di interpretare la musica. Attraverso un percorso di ricerca e confronto, lavoriamo per individuare una direzione stilistica coerente con la sua personalità e che possa diventare la base del progetto.",
            "ad-p3": "Il lavoro non si limita alla musica. Quando necessario, coinvolgiamo la nostra rete di collaboratori per sviluppare anche fotografia, video e identità visiva, così che ogni elemento del progetto possa parlare la stessa lingua.",
            "ad-s1-h": "Cosa facciamo",
            "ad-s1-i1": "<strong>Ricerca e direzione artistica</strong>Analizziamo riferimenti, influenze e caratteristiche dell'artista per individuare una direzione musicale e stilistica autentica.",
            "ad-s1-i2": "<strong>Sviluppo musicale</strong>Lavoriamo sui brani, sulla produzione e sugli arrangiamenti per costruire un repertorio coerente con la direzione individuata.",
            "ad-s1-i3": "<strong>Identità visiva</strong>Attraverso la nostra rete di collaboratori possiamo sviluppare fotografia, video e materiali visivi coerenti con il progetto musicale.",
            "ad-s1-i4": "<strong>Costruzione del progetto</strong>Mettiamo insieme musica, immagine e comunicazione per arrivare a un progetto organico e riconoscibile.",
            "ad-s1-i5": "<strong>Materiali professionali</strong>Prepariamo schede e materiali professionali necessari per presentare l'artista e il progetto a etichette, editori e professionisti del settore discografico.",
            "ad-s2-h": "Il rapporto con il settore",
            "ad-s2-p1": "Quando riteniamo che un progetto sia pronto, possiamo utilizzare la nostra rete di contatti per presentarlo a etichette, editori e professionisti del settore discografico. L'obiettivo è creare occasioni concrete di ascolto e valutazione e, quando ci sono le condizioni, favorire possibili collaborazioni o accordi.",
            "ad-s2-note": "La presentazione a un'etichetta o a un professionista non costituisce una garanzia di contratto. Il nostro lavoro consiste nel preparare il progetto nel modo più solido possibile e creare le condizioni perché possa essere ascoltato dalle persone giuste.",
            "ad-outro": "Non costruire un artista secondo una formula.<br>Costruire intorno all'artista un progetto che gli appartenga davvero.",
            "mp-lead": "Dall'idea al brano finito, lavorando insieme all'artista.",
            "mp-claim": "Dall'idea al brano finito.",
            "mp-p1": "La Music Production è il percorso dedicato alla realizzazione musicale di un singolo, di un EP o di un album.",
            "mp-p2": "Partiamo dall'idea dell'artista e lavoriamo insieme per trasformarla in una produzione completa, intervenendo dove necessario sulla struttura del brano, sugli arrangiamenti, sulla scelta dei suoni e sull'equilibrio generale della produzione.",
            "mp-p3": "Il nostro obiettivo non è applicare un sound predefinito, ma trovare quello più adatto al brano e all'artista.",
            "mp-s1-h": "Cosa facciamo",
            "mp-s1-i1": "<strong>Pre-produzione</strong>Analizziamo il brano, la struttura, la scrittura e gli elementi che possono essere sviluppati prima della registrazione.",
            "mp-s1-i2": "<strong>Arrangiamento e produzione</strong>Costruiamo l'arrangiamento e sviluppiamo il suono del brano attraverso strumenti, elettronica, effetti e scelte produttive.",
            "mp-s1-i3": "<strong>Registrazione</strong>Seguiamo le sessioni di registrazione e lavoriamo sulla performance per ottenere una traccia che mantenga carattere e personalità.",
            "mp-s1-i4": "<strong>Mixing &amp; mastering</strong>La produzione può essere accompagnata anche dalle fasi di mixing e mastering, così da portare il brano fino alla sua versione definitiva.",
            "mp-s2-h": "Come lavoriamo",
            "mp-s2-p1": "Ogni brano richiede un approccio diverso. Per questo il processo parte sempre dal confronto con l'artista. Ascoltiamo i riferimenti, analizziamo ciò che è già stato scritto e prodotto e cerchiamo di capire cosa deve rimanere intatto e cosa invece può essere sviluppato.",
            "mp-s2-p2": "La produzione deve valorizzare la canzone, non sovrastarla.",
            "mp-outro": "Un brano completo, prodotto e pronto per essere pubblicato o inserito all'interno di un progetto più ampio.",
            "mm-lead": "Diamo al tuo brano il suono che merita.",
            "mm-claim": "Il suono finale del tuo progetto.",
            "mm-p1": "Mixing &amp; Mastering è il servizio dedicato agli artisti e ai produttori che hanno già una produzione e vogliono portarla alla sua versione definitiva.",
            "mm-p2": "Nel mixing lavoriamo sull'equilibrio tra voce, strumenti, effetti e frequenze, intervenendo su dinamica, spazialità e profondità per dare al brano un'immagine sonora coerente.",
            "mm-p3": "Il mastering è la fase finale del processo: lavoriamo sul risultato complessivo per ottenere un master equilibrato e pronto per la distribuzione.",
            "mm-s1-h": "Mixing",
            "mm-s1-i1": "Equilibrio tra voce e strumenti",
            "mm-s1-i2": "Gestione delle frequenze",
            "mm-s1-i3": "Dinamica",
            "mm-s1-i4": "Profondità e spazialità",
            "mm-s1-i5": "Effetti e ambiente",
            "mm-s1-i6": "Definizione del suono complessivo",
            "mm-s2-h": "Mastering",
            "mm-s2-i1": "Ottimizzazione del master finale",
            "mm-s2-i2": "Controllo dell'equilibrio generale",
            "mm-s2-i3": "Dinamica e livello",
            "mm-s2-i4": "Preparazione del file finale per la distribuzione",
            "mm-s3-h": "Il nostro approccio",
            "mm-s3-p1": "Non cerchiamo di rendere ogni brano uguale agli altri.",
            "mm-s3-p2": "Il mix deve partire da ciò che è già stato costruito in produzione e valorizzare l'identità del brano, senza snaturarne il carattere.",
            "cont-eyebrow": "Contatti",
            "cont-title": "Parliamo",
            "cont-intro": "Raccontaci la tua idea. Ti rispondiamo di persona.",
            "ponz-role": "Produzione, Direzione artistica",
            "andrea-role": "Arrangiamento, Polistrumentismo",
            "form-badge": "Comunicazione diretta",
            "form-title": "Scrivi al Tempio.",
            "form-subtitle": "Parlaci del tuo progetto. Rispondiamo solitamente entro 24 ore.",
            "form-name-label": "Nome / Nome d'Arte *",
            "form-email-label": "Email di Contatto *",
            "form-service-label": "Cosa hai in mente?",
            "opt-artist": "Artist Development",
            "opt-prod": "Music Production",
            "opt-mix": "Mixing &amp; Mastering",
            "opt-other": "Altro / Info generali",
            "form-msg-label": "Raccontaci la tua visione *",
            "form-btn-send": "Invia Messaggio",
            "connect-title-contacts": "Facciamo squadra.",
            "connect-title-portfolio": "Il prossimo progetto potrebbe essere il tuo."
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