// Tiny Temple Toolbox - pagina 404
import commonDict from '/shared/i18n-common.js';
import { init, lang, setLang } from '/shared/i18n.js';
import { pressFeedback } from '/shared/ui.js';

init(commonDict);
pressFeedback(document);

const langBtn = document.getElementById('tb-lang-btn');
if (langBtn) {
    langBtn.addEventListener('click', () => {
        setLang(lang() === 'it' ? 'en' : 'it');
    });
}
