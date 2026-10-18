import { plan } from './scripts/plan.mjs';
import { WORKER_URL } from './config.js';
import { rule, cutItems, dirItem, WRAP, iconItem, report, TITLES, grade, AREAS } from './scripts/rules.mjs';
import { L, setLang, getLang } from './scripts/lang.mjs';

const $ = id => document.getElementById(id);
const say = t => { $('status').textContent = t; };
const store = (k, v) => { try { if (v === undefined) return localStorage[k] || ''; localStorage[k] = v; } catch { return ''; } };
const el = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text ? { textContent: text } : {});
const icon = (id, cls = 'ic') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), u = document.createElementNS(s.namespaceURI, 'use');
  s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); u.setAttribute('href', '#i-' + id); s.append(u);
  return s;
};
let pending;

// ---------- language: Thai markup carries data-en="..." (and data-en-placeholder / -aria-label / -content) ----------
setLang(store('lang') || (navigator.language.startsWith('th') ? 'th' : 'en'));
function applyLang() {
  const en = getLang() === 'en';
  document.documentElement.lang = getLang();
  for (const e of document.querySelectorAll('[data-en]')) { e.dataset.th ??= e.innerHTML; e.innerHTML = en ? e.dataset.en : e.dataset.th; }
  for (const a of ['placeholder', 'aria-label', 'content']) {
    const key = 'th' + a.replace('-', '');
    for (const e of document.querySelectorAll(`[data-en-${a}]`)) { e.dataset[key] ??= e.getAttribute(a); e.setAttribute(a, en ? e.getAttribute('data-en-' + a) : e.dataset[key]); }
  }
  $('lang').textContent = en ? 'ไทย' : 'EN';
}
applyLang();

// ---------- theme + setup dialog ----------
$('lang').onclick = () => {
  setLang(getLang() === 'en' ? 'th' : 'en'); store('lang', getLang());
  applyLang(); renderSample(); reset(); fieldErr('');
};
$('theme').onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; store('theme', next);
};
$('conv').value = store('conv') || (location.hostname.endsWith('.github.io')
  ? `${location.hostname.split('.')[0]}/${location.pathname.split('/')[1]}` : '');
$('tok').value = store('tok');
const ready = () => { $('tok-dot').hidden = !($('conv').value.trim() && $('tok').value.trim()); };
ready();
$('open-setup').onclick = () => $('setup').showModal();
$('open-setup').hidden = !!WORKER_URL;
$('setup').addEventListener('close', () => {
  if ($('setup').returnValue === 'save') { store('conv', $('conv').value.trim()); store('tok', $('tok').value.trim()); }
  ready();
});

// ---------- markdown subset (### heading, - item, "  - " effect line) -> DOM, text only ----------
function inline(node, text) {
  text.split('`').forEach((s, i) => node.append(i % 2 ? el('code', '', s) : s));
}
function md(text) {
  const kindOf = Object.fromEntries(Object.entries(TITLES).map(([k, v]) => [v, k])), box = el('div');
  let ul, li;
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      const kind = kindOf[line.slice(4)] || 'plain', h = el('h4', 'group-h ' + kind);
      h.append(el('span', 'tag', line.slice(4)));
      box.append(h);
      ul = box.appendChild(el('ul', kind));
    } else if (line.startsWith('- ')) {
      ul ??= box.appendChild(el('ul', 'plain'));
      li = ul.appendChild(el('li'));
      inline(li, line.slice(2));
    } else if (line.startsWith('  - ') && li) {
      const s = el('span', 'effect'); inline(s, line.slice(4)); li.append(s);
    } else if (line.trim() && !line.startsWith('## ')) {
      const p = el('p'); inline(p, line); box.append(p); ul = li = null;
    }
  }
  box.querySelectorAll('.group-h').forEach(h => h.append(el('span', 'count', String(h.nextElementSibling.children.length))));
  return box;
}

