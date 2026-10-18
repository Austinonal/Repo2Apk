// One source of truth. The website (preview) and prepare.mjs (real run) both import this,
// so the plan you confirm is the plan that runs.

export const MAX = 25e6;
export const ENTRY_DIRS = ['docs', 'public', 'dist', 'www', 'web', 'site'];
export const BUILD_DIRS = ['dist', 'build', 'out', 'public'];

export const JUNK = [
  { re: /(^|\/)(\.git|node_modules|\.github|\.vscode|\.idea)(\/|$)/,
    label: 'โฟลเดอร์ระบบและเครื่องมือ dev (.git, node_modules, .github, .vscode)',
    effect: 'APK เล็กลงและติดตั้งเร็วขึ้น แอปไม่ใช้ของพวกนี้ตอนรัน จึงไม่กระทบการทำงาน' },
  { re: /(^|\/)\.env/,
    label: 'ไฟล์ .env (ความลับ)',
    effect: 'กันคีย์/รหัสลับหลุด เพราะใครแตก APK ก็อ่านได้ แต่ถ้าโค้ดฝั่งเว็บอ่านค่าจากไฟล์นี้ตอนรัน จะหาค่าไม่เจอ' },
  { re: /(^|\/)(tests?|__tests__)(\/|$)/,
    label: 'โฟลเดอร์ test',
    effect: 'ไม่กระทบผู้ใช้ APK เล็กลงเล็กน้อย' },
  { re: /\.map$/,
    label: 'ไฟล์ .map (source map)',
    effect: 'ไม่กระทบผู้ใช้ แต่ถ้าแอปพังแล้วดู error ในเครื่องมือ dev จะอ่านโค้ดย้อนกลับยากขึ้น' },
  { re: /\.(md|log)$/,
    label: 'ไฟล์ .md / .log',
    effect: 'ไม่กระทบแอป ยกเว้นเว็บโหลดไฟล์ .md มาแสดงเอง (เช่น หน้าเอกสาร) ส่วนนั้นจะว่าง' },
  { re: /\.py$/,
    label: 'ไฟล์ Python (.py)',
    effect: 'Python รันใน APK ไม่ได้ จึงไม่มีผลกับหน้าเว็บ แต่ถ้าเว็บเรียก backend ตัวนี้ ต้องมีเซิร์ฟเวอร์แยกที่ออนไลน์อยู่' },
  { re: /\.zip$/,
    label: 'ไฟล์ .zip',
    effect: 'APK เล็กลง ถ้าเว็บมีปุ่มดาวน์โหลดไฟล์ zip ปุ่มนั้นจะใช้ไม่ได้' },
  { re: /(^|\/)(package(-lock)?\.json|\.DS_Store)$/,
    label: 'package.json / lock file / .DS_Store',
    effect: 'ไม่กระทบแอป ไฟล์พวกนี้ใช้ตอน build เท่านั้น' },
];
export const BIG = {
  label: 'ไฟล์ใหญ่เกิน 25 MB',
  effect: 'ไฟล์เหล่านี้จะไม่อยู่ในแอป ถ้าเว็บเรียกใช้ (เช่น วิดีโอ เสียง) จะโหลดไม่ขึ้น ควรย้ายไปโฮสต์ที่อื่นแล้วใส่เป็นลิงก์ https',
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
    what: `${r.label}: ${a.length} รายการ (เช่น ${a.slice(0, 3).join(', ')})`,
    effect: r.effect,
  }));
};

