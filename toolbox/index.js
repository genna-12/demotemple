// Tiny Temple Toolbox - pagina indice
import commonDict from '/shared/i18n-common.js';
import { init } from '/shared/i18n.js';
import { pressFeedback } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { initPwa } from '/shared/pwa.js';

init(commonDict);
pressFeedback(document);
mountBar({ page: 'home', current: 'home' });

initPwa({
    installBtn: document.getElementById('tb-install'),
    iosHelp: document.getElementById('tb-ios-help'),
    installSection: document.getElementById('installa') || document.getElementById('tb-install-section')
});