// ---------- score card ----------
function scoreCard(items) {
  const g = grade(items), box = el('section', 'score');
  box.setAttribute('aria-label', L('ผลประเมิน repo', 'Repo score'));
  const tone = g.total >= 85 ? 'good' : g.total >= 60 ? 'mid' : 'low';
  const top = el('div', 'score-top ' + tone), ring = el('div', 'ring');
  ring.style.setProperty('--v', g.total);
  ring.append(el('b', '', String(g.total)), el('small', '', '/100'));
  const head = el('div');
  head.append(el('h3', '', { good: L('พร้อมแปลงเป็นแอป', 'Ready to convert'), mid: L('แปลงได้ แต่ควรแก้ก่อน', 'Can convert, but fix a few things first'), low: L('ควรแก้ก่อนแปลง', 'Fix these before converting') }[tone]),
    el('p', '', g.tips.length ? L(`เจอ ${g.tips.length} จุดที่ทำให้แอปดีขึ้นได้`, `${g.tips.length} thing(s) could make your app better`) : L('ไม่เจอปัญหาที่ต้องแก้', 'Nothing to fix')));
  top.append(ring, head);
  const bars = el('ul', 'areas');
  for (const [k, label] of Object.entries(AREAS)) {
    const v = g.areas[k], li = el('li'), bar = el('span', 'meter ' + (v >= 80 ? 'good' : v >= 50 ? 'mid' : 'low'));
    bar.style.setProperty('--v', v); bar.setAttribute('aria-hidden', 'true');
    li.append(el('span', '', label), bar, el('span', 'v', v + '%'));
    bars.append(li);
  }
  box.append(top, bars);
  if (g.tips.length) {
    const ul = el('ul', 'tips');
    for (const t of g.tips) { const li = el('li'); li.append(el('span', 'act ' + t.act, { cut: L('ควรลด', 'Remove'), add: L('ควรเพิ่ม', 'Add'), fix: L('ควรแก้', 'Fix') }[t.act]), el('span', '', t.tip), el('span', 'pts', '−' + t.p)); ul.append(li); }
    box.append(el('h4', 'tips-h', L('สิ่งที่ควรทำ (เรียงจากสำคัญสุด)', 'What to do (most important first)')), ul);
  }
  return box;
}

