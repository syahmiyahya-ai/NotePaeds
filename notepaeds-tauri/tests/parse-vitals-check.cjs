const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
const line = html.split('\n').find(item => item.startsWith('function parseVitals('));
if (!line) throw new Error('parseVitals not found');
const ctx = vm.createContext({});
vm.runInContext(line, ctx);

function vital(input) {
  ctx.raw = input;
  const result = vm.runInContext('parseVitals(raw)', ctx);
  assert.equal(result.ok, true, input);
  return result.text.split('\n').slice(1).join('; ');
}

const cases = [
  ['BP 106/82', 'BP: 106/82 mmHg'],
  ['BP 106 over 82', 'BP: 106/82 mmHg'],
  ['bp 90 over 60', 'BP: 90/60 mmHg'],
  ['HR 110', 'HR: 110 bpm'],
  ['SpO2 99 percent', 'SpO2: 99%'],
  ['sats 99', 'SpO2: 99%'],
  ['sat 98%', 'SpO2: 98%'],
  ['Blood Pressure: 120/80 MAP 93', 'BP: 120/80 mmHg (MAP 93)']
];

for (const [input, expected] of cases) {
  assert.equal(vital(input), expected, input);
}

const saturday = vital('Saturday review HR 120');
assert.equal(saturday, 'HR: 120 bpm', 'Saturday review HR 120');
assert.equal(saturday.includes('SpO2'), false, 'Saturday must not match SpO2');

console.log('parseVitals reads BP x over y and sats N PASS');
