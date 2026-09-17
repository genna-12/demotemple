// Tiny Temple Toolbox - pagina 404
import commonDict from '/shared/i18n-common.js';
import { init } from '/shared/i18n.js';
import { pressFeedback } from '/shared/ui.js';
import { mountBar } from '/shared/nav.js';

init(commonDict);
pressFeedback(document);
mountBar({ page: 'home', current: null });