// ---------- flow state ----------
// 0 = plan, 1 = confirm, 2 = build, 3 = all done, -1 = nothing yet
function setStep(n) {
  [...$('rail').children].forEach((li, i) => {
    li.classList.toggle('done', i < n);
    li.classList.toggle('now', i === n);
    if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}
const busy = on => {
  $('plan-btn').disabled = $('confirm').disabled = $('lang').disabled = on;
  $('plan-btn').setAttribute('aria-busy', on);
  $('bar').hidden = !on;
};
function reset() {
  $('plan').hidden = $('result').hidden = true;
  $('sample').hidden = false;
  setStep(-1); say(''); busy(false);
}
const fieldErr = t => { $('form-err').textContent = t || ''; $('form-err').hidden = !t; };

// sample plan so a first-time visitor sees what the tool does
const renderSample = () => $('sample-body').replaceChildren(md(report([
  ...cutItems(['.git', 'node_modules', '.env', 'README.md'].map(p => [p, rule(p)])),
  dirItem('docs'), iconItem('icons/icon-512.png'), WRAP,
])));
renderSample();

const targets = () => [...document.querySelectorAll('.targets input:checked')].map(c => c.value);
const parse = s => s.trim().match(/^(?:https?:\/\/)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^\s?#]+))?\/?$/);
const ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, VER_RE = /^\d+(\.\d+){0,2}$/;

$('url').addEventListener('input', () => fieldErr(''));
$('form').onsubmit = async e => {
  e.preventDefault();
  const u = parse($('url').value), id = $('appid').value.trim(), ver = $('appver').value.trim();
  if (!u) { $('url').focus(); return fieldErr(L('ลิงก์ไม่ถูกต้อง ลองแบบ github.com/ชื่อคุณ/โปรเจกต์', 'Invalid link. Try github.com/you/project')); }
  if (!targets().length) return fieldErr(L('เลือกอย่างน้อยหนึ่งแพลตฟอร์ม', 'Pick at least one platform'));
  if (id && !ID_RE.test(id)) { $('form').querySelector('.more').open = true; $('appid').focus(); return fieldErr(L('App ID ต้องเป็นตัวพิมพ์เล็ก คั่นด้วยจุดอย่างน้อย 2 ส่วน เช่น com.me.app', 'App ID must be lowercase with at least 2 parts separated by dots, e.g. com.me.app')); }
  if (ver && !VER_RE.test(ver)) { $('form').querySelector('.more').open = true; $('appver').focus(); return fieldErr(L('เวอร์ชันต้องเป็นตัวเลข เช่น 1.2.0', 'Version must be numbers, e.g. 1.2.0')); }
  fieldErr('');
  reset(); setStep(0); busy(true); say(L('กำลังอ่าน repo...', 'Reading the repo...'));
  try {
    const p = await plan(u[1], u[2], u[3], targets());
    pending = { repo: `${u[1]}/${u[2]}`, branch: u[3] || '', targets: targets().join(','), id, version: ver };
    const head = el('p', 'plan-meta');
    inline(head, L(`อ่าน \`${pending.repo}\` สาขา \`${p.branch}\` แล้ว มี ${p.count} ไฟล์ นี่คือสิ่งที่จะเกิดขึ้น`, `Read \`${pending.repo}\` on branch \`${p.branch}\`: ${p.count} files. Here is what will happen`));
    $('plan-body').replaceChildren(scoreCard(p.items), head, md(report(p.items)));
    const cuts = p.items.filter(i => i.kind === 'cut');
    $('plan-body').querySelectorAll('ul.cut > li').forEach((li, i) => {
      const l = el('label', 'keep'), c = el('input');
      c.type = 'checkbox'; c.dataset.id = cuts[i].id;
      l.append(c, el('span', '', L('เก็บไว้ ไม่ตัด', 'Keep, do not remove'))); li.append(l);
    });
    $('sample').hidden = true;
    $('plan').hidden = false; setStep(1); say(L('ดูคะแนนกับแผน แล้วกดยืนยันถ้าพร้อม', 'Check the score and plan, then confirm when ready'));
    if (matchMedia('(max-width: 959px)').matches) $('plan').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  } catch (err) {
    reset();
    fieldErr({ 404: L('ไม่เจอ repo นี้ (เป็น private หรือพิมพ์ผิด?)', 'Repo not found (is it private, or a typo?)'),
      403: L('เรียก GitHub เกินโควตา รอสักครู่แล้วลองใหม่', 'GitHub rate limit reached. Wait a moment and try again') }[err.message]
      || L('อ่าน repo ไม่ได้: ', 'Could not read the repo: ') + err.message);
  }
  busy(false);
};

$('cancel').onclick = reset;

$('confirm').onclick = async () => {
  const conv = $('conv').value.trim(), tok = $('tok').value.trim();
  if (!WORKER_URL && (!conv || !tok)) { $('setup').showModal(); $(conv ? 'tok' : 'conv').focus(); return say(L('ใส่ repo ของเว็บนี้กับ token ก่อน แล้วกดยืนยันอีกครั้ง', 'Enter this site\'s repo and a token first, then confirm again')); }
  if (!WORKER_URL) { store('conv', conv); store('tok', tok); ready(); }
  const gh = (p, o = {}) => fetch('https://api.github.com' + p, { ...o, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' } });
  const job = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const inputs = { repo: pending.repo, branch: pending.branch, job, targets: pending.targets,
    name: $('appname').value.trim(), id: pending.id, version: pending.version, lang: getLang(),
    skip: [...document.querySelectorAll('.keep input:checked')].map(c => c.dataset.id).join(',') };
  busy(true); setStep(2); say(L('กำลังสั่งงาน...', 'Starting the build...'));
  try {
    if (WORKER_URL) {
      const d = await fetch(WORKER_URL + '/build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(inputs) });
      if (d.status === 429) throw new Error(L('ตอนนี้มีคนแปลงอยู่เยอะ รอสักครู่แล้วกดยืนยันอีกครั้ง', 'Many builds are running right now. Wait a moment and confirm again'));
      if (!d.ok) throw new Error(L('สั่งงานไม่สำเร็จ (', 'Could not start the build (') + d.status + L(') ลองใหม่อีกครั้ง', '). Try again'));
    } else {
      const r = await gh(`/repos/${conv}`);
      if (!r.ok) throw new Error(L('เข้า repo ของเว็บนี้ไม่ได้ (เช็คชื่อ repo / token)', 'Cannot access this site\'s repo (check the repo name / token)'));
      const ref = (await r.json()).default_branch;
      const d = await gh(`/repos/${conv}/actions/workflows/build.yml/dispatches`, { method: 'POST', body: JSON.stringify({ ref, inputs }) });
      if (d.status === 404) throw new Error(L('ไม่เจอ workflow build.yml ใน repo ของเว็บนี้ (ต้องอยู่ที่ .github/workflows/build.yml)', 'build.yml workflow not found in this site\'s repo (it must be at .github/workflows/build.yml)'));
      if (!d.ok) throw new Error(L('สั่งงานไม่สำเร็จ (', 'Could not start the build (') + d.status + L(') เช็คสิทธิ์ token', '). Check the token permissions'));
    }
    const t0 = Date.now();
    for (;;) {
      await new Promise(f => setTimeout(f, globalThis.POLL ?? 8000));
      const s = Math.round((Date.now() - t0) / 1000);
      say(L('กำลังสร้างไฟล์... ', 'Building... ') + `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` + L(' (ปกติ 3-10 นาที)', ' (usually 3-10 minutes)'));
      const x = await (WORKER_URL ? fetch(`${WORKER_URL}/release/${job}`) : gh(`/repos/${conv}/releases/tags/apk-${job}`));
      if (x.ok) return finish(await x.json());
      if (Date.now() - t0 > 45 * 60e3) throw new Error(L('นานเกินไป ไปดูแท็บ Actions ใน repo', 'Taking too long. Check the Actions tab in the repo'));
    }
  } catch (err) { say(err.message); setStep(1); }
  finally { busy(false); }
};

// ---------- result: one card per downloadable file ----------
const KINDS = [
  [/-android-debug\.apk$/, 'android', 'Android', ['debug APK ติดตั้งลองได้เลย', 'Debug APK, install and try it']],
  [/\.apk$/, 'android', 'Android', ['APK ที่เซ็นแล้ว', 'Signed APK']],
  [/\.aab$/, 'android', 'Android', ['AAB สำหรับ Play Store', 'AAB for Google Play']],
  [/\.exe$/, 'windows', 'Windows', ['ตัวติดตั้ง .exe', '.exe installer']],
  [/\.dmg$/, 'mac', 'macOS', ['Universal .dmg', 'Universal .dmg']],
  [/\.AppImage$/, 'linux', 'Linux', ['AppImage (chmod +x แล้วรัน)', 'AppImage (chmod +x, then run)']],
  [/\.ipa$/, 'ios', 'iOS', ['.ipa ติดตั้งผ่าน Sideloadly / AltStore', '.ipa, install with Sideloadly / AltStore']],
  [/\.zip$/, 'ios', 'iOS', ['โปรเจกต์ Xcode', 'Xcode project']],
];
const mb = n => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';

function finish(rel) {
  const files = rel.assets.filter(x => !x.name.startsWith('facts')), box = $('result');
  $('plan').hidden = true; box.hidden = false;
  box.replaceChildren();
  setStep(files.length ? 3 : 2); say(files.length ? L('เสร็จแล้ว', 'Done') : L('สร้างไม่สำเร็จ', 'Build failed'));
  const h = el('h3', 'stage-h', files.length ? L('ไฟล์พร้อมแล้ว', 'Your files are ready') : L('สร้างไม่สำเร็จ', 'Build failed')); box.append(h);
  if (files.length) {
    const grid = el('div', 'downloads');
    for (const x of files) {
      const [, os, label, note] = KINDS.find(([re]) => re.test(x.name)) || [0, 'download', x.name.split('.').pop(), ['', '']];
      const a = el('a', 'dl'); a.href = x.browser_download_url;
      const t = el('span', 'dl-text');
      t.append(el('b', '', label), el('span', '', L(...note)), el('small', '', `${x.name} · ${mb(x.size)}`));
      a.append(icon(os, 'ic lg'), t, icon('download', 'ic dl-go'));
      grid.append(a);
    }
    box.append(grid, el('p', 'note', L('รายงานด้านล่างคือสิ่งที่เกิดขึ้นจริง ถ้าไม่ตรงกับแผน บอกได้เลย', 'The report below is what actually happened. If it does not match the plan, let us know')));
  } else {
    const url = (rel.body.match(/https?:\/\/\S+/) || [])[0];
    if (url) { const l = el('a', 'btn ghost', L('ดู log ว่าพังตรงไหน', 'See the log to find where it failed')); l.href = url; box.append(l); }
  }
  const rep = el('div', 'report'); rep.append(md(rel.body)); box.append(rep);
  h.tabIndex = -1; h.focus();
}
