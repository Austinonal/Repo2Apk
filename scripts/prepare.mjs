// Turns the cloned repo (./src) into a clean web folder (./www) and writes report.md
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
import { TEXT, TEXT_MAX, baseFix, baseItem, BUILD_DIRS, rule, cutItems, entryDir, dirItem, noIndex, htmlFix, report, BUILD_ITEM, WRAP } from './rules.mjs';

const SRC = 'src', OUT = 'www';
const repoName = process.env.REPO_NAME || 'app';
const items = [], removed = [];
const sh = (c, cwd) => execSync(c, { cwd, stdio: 'inherit' });
const has = p => fs.existsSync(p);

// 1. find the folder that holds the finished web app
let web = SRC, pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')); } catch {}
if (pkg.scripts?.build) {
  sh('npm install --no-audit --no-fund --legacy-peer-deps', SRC);
  sh('npm run build', SRC);
  const d = BUILD_DIRS.find(x => has(path.join(SRC, x, 'index.html')));
  if (d) {
    web = path.join(SRC, d);
    items.push({ ...BUILD_ITEM, what: `รัน \`npm run build\` แล้วใช้โฟลเดอร์ \`${d}/\`` });
  } else items.push({ kind: 'warn', what: 'build ผ่านแต่ไม่เจอ index.html ใน dist / build / out / public',
    effect: 'จึงใช้ทั้ง repo แทน ซึ่งมักเป็นโค้ดต้นฉบับที่เปิดตรงๆ ไม่ได้ แอปอาจขึ้นหน้าว่าง' });
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
    const x = rule(r, st.isDirectory() ? 0 : st.size);
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
items.push(WRAP);

// 4. app name / id for the next step
const title = (fs.readFileSync(idx, 'utf8').match(/<title>([^<]+)/i) || [])[1] || '';
const name = (process.env.APP_NAME || title || repoName).replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 30) || repoName;
const id = 'com.repo2apk.a' + (repoName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'app');
fs.appendFileSync(process.env.GITHUB_ENV || '/dev/null', `APP_NAME=${name}\nAPP_ID=${id}\n`);

fs.writeFileSync('report.md', '## รายงานการแปลง\n\n' + report(items));
assert(has(idx), 'www/index.html must exist');
