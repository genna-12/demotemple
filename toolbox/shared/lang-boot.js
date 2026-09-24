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
    /* Impostazioni > Aspetto (spec 18 §5): preferenze portabili nell'archivio,
       qui lette dalla copia veloce in localStorage (JSON: 'true'). */
    var pref = function (k) {
        try { return window.localStorage.getItem(k) === 'true'; } catch (e) { return false; }
    };
    /* "Animazioni ridotte": come prefers-reduced-motion, dal primo frame
       (base.css ha le stesse regole sotto html.tb-ridotte) */
    var ridotte = pref('tt.shared.animazioni-ridotte');
    if (ridotte) root.classList.add('tb-ridotte');
    /* intro gia' vista in questa sessione, "Salta l'intro" o movimento
       ridotto: il logo parte agganciato in alto a sinistra, senza
       transizione (vedi shared/intro.js). */
    var noIntro = ridotte || pref('tt.shared.salta-intro');
    try { noIntro = noIntro || window.sessionStorage.getItem('tbIntro') === '1'; } catch (e) { /* storage bloccato */ }
    try {
        noIntro = noIntro || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { /* matchMedia assente */ }
    if (noIntro) root.classList.add('tb-no-intro');
    if (l === 'it') return;
    root.classList.add('tb-i18n-pending');
    /* rete di sicurezza: se i moduli non partono i testi IT restano leggibili */
    setTimeout(function () { root.classList.remove('tb-i18n-pending'); }, 3000);
}());
