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
// Chiavi "sync-*" (spec 18 §4/§5): la sincronizzazione era di Penna sola
// (spec 17 §3, #pen-sync), ora e' della Toolbox intera, un codice per
// tutto, in Impostazioni (#imp-sync). Spostate qui da penna/i18n.js perche'
// valgono ovunque; "sync-what"/"sync-coll-*"/"sync-intro-all" sono nuove
// del giro 18 (elenco delle collezioni sincronizzabili).
// Chiavi "help-*"/"hint-*" (spec 18 §6, aiuto in-app uniforme): usate da
// shared/aiuto.js, comune a tutti gli strumenti + /impostazioni/.
// "help-open" e' il testo visibile del bottone .tb-help in barra
// (data-i18n) e "help-close" l'aria-label del bottone × del foglio "Come
// funziona" che aiuto.js costruisce al volo (riusa .tb-sheet/.tb-sheet-close
// di shared/sheet.js: chiave separata da "sheet-close" perche' qui la X
// chiude nello specifico l'aiuto, non un foglio qualsiasi).
// "hint-close-aria" e' l'aria-label del × sulla riga .tb-hint del primo
// avvio (testo della riga: aiuto.js legge hint.it/hint.en da <slug>/aiuto.js,
// non da qui).
export default {
    it: {
        'tb-back': 'Toolbox',
        'tb-lang-aria': 'Cambia lingua',

        'bar-menu-open': 'Apri il menu',
        'bar-menu-close': 'Chiudi il menu',
        'bar-logo-aria': 'Toolbox, vai alla dashboard',
        'menu-all': 'Dashboard',
        'menu-tools': 'Strumenti',
        'menu-impostazioni': 'Impostazioni',
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

        'help-open': 'Come funziona',
        'help-close': 'Chiudi l’aiuto',
        'hint-close-aria': 'Chiudi il suggerimento',

        'tb-settings-link': 'Impostazioni della Toolbox →',

        'sync-title': 'Sincronizza fra dispositivi',
        'sync-intro-all': 'Stessi testi, piani e preferenze su telefono e computer, senza account.',
        'sync-create': 'Crea un codice',
        'sync-have': 'Ho già un codice',
        'sync-code-warn': 'Scrivilo da qualche parte: senza il codice i dati non si ritrovano.',
        'sync-last': 'Ultima sincronizzazione: {ora}',
        'sync-wipe': 'Scollega ed elimina dal server',
        'sync-off': 'Nessuna rete: riprovo dopo',
        'sync-bad-code': 'Codice non valido',
        'sync-full': 'Collezione piena',
        'sync-activate': 'Attiva',
        'sync-link': 'Collega',
        'sync-now': 'Sincronizza',
        'sync-show': 'Mostra codice',
        'sync-unlink': 'Scollega',
        'sync-doing': 'Sincronizzazione in corso…',
        'sync-done': 'Sincronizzato',
        'sync-fail': 'Errore del server: riprovo dopo',
        'sync-too-big': 'Elemento troppo grande per la sincronizzazione',
        'sync-copy': 'Copia',
        'sync-copied': 'Codice copiato',
        'sync-input-label': 'Il tuo codice (sei parole)',
        'sync-input-placeholder': 'parola parola parola parola parola parola',
        'sync-wipe-ask': 'Elimino le copie dal server? I dati restano su questo dispositivo.',
        'sync-what': 'Cosa sincronizzare',
        'sync-coll-penna': 'Testi',
        'sync-coll-uscite': 'Piani di uscita',
        'sync-coll-accordature': 'Accordature',
        'sync-coll-metronomo-preset': 'Preset del metronomo',
        'sync-coll-dna': 'Storico DNA',
        'sync-coll-impostazioni': 'Preferenze',

        'e404-eyebrow': 'Errore 404',
        'e404-title': 'Pagina non trovata',
        'e404-intro': 'Il link che hai seguito non porta da nessuna parte: la pagina è stata spostata oppure non è mai esistita.',

        'audio-resume-msg': 'Tocca per riprendere',

        'store-migrate-fail': 'Non riesco ad aggiornare i dati salvati: li vedi, ma le modifiche non si salvano. Riprova riaprendo la pagina.',
        'store-pref-fail': 'Questa impostazione resta solo su questo dispositivo: non entra nei dati della Toolbox.',
        'store-limit': 'Spazio pieno per questi dati: elimina qualcosa per salvarne altri.'
    },
    en: {
        'tb-back': 'Toolbox',
        'tb-lang-aria': 'Change language',

        'bar-menu-open': 'Open menu',
        'bar-menu-close': 'Close menu',
        'bar-logo-aria': 'Toolbox, go to the dashboard',
        'menu-all': 'Dashboard',
        'menu-tools': 'Tools',
        'menu-impostazioni': 'Settings',
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

        'help-open': 'How it works',
        'help-close': 'Close help',
        'hint-close-aria': 'Dismiss this tip',

        'tb-settings-link': 'Toolbox settings →',

        'sync-title': 'Sync across devices',
        'sync-intro-all': 'The same lyrics, plans and preferences on your phone and computer, no account.',
        'sync-create': 'Create a code',
        'sync-have': 'I already have a code',
        'sync-code-warn': 'Write it down: without the code the data cannot be recovered.',
        'sync-last': 'Last sync: {ora}',
        'sync-wipe': 'Unlink and delete from the server',
        'sync-off': 'No network: will retry later',
        'sync-bad-code': 'Invalid code',
        'sync-full': 'Collection full',
        'sync-activate': 'Turn on',
        'sync-link': 'Link',
        'sync-now': 'Sync now',
        'sync-show': 'Show code',
        'sync-unlink': 'Unlink',
        'sync-doing': 'Syncing…',
        'sync-done': 'Synced',
        'sync-fail': 'Server error: will retry later',
        'sync-too-big': 'Item too large to sync',
        'sync-copy': 'Copy',
        'sync-copied': 'Code copied',
        'sync-input-label': 'Your code (six words)',
        'sync-input-placeholder': 'word word word word word word',
        'sync-wipe-ask': 'Delete the server copies? The data stays on this device.',
        'sync-what': 'What to sync',
        'sync-coll-penna': 'Lyrics',
        'sync-coll-uscite': 'Release plans',
        'sync-coll-accordature': 'Tunings',
        'sync-coll-metronomo-preset': 'Metronome presets',
        'sync-coll-dna': 'DNA history',
        'sync-coll-impostazioni': 'Preferences',

        'e404-eyebrow': 'Error 404',
        'e404-title': 'Page not found',
        'e404-intro': 'The link you followed leads nowhere: the page has been moved or never existed.',

        'audio-resume-msg': 'Tap to resume',

        'store-migrate-fail': 'I cannot update your saved data: you can see it, but changes are not saved. Try reopening the page.',
        'store-pref-fail': 'This setting stays on this device only: it is not part of your Toolbox data.',
        'store-limit': 'Storage full for this data: delete something to save more.'
    }
};
