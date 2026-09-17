/* Tiny Temple Toolbox - lingua e stato dell'intro prima del primo paint
   (script classico, nel <head> prima dei CSS). */
(function () {
    var l = null;
    try { l = new URLSearchParams(location.search).get('lang'); } catch (e) { /* niente query */ }
    if (l !== 'it' && l !== 'en') {
        try { l = localStorage.getItem('tinyTempleLang'); } catch (e) { l = null; }
    }
    if (l !== 'it' && l !== 'en') l = 'it';
    var root = document.documentElement;
    root.lang = l;
    /* intro gia' vista in questa sessione o movimento ridotto: il logo parte
       agganciato in alto a sinistra, senza transizione (vedi shared/intro.js). */
    var noIntro = false;
    try { noIntro = window.sessionStorage.getItem('tbIntro') === '1'; } catch (e) { noIntro = false; }
    try {
        noIntro = noIntro || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* matchMedia assente */ }
    if (noIntro) root.classList.add('tb-no-intro');
    if (l === 'it') return;
    root.classList.add('tb-i18n-pending');
    /* rete di sicurezza: se i moduli non partono i testi IT restano leggibili */
    setTimeout(function () { root.classList.remove('tb-i18n-pending'); }, 3000);
}());