export const BUILD_ITEM = {
  kind: 'add', id: 'build',
  what: 'รัน `npm run build` แล้วใช้โฟลเดอร์ผลลัพธ์ (dist / build / out)',
  effect: 'เว็บแนว React/Vite ต้อง build ก่อนจึงรันได้ ไม่งั้นแอปจะขึ้นหน้าว่าง ใช้เวลาเพิ่ม 1-3 นาที รายการไฟล์ที่ตัดจะรู้ตอนรายงานฉบับจริง และขั้นนี้รันสคริปต์ของ repo (npm install/build) จึงใช้กับ repo ที่ไว้ใจได้เท่านั้น',
};
export const WRAP = {
  kind: 'add',
  what: 'ตัวห่อ Android (Capacitor): WebView, สิทธิ์ INTERNET, ไอคอนและ splash จากเว็บ',
  effect: 'ได้ debug APK ติดตั้งลองได้ทันที ถ้าตั้งคีย์ไว้ใน secrets ของ repo นี้ จะได้ APK + AAB ที่เซ็นแล้วด้วย (AAB ใช้อัปขึ้น Play Store) APK มีขนาดฐานหลาย MB แม้เว็บจะเล็ก',
};
export const WRAPS = {
  android: WRAP,
  windows: { kind: 'add', what: 'ตัวห่อ Windows (Electron): ตัวติดตั้ง .exe',
    effect: 'เว็บเปิดเป็นโปรแกรมบน Windows ได้ ลิงก์ออกนอกเว็บจะเปิดในเบราว์เซอร์ปกติ ยังไม่ได้เซ็นชื่อ ครั้งแรก Windows จะขึ้นเตือน SmartScreen (กด More info แล้ว Run anyway) ไฟล์ใหญ่ราว 70-100 MB เพราะแถม Chromium มาด้วย' },
  mac: { kind: 'add', what: 'ตัวห่อ macOS (Electron): ไฟล์ .dmg แบบ Universal (Apple Silicon + Intel)',
    effect: 'ใช้ได้ทั้ง Mac ชิป M และ Intel ยังไม่ได้เซ็นชื่อกับ Apple เปิดครั้งแรกต้องคลิกขวาที่แอปแล้วเลือก Open (ถ้าขึ้นว่า damaged ให้รัน xattr -cr บนแอป) ไฟล์ใหญ่ราว 150-200 MB' },
  linux: { kind: 'add', what: 'ตัวห่อ Linux (Electron): ไฟล์ .AppImage',
    effect: 'รันได้บน Linux แทบทุกตัวโดยไม่ต้องติดตั้ง แค่ chmod +x แล้วดับเบิลคลิก ไฟล์ใหญ่ราว 100 MB' },
  ios: { kind: 'add', what: 'iOS (Capacitor): ไฟล์ .ipa ที่ยังไม่เซ็น + โปรเจกต์ Xcode',
    effect: 'iPhone ไม่รับไฟล์ที่ไม่ได้เซ็น ใช้ Sideloadly หรือ AltStore (มีทั้ง Windows และ Mac) เซ็น .ipa ด้วย Apple ID ฟรีแล้วติดตั้งได้ แต่แอปหมดอายุทุก 7 วัน ถ้าจะขึ้น App Store ต้องเปิดโปรเจกต์ Xcode บน Mac และมีบัญชี Apple Developer ($99 ต่อปี)' },
};
export const wrapItems = ts => ts.map(t => WRAPS[t]).filter(Boolean);
export const TRUNC = {
  kind: 'warn', id: 'trunc',
  what: 'repo ใหญ่มาก ตรวจรายการไฟล์ได้ไม่ครบ',
  effect: 'แผนนี้อาจขาดบางรายการ รายงานฉบับจริงหลังแปลงจะครบถ้วนกว่า',
};

// exists(p) -> bool. Returns '' (index.html at root), a folder name, or undefined (none).
export const entryDir = exists =>
  exists('index.html') ? '' : ENTRY_DIRS.find(d => exists(d + '/index.html'));
