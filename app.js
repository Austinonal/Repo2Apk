import { plan } from './scripts/plan.mjs';
import { rule, cutItems, dirItem, WRAP, report, TITLES } from './scripts/rules.mjs';

const $ = id => document.getElementById(id), L = localStorage;
const say = t => { $('status').textContent = t; };
const kindOf = Object.fromEntries(Object.entries(TITLES).map(([k, v]) => [v, k]));
let pending;

$('conv').value = L.conv || (location.hostname.endsWith('.github.io')
  ? `${location.hostname.split('.')[0]}/${location.pathname.split('/')[1]}` : '');
$('tok').value = L.tok || '';

// markdown subset (### heading, - item, "  - " effect line) -> DOM, text only
function inline(el, text) {
  text.split('`').forEach((s, i) => {
    if (i % 2) { const c = document.createElement('code'); c.textContent = s; el.append(c); }
    else el.append(s);
  });
}
function md(text) {
  const box = document.createElement('div');
  let ul, li;
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      const h = document.createElement('h3'); h.textContent = line.slice(4); box.append(h);
      ul = box.appendChild(document.createElement('ul'));
      ul.className = kindOf[line.slice(4)] || 'plain';
    } else if (line.startsWith('- ')) {
      ul ??= box.appendChild(Object.assign(document.createElement('ul'), { className: 'plain' }));
      li = ul.appendChild(document.createElement('li'));
      inline(li, line.slice(2));
    } else if (line.startsWith('  - ') && li) {
      const s = document.createElement('span'); s.className = 'effect'; inline(s, line.slice(4)); li.append(s);
    } else if (line.trim() && !line.startsWith('## ')) {
      const p = document.createElement('p'); inline(p, line); box.append(p); ul = li = null;
    }
  }
  return box;
}

// 0 = plan, 1 = confirm, 2 = build, 3 = all done, -1 = nothing yet
function setStep(n) {
  [...$('rail').children].forEach((el, i) => {
    el.classList.toggle('done', i < n);
    el.classList.toggle('now', i === n);
  });
}
const busy = on => {
  $('plan-btn').disabled = $('confirm').disabled = on;
  $('bar').hidden = !on;
};
function reset() {
  $('plan').hidden = $('result').hidden = true;
  $('sample').hidden = false;
  setStep(-1); say(''); busy(false);
}

// sample plan so a first-time visitor sees what the tool does
$('sample-body').replaceChildren(md(report([
  ...cutItems(['.git', 'node_modules', '.env', 'README.md'].map(p => [p, rule(p)])),
  dirItem('docs'), WRAP,
])));

