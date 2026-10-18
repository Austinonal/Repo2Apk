// Holds the GitHub token so visitors never need one. Deploy: see worker/README.md
// env: GH_TOKEN (secret), CONV_REPO ("owner/repo" that holds build.yml), ALLOW_ORIGIN (site origin), MAX_RUNNING (default 3)
const GH = 'https://api.github.com', ACTIVE = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];
// same rules as the workflow's own checks
const OK = {
  repo: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, branch: /^[A-Za-z0-9_./-]*$/, targets: /^(android|ios|windows|mac|linux)(,(android|ios|windows|mac|linux))*$/,
  skip: /^[a-z,]*$/, id: /^([a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+)?$/, version: /^(\d+(\.\d+){0,2})?$/, job: /^[a-z0-9]{4,24}$/,
};

export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOW_ORIGIN, 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' };
    const out = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.headers.get('Origin') !== env.ALLOW_ORIGIN) return out(403, { error: 'origin' });
    const gh = (p, o = {}) => fetch(GH + p, { ...o, headers: { Authorization: 'Bearer ' + env.GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'repo2app-worker' } });
    const { pathname } = new URL(req.url);

    const rel = pathname.match(/^\/release\/([a-z0-9]{4,24})$/);
    if (req.method === 'GET' && rel) {
      const r = await gh(`/repos/${env.CONV_REPO}/releases/tags/apk-${rel[1]}`);
      return out(r.status, r.ok ? await r.json() : {});
    }

    if (req.method === 'POST' && pathname === '/build') {
      let b; try { b = await req.json(); } catch { return out(400, { error: 'json' }); }
      const inputs = { repo: '', branch: '', job: '', targets: '', skip: '', name: '', id: '', version: '', ...b };
      for (const [k, re] of Object.entries(OK)) if (typeof inputs[k] !== 'string' || !re.test(inputs[k])) return out(400, { error: 'bad ' + k });
      if (typeof inputs.name !== 'string' || inputs.name.length > 30) return out(400, { error: 'bad name' });
      // stateless abuse guard: refuse when too many builds are already running on our Actions minutes
      const runs = await (await gh(`/repos/${env.CONV_REPO}/actions/runs?per_page=30`)).json();
      if ((runs.workflow_runs || []).filter(r => ACTIVE.includes(r.status)).length >= (+env.MAX_RUNNING || 3)) return out(429, { error: 'busy' });
      const info = await (await gh(`/repos/${env.CONV_REPO}`)).json();
      const d = await gh(`/repos/${env.CONV_REPO}/actions/workflows/build.yml/dispatches`, { method: 'POST',
        body: JSON.stringify({ ref: info.default_branch, inputs: Object.fromEntries(Object.keys({ repo: 1, branch: 1, job: 1, targets: 1, skip: 1, name: 1, id: 1, version: 1 }).map(k => [k, inputs[k]])) }) });
      return out(d.ok ? 200 : d.status, d.ok ? { ok: true } : { error: 'dispatch' });
    }
    return out(404, {});
  },
};
