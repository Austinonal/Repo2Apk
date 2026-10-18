// One source of truth. The website (preview) and prepare.mjs (real run) both import this,
// so the plan you confirm is the plan that runs.

import { L } from './lang.mjs';

export const MAX = 25e6;
export const ENTRY_DIRS = ['docs', 'public', 'dist', 'www', 'web', 'site'];
export const BUILD_DIRS = ['dist', 'build', 'out', 'public'];

export const JUNK = [
  { re: /(^|\/)(\.git|node_modules|\.github|\.vscode|\.idea)(\/|$)/,
    get label() { return L('โฟลเดอร์ระบบและเครื่องมือ dev (.git, node_modules, .github, .vscode)', 'System and dev-tool folders (.git, node_modules, .github, .vscode)'); },
    get effect() { return L('APK เล็กลงและติดตั้งเร็วขึ้น แอปไม่ใช้ของพวกนี้ตอนรัน จึงไม่กระทบการทำงาน', 'The app gets smaller and installs faster. It never uses these at runtime, so nothing breaks.'); } },
  { re: /(^|\/)\.env/,
    get label() { return L('ไฟล์ .env (ความลับ)', '.env files (secrets)'); },
    get effect() { return L('กันคีย์/รหัสลับหลุด เพราะใครแตก APK ก็อ่านได้ แต่ถ้าโค้ดฝั่งเว็บอ่านค่าจากไฟล์นี้ตอนรัน จะหาค่าไม่เจอ', 'Keeps keys and passwords from leaking, since anyone can unpack an APK. But if your web code reads values from this file at runtime, it will not find them.'); } },
  { re: /(^|\/)(tests?|__tests__)(\/|$)/,
    get label() { return L('โฟลเดอร์ test', 'Test folders'); },
    get effect() { return L('ไม่กระทบผู้ใช้ APK เล็กลงเล็กน้อย', 'No effect for users. The app gets slightly smaller.'); } },
  { re: /\.map$/,
    get label() { return L('ไฟล์ .map (source map)', '.map files (source maps)'); },
    get effect() { return L('ไม่กระทบผู้ใช้ แต่ถ้าแอปพังแล้วดู error ในเครื่องมือ dev จะอ่านโค้ดย้อนกลับยากขึ้น', 'No effect for users, but if the app crashes, reading errors in dev tools gets harder.'); } },
  { re: /\.(md|log)$/,
    get label() { return L('ไฟล์ .md / .log', '.md / .log files'); },
    get effect() { return L('ไม่กระทบแอป ยกเว้นเว็บโหลดไฟล์ .md มาแสดงเอง (เช่น หน้าเอกสาร) ส่วนนั้นจะว่าง', 'No effect, unless your site loads .md files to display them (e.g. a docs page). That part will be empty.'); } },
  { re: /\.py$/,
    get label() { return L('ไฟล์ Python (.py)', 'Python files (.py)'); },
    get effect() { return L('Python รันใน APK ไม่ได้ จึงไม่มีผลกับหน้าเว็บ แต่ถ้าเว็บเรียก backend ตัวนี้ ต้องมีเซิร์ฟเวอร์แยกที่ออนไลน์อยู่', 'Python cannot run inside an APK. The web page is unaffected, but if it calls this backend, you need a separate server that is online.'); } },
  { re: /\.zip$/,
    get label() { return L('ไฟล์ .zip', '.zip files'); },
    get effect() { return L('APK เล็กลง ถ้าเว็บมีปุ่มดาวน์โหลดไฟล์ zip ปุ่มนั้นจะใช้ไม่ได้', 'The app gets smaller. If your site has a button that downloads a zip, that button will stop working.'); } },
  { re: /(^|\/)(package(-lock)?\.json|\.DS_Store)$/,
    get label() { return L('package.json / lock file / .DS_Store', 'package.json / lock files / .DS_Store'); },
    get effect() { return L('ไม่กระทบแอป ไฟล์พวกนี้ใช้ตอน build เท่านั้น', 'No effect. These are only used at build time.'); } },
];
export const BIG = {
  get label() { return L('ไฟล์ใหญ่เกิน 25 MB', 'Files over 25 MB'); },
  get effect() { return L('ไฟล์เหล่านี้จะไม่อยู่ในแอป ถ้าเว็บเรียกใช้ (เช่น วิดีโอ เสียง) จะโหลดไม่ขึ้น ควรย้ายไปโฮสต์ที่อื่นแล้วใส่เป็นลิงก์ https', 'These files are left out of the app. If your site uses them (e.g. video, audio) they will not load. Host them elsewhere and link with https.'); },
};

