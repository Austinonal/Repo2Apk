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
export const rule = (p, size = 0) => JUNK.find(j => j.re.test(p)) || (size > MAX ? BIG : undefined);

// list of [path, rule] -> one plan item per rule
export const cutItems = list => {
  const g = new Map();
  for (const [p, r] of list) g.set(r, [...(g.get(r) || []), p]);
  return [...g].map(([r, a]) => ({
    kind: 'cut',
    what: `${r.label}: ${a.length} รายการ (เช่น ${a.slice(0, 3).join(', ')})`,
    effect: r.effect,
  }));
};

export const BUILD_ITEM = {
  kind: 'add',
  what: 'รัน `npm run build` แล้วใช้โฟลเดอร์ผลลัพธ์ (dist / build / out)',
  effect: 'เว็บแนว React/Vite ต้อง build ก่อนจึงรันได้ ไม่งั้นแอปจะขึ้นหน้าว่าง ใช้เวลาเพิ่ม 1-3 นาที รายการไฟล์ที่ตัดจะรู้ตอนรายงานฉบับจริง และขั้นนี้รันสคริปต์ของ repo (npm install/build) จึงใช้กับ repo ที่ไว้ใจได้เท่านั้น',
};
export const WRAP = {
  kind: 'add',
  what: 'ตัวห่อ APK (Capacitor): WebView, สิทธิ์ INTERNET, ไอคอนและ splash เริ่มต้น',
  effect: 'ทำให้เว็บเปิดเป็นแอปได้ ไอคอนจะเป็นของ Capacitor ยังไม่ใช้ไอคอนของ repo และ APK จะมีขนาดฐานหลาย MB แม้เว็บจะเล็ก',
};
export const TRUNC = {
  kind: 'warn',
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
  ? { kind: 'add', what: `ไม่มี index.html จึงสร้างหน้าที่เด้งไป \`${other}\``,
      effect: 'แอปจะเปิดที่หน้านั้นเสมอ หน้า html อื่นเข้าได้เฉพาะผ่านลิงก์ในเว็บ' }
  : { kind: 'add', what: 'ไม่เจอ index.html เลย จึงสร้างหน้าเปล่าที่มีแค่ชื่อ repo',
      effect: 'APK เปิดได้แต่เป็นหน้าว่าง ควรเพิ่ม index.html ใน repo ก่อนแปลง' };

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the two fixes that live inside index.html
export function htmlFix(html) {
  const items = [];
  let out = html;
  if (!/<meta[^>]+name=["']viewport/i.test(out) && /<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, '$&<meta name="viewport" content="width=device-width,initial-scale=1">');
    items.push({ kind: 'add', what: 'เพิ่ม `<meta viewport>` ใน index.html',
      effect: 'มือถือจะแสดงหน้าพอดีจอ ไม่ย่อเล็กแบบหน้าเว็บคอม ถ้าเว็บออกแบบเผื่อมือถือไว้แล้ว ก็ไม่เปลี่ยนอะไร' });
  }
  const http = [...new Set(out.match(/http:\/\/(?!localhost|www\.w3\.org)[^\s"')]+/g) || [])].slice(0, 3);
  if (http.length) items.push({ kind: 'warn', what: `มีลิงก์ http:// ใน index.html: ${http.join(', ')}`,
    effect: 'หน้าแอปเป็น https ลิงก์ที่ไม่เข้ารหัสมักถูกบล็อก รูป/สคริปต์/API เหล่านั้นอาจโหลดไม่ขึ้น ควรเปลี่ยนเป็น https://' });
  return { html: out, items };
}

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
  kind: 'fix',
  what: `ตัด path แบบ GitHub Pages (\`/${repo}/\`) ออกจาก ${files.length} ไฟล์ (เช่น ${files.slice(0, 3).join(', ')})`,
  effect: 'ไม่ตัดจะทำให้ css/js/รูป/ข้อมูลโหลดไม่ขึ้นใน APK เพราะแอปเปิดจาก root ไม่ใช่โฟลเดอร์ชื่อ repo',
});