export const dirItem = d => ({
  kind: 'fix',
  what: `index.html ไม่อยู่ที่ root จึงใช้โฟลเดอร์ \`${d}/\` เป็นตัวแอป`,
  effect: 'ไฟล์นอกโฟลเดอร์นี้จะไม่อยู่ใน APK ถ้าหน้าเว็บอ้างถึงไฟล์นอกโฟลเดอร์ จะหาไม่เจอ',
});
export const noIndex = other => other
  ? { kind: 'add', id: 'redirect', what: `ไม่มี index.html จึงสร้างหน้าที่เด้งไป \`${other}\``,
      effect: 'แอปจะเปิดที่หน้านั้นเสมอ หน้า html อื่นเข้าได้เฉพาะผ่านลิงก์ในเว็บ' }
  : { kind: 'add', id: 'noindex', what: 'ไม่เจอ index.html เลย จึงสร้างหน้าเปล่าที่มีแค่ชื่อ repo',
      effect: 'APK เปิดได้แต่เป็นหน้าว่าง ควรเพิ่ม index.html ใน repo ก่อนแปลง' };

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the two fixes that live inside index.html
export function htmlFix(html) {
  const items = [];
  let out = html;
  if (!/<meta[^>]+name=["']viewport/i.test(out) && /<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, '$&<meta name="viewport" content="width=device-width,initial-scale=1">');
    items.push({ kind: 'add', id: 'viewport', what: 'เพิ่ม `<meta viewport>` ใน index.html',
      effect: 'มือถือจะแสดงหน้าพอดีจอ ไม่ย่อเล็กแบบหน้าเว็บคอม ถ้าเว็บออกแบบเผื่อมือถือไว้แล้ว ก็ไม่เปลี่ยนอะไร' });
  }
  const http = [...new Set(out.match(/http:\/\/(?!localhost|www\.w3\.org)[^\s"')]+/g) || [])].slice(0, 3);
  if (http.length) items.push({ kind: 'warn', id: 'http', what: `มีลิงก์ http:// ใน index.html: ${http.join(', ')}`,
    effect: 'หน้าแอปเป็น https ลิงก์ที่ไม่เข้ารหัสมักถูกบล็อก รูป/สคริปต์/API เหล่านั้นอาจโหลดไม่ขึ้น ควรเปลี่ยนเป็น https://' });
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
  ? { kind: 'add', what: `ใช้ \`${p}\` เป็นไอคอนแอปทุกแพลตฟอร์ม`,
      effect: 'ไอคอนบนหน้าจอ, splash และไอคอนโปรแกรมบนคอมจะเป็นของเว็บคุณ ถ้ารูปเล็กกว่า 512px ไอคอนอาจดูแตกบนจอความละเอียดสูง' }
  : { kind: 'warn', id: 'noicon', what: 'ไม่เจอไอคอนของเว็บ (manifest, apple-touch-icon, icon.png)',
      effect: 'แอปจะใช้ไอคอนเริ่มต้นของ Capacitor / Electron ถ้าอยากได้ไอคอนเอง ใส่ icon.png ขนาด 1024px ไว้ข้าง index.html' };
export const lookItem = (look, file) => look.name && {
  kind: 'fix', id: 'pwa', what: `ใช้ชื่อ "${look.name}" และสีพื้น ${look.bg} จาก \`${file}\``,
  effect: 'ชื่อใต้ไอคอนและสีหน้า splash จะตรงกับ PWA ของคุณ ถ้ากรอกชื่อแอปเองไว้ จะใช้ชื่อที่กรอกแทน',
};

export const TITLES = { cut: 'ตัดออก', add: 'เพิ่ม / สร้างให้', fix: 'แก้ให้', warn: 'ควรเช็ค' };
export const report = items => Object.entries(TITLES).map(([k, t]) => {
  const a = items.filter(i => i.kind === k);
  return a.length ? `### ${t}\n${a.map(i => `- ${i.what}\n  - ผลต่อแอป: ${i.effect}`).join('\n')}\n\n` : '';
}).join('');

// GitHub Pages apps often hard-code "/<repo>/..." in js/css/json too, not only html
export const TEXT = /\.(html|js|mjs|css|json|webmanifest)$/;
export const TEXT_MAX = 300e3;
export const baseFix = (t, repo) => t.replace(new RegExp('(["\'(`])/' + esc(repo) + '/', 'g'), '$1/');
export const baseItem = (repo, files) => ({
  kind: 'fix', id: 'base',
  what: `ตัด path แบบ GitHub Pages (\`/${repo}/\`) ออกจาก ${files.length} ไฟล์ (เช่น ${files.slice(0, 3).join(', ')})`,
  effect: 'ไม่ตัดจะทำให้ css/js/รูป/ข้อมูลโหลดไม่ขึ้นใน APK เพราะแอปเปิดจาก root ไม่ใช่โฟลเดอร์ชื่อ repo',
});


// score the plan: each finding costs points in one area and comes with what to do about it
// [area, item id, points, do: 'ลด' | 'เพิ่ม' | 'แก้', tip]
export const AREAS = { ready: 'พร้อมเปิดเป็นแอป', safe: 'ความปลอดภัย', mobile: 'รองรับมือถือ', look: 'ไอคอน / PWA', size: 'ขนาดไฟล์' };
const CHECKS = [
  ['ready', 'noindex', 40, 'เพิ่ม', 'เพิ่ม index.html เป็นหน้าแรกของเว็บ ไม่งั้นแอปจะเป็นหน้าว่าง'],
  ['ready', 'redirect', 10, 'แก้', 'ตั้งชื่อหน้าแรกเป็น index.html'],
  ['ready', 'py', 15, 'ลด', 'ย้ายโค้ด Python ไปเป็นเซิร์ฟเวอร์ออนไลน์ แล้วให้เว็บเรียกผ่าน https'],
  ['ready', 'build', 5, 'แก้', 'เช็คว่า npm run build ผ่านบนเครื่องสะอาด (ลบ node_modules แล้วลองใหม่)'],
  ['ready', 'base', 5, 'แก้', 'ใช้ path แบบ relative (./) แทน /ชื่อ-repo/ หรือตั้ง base: "./" ใน vite.config'],
  ['safe', 'env', 30, 'ลด', 'ลบ .env ออกจาก repo ใส่ไว้ใน .gitignore และเปลี่ยนคีย์ที่เคยหลุดใหม่ทั้งหมด'],
  ['safe', 'http', 15, 'แก้', 'เปลี่ยนลิงก์ http:// เป็น https://'],
  ['mobile', 'viewport', 25, 'เพิ่ม', 'ใส่ <meta name="viewport"> และจัดหน้าให้พอดีจอมือถือ'],
  ['look', 'noicon', 25, 'เพิ่ม', 'เพิ่มไอคอน PNG 1024×1024 (icon.png ข้าง index.html หรือใน manifest)'],
  ['look', '!pwa', 15, 'เพิ่ม', 'เพิ่ม manifest.json ที่มี name, short_name, icons, background_color'],
  ['size', 'big', 25, 'ลด', 'ย้ายไฟล์ที่ใหญ่เกิน 25 MB (วิดีโอ เสียง) ไปโฮสต์ที่อื่นแล้วใช้ลิงก์ https'],
  ['size', 'zip', 5, 'ลด', 'เอาไฟล์ .zip ออกจากโฟลเดอร์เว็บ'],
  ['size', 'trunc', 10, 'ลด', 'repo ใหญ่มาก แยกเว็บไปไว้ใน repo หรือโฟลเดอร์ของตัวเอง'],
];
export function grade(items) {
  const ids = new Set(items.map(i => i.id)), built = ids.has('build');
  const hits = CHECKS.filter(([, id]) => id[0] === '!' ? !built && !ids.has(id.slice(1)) : ids.has(id));
  const areas = Object.fromEntries(Object.keys(AREAS).map(a => [a, 100]));
  for (const [a, , p] of hits) areas[a] = Math.max(0, areas[a] - p * 2); // one area at x2 so a single issue shows clearly
  const total = Math.max(0, 100 - hits.reduce((s, [, , p]) => s + p, 0));
  return { total, areas, tips: hits.sort((a, b) => b[2] - a[2]).map(([, , p, act, tip]) => ({ p, act, tip })) };
}