/**
 * Tiny Temple - Contact Engine (Anti-Spam, Rate Limit & Spatial Glass UI)
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. HERO ANIMATIONS ---
    const heroTitle = document.querySelector('.hero-content h1');
    const heroSubtitle = document.querySelector('.hero-subtitle');

    setTimeout(() => {
        document.body.classList.remove('loading-state');
        if (heroTitle) heroTitle.classList.add('is-visible');
        if (heroSubtitle) {
            heroSubtitle.style.opacity = '0';
            heroSubtitle.style.transform = 'translateY(20px)';
            setTimeout(() => heroSubtitle.classList.add('is-visible'), 300);
        }
    }, 100);

    // --- 2. CONFIGURAZIONE INVIO MAIL ---
    // OPZIONE A: Web3Forms (Consigliata: 100% Gratuita e Illimitata)
    // Iscriviti su https://web3forms.com inserendo tinytempleproduction@gmail.com e incolla la chiave qui sotto:
    const WEB3FORMS_ACCESS_KEY = "INSERISCI_QUI_LA_TUA_ACCESS_KEY_WEB3FORMS";

    // --- 3. CONTROLLI ANTI-SPAM, ANTI-BOT & DOS ---
    const form = document.getElementById('tiny-contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const formStatus = document.getElementById('form-status');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;

    // A. Timestamp per time-gate (Scarta se compilato in < 2.5s)
    const pageLoadTime = Date.now();

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // B. Controllo Honeypot
            const trapValue = form.querySelector('input[name="studio_verification_code"]').value;
            if (trapValue && trapValue.trim() !== '') {
                console.warn("Spam Bot rilevato e bloccato.");
                showStatus("Invio riuscito.", "success");
                form.reset();
                return;
            }

            // C. Controllo Time-Gate
            const submissionDuration = (Date.now() - pageLoadTime) / 1000;
            if (submissionDuration < 2.5) {
                console.warn("Invio troppo rapido (Bot).");
                showStatus("Errore: Invio troppo rapido. Riprova con calma.", "error");
                return;
            }

            // D. Rate Limiting Locale (Max 1 invio ogni 60s per browser)
            const lastSent = localStorage.getItem('tiny_temple_last_form_submission');
            if (lastSent && (Date.now() - parseInt(lastSent, 10)) < 60000) {
                const remainingSecs = Math.ceil((60000 - (Date.now() - parseInt(lastSent, 10))) / 1000);
                showStatus(`Hai già inviato un messaggio. Attendi ${remainingSecs} secondi prima di inviarne un altro.`, "error");
                return;
            }

            // E. Validazione campi
            const name = document.getElementById('user_name').value.trim();
            const email = document.getElementById('user_email').value.trim();
            const service = document.getElementById('service_type').value;
            const message = document.getElementById('message').value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!name || name.length < 2) {
                showStatus("Per favore inserisci un nome valido.", "error");
                return;
            }
            if (!emailRegex.test(email)) {
                showStatus("Per favore inserisci un indirizzo email valido.", "error");
                return;
            }
            if (!message || message.length < 10) {
                showStatus("Il messaggio è troppo breve (minimo 10 caratteri).", "error");
                return;
            }

            // F. Esecuzione Invio
            setButtonLoading(true);

            try {
                // Invio tramite Web3Forms (o adatta per EmailJS)
                const payload = {
                    access_key: WEB3FORMS_ACCESS_KEY,
                    from_name: name,
                    email: email,
                    subject: `[Tiny Temple] Nuova Richiesta da ${name} - ${service}`,
                    service_type: service,
                    message: message
                };

                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.status === 200) {
                    showStatus("Grazie. Il tuo messaggio è stato inviato al Tempio. Risponderemo a breve.", "success");
                    localStorage.setItem('tiny_temple_last_form_submission', Date.now().toString());
                    form.reset();
                } else {
                    throw new Error(result.message || "Errore durante l'invio.");
                }
            } catch (err) {
                console.error("Errore invio:", err);
                // Fallback a mailto diretto se l'API non risponde
                showStatus("Impossibile completare l'invio automatico. Puoi scriverci direttamente a tinytempleproduction@gmail.com", "error");
            } finally {
                setButtonLoading(false);
            }
        });
    }

    function showStatus(text, type) {
        formStatus.textContent = text;
        formStatus.className = `form-status ${type}`;
        formStatus.style.display = 'block';
    }

    function setButtonLoading(loading) {
        submitBtn.disabled = loading;
        if (btnText) {
            btnText.textContent = loading ? "Invio in corso..." : "Invia Messaggio";
        }
    }
});