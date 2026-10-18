// node scripts/lang.test.mjs  — English output must contain no Thai, Thai output must contain some
import assert from 'assert';
import { setLang } from './lang.mjs';
import { JUNK, BIG, rule, cutItems, BUILD_ITEM, WRAPS, TRUNC, dirItem, noIndex, htmlFix, iconItem, lookItem, baseItem, report, grade, AREAS, TITLES } from './rules.mjs';

const THAI = /[฀-๿]/;
const everything = () => {
  const cuts = cutItems([...JUNK.map(j => ['x/' + j.id, j]), ['big.mp4', BIG]]);
  const items = [...cuts, BUILD_ITEM, ...Object.values(WRAPS), TRUNC, dirItem('docs'), noIndex('a.html'), noIndex(),
    ...htmlFix('<head></head><img src="http://cdn.example.com/a.png">').items, iconItem('i.png'), iconItem(),
    lookItem({ name: 'App', bg: '#fff' }, 'm.json'), baseItem('repo', ['a.js'])];
  const ids = ['noindex', 'redirect', 'py', 'build', 'base', 'env', 'http', 'viewport', 'noicon', 'big', 'zip', 'trunc'].map(id => ({ id }));
  const g = grade(ids);
  return [report(items), JSON.stringify(g.tips), JSON.stringify({ ...AREAS }), JSON.stringify({ ...TITLES })].join('\n');
};

setLang('en');
assert(!THAI.test(everything()), 'English output contains Thai: ' + everything().match(/.{0,40}[฀-๿]+.{0,20}/)?.[0]);
assert.equal(TITLES.cut, 'Removed');
assert(rule('.env').effect.includes('leak'));
setLang('th');
assert(THAI.test(everything()));
assert.equal(TITLES.cut, 'ตัดออก');
console.log('lang ok');
