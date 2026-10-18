// Builds the preview plan from GitHub's public API. No clone, no Actions, no token.
import { TEXT, TEXT_MAX, baseFix, baseItem, rule, cutItems, entryDir, dirItem, noIndex, htmlFix, BUILD_ITEM, wrapItems, TRUNC,
  manifestPath, iconCandidates, iconItem, appLook, lookItem } from './rules.mjs';
import { L } from './lang.mjs';

const get = async (url, json) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  return json ? r.json() : r.text();
};

export async function plan(owner, name, wanted, targets = ['android']) {
  const api = 'https://api.github.com/repos/' + owner + '/' + name;
  const branch = wanted || (await get(api, true)).default_branch;
  const tree = await get(`${api}/git/trees/${branch}?recursive=1`, true);
  const raw = p => fetch(`https://raw.githubusercontent.com/${owner}/${name}/${branch}/${p}`)
    .then(r => (r.ok ? r.text() : ''));
  const files = tree.tree.filter(e => e.type === 'blob').map(e => e.path);
  const items = [];

  const pkg = files.includes('package.json') ? await raw('package.json').then(JSON.parse).catch(() => ({})) : {};
  if (pkg.scripts?.build) items.push(BUILD_ITEM);
  else {
    const dir = entryDir(p => files.includes(p));
    const pre = dir ? dir + '/' : '';
    if (dir) items.push(dirItem(dir));

    const cuts = [], gone = [], kept = [];
    for (const e of tree.tree) {
      if (!e.path.startsWith(pre)) continue;
      const rel = e.path.slice(pre.length);
      if (gone.some(g => rel.startsWith(g))) continue;
      const r = rule(rel, e.size);
      if (!r) { if (e.type === 'blob' && TEXT.test(rel) && e.size <= TEXT_MAX) kept.push(rel); continue; }
      cuts.push([rel, r]);
      if (e.type === 'tree') gone.push(rel + '/');
    }
    items.unshift(...cutItems(cuts));

    const fixed = [];
    for (const f of kept.slice(0, 60)) { const t = await raw(pre + f); if (baseFix(t, name) !== t) fixed.push(f); }
    if (fixed.length) items.push(baseItem(name, fixed.sort()));
    if (kept.length > 60) items.push({ ...TRUNC, what: L(`ตรวจ path ได้แค่ 60 จาก ${kept.length} ไฟล์ข้อความ`, `Only 60 of ${kept.length} text files were checked for paths`) });
    if (files.includes(pre + 'index.html')) {
      const html = await raw(pre + 'index.html'), mp = manifestPath(html);
      const manifest = mp && files.includes(pre + mp) ? await raw(pre + mp).then(JSON.parse).catch(() => ({})) : {};
      items.push(...htmlFix(html).items);
      items.push(iconItem(iconCandidates(html, manifest, mp).find(p => files.includes(pre + p))));
      const look = lookItem(appLook(manifest), mp);
      if (look) items.push(look);
    } else {
      const top = files.filter(f => f.startsWith(pre)).map(f => f.slice(pre.length));
      items.push(noIndex(top.find(f => !f.includes('/') && f.endsWith('.html'))));
    }
  }
  if (tree.truncated) items.push(TRUNC);
  items.push(...wrapItems(targets));
  return { items, branch, count: files.length };
}
