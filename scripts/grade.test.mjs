// node scripts/grade.test.mjs
import assert from 'assert';
import { grade, iconItem, htmlFix, cutItems, rule, BUILD_ITEM } from './rules.mjs';

assert.equal(grade([iconItem('icon.png'), { kind: 'fix', id: 'pwa' }]).total, 100);
const bad = grade([...cutItems([['.env', rule('.env')]]), ...htmlFix('<head></head>').items, iconItem()]);
assert.equal(bad.total, 100 - 30 - 25 - 25 - 15);
assert.equal(bad.tips[0].act, 'ลด'); // .env is the worst
assert.equal(bad.areas.safe, 40);
assert.equal(grade([BUILD_ITEM]).total, 95); // built apps: manifest unknown, not penalised
console.log('grade ok');
