// Tiny Temple Toolbox - dizionario comune (IT/EN)
// Modulo dati puro: nessun effetto all'import. Usato da index.html/404.html
// e, unito al dizionario dello strumento, da ogni pagina <slug>/.
// Chiavi "bar-*"/"menu-*": barra e menu compatto (shared/nav.js, spec 02).
// Chiavi "dash-*"/"picker-*": dashboard e picker (shared/dash.js), lette
// anche insieme a shared/tools.js (nomi/stato/famiglia). "fam-*": nomi
// famiglia, usati da menu e picker. "pill-soon": stato "in arrivo".
// Chiavi "mic-*": usate da shared/mic.js (renderConsent). Chiavi "pwa-*":
// usate da shared/pwa.js (toast di aggiornamento; "pwa-manual" per il
// ripiego "usa il menu del browser" quando non c'e' prompt nativo;
// "idx-ios-*" per i passi iPhone, ora dentro il menu, invariati dalla
// spec 01). "audio-resume-msg": testo "Tocca per riprendere" della spec
// (00-architettura §3), pronto per lo strumento che lo mostra dopo
// needsGesture() al ritorno in primo piano.
export default {
    it: {
        'tb-back': 'Toolbox',
        'tb-lang-aria': 'Cambia lingua',

        'bar-menu-open': 'Apri il menu',
        'bar-menu-close': 'Chiudi il menu',
        'bar-logo-aria': 'Toolbox, vai alla dashboard',
        'menu-all': 'Dashboard',
        'menu-tools': 'Strumenti',
        'menu-install': 'Installa l’app',
        'menu-ext': 'Sito dello studio',
        'pill-soon': 'In arrivo',
        'fam-live': 'Dal vivo',
        'fam-analysis': 'Analisi',
        'fam-writing': 'Scrittura',
        'fam-calc': 'Calcolo',
        'fam-release': 'Lancio',

        'idx-title': 'Toolbox',
        'dash-subtitle': 'Sei strumenti per scrivere, provare e pubblicare. Funzionano offline, i dati restano sul telefono.',
        'dash-edit': 'Modifica',
        'dash-done': 'Fine',
        'dash-add': 'Aggiungi strumento',
        'dash-remove-aria': 'Togli {tool}',
        'dash-move-aria': 'Sposta {tool} con le frecce',
        'dash-moved': '{tool}: posizione {n}',
        'dash-editing': 'Stai riordinando',
        'dash-locked': 'In Modifica le tile si spostano, non si aprono.',
        'dash-removed': 'Tolto {tool}',
        'dash-restored': 'Rimesso {tool}',
        'dash-undo': 'Annulla',
        'picker-title': 'Aggiungi alla dashboard',
        'picker-close-aria': 'Chiudi',
        'picker-empty': 'Sono già tutti qui.',
        'picker-reset': 'Ripristina ordine',

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

        'idx-ios-title': 'Su iPhone',
        'idx-ios-step1': 'Apri questa pagina in Safari.',
        'idx-ios-step2': 'Tocca Condividi (il quadrato con la freccia in alto).',
        'idx-ios-step3': 'Scegli “Aggiungi alla schermata Home”.',
        'idx-ios-inapp-title': 'Apri in Safari',
        'idx-ios-inapp-text': 'Questo browser non permette di installare l’app. Tocca il menu e scegli “Apri in Safari”, poi segui i passaggi per aggiungerla alla schermata Home.',
        'pwa-manual': 'Usa il menu del browser: Installa app oppure Aggiungi alla schermata Home.',

        'mic-unavailable': 'Il microfono non è disponibile su questo browser.',
        'mic-none': 'Nessun microfono trovato su questo dispositivo.',
        'mic-busy': "Il microfono è già in uso da un'altra app.",
        'mic-failed': 'Impossibile usare il microfono. Riprova.',
        'mic-denied': 'Il permesso per il microfono è stato negato. Puoi riattivarlo dalle impostazioni del browser.',
        'mic-retry': 'Riprova',
        'mic-start': 'Avvia ascolto',
        'mic-consent-title': 'Serve il microfono',
        'mic-consent-text': 'Questo strumento usa il microfono del dispositivo solo mentre lo usi tu: l’audio resta nel browser e non viene inviato da nessuna parte. Puoi revocare il consenso quando vuoi.',
        'mic-consent-allow': 'Attiva il microfono',

        'mic-live-aria': 'Microfono attivo',
        'mic-state-granted': 'Microfono: consentito',
        'mic-state-unasked': 'Microfono: non richiesto',
        'mic-revoke': 'Revoca',

        'pack-installed': 'Pacchetti del rimario',
        'pack-remove': 'Rimuovi',
        'pack-remove-ask': 'Rimuovo questo pacchetto? Potrai riscaricarlo.',
        'pack-remove-cancel': 'Annulla',

        'pwa-update': 'Nuova versione disponibile.',
        'pwa-update-action': 'Aggiorna',
        'toast-close-aria': 'Chiudi l’avviso',

        'tb-footer-privacy': 'Privacy',
        'footer-designed': 'Designed by Genna',
        'sheet-close': 'Chiudi',
        'info-aria': 'Che cos\'è',

        'e404-eyebrow': 'Errore 404',
        'e404-title': 'Pagina non trovata',
        'e404-intro': 'Il link che hai seguito non porta da nessuna parte: la pagina è stata spostata oppure non è mai esistita.',

        'audio-resume-msg': 'Tocca per riprendere'
    },
    en: {
        'tb-back': 'Toolbox',
        'tb-lang-aria': 'Change language',

        'bar-menu-open': 'Open menu',
        'bar-menu-close': 'Close menu',
        'bar-logo-aria': 'Toolbox, go to the dashboard',
        'menu-all': 'Dashboard',
        'menu-tools': 'Tools',
        'menu-install': 'Install the app',
        'menu-ext': 'Studio website',
        'pill-soon': 'Coming soon',
        'fam-live': 'Live',
        'fam-analysis': 'Analysis',
        'fam-writing': 'Writing',
        'fam-calc': 'Calculators',
        'fam-release': 'Release',

        'idx-title': 'Toolbox',
        'dash-subtitle': 'Six tools to write, try out and release. They work offline, your data stays on your phone.',
        'dash-edit': 'Edit',
        'dash-done': 'Done',
        'dash-add': 'Add tool',
        'dash-remove-aria': 'Remove {tool}',
        'dash-move-aria': 'Move {tool} with the arrow keys',
        'dash-moved': '{tool}: position {n}',
        'dash-editing': 'You are reordering',
        'dash-locked': 'In Edit mode tiles move instead of opening.',
        'dash-removed': 'Removed {tool}',
        'dash-restored': '{tool} is back',
        'dash-undo': 'Undo',
        'picker-title': 'Add to the dashboard',
        'picker-close-aria': 'Close',
        'picker-empty': 'They’re all here already.',
        'picker-reset': 'Reset order',

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

        'idx-ios-title': 'On iPhone',
        'idx-ios-step1': 'Open this page in Safari.',
        'idx-ios-step2': 'Tap Share (the square with the arrow at the top).',
        'idx-ios-step3': 'Choose “Add to Home Screen”.',
        'idx-ios-inapp-title': 'Open in Safari',
        'idx-ios-inapp-text': 'This browser can’t install apps. Tap the menu and choose “Open in Safari”, then follow the steps to add it to your home screen.',
        'pwa-manual': 'Use your browser menu: Install app or Add to Home Screen.',

        'mic-unavailable': 'The microphone isn’t available in this browser.',
        'mic-none': 'No microphone was found on this device.',
        'mic-busy': 'The microphone is already in use by another app.',
        'mic-failed': "Couldn't use the microphone. Try again.",
        'mic-denied': 'Microphone access was denied. You can re-enable it from your browser settings.',
        'mic-retry': 'Try again',
        'mic-start': 'Start listening',
        'mic-consent-title': 'Microphone needed',
        'mic-consent-text': 'This tool uses your device’s microphone only while you’re using it: the audio stays in the browser and is never sent anywhere. You can withdraw consent whenever you like.',
        'mic-consent-allow': 'Turn on the microphone',

        'mic-live-aria': 'Microphone active',
        'mic-state-granted': 'Microphone: allowed',
        'mic-state-unasked': 'Microphone: not requested',
        'mic-revoke': 'Revoke',

        'pack-installed': 'Rhyme dictionary packs',
        'pack-remove': 'Remove',
        'pack-remove-ask': 'Remove this pack? You can download it again later.',
        'pack-remove-cancel': 'Cancel',

        'pwa-update': 'New version available.',
        'pwa-update-action': 'Update',
        'toast-close-aria': 'Dismiss',

        'tb-footer-privacy': 'Privacy',
        'footer-designed': 'Designed by Genna',
        'sheet-close': 'Close',
        'info-aria': 'What is this',

        'e404-eyebrow': 'Error 404',
        'e404-title': 'Page not found',
        'e404-intro': 'The link you followed leads nowhere: the page has been moved or never existed.',

        'audio-resume-msg': 'Tap to resume'
    }
};
