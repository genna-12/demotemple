#!/usr/bin/env node
// Controlli meccanici pre-pubblicazione. Nessuna dipendenza npm (Node >= 18).
// Uso: node scripts/check.mjs  (dalla radice del repo)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fails = [], warns = [], infos = []; let checksRun = 0;
function ok(msg) { checksRun++; console.log('  ✓ ' + msg); }
function bad(msg, details) { checksRun++; fails.push(msg); console.log('  ✗ ' + msg); (details || []).forEach((d) => console.log('      - ' + d)); }
function warn(msg, details) { warns.push(msg); console.log('  ! ' + msg); (details || []).forEach((d) => console.log('      - ' + d)); }
function section(t) { console.log('\n== ' + t + ' =='); }
const EXCLUDE_DIRS = new Set(['.git', 'assets', 'node_modules']);
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(name)) continue;
    const full = path.join(dir, name), st = fs.lstatSync(full); // lstat: niente loop su symlink
    st.isDirectory() ? walk(full, out) : st.isFile() && out.push(full);
  }
  return out;
}
function isBinary(buf) { const len = Math.min(buf.length, 4096); for (let i = 0; i < len; i++) if (buf[i] === 0) return true; return false; }
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const allFiles = walk(ROOT);
// git: helper unico; safecrlf=false + stderr scartato evita i warning "LF will be replaced by CRLF" (Windows, autocrlf attivo)
function git(args, raw) { return execFileSync('git', ['-c', 'core.safecrlf=false', ...args], { cwd: ROOT, encoding: raw ? undefined : 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
let gitOk = true, autocrlf = false; try { git(['rev-parse', '--is-inside-work-tree']); } catch { gitOk = false; }
if (gitOk) { try { autocrlf = git(['config', 'core.autocrlf']).trim() === 'true'; } catch { /* non impostato */ } }
const eolInfo = new Map(), ignoredSet = new Set(), stagedSet = new Set();
if (gitOk) try {
  git(['ls-files', '--eol']).split('\n').filter(Boolean).forEach((line) => {
    const tab = line.indexOf('\t'), m = line.slice(0, tab).match(/i\/(\S+)\s+w\/(\S+)/);
    if (m) eolInfo.set(line.slice(tab + 1), { i: m[1], w: m[2] });
  });
  git(['ls-files', '--others', '--ignored', '--exclude-standard']).split('\n').filter(Boolean).forEach((f) => ignoredSet.add(f));
  git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean).forEach((f) => stagedSet.add(f));
} catch { gitOk = false; }
function actualEol(buf) {
  const text = buf.toString('latin1'), nl = (text.match(/\n/g) || []).length;
  if (nl === 0) return 'VUOTO';
  const crlf = (text.match(/\r\n/g) || []).length, cr = (text.match(/\r/g) || []).length;
  return cr === 0 ? 'LF' : crlf === nl && cr === crlf ? 'CRLF' : 'MISTO';
}
const EOL_MAP = { LF: 'lf', CRLF: 'crlf', MISTO: 'mixed' };
function headStyleOf(r) { try { return EOL_MAP[actualEol(git(['show', `HEAD:${r}`], true))] || null; } catch { return null; } }
// 1. FINE RIGA
section('1. Fine riga (LF/CRLF)');
const LF_DIRS = ['toolbox/', 'docs/', 'scripts/', '.claude/']; // fallback (solo se git non c'e'): mappa statica, sw.js/pwa.js LF
const LF_EXACT = new Set(['main.js', '_headers', 'site.webmanifest', 'robots.txt', 'sitemap.xml', 'CLAUDE.md', 'sw.js', 'pwa.js']);
const CRLF_EXACT = new Set(['style.css', 'preload.js', 'page.js', 'consent.js', 'contact.js', 'home.js', 'portfolio.js']);
function fallbackExpected(r) {
  if (LF_DIRS.some((d) => r.startsWith(d)) || r.endsWith('.html') || LF_EXACT.has(r)) return 'LF';
  return CRLF_EXACT.has(r) ? 'CRLF' : null; // non mappato: ignorato ma contato
}
let eolChecked = 0, eolIgnored = 0, autocrlfNorm = 0;
const eolBad = [];
for (const full of allFiles) {
  const r = rel(full);
  if (gitOk && ignoredSet.has(r)) continue; // ignorato da git (es. legale/, tree.txt su disco)
  const info = gitOk ? eolInfo.get(r) : undefined;
  if (info) {
    if (info.i === '-' || info.w === '-') continue; // binario o vuoto: non verificabile
    eolChecked++;
    if (info.w === 'mixed') eolBad.push(`${r}: fine riga MISTA nel working tree`);
    else if (autocrlf && info.i === 'lf' && info.w === 'crlf') autocrlfNorm++; // normalizzazione attesa di git
    else if (stagedSet.has(r)) { const hs = headStyleOf(r); if (hs && info.i !== hs) eolBad.push(`${r}: indice (${info.i}) diverge da HEAD (${hs})`); }
    continue;
  }
  const buf = fs.readFileSync(full); // non tracciato e non ignorato: file nuovo, atteso LF; senza git si ripiega sulla mappa
  if (isBinary(buf)) continue;
  const expected = gitOk ? 'LF' : fallbackExpected(r);
  if (expected === null) { eolIgnored++; continue; }
  eolChecked++;
  const actual = actualEol(buf);
  if (actual !== 'VUOTO' && actual !== expected) eolBad.push(`${r}${gitOk ? ' (nuovo)' : ''}: atteso ${expected}, trovato ${actual}`);
}
if (autocrlfNorm) infos.push(`autocrlf=true: ${autocrlfNorm} file appaiono CRLF sul disco, verranno salvati LF`);
if (eolBad.length === 0) ok(`${eolChecked} file controllati, tutti coerenti (${eolIgnored} ignorati perche' non mappati)`);
else bad(`${eolBad.length}/${eolChecked} file con fine riga sbagliata`, eolBad);
// 2. TRADUZIONI
section('2. Traduzioni (dizionario in main.js)');
const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
function findMatchingBrace(src, openIdx) {
  let depth = 0, inStr = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') depth++; else if (c === '}') { if (--depth === 0) return i; }
  }
  return -1;
}
const marker = 'const dict = {', startIdx = mainJs.indexOf(marker);
let itKeys = [], enKeys = [], dictOk = false;
if (startIdx === -1) bad('non trovo "const dict = {" in main.js: struttura cambiata, controllo saltato');
else {
  const braceOpen = startIdx + marker.length - 1, braceClose = findMatchingBrace(mainJs, braceOpen);
  if (braceClose === -1) bad('parentesi del dizionario non bilanciate in main.js');
  else {
    try { // valuta SOLO il letterale oggetto estratto, in una sandbox vm isolata: mai main.js per intero
      const dictObj = vm.runInContext('(' + mainJs.slice(braceOpen, braceClose + 1) + ')', vm.createContext({}), { timeout: 2000 });
      itKeys = Object.keys(dictObj.it || {}); enKeys = Object.keys(dictObj.en || {}); dictOk = true;
    } catch (e) { bad('impossibile valutare il dizionario estratto: ' + e.message); }
  }
}
if (dictOk) {
  const itSet = new Set(itKeys), enSet = new Set(enKeys);
  const onlyIt = itKeys.filter((k) => !enSet.has(k)), onlyEn = enKeys.filter((k) => !itSet.has(k));
  if (onlyIt.length === 0 && onlyEn.length === 0) ok(`chiavi identiche in it/en (${itKeys.length} chiavi)`);
  else bad('chiavi disallineate tra it ed en', [...onlyIt.map((k) => `solo in it: "${k}"`), ...onlyEn.map((k) => `solo in en: "${k}"`)]);
  const htmlFiles = allFiles.filter((f) => rel(f).endsWith('.html'));
  const attrRe = /data-translate(?:-aria|-done)?="([^"]+)"/g, usedKeys = new Map(); // chiavi usate negli HTML (radice + toolbox/**)
  for (const f of htmlFiles) {
    const content = fs.readFileSync(f, 'utf8');
    for (const m of content.matchAll(attrRe)) {
      const list = usedKeys.get(m[1]) ?? usedKeys.set(m[1], []).get(m[1]);
      if (!list.includes(rel(f))) list.push(rel(f));
    }
  }
  const bothSet = new Set(itKeys.filter((k) => enSet.has(k))), missing = [];
  for (const [k, files] of usedKeys) if (!bothSet.has(k)) missing.push(`"${k}" usata in ${files.join(', ')} ma assente dal dizionario`);
  if (missing.length === 0) ok(`${usedKeys.size} chiavi usate negli HTML, tutte presenti nel dizionario`);
  else bad(`${missing.length} chiavi usate negli HTML ma mancanti nel dizionario`, missing);
  const unused = [...bothSet].filter((k) => !usedKeys.has(k));
  if (unused.length) infos.push(`${unused.length} chiavi del dizionario mai usate negli HTML: ${unused.join(', ')}`);
}
function checkVersion(swRel, files, version) { // se un precacheato cambia e VERSION resta uguale, chi ha gia' visitato resta sulla cache vecchia
  if (!gitOk) { infos.push(`git non disponibile: controllo VERSION di ${swRel} saltato`); return; }
  try {
    const untracked = new Set(git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean));
    const changed = new Set([...git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean), ...untracked]);
    // un file CRLF nel worktree con LF in index (OneDrive, autocrlf) NON e' una modifica: --name-only lo elenca lo stesso, si riverifica il contenuto
    const touched = [...new Set(files)].filter((f) => changed.has(f) && (untracked.has(f) || git(['diff', '--ignore-cr-at-eol', 'HEAD', '--', f]).trim() !== ''));
    if (touched.length === 0) { ok(`${swRel}: nessun file precacheato modificato rispetto a HEAD, VERSION non necessaria`); return; }
    let headVersion = null; try { headVersion = (git(['show', `HEAD:${swRel}`]).match(/const VERSION\s*=\s*'([^']+)'/) || [])[1] ?? null; } catch { /* assente in HEAD */ }
    if (headVersion === null) infos.push(`${swRel} assente in HEAD: controllo VERSION vs HEAD saltato`);
    else if (headVersion === version) bad(`VERSION da alzare in ${swRel}`, [`file precacheati modificati/nuovi: ${touched.join(', ')}`, `VERSION invariata (${version}) rispetto a HEAD`]);
    else ok(`${swRel}: VERSION alzata (${headVersion} -> ${version}) coerente con ${touched.length} file precacheati modificati`);
  } catch (e) { infos.push('errore leggendo lo stato git: ' + e.message); }
}
// 3. SERVICE WORKER
section('3. Service worker (sw.js)');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const versionM = swSrc.match(/const VERSION\s*=\s*'([^']+)'/), version = versionM ? versionM[1] : null;
function extractStrings(src, from, to) {
  const sect = src.slice(from, to === -1 ? src.length : to), out = [];
  for (const m of sect.matchAll(/'([^']*)'|"([^"]*)"/g)) { const v = m[1] ?? m[2]; if (v.startsWith('/')) out.push(v); }
  return out;
}
const coreStart = swSrc.indexOf('const CORE = ['), extraStart = swSrc.indexOf('const EXTRA = ['), extraEnd = swSrc.indexOf('async function cacheAll', extraStart);
const CORE = coreStart === -1 ? [] : extractStrings(swSrc, coreStart, extraStart === -1 ? -1 : extraStart), EXTRA = extraStart === -1 ? [] : extractStrings(swSrc, extraStart, extraEnd === -1 ? -1 : extraEnd);
const precache = [...CORE, ...EXTRA];
function mapToFile(p) {
  if (p.endsWith('/')) return p.slice(1) + 'index.html';
  const r = p.replace(/^\//, ''); return path.extname(r) ? r : r + '.html';
}
if (!version || coreStart === -1) bad('non trovo VERSION o CORE in sw.js: struttura cambiata, controllo saltato');
else {
  const missingFiles = precache.map((p) => [p, mapToFile(p)]).filter(([, f]) => !fs.existsSync(path.join(ROOT, f))).map(([p, f]) => `${p} -> ${f} non esiste`);
  if (missingFiles.length === 0) ok(`VERSION=${version}, ${precache.length} voci in precache, tutte esistono nel repo`);
  else bad(`${missingFiles.length} voci in precache puntano a file inesistenti`, missingFiles);
  checkVersion('sw.js', precache.map(mapToFile), version);
}
// 4. _headers
section('4. _headers (Cloudflare Pages)');
function parseHeaders(relPath) {
  const blocks = []; let current = null;
  fs.readFileSync(path.join(ROOT, relPath), 'utf8').split(/\r\n|\n/).forEach((line, i) => {
    if (/^\s*$/.test(line)) { current = null; return; }
    if (/^#/.test(line)) return; // commento in colonna 0
    if (/^\S/.test(line)) { current = { path: line.trim(), pathLine: i + 1, headers: [] }; blocks.push(current); return; }
    const m = current && line.match(/^\s+([^:]+):\s*(.*)$/);
    if (m) current.headers.push({ name: m[1].trim(), line: i + 1 });
  });
  return blocks;
}
// Due percorsi si sovrappongono se uno (con * e :segnaposto sostituiti) combacia con l'altro.
const patRe = (p) => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[a-z]\w*/gi, '[^/]+') + '$');
const patSample = (p) => p.replace(/\*/g, 'x').replace(/:[a-z]\w*/gi, 'x');
const overlaps = (a, b) => a === b || patRe(a).test(patSample(b)) || patRe(b).test(patSample(a));
function checkHeaders(relPath, blocks) {
  const problems = [];
  blocks.forEach((b) => { const seen = new Map(); b.headers.forEach((h) => {
    const key = h.name.toLowerCase();
    if (seen.has(key)) problems.push(`${b.path} (righe ${seen.get(key)} e ${h.line}): "${h.name}" ripetuto nello stesso blocco`);
    else seen.set(key, h.line);
  }); });
  blocks.forEach((a, i) => blocks.slice(i + 1).forEach((b) => { // blocchi che coincidono si sommano: stesso header su percorsi sovrapposti = invalido
    if (!overlaps(a.path, b.path)) return;
    const names = new Set(a.headers.map((h) => h.name.toLowerCase()));
    new Set(b.headers.map((h) => h.name.toLowerCase())).forEach((n) => { if (names.has(n)) problems.push(`"${a.path}" (riga ${a.pathLine}) e "${b.path}" (riga ${b.pathLine}) impostano entrambi "${n}"`); });
  }));
  if (problems.length === 0) ok(`${relPath}: ${blocks.length} blocchi analizzati, nessun header duplicato/sovrapposto`);
  else bad(`${relPath}: header duplicati o sovrapposti`, problems);
}
const blocks = parseHeaders('_headers');
checkHeaders('_headers', blocks);
const byPath = new Map();
blocks.forEach((b) => { if (!byPath.has(b.path)) byPath.set(b.path, []); byPath.get(b.path).push(b); });
const rootHtml = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')); // pagine html senza Cache-Control dedicata: warning
const missingCache = rootHtml.map((f) => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, ''))).filter((route) => !(byPath.get(route) || []).some((b) => b.headers.some((h) => h.name.toLowerCase() === 'cache-control')));
if (missingCache.length) warn(`${missingCache.length} pagine senza Cache-Control dedicata`, missingCache);
else ok('ogni pagina html ha una regola Cache-Control');
// 5. HTML DI BASE
section('5. HTML di base (script, manifest, CSP)');
const htmlAll = allFiles.filter((f) => rel(f).endsWith('.html'));
const htmlOrderBad = [], htmlManifestBad = [], htmlInlineBad = [], htmlGoogleBad = [], htmlStyleBad = [], htmlStyleWarn = [];
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let siteHtmlCount = 0;
for (const f of htmlAll) {
  const r = rel(f), isTb = r.startsWith('toolbox/');
  const content = fs.readFileSync(f, 'utf8');
  const scripts = [...content.matchAll(SCRIPT_RE)].map((m) => {
    const attrs = m[1], srcM = attrs.match(/\bsrc="([^"]+)"/), typeM = attrs.match(/\btype="([^"]+)"/);
    return { src: srcM ? srcM[1] : null, type: typeM ? typeM[1] : null, body: m[2], idx: m.index };
  });
  if (isTb) {
    // niente ordine consent->main->pwa ne' manifest vetrina: la toolbox ha il proprio manifest
    if (!/<link[^>]*rel="manifest"\s+href="\/manifest\.webmanifest"/.test(content)) htmlManifestBad.push(r);
  } else {
    siteHtmlCount++;
    const named = (name) => scripts.find((s) => s.src === '/' + name);
    const consent = named('consent.js'), main = named('main.js'), pwa = named('pwa.js');
    const others = scripts.filter((s) => s.src && !['/consent.js', '/main.js', '/pwa.js', '/preload.js'].includes(s.src));
    let orderOk = !(consent && main && consent.idx > main.idx) && !(main && pwa && main.idx > pwa.idx);
    for (const o of others) orderOk = orderOk && !(main && o.idx < main.idx) && !(pwa && o.idx > pwa.idx);
    if (!orderOk) htmlOrderBad.push(r);
    if (!/<link[^>]*rel="manifest"/.test(content)) htmlManifestBad.push(r);
  }
  for (const s of scripts) { if (s.src || s.type === 'application/ld+json') continue; if (s.body.trim()) htmlInlineBad.push(`${r}: script inline senza src (type=${s.type || 'default'})`); }
  if (/\sstyle\s*=\s*["']/.test(content)) (isTb ? htmlStyleBad : htmlStyleWarn).push(r); // CSP toolbox: style-src 'self' senza unsafe-inline
  if (/googleapis|gstatic/i.test(content)) htmlGoogleBad.push(r);
}
if (htmlOrderBad.length === 0) ok(`${siteHtmlCount} pagine vetrina, ordine script conforme (consent -> main -> altri -> pwa)`);
else bad('ordine script non conforme', htmlOrderBad);
if (htmlManifestBad.length === 0) ok('link rel="manifest" corretto in tutte le pagine (vetrina e toolbox)');
else bad('link rel="manifest" mancante o con href sbagliato', htmlManifestBad);
if (htmlInlineBad.length === 0) ok('nessuno script inline vietato dalla CSP');
else bad('script inline vietati dalla CSP', htmlInlineBad);
if (htmlStyleBad.length) bad("style= inline vietato dalla CSP Toolbox (style-src senza unsafe-inline)", htmlStyleBad);
else ok('nessun attributo style= inline nelle pagine Toolbox');
if (htmlStyleWarn.length) warn('style= inline nella vetrina (CSP con unsafe-inline: tollerato ma da evitare)', htmlStyleWarn);
if (htmlGoogleBad.length === 0) ok('nessun riferimento a googleapis/gstatic');
else bad('riferimenti a googleapis/gstatic trovati', htmlGoogleBad);
// 6. TOOLBOX (sottodominio, Root directory "toolbox")
section('6. Toolbox (toolbox/)');
const TB = 'toolbox', tbExists = (r) => fs.existsSync(path.join(ROOT, TB, r));
function loadDict(r) {
  const src = fs.readFileSync(path.join(ROOT, r), 'utf8');
  const at = src.search(/export\s+default\s*\{/), open = at === -1 ? -1 : src.indexOf('{', at), close = open === -1 ? -1 : findMatchingBrace(src, open);
  if (close === -1) { bad(`${r}: "export default { ... }" non trovato`); return null; }
  try { return vm.runInContext('(' + src.slice(open, close + 1) + ')', vm.createContext({}), { timeout: 2000 }); } catch (e) { bad(`${r}: dizionario non valutabile: ${e.message}`); return null; }
}
if (!tbExists('shared/i18n-common.js')) infos.push('toolbox/shared/i18n-common.js assente: controlli i18n della Toolbox saltati');
else {
  const dicts = new Map(); // '' = comune, '<slug>' = strumento
  const loadInto = (scope, r) => {
    const d = loadDict(r); if (!d) return;
    const it = Object.keys(d.it || {}), en = Object.keys(d.en || {}), inBoth = it.filter((k) => k in (d.en || {}));
    const diff = [...it.filter((k) => !(k in (d.en || {}))).map((k) => `solo in it: "${k}"`), ...en.filter((k) => !(k in (d.it || {}))).map((k) => `solo in en: "${k}"`)];
    if (diff.length) bad(`${r}: chiavi disallineate tra it ed en`, diff); else ok(`${r}: chiavi identiche in it/en (${it.length} chiavi)`);
    dicts.set(scope, new Set(inBoth));
  };
  loadInto('', `${TB}/shared/i18n-common.js`);
  for (const d of fs.readdirSync(path.join(ROOT, TB))) if (!['shared', 'vendor', 'assets'].includes(d) && tbExists(`${d}/i18n.js`)) loadInto(d, `${TB}/${d}/i18n.js`);
  const htmlRe = /data-i18n(?:-aria|-html)?="([^"]+)"/g;
  const jsRe = /(?:\bt|\btoast|\bkey|Key)\s*[(:=]\s*'([a-z][a-z0-9]*(?:-[a-z0-9]+)+)'/g; // t('..'), toast('..'), key:'..', titleKey:'..'
  const skip = (r) => r.startsWith(`${TB}/vendor/`) || r === `${TB}/sw.js` || /(^|\/)i18n(-common)?\.js$/.test(r);
  const missing = [], used = new Set();
  for (const f of allFiles) {
    const r = rel(f);
    if (!r.startsWith(TB + '/') || skip(r) || !/\.(html|js)$/.test(r)) continue;
    const scope = r.split('/').length > 2 && dicts.has(r.split('/')[1]) ? r.split('/')[1] : '', avail = (k) => dicts.get('').has(k) || (scope !== '' && dicts.get(scope).has(k));
    const content = fs.readFileSync(f, 'utf8');
    for (const re of r.endsWith('.js') ? [htmlRe, jsRe] : [htmlRe]) for (const m of content.matchAll(re)) {
      used.add(m[1]); if (!avail(m[1])) missing.push(`"${m[1]}" usata in ${r} ma assente da i18n-common.js${scope ? ` e ${scope}/i18n.js` : ''}`);
    }
  }
  if (missing.length === 0) ok(`toolbox: ${used.size} chiavi i18n usate, tutte presenti nei dizionari`);
  else bad(`toolbox: ${missing.length} chiavi i18n mancanti`, [...new Set(missing)]);
  const unusedTb = [...dicts.values()].flatMap((set) => [...set]).filter((k) => !used.has(k));
  if (unusedTb.length) infos.push(`toolbox: ${unusedTb.length} chiavi mai trovate nel codice (forse usate in modo dinamico): ${unusedTb.join(', ')}`);
}
if (!tbExists('sw.js')) infos.push('toolbox/sw.js assente: controlli precache Toolbox saltati');
else {
  const tbSw = fs.readFileSync(path.join(ROOT, TB, 'sw.js'), 'utf8');
  const tbVersion = (tbSw.match(/const VERSION\s*=\s*'([^']+)'/) || [])[1];
  const list = (name) => { const i = tbSw.indexOf(`const ${name} = [`); return i === -1 ? null : extractStrings(tbSw, i, tbSw.indexOf('];', i)); };
  const shell = list('SHELL'), tools = list('TOOLS');
  if (!tbVersion || !shell || !tools) bad('non trovo VERSION, SHELL o TOOLS in toolbox/sw.js: struttura cambiata, controllo saltato');
  else {
    const sw = [...shell, ...tools], files = sw.map((p) => `${TB}/${mapToFile(p)}`);
    const miss = sw.filter((p, i) => !fs.existsSync(path.join(ROOT, files[i]))).map((p) => `${p} -> ${TB}/${mapToFile(p)} non esiste`);
    if (miss.length === 0) ok(`toolbox/sw.js: VERSION=${tbVersion}, ${files.length} voci in precache, tutte esistono`);
    else bad(`toolbox/sw.js: ${miss.length} voci in precache puntano a file inesistenti`, miss);
    const cached = new Set(sw), notCached = []; // script/import locali delle voci in precache devono restare in precache
    sw.forEach((p, i) => {
      if (!/\.(html|js)$/.test(files[i]) || !fs.existsSync(path.join(ROOT, files[i]))) return;
      const c = fs.readFileSync(path.join(ROOT, files[i]), 'utf8');
      const re = files[i].endsWith('.html') ? /<script\b[^>]*\bsrc="([^"]+)"/g : /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
      for (const m of c.matchAll(re)) {
        if (/^([a-z]+:|\/\/)/i.test(m[1])) continue;
        const u = new URL(m[1], 'https://toolbox.invalid' + p).pathname;
        if (!u.startsWith('/vendor/') && !cached.has(u)) notCached.push(`${u} (usato da ${p})`);
      }
    });
    if (notCached.length === 0) ok('toolbox/sw.js: script e import delle voci in precache sono tutti in precache');
    else bad('toolbox/sw.js: script/import non in precache (offline si romperebbero)', [...new Set(notCached)]);
    checkVersion(`${TB}/sw.js`, files, tbVersion);
  }
}
if (tbExists('_headers')) checkHeaders(`${TB}/_headers`, parseHeaders(`${TB}/_headers`));
else infos.push('toolbox/_headers assente: controllo saltato');
const tbFonts = path.join(ROOT, TB, 'assets', 'fonts'); // copie 1:1 di assets/fonts (Pages con root toolbox/ non vede ../assets)
const tbFontFiles = fs.existsSync(tbFonts) ? fs.readdirSync(tbFonts) : [];
if (tbFontFiles.length === 0) infos.push('toolbox/assets/fonts assente: controllo copie font saltato');
else {
  const origOf = (n) => path.join(ROOT, 'assets', 'fonts', n);
  const diffFonts = tbFontFiles.filter((n) => !fs.existsSync(origOf(n)) || !fs.readFileSync(origOf(n)).equals(fs.readFileSync(path.join(tbFonts, n))));
  if (diffFonts.length === 0) ok(`toolbox/assets/fonts: ${tbFontFiles.length} file identici a assets/fonts`);
  else bad('toolbox/assets/fonts: file diversi o assenti in assets/fonts', diffFonts);
}
if (!fs.existsSync(path.join(ROOT, '_redirects'))) infos.push('_redirects assente in root: regola /toolbox/* non ancora presente');
else if (/^\/toolbox\/\*\s+https:\/\/toolbox\.tinytemplestudio\.it\/:splat\s+301\s*$/m.test(fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8'))) ok('_redirects: /toolbox/* -> https://toolbox.tinytemplestudio.it/:splat 301');
else bad('_redirects: manca la regola "/toolbox/* https://toolbox.tinytemplestudio.it/:splat 301"');
// 6f. Token del design system: :root di style.css vs toolbox/shared/tokens.css (theme.css come fallback)
function rootVars(cssPath) {
  const src = fs.readFileSync(path.join(ROOT, cssPath), 'utf8');
  const at = src.indexOf(':root {'), open = at === -1 ? -1 : src.indexOf('{', at), close = open === -1 ? -1 : findMatchingBrace(src, open), vars = new Map();
  if (close !== -1) for (const m of src.slice(open + 1, close).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars.set(m[1], m[2].trim());
  return vars;
}
const tbTokensPath = tbExists('shared/tokens.css') ? `${TB}/shared/tokens.css` : tbExists('shared/theme.css') ? `${TB}/shared/theme.css` : null;
if (!tbTokensPath) infos.push('toolbox/shared/tokens.css (o theme.css) assente: controllo token saltato');
else {
  const norm = (v) => v.replace(/\s+/g, ' ').trim().toLowerCase();
  const siteVars = rootVars('style.css'), tbVars = rootVars(tbTokensPath), diffs = [], tbOnly = [];
  for (const [k, v] of tbVars) {
    if (!siteVars.has(k)) tbOnly.push(`--${k}`);
    else if (norm(siteVars.get(k)) !== norm(v)) diffs.push(`--${k}: vetrina="${siteVars.get(k)}" vs toolbox="${v}"`);
  }
  if (diffs.length === 0) ok(`design tokens: ${tbVars.size - tbOnly.length} variabili condivise identiche tra style.css e ${tbTokensPath}`);
  else bad(`design tokens: valori diversi tra style.css e ${tbTokensPath}`, diffs);
  if (tbOnly.length) infos.push(`${tbTokensPath}: ${tbOnly.length} variabili solo Toolbox (normale, prefisso --tb-): ${tbOnly.join(', ')}`);
}
// 7. RIEPILOGO
section('7. Riepilogo');
console.log(`Controlli eseguiti: ${checksRun}`);
console.log(`Falliti: ${fails.length}`);
console.log(`Warning: ${warns.length}`);
console.log(`Info: ${infos.length}`);
infos.forEach((i) => console.log('  i ' + i));
console.log('\nEsito: ' + (fails.length ? 'FALLITO' : 'OK'));
process.exit(fails.length ? 1 : 0);