// path (relative to the web folder) -> the rule that cuts it, or undefined
['sys', 'env', 'tests', 'map', 'docs', 'py', 'zip', 'pkg'].forEach((id, i) => { JUNK[i].id = id; });
BIG.id = 'big';
export const rule = (p, size = 0, skip = []) => {
  const x = JUNK.find(j => j.re.test(p)) || (size > MAX ? BIG : undefined);
  return x && !skip.includes(x.id) ? x : undefined;
};

// list of [path, rule] -> one plan item per rule
export const cutItems = list => {
  const g = new Map();
  for (const [p, r] of list) g.set(r, [...(g.get(r) || []), p]);
  return [...g].map(([r, a]) => ({
    kind: 'cut', id: r.id,
    what: L(`${r.label}: ${a.length} รายการ (เช่น ${a.slice(0, 3).join(', ')})`, `${r.label}: ${a.length} item(s) (e.g. ${a.slice(0, 3).join(', ')})`),
    effect: r.effect,
  }));
};

export const BUILD_ITEM = {
  kind: 'add', id: 'build',
  get what() { return L('รัน `npm run build` แล้วใช้โฟลเดอร์ผลลัพธ์ (dist / build / out)', 'Run `npm run build` and use the output folder (dist / build / out)'); },
  get effect() { return L('เว็บแนว React/Vite ต้อง build ก่อนจึงรันได้ ไม่งั้นแอปจะขึ้นหน้าว่าง ใช้เวลาเพิ่ม 1-3 นาที รายการไฟล์ที่ตัดจะรู้ตอนรายงานฉบับจริง และขั้นนี้รันสคริปต์ของ repo (npm install/build) จึงใช้กับ repo ที่ไว้ใจได้เท่านั้น',
    'React/Vite style sites must be built first, otherwise the app is a blank page. Adds 1-3 minutes. The list of removed files is only known in the real report. This step runs the repo\'s own scripts (npm install/build), so only use it on repos you trust.'); },
};
export const WRAP = {
  kind: 'add',
  get what() { return L('ตัวห่อ Android (Capacitor): WebView, สิทธิ์ INTERNET, ไอคอนและ splash จากเว็บ', 'Android wrapper (Capacitor): WebView, INTERNET permission, icon and splash from your site'); },
  get effect() { return L('ได้ debug APK ติดตั้งลองได้ทันที ถ้าตั้งคีย์ไว้ใน secrets ของ repo นี้ จะได้ APK + AAB ที่เซ็นแล้วด้วย (AAB ใช้อัปขึ้น Play Store) APK มีขนาดฐานหลาย MB แม้เว็บจะเล็ก',
    'You get a debug APK you can install right away. If signing keys are set in this repo\'s secrets, you also get a signed APK + AAB (the AAB is for Google Play). The APK has a base size of several MB even for a tiny site.'); },
};
export const WRAPS = {
  android: WRAP,
  windows: { kind: 'add',
    get what() { return L('ตัวห่อ Windows (Electron): ตัวติดตั้ง .exe', 'Windows wrapper (Electron): .exe installer'); },
    get effect() { return L('เว็บเปิดเป็นโปรแกรมบน Windows ได้ ลิงก์ออกนอกเว็บจะเปิดในเบราว์เซอร์ปกติ ยังไม่ได้เซ็นชื่อ ครั้งแรก Windows จะขึ้นเตือน SmartScreen (กด More info แล้ว Run anyway) ไฟล์ใหญ่ราว 70-100 MB เพราะแถม Chromium มาด้วย', 'Your site runs as a Windows program. Links to other sites open in the normal browser. It is not code-signed, so Windows shows a SmartScreen warning the first time (click More info, then Run anyway). About 70-100 MB because Chromium is bundled.'); } },
  mac: { kind: 'add',
    get what() { return L('ตัวห่อ macOS (Electron): ไฟล์ .dmg แบบ Universal (Apple Silicon + Intel)', 'macOS wrapper (Electron): universal .dmg (Apple Silicon + Intel)'); },
    get effect() { return L('ใช้ได้ทั้ง Mac ชิป M และ Intel ยังไม่ได้เซ็นชื่อกับ Apple เปิดครั้งแรกต้องคลิกขวาที่แอปแล้วเลือก Open (ถ้าขึ้นว่า damaged ให้รัน xattr -cr บนแอป) ไฟล์ใหญ่ราว 150-200 MB', 'Works on both M-series and Intel Macs. It is not signed with Apple, so the first time you must right-click the app and choose Open (if it says "damaged", run xattr -cr on the app). About 150-200 MB.'); } },
  linux: { kind: 'add',
    get what() { return L('ตัวห่อ Linux (Electron): ไฟล์ .AppImage', 'Linux wrapper (Electron): .AppImage'); },
    get effect() { return L('รันได้บน Linux แทบทุกตัวโดยไม่ต้องติดตั้ง แค่ chmod +x แล้วดับเบิลคลิก ไฟล์ใหญ่ราว 100 MB', 'Runs on almost any Linux without installing. Just chmod +x and double-click. About 100 MB.'); } },
  ios: { kind: 'add',
    get what() { return L('iOS (Capacitor): ไฟล์ .ipa ที่ยังไม่เซ็น + โปรเจกต์ Xcode', 'iOS (Capacitor): unsigned .ipa + Xcode project'); },
    get effect() { return L('iPhone ไม่รับไฟล์ที่ไม่ได้เซ็น ใช้ Sideloadly หรือ AltStore (มีทั้ง Windows และ Mac) เซ็น .ipa ด้วย Apple ID ฟรีแล้วติดตั้งได้ แต่แอปหมดอายุทุก 7 วัน ถ้าจะขึ้น App Store ต้องเปิดโปรเจกต์ Xcode บน Mac และมีบัญชี Apple Developer ($99 ต่อปี)', 'iPhones reject unsigned files. Use Sideloadly or AltStore (Windows and Mac) to sign the .ipa with a free Apple ID and install it, but the app expires every 7 days. To publish on the App Store you need the Xcode project on a Mac and an Apple Developer account ($99/year).'); } },
};
export const wrapItems = ts => ts.map(t => WRAPS[t]).filter(Boolean);
export const TRUNC = {
  kind: 'warn', id: 'trunc',
  get what() { return L('repo ใหญ่มาก ตรวจรายการไฟล์ได้ไม่ครบ', 'The repo is very large, so the file list is incomplete'); },
  get effect() { return L('แผนนี้อาจขาดบางรายการ รายงานฉบับจริงหลังแปลงจะครบถ้วนกว่า', 'This plan may miss some items. The real report after conversion will be complete.'); },
};

