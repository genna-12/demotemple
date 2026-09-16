// Tiny Temple Toolbox - pagina indice
import commonDict from '/shared/i18n-common.js';
import { init, lang, setLang } from '/shared/i18n.js';
import { pressFeedback } from '/shared/ui.js';
import { initPwa } from '/shared/pwa.js';

init(commonDict);
pressFeedback(document);

const langBtn = document.getElementById('tb-lang-btn');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        setLang(lang() === 'it' ? 'en' : 'it');
    });
}

initPwa({
    installBtn: document.getElementById('tb-install'),
    iosHelp: document.getElementById('tb-ios-help'),
    installSection: document.getElementById('tb-install-section')
});
