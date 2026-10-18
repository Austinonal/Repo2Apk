// node worker/worker.test.mjs  (mocks GitHub, runs the worker handler)
import assert from 'assert';
import worker from './index.js';

const env = { GH_TOKEN: 't', CONV_REPO: 'me/site', ALLOW_ORIGIN: 'https://me.github.io', MAX_RUNNING: '2' };
let running = 0, dispatched;
globalThis.fetch = async (url, o = {}) => {
  const j = b => new Response(JSON.stringify(b), { status: 200 });
  if (url.includes('/actions/runs')) return j({ workflow_runs: Array(running).fill({ status: 'in_progress' }) });
  if (url.includes('/dispatches')) { dispatched = JSON.parse(o.body); return new Response(null, { status: 204 }); }
  if (url.includes('/releases/tags/')) return url.endsWith('apk-abcd') ? j({ tag_name: 'apk-abcd' }) : new Response('{}', { status: 404 });
  return j({ default_branch: 'main' });
};
const call = (path, method = 'GET', body, origin = env.ALLOW_ORIGIN) =>
  worker.fetch(new Request('https://w.dev' + path, { method, headers: { Origin: origin }, body: body && JSON.stringify(body) }), env);
const good = { repo: 'a/b', branch: '', job: 'abcd', targets: 'android,ios', skip: '', name: 'X', id: '', version: '' };

assert.equal((await call('/build', 'POST', good, 'https://evil.dev')).status, 403);
assert.equal((await call('/build', 'POST', good)).status, 200);
assert.equal(dispatched.ref, 'main'); assert.equal(dispatched.inputs.targets, 'android,ios');
assert.equal((await call('/build', 'POST', { ...good, repo: 'a/b;rm -rf' })).status, 400);
assert.equal((await call('/build', 'POST', { ...good, targets: 'android,evil' })).status, 400);
assert.equal((await call('/build', 'POST', { ...good, name: 'x'.repeat(31) })).status, 400);
running = 2; assert.equal((await call('/build', 'POST', good)).status, 429);
assert.equal((await call('/release/abcd')).status, 200);
assert.equal((await call('/release/zzzz')).status, 404);
assert.equal((await call('/release/..%2F..')).status, 404);
assert.equal((await call('/', 'OPTIONS')).status, 204);
console.log('worker ok');
