// Tiny Temple Toolbox - dizionario comune (IT/EN)
// Modulo dati puro: nessun effetto all'import. Usato da index.html/404.html
// e, unito al dizionario dello strumento, da ogni pagina <slug>/.
// Chiavi "bar-*"/"menu-*": barra e menu fullscreen (shared/nav.js, spec 01).
// Chiavi "pill-*"/"fam-*"/"home-*": home (index.html), lette anche insieme
// a shared/tools.js (nomi/stato) per comporre le righe degli strumenti.
// Chiavi "mic-*": usate da shared/mic.js (renderConsent). Chiavi "pwa-*":
// usate da shared/pwa.js (toast di aggiornamento; "pwa-manual" per il
// ripiego "usa il menu del browser" quando non c'e' prompt nativo).
// "audio-resume-msg":
// testo "Tocca per riprendere" della spec (00-architettura §3), pronto per
// lo strumento che lo mostra dopo needsGesture() al ritorno in primo piano.
export default {
    it: {
        'tb-back': '← Toolbox',
        'tb-lang-aria': 'Cambia lingua',

        'bar-menu-open': 'Apri il menu',
        'bar-menu-close': 'Chiudi il menu',
        'bar-back-aria': 'Torna alla Toolbox',
        'menu-all': 'Tutti gli strumenti',
        'menu-install': 'Installa l’app',
        'menu-site': 'Sito dello studio',
        'pill-soon': 'In arrivo',
        'pill-next': 'Prossimo',
        'fam-live': 'Dal vivo',
        'fam-analysis': 'Analisi',
        'fam-writing': 'Scrittura',
        'fam-calc': 'Calcolo',
        'fam-release': 'Lancio',

        'idx-eyebrow': 'Tiny Temple Studio',
        'idx-title': 'Toolbox',
        'home-intro': 'Gli strumenti dello studio, in tasca. Gratis, senza account, uno nuovo alla volta.',
        'home-next': 'Il prossimo: {tool}',

        'tool-metronomo': 'Metronomo',
        'tool-metronomo-desc': 'Tempo preciso per le prove e le registrazioni.',
        'tool-accordatore': 'Accordatore',
        'tool-accordatore-desc': 'Accorda lo strumento dal microfono del telefono.',
        'tool-calcolatore-tempo': 'Calcolatore Tempo',
        'tool-calcolatore-tempo-desc': 'Calcola delay e riverbero a partire dal BPM.',
        'tool-dna': 'DNA',
        'tool-dna-desc': 'Scopri tonalità e BPM di una registrazione.',
        'tool-penna': 'Penna',
        'tool-penna-desc': 'Rimario e blocco testi.',
        'tool-pianificatore-uscita': 'Pianificatore Uscita',
        'tool-pianificatore-uscita-desc': 'Organizza i passi per pubblicare il tuo brano.',
        'tool-checklist-consegna': 'Checklist Consegna',
        'tool-checklist-consegna-desc': 'Cosa preparare e come chiamare le tracce.',
        'tool-split-sheet': 'Split Sheet',
        'tool-split-sheet-desc': 'Dividi le quote e scarica il PDF da firmare.',

        'idx-install-title': 'Installa la Toolbox',
        'idx-install-text': 'Aggiungila alla schermata Home per aprirla come un’app, anche offline.',
        'idx-install-btn': 'Installa l’app',
        'idx-ios-title': 'Su iPhone',
        'idx-ios-step1': 'Apri questa pagina in Safari.',
        'idx-ios-step2': 'Tocca Condividi (il quadrato con la freccia in alto).',
        'idx-ios-step3': 'Scegli “Aggiungi alla schermata Home”.',
        'idx-ios-inapp-title': 'Apri in Safari',
        'idx-ios-inapp-text': 'Questo browser non permette di installare l’app. Tocca il menu e scegli “Apri in Safari”, poi segui i passaggi per aggiungerla alla schermata Home.',
        'pwa-manual': 'Usa il menu del browser: Installa app oppure Aggiungi alla schermata Home.',

        'mic-unavailable': 'Il microfono non è disponibile su questo browser.',
        'mic-denied': 'Il permesso per il microfono è stato negato. Puoi riattivarlo dalle impostazioni del browser.',
        'mic-retry': 'Riprova',
        'mic-start': 'Attiva il microfono',
        'mic-consent-title': 'Serve il microfono',
        'mic-consent-text': 'Questo strumento usa il microfono del dispositivo solo mentre lo usi tu: l’audio resta nel browser e non viene inviato da nessuna parte. Puoi revocare il consenso quando vuoi.',
        'mic-consent-allow': 'Attiva il microfono',

        'pwa-update': 'Nuova versione disponibile.',
        'pwa-update-action': 'Aggiorna',

        'tb-footer-legal-note': 'Tiny Temple Studio è il nome con cui Francesco Pontillo, libero professionista, esercita la propria attività. I professionisti indicati sul sito collaborano in qualità di lavoratori autonomi indipendenti.',
        'tb-footer-privacy': 'Privacy Policy',
        'tb-footer-cookie': 'Cookie Policy',
        'tb-footer-note-legali': 'Note legali',
        'tb-footer-site': 'Sito dello studio',

        'e404-eyebrow': 'Errore 404',
        'e404-title': 'Pagina non trovata',
        'e404-intro': 'Il link che hai seguito non porta da nessuna parte: la pagina è stata spostata oppure non è mai esistita.',

        'audio-resume-msg': 'Tocca per riprendere'
    },
    en: {
        'tb-back': '← Toolbox',
        'tb-lang-aria': 'Change language',

        'bar-menu-open': 'Open menu',
        'bar-menu-close': 'Close menu',
        'bar-back-aria': 'Back to the Toolbox',
        'menu-all': 'All tools',
        'menu-install': 'Install the app',
        'menu-site': 'Studio website',
        'pill-soon': 'Coming soon',
        'pill-next': 'Up next',
        'fam-live': 'Live',
        'fam-analysis': 'Analysis',
        'fam-writing': 'Writing',
        'fam-calc': 'Calculators',
        'fam-release': 'Release',

        'idx-eyebrow': 'Tiny Temple Studio',
        'idx-title': 'Toolbox',
        'home-intro': 'The studio’s tools in your pocket. Free, no account, one new tool at a time.',
        'home-next': 'Up next: {tool}',

        'tool-metronomo': 'Metronome',
        'tool-metronomo-desc': 'Precise tempo for rehearsals and takes.',
        'tool-accordatore': 'Tuner',
        'tool-accordatore-desc': 'Tune your instrument with your phone’s mic.',
        'tool-calcolatore-tempo': 'Tempo Calculator',
        'tool-calcolatore-tempo-desc': 'Work out delay and reverb times from your BPM.',
        'tool-dna': 'DNA',
        'tool-dna-desc': 'Find the key and BPM of a recording.',
        'tool-penna': 'Lyric Pad',
        'tool-penna-desc': 'Rhymes and a notebook for lyrics.',
        'tool-pianificatore-uscita': 'Release Planner',
        'tool-pianificatore-uscita-desc': 'Plan every step to release your track.',
        'tool-checklist-consegna': 'Delivery Checklist',
        'tool-checklist-consegna-desc': 'What to prepare and how to name your stems.',
        'tool-split-sheet': 'Split Sheet',
        'tool-split-sheet-desc': 'Split the shares, download a PDF to sign.',

        'idx-install-title': 'Install the Toolbox',
        'idx-install-text': 'Add it to your home screen to open it like an app, even offline.',
        'idx-install-btn': 'Install the app',
        'idx-ios-title': 'On iPhone',
        'idx-ios-step1': 'Open this page in Safari.',
        'idx-ios-step2': 'Tap Share (the square with the arrow at the top).',
        'idx-ios-step3': 'Choose “Add to Home Screen”.',
        'idx-ios-inapp-title': 'Open in Safari',
        'idx-ios-inapp-text': 'This browser can’t install apps. Tap the menu and choose “Open in Safari”, then follow the steps to add it to your home screen.',
        'pwa-manual': 'Use your browser menu: Install app or Add to Home Screen.',

        'mic-unavailable': 'The microphone isn’t available in this browser.',
        'mic-denied': 'Microphone access was denied. You can re-enable it from your browser settings.',
        'mic-retry': 'Try again',
        'mic-start': 'Turn on the microphone',
        'mic-consent-title': 'Microphone needed',
        'mic-consent-text': 'This tool uses your device’s microphone only while you’re using it: the audio stays in the browser and is never sent anywhere. You can withdraw consent whenever you like.',
        'mic-consent-allow': 'Turn on the microphone',

        'pwa-update': 'New version available.',
        'pwa-update-action': 'Update',

        'tb-footer-legal-note': 'Tiny Temple Studio is the name under which Francesco Pontillo, a self-employed professional, carries out his activity. The professionals listed on this site work with the studio as independent self-employed contractors.',
        'tb-footer-privacy': 'Privacy Policy',
        'tb-footer-cookie': 'Cookie Policy',
        'tb-footer-note-legali': 'Legal notice',
        'tb-footer-site': 'Studio website',

        'e404-eyebrow': 'Error 404',
        'e404-title': 'Page not found',
        'e404-intro': 'The link you followed leads nowhere: the page has been moved or never existed.',

        'audio-resume-msg': 'Tap to resume'
    }
};