// exists(p) -> bool. Returns '' (index.html at root), a folder name, or undefined (none).
export const entryDir = exists =>
  exists('index.html') ? '' : ENTRY_DIRS.find(d => exists(d + '/index.html'));
export const dirItem = d => ({
  kind: 'fix',
  what: L(`index.html ไม่อยู่ที่ root จึงใช้โฟลเดอร์ \`${d}/\` เป็นตัวแอป`, `index.html is not at the root, so the folder \`${d}/\` is used as the app`),
  effect: L('ไฟล์นอกโฟลเดอร์นี้จะไม่อยู่ใน APK ถ้าหน้าเว็บอ้างถึงไฟล์นอกโฟลเดอร์ จะหาไม่เจอ', 'Files outside this folder are not in the app. If the page references them, they will not be found.'),
});
export const noIndex = other => other
  ? { kind: 'add', id: 'redirect', what: L(`ไม่มี index.html จึงสร้างหน้าที่เด้งไป \`${other}\``, `There is no index.html, so a page that redirects to \`${other}\` is created`),
      effect: L('แอปจะเปิดที่หน้านั้นเสมอ หน้า html อื่นเข้าได้เฉพาะผ่านลิงก์ในเว็บ', 'The app always opens on that page. Other HTML pages are only reachable through links in your site.') }
  : { kind: 'add', id: 'noindex', what: L('ไม่เจอ index.html เลย จึงสร้างหน้าเปล่าที่มีแค่ชื่อ repo', 'No index.html found, so a blank page with just the repo name is created'),
      effect: L('APK เปิดได้แต่เป็นหน้าว่าง ควรเพิ่ม index.html ใน repo ก่อนแปลง', 'The app opens but shows a blank page. Add an index.html to the repo before converting.') };

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the two fixes that live inside index.html
export function htmlFix(html) {
  const items = [];
  let out = html;
  if (!/<meta[^>]+name=["']viewport/i.test(out) && /<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, '$&<meta name="viewport" content="width=device-width,initial-scale=1">');
    items.push({ kind: 'add', id: 'viewport', what: L('เพิ่ม `<meta viewport>` ใน index.html', 'Add `<meta viewport>` to index.html'),
      effect: L('มือถือจะแสดงหน้าพอดีจอ ไม่ย่อเล็กแบบหน้าเว็บคอม ถ้าเว็บออกแบบเผื่อมือถือไว้แล้ว ก็ไม่เปลี่ยนอะไร', 'Phones will fit the page to the screen instead of shrinking it like a desktop page. If your site is already mobile-ready, nothing changes.') });
  }
  const http = [...new Set(out.match(/http:\/\/(?!localhost|www\.w3\.org)[^\s"')]+/g) || [])].slice(0, 3);
  if (http.length) items.push({ kind: 'warn', id: 'http', what: L(`มีลิงก์ http:// ใน index.html: ${http.join(', ')}`, `index.html has http:// links: ${http.join(', ')}`),
    effect: L('หน้าแอปเป็น https ลิงก์ที่ไม่เข้ารหัสมักถูกบล็อก รูป/สคริปต์/API เหล่านั้นอาจโหลดไม่ขึ้น ควรเปลี่ยนเป็น https://', 'The app page is https, and unencrypted links are usually blocked, so those images, scripts or APIs may not load. Change them to https://.') });
  return { html: out, items };
}

// icon + manifest: same lookup for the preview and the real run
export const ICON_RE = /\.(png|jpe?g|webp|svg)$/i;
const attr = (tag, name) => (tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']+)', 'i')) || [])[1];
const links = (html, rel) => (html.match(/<link\b[^>]*>/gi) || [])
  .filter(t => new RegExp('^(shortcut )?' + rel + '$', 'i').test(attr(t, 'rel') || '')).map(t => attr(t, 'href'));
// href relative to the file at `from` -> path relative to the web root, or '' for remote/data urls
export const local = (href = '', from = '') => {
  if (!href || /^([a-z]+:|\/\/)/i.test(href)) return '';
  const parts = (href.startsWith('/') ? '' : from.split('/').slice(0, -1).join('/') + '/') + href.split(/[?#]/)[0];
  const out = [];
  for (const s of parts.split('/')) s === '..' ? out.pop() : s && s !== '.' && out.push(s);
  return out.join('/');
};
export const manifestPath = html => local(links(html, 'manifest')[0]);
// best-first list of icon paths: biggest manifest icon, apple-touch-icon, <link rel=icon>, common names
export function iconCandidates(html, manifest = {}, mPath = '') {
  const size = s => Math.max(0, ...String(s || '').split(/\s+/).map(x => parseInt(x) || (x === 'any' ? 4096 : 0)));
  const fromManifest = (Array.isArray(manifest.icons) ? manifest.icons : [])
    .filter(i => i && i.src).sort((a, b) => size(b.sizes) - size(a.sizes)).map(i => local(i.src, mPath));
  return [...new Set([...fromManifest, ...links(html, 'apple-touch-icon').map(h => local(h)),
    ...links(html, 'icon').map(h => local(h)),
    'icon.png', 'logo.png', 'icon.svg', 'logo.svg', 'favicon.png', 'img/icon.png', 'images/icon.png', 'assets/icon.png'])]
    .filter(p => p && ICON_RE.test(p));
}
const COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const appLook = (manifest = {}) => ({
  name: String(manifest.short_name || manifest.name || '').trim(),
  bg: COLOR.test(manifest.background_color) ? manifest.background_color : (COLOR.test(manifest.theme_color) ? manifest.theme_color : '#ffffff'),
});
export const iconItem = p => p
  ? { kind: 'add', what: L(`ใช้ \`${p}\` เป็นไอคอนแอปทุกแพลตฟอร์ม`, `Use \`${p}\` as the app icon on every platform`),
      effect: L('ไอคอนบนหน้าจอ, splash และไอคอนโปรแกรมบนคอมจะเป็นของเว็บคุณ ถ้ารูปเล็กกว่า 512px ไอคอนอาจดูแตกบนจอความละเอียดสูง', 'The home-screen icon, splash and desktop program icon will be yours. If the image is under 512px it may look blurry on high-resolution screens.') }
  : { kind: 'warn', id: 'noicon', what: L('ไม่เจอไอคอนของเว็บ (manifest, apple-touch-icon, icon.png)', 'No icon found (manifest, apple-touch-icon, icon.png)'),
      effect: L('แอปจะใช้ไอคอนเริ่มต้นของ Capacitor / Electron ถ้าอยากได้ไอคอนเอง ใส่ icon.png ขนาด 1024px ไว้ข้าง index.html', 'The app will use the default Capacitor / Electron icon. To use your own, put a 1024px icon.png next to index.html.') };
export const lookItem = (look, file) => look.name && {
  kind: 'fix', id: 'pwa', what: L(`ใช้ชื่อ "${look.name}" และสีพื้น ${look.bg} จาก \`${file}\``, `Use the name "${look.name}" and background colour ${look.bg} from \`${file}\``),
  effect: L('ชื่อใต้ไอคอนและสีหน้า splash จะตรงกับ PWA ของคุณ ถ้ากรอกชื่อแอปเองไว้ จะใช้ชื่อที่กรอกแทน', 'The name under the icon and the splash colour will match your PWA. If you typed an app name yourself, that one is used instead.'),
};

export const TITLES = {
  get cut() { return L('ตัดออก', 'Removed'); }, get add() { return L('เพิ่ม / สร้างให้', 'Added'); },
  get fix() { return L('แก้ให้', 'Fixed'); }, get warn() { return L('ควรเช็ค', 'Check these'); },
};
export const report = items => Object.entries(TITLES).map(([k, t]) => {
  const a = items.filter(i => i.kind === k);
  return a.length ? `### ${t}\n${a.map(i => `- ${i.what}\n  - ${L('ผลต่อแอป', 'Effect on the app')}: ${i.effect}`).join('\n')}\n\n` : '';
}).join('');

// GitHub Pages apps often hard-code "/<repo>/..." in js/css/json too, not only html
export const TEXT = /\.(html|js|mjs|css|json|webmanifest)$/;
export const TEXT_MAX = 300e3;
export const baseFix = (t, repo) => t.replace(new RegExp('(["\'(`])/' + esc(repo) + '/', 'g'), '$1/');
export const baseItem = (repo, files) => ({
  kind: 'fix', id: 'base',
  what: L(`ตัด path แบบ GitHub Pages (\`/${repo}/\`) ออกจาก ${files.length} ไฟล์ (เช่น ${files.slice(0, 3).join(', ')})`, `Strip GitHub Pages paths (\`/${repo}/\`) from ${files.length} file(s) (e.g. ${files.slice(0, 3).join(', ')})`),
  effect: L('ไม่ตัดจะทำให้ css/js/รูป/ข้อมูลโหลดไม่ขึ้นใน APK เพราะแอปเปิดจาก root ไม่ใช่โฟลเดอร์ชื่อ repo', 'Without this, css/js/images/data would not load in the app, because it opens from the root, not from a folder named after the repo.'),
});


// score the plan: each finding costs points in one area and comes with what to do about it
// [area, item id, points, do: 'cut' | 'add' | 'fix', tip]
export const AREAS = {
  get ready() { return L('พร้อมเปิดเป็นแอป', 'Ready to run as an app'); }, get safe() { return L('ความปลอดภัย', 'Security'); },
  get mobile() { return L('รองรับมือถือ', 'Mobile friendly'); }, get look() { return L('ไอคอน / PWA', 'Icon / PWA'); }, get size() { return L('ขนาดไฟล์', 'File size'); },
};
const checks = () => [
  ['ready', 'noindex', 40, 'add', L('เพิ่ม index.html เป็นหน้าแรกของเว็บ ไม่งั้นแอปจะเป็นหน้าว่าง', 'Add an index.html as your home page, otherwise the app is a blank page')],
  ['ready', 'redirect', 10, 'fix', L('ตั้งชื่อหน้าแรกเป็น index.html', 'Name your home page index.html')],
  ['ready', 'py', 15, 'cut', L('ย้ายโค้ด Python ไปเป็นเซิร์ฟเวอร์ออนไลน์ แล้วให้เว็บเรียกผ่าน https', 'Move the Python code to an online server and call it over https')],
  ['ready', 'build', 5, 'fix', L('เช็คว่า npm run build ผ่านบนเครื่องสะอาด (ลบ node_modules แล้วลองใหม่)', 'Check that npm run build passes on a clean machine (delete node_modules and retry)')],
  ['ready', 'base', 5, 'fix', L('ใช้ path แบบ relative (./) แทน /ชื่อ-repo/ หรือตั้ง base: "./" ใน vite.config', 'Use relative paths (./) instead of /repo-name/, or set base: "./" in vite.config')],
  ['safe', 'env', 30, 'cut', L('ลบ .env ออกจาก repo ใส่ไว้ใน .gitignore และเปลี่ยนคีย์ที่เคยหลุดใหม่ทั้งหมด', 'Remove .env from the repo, add it to .gitignore, and rotate any keys that were exposed')],
  ['safe', 'http', 15, 'fix', L('เปลี่ยนลิงก์ http:// เป็น https://', 'Change http:// links to https://')],
  ['mobile', 'viewport', 25, 'add', L('ใส่ <meta name="viewport"> และจัดหน้าให้พอดีจอมือถือ', 'Add <meta name="viewport"> and make the layout fit phone screens')],
  ['look', 'noicon', 25, 'add', L('เพิ่มไอคอน PNG 1024×1024 (icon.png ข้าง index.html หรือใน manifest)', 'Add a 1024×1024 PNG icon (icon.png next to index.html, or in the manifest)')],
  ['look', '!pwa', 15, 'add', L('เพิ่ม manifest.json ที่มี name, short_name, icons, background_color', 'Add a manifest.json with name, short_name, icons, background_color')],
  ['size', 'big', 25, 'cut', L('ย้ายไฟล์ที่ใหญ่เกิน 25 MB (วิดีโอ เสียง) ไปโฮสต์ที่อื่นแล้วใช้ลิงก์ https', 'Host files over 25 MB (video, audio) elsewhere and link them over https')],
  ['size', 'zip', 5, 'cut', L('เอาไฟล์ .zip ออกจากโฟลเดอร์เว็บ', 'Remove .zip files from the web folder')],
  ['size', 'trunc', 10, 'cut', L('repo ใหญ่มาก แยกเว็บไปไว้ใน repo หรือโฟลเดอร์ของตัวเอง', 'The repo is very large; move the site into its own repo or folder')],
];
export function grade(items) {
  const ids = new Set(items.map(i => i.id)), built = ids.has('build');
  const hits = checks().filter(([, id]) => id[0] === '!' ? !built && !ids.has(id.slice(1)) : ids.has(id));
  const areas = Object.fromEntries(Object.keys(AREAS).map(a => [a, 100]));
  for (const [a, , p] of hits) areas[a] = Math.max(0, areas[a] - p * 2); // one area at x2 so a single issue shows clearly
  const total = Math.max(0, 100 - hits.reduce((s, [, , p]) => s + p, 0));
  return { total, areas, tips: hits.sort((a, b) => b[2] - a[2]).map(([, , p, act, tip]) => ({ p, act, tip })) };
}
