// Tiny Temple Toolbox - dashboard
import commonDict from '/shared/i18n-common.js';
import { init } from '/shared/i18n.js';
import { pressFeedback } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';
import { mountDash } from '/shared/dash.js';
import { startIntro } from '/shared/intro.js';
import { initPwa } from '/shared/pwa.js';

init(commonDict);
pressFeedback(document);
mountBar({ page: 'home', current: 'home' });
mountDash();
startIntro({ isHome: true });

initPwa({
    installBtn: document.getElementById('tb-menu-install'),
    iosHelp: document.getElementById('tb-menu-ios'),
    installSection: document.querySelector('.tb-menu-install-group')
});
