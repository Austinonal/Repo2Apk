// Turns the cloned repo (./src) into a clean web folder (./www) and writes report.md
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { TEXT, TEXT_MAX, baseFix, baseItem, BUILD_DIRS, rule, cutItems, entryDir, dirItem, noIndex, htmlFix, report, BUILD_ITEM, wrapItems,
  manifestPath, iconCandidates, iconItem, appLook, lookItem } from './rules.mjs';

const SRC = 'src', OUT = 'www';
const [repoOwner, repoName] = (process.env.REPO || 'me/app').split('/');
const items = [], removed = [];
const SKIP = (process.env.SKIP || '').split(',').filter(Boolean);
const T = (process.env.TARGETS || 'android').split(',').filter(Boolean);
const sh = (c, cwd) => execSync(c, { cwd, stdio: 'inherit' });
const has = p => fs.existsSync(p);

// 1. find the folder that holds the finished web app
let web = SRC, pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')); } catch {}
if (pkg.scripts?.build) {
  const pm = has(path.join(SRC, 'pnpm-lock.yaml')) ? 'pnpm' : has(path.join(SRC, 'yarn.lock')) ? 'yarn' : 'npm';
  if (pm !== 'npm') sh('corepack enable', SRC);
  sh({ npm: 'npm install --no-audit --no-fund --legacy-peer-deps', pnpm: 'pnpm install', yarn: 'yarn install' }[pm], SRC);
  sh(pm + ' run build', SRC);
  // Angular puts it in dist/<name>/browser, so look up to 2 levels down
  const find = (d, depth) => has(path.join(SRC, d, 'index.html')) ? d
    : depth && fs.statSync(path.join(SRC, d), { throwIfNoEntry: false })?.isDirectory()
      ? fs.readdirSync(path.join(SRC, d)).map(n => find(path.posix.join(d, n), depth - 1)).find(Boolean) : undefined;
  const d = BUILD_DIRS.map(x => find(x, 2)).find(Boolean);
  if (d) {
    web = path.join(SRC, d);
    items.push({ ...BUILD_ITEM, what: `รัน \`${pm} run build\` แล้วใช้โฟลเดอร์ \`${d}/\`` });
  } else items.push({ kind: 'warn', what: 'build ผ่านแต่ไม่เจอ index.html ใน dist / build / out / public',
    effect: 'จึงใช้ทั้ง repo แทน ซึ่งมักเป็นโค้ดต้นฉบับที่เปิดตรงๆ ไม่ได้ แอปอาจขึ้นหน้าว่าง (Next.js ต้องตั้ง `output: \'export\'` ใน next.config ก่อน)' });
} else {
  const d = entryDir(p => has(path.join(SRC, p)));
  if (d) { web = path.join(SRC, d); items.push(dirItem(d)); }
}

// 2. copy, cutting what an app must not carry
function copy(from, to, rel = '') {
  fs.mkdirSync(to, { recursive: true });
  for (const n of fs.readdirSync(from)) {
    const f = path.join(from, n), r = path.posix.join(rel, n), st = fs.statSync(f, { throwIfNoEntry: false });
    if (!st) continue;
    const x = rule(r, st.isDirectory() ? 0 : st.size, SKIP);
    if (x) removed.push([r, x]);
    else if (st.isDirectory()) copy(f, path.join(to, n), r);
    else fs.copyFileSync(f, path.join(to, n));
  }
}
fs.rmSync(OUT, { recursive: true, force: true });
copy(web, OUT);
items.unshift(...cutItems(removed));

// 3a. hard-coded "/<repo>/" paths in every text file
const fixed = [];
(function walk(d, rel = '') {
  for (const n of fs.readdirSync(d)) {
    const f = path.join(d, n), r = path.posix.join(rel, n), st = fs.statSync(f);
    if (st.isDirectory()) walk(f, r);
    else if (TEXT.test(r) && st.size <= TEXT_MAX) {
      const t = fs.readFileSync(f, 'utf8'), u = baseFix(t, repoName);
      if (u !== t) { fs.writeFileSync(f, u); fixed.push(r); }
    }
  }
})(OUT);
if (fixed.length) items.push(baseItem(repoName, fixed.sort()));

// 3b. entry page: fix the one we have, or make one
const idx = path.join(OUT, 'index.html');
if (has(idx)) {
  const r = htmlFix(fs.readFileSync(idx, 'utf8'));
  fs.writeFileSync(idx, r.html);
  items.push(...r.items);
} else {
  const other = fs.readdirSync(OUT).find(f => f.endsWith('.html'));
  fs.writeFileSync(idx, other
    ? `<!doctype html><meta charset="utf-8"><script>location.replace(${JSON.stringify(encodeURI(other))})</script>`
    : `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${repoName}</title><body style="font-family:sans-serif;padding:24px"><h2>${repoName}</h2><p>repo นี้ไม่มีหน้าเว็บ (ไม่เจอ index.html)</p>`);
  items.push(noIndex(other));
}
// 3c. icon + PWA manifest -> ./icon.png (1024px) and app name / background colour
const html = fs.readFileSync(idx, 'utf8'), mp = manifestPath(html);
let manifest = {};
try { if (mp) manifest = JSON.parse(fs.readFileSync(path.join(OUT, mp), 'utf8')); } catch {}
const look = appLook(manifest);
const iconSrc = iconCandidates(html, manifest, mp).find(p => has(path.join(OUT, p)));
let icon = false;
if (iconSrc) {
  try {
    const { default: sharp } = await import('sharp');
    await sharp(path.join(OUT, iconSrc), { density: 300 }).resize(1024, 1024, { fit: 'contain', background: '#0000' }).png().toFile('icon.png');
    icon = true;
    items.push(iconItem(iconSrc));
  } catch (e) {
    items.push({ kind: 'warn', what: `อ่านไฟล์ไอคอน \`${iconSrc}\` ไม่ได้ (${e.message.slice(0, 80)})`, effect: 'แอปจะใช้ไอคอนเริ่มต้นแทน' });
  }
} else items.push(iconItem());
const lk = lookItem(look, mp);
if (lk) items.push(lk);
items.push(...wrapItems(T));

// 4. app name / id / version for the next steps
const title = (html.match(/<title>([^<]+)/i) || [])[1] || '';
const name = (process.env.APP_NAME || look.name || title || repoName).replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 30) || repoName;
const seg = s => (s.toLowerCase().replace(/[^a-z0-9]/g, '') || 'app').replace(/^(?=\d)/, 'a');
const id = process.env.APP_ID || ['com.repo2apk', seg(repoOwner), seg(repoName)].join('.');
const version = ((process.env.APP_VERSION || pkg.version || '1.0.0').match(/^\d+(\.\d+){0,2}/) || ['1.0.0'])[0]
  .split('.').concat('0', '0').slice(0, 3).join('.');
const OS = { windows: 'windows-latest', mac: 'macos-latest', ios: 'macos-latest', linux: 'ubuntu-latest' };
const native = T.filter(t => OS[t]).map(t => ({ t, os: OS[t] }));
fs.appendFileSync(process.env.GITHUB_OUTPUT || '/dev/null', [`name=${name}`, `id=${id}`, `version=${version}`,
  `bg=${look.bg}`, `icon=${icon}`, `android=${T.includes('android')}`, `native=${native.length > 0}`,
  `matrix=${JSON.stringify({ include: native })}`, ''].join('\n'));

fs.writeFileSync('report.md', '## รายงานการแปลง\n\n' + report(items));
assert(has(idx), 'www/index.html must exist');