const targets = () => [...document.querySelectorAll('.targets input:checked')].map(c => c.value);
const parse = s => s.trim().match(/^(?:https?:\/\/)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^\s?#]+))?\/?$/);

$('form').onsubmit = async e => {
  e.preventDefault();
  const u = parse($('url').value);
  if (!u) return say('ลิงก์ไม่ถูกต้อง ลองแบบ github.com/ชื่อคุณ/โปรเจกต์');
  if (!targets().length) return say('เลือกอย่างน้อยหนึ่งปลายทาง');
  reset(); setStep(0); busy(true); say('กำลังอ่าน repo...');
  try {
    const p = await plan(u[1], u[2], u[3], targets());
    pending = { repo: `${u[1]}/${u[2]}`, branch: u[3] || '', targets: targets().join(',') };
    const head = document.createElement('p');
    inline(head, `อ่าน \`${pending.repo}\` สาขา \`${p.branch}\` แล้ว มี ${p.count} ไฟล์ นี่คือสิ่งที่จะเกิดขึ้น`);
    $('plan-body').replaceChildren(head, md(report(p.items)));
    const cuts = p.items.filter(i => i.kind === 'cut');
    $('plan-body').querySelectorAll('ul.cut > li').forEach((li, i) => {
      const l = document.createElement('label'), c = document.createElement('input');
      l.className = 'keep'; c.type = 'checkbox'; c.dataset.id = cuts[i].id;
      l.append(c, ' เก็บไว้ ไม่ตัด'); li.append(l);
    });
    $("sample").hidden = true;
    $('plan').hidden = false; setStep(1); say('');
  } catch (err) {
    reset();
    say({ 404: 'ไม่เจอ repo นี้ (เป็น private หรือพิมพ์ผิด?)', 403: 'เรียก GitHub เกินโควตา รอสักครู่แล้วลองใหม่' }[err.message]
      || 'อ่าน repo ไม่ได้: ' + err.message);
  }
  busy(false);
};

$('cancel').onclick = reset;

$('confirm').onclick = async () => {
  const conv = $('conv').value.trim(), tok = $('tok').value.trim();
  if (!conv || !tok) { $('setup').open = true; $('tok').focus(); return say('ใส่ repo ของเว็บนี้กับ token ในช่อง "ตั้งค่า" ก่อน แล้วกดยืนยันอีกครั้ง'); }
  L.conv = conv; L.tok = tok;
  const gh = (p, o = {}) => fetch('https://api.github.com' + p, { ...o, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' } });
  const job = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  busy(true); setStep(2); say('กำลังสั่งงาน...');
  try {
    const r = await gh(`/repos/${conv}`);
    if (!r.ok) throw new Error('เข้า repo ของเว็บนี้ไม่ได้ (เช็คชื่อ repo / token)');
    const ref = (await r.json()).default_branch;
    const d = await gh(`/repos/${conv}/actions/workflows/build.yml/dispatches`, { method: 'POST',
      body: JSON.stringify({ ref, inputs: { repo: pending.repo, branch: pending.branch, job, targets: pending.targets, name: $('appname').value.trim(),
        skip: [...document.querySelectorAll('.keep input:checked')].map(c => c.dataset.id).join(',') } }) });
    if (!d.ok) throw new Error('สั่งงานไม่สำเร็จ (' + d.status + ') เช็คสิทธิ์ token');
    const t0 = Date.now();
    for (;;) {
      await new Promise(f => setTimeout(f, globalThis.POLL ?? 8000));
      say(`กำลังสร้างไฟล์... ${Math.round((Date.now() - t0) / 1000)} วินาที (ปกติ 3-6 นาที)`);
      const x = await gh(`/repos/${conv}/releases/tags/apk-${job}`);
      if (x.ok) return finish(await x.json());
      if (Date.now() - t0 > 30 * 60e3) throw new Error('นานเกินไป ไปดูแท็บ Actions ใน repo');
    }
  } catch (err) { say(err.message); setStep(1); }
  finally { busy(false); }
};

function finish(rel) {
  const a = rel.assets.find(x => !x.name.startsWith('facts')), box = $('result');
  $('plan').hidden = true; box.hidden = false;
  box.replaceChildren();
  setStep(a ? 3 : 2); say(a ? 'เสร็จแล้ว' : 'สร้างไม่สำเร็จ');
  const h = document.createElement('h2'); h.textContent = a ? 'ไฟล์พร้อมแล้ว' : 'สร้างไม่สำเร็จ'; box.append(h);
  if (a) {
    const row = document.createElement('div'); row.className = 'actions';
    const names = { apk: 'Android (.apk)', exe: 'Windows (.exe)', dmg: 'macOS (.dmg)', zip: 'iOS (โปรเจกต์ Xcode)' };
    for (const x of rel.assets) {
      const link = document.createElement('a');
      link.className = 'btn primary'; link.href = x.browser_download_url;
      link.textContent = 'ดาวน์โหลด ' + (names[x.name.split('.').pop()] || x.name);
      row.append(link);
    }
    box.append(row);
    const n = document.createElement('p'); n.className = 'note';
    n.textContent = 'รายงานด้านล่างคือสิ่งที่เกิดขึ้นจริง ถ้าไม่ตรงกับแผน บอกได้เลย';
    box.append(n);
  } else {
    const url = (rel.body.match(/https?:\/\/\S+/) || [])[0];
    if (url) { const l = document.createElement('a'); l.className = 'btn'; l.href = url; l.textContent = 'ดู log ว่าพังตรงไหน'; box.append(l); }
  }
  box.append(md(rel.body));
}
