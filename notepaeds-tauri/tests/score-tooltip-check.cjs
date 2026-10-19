// Regression: a tall reference bubble must not swallow the launcher click.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const relative of ['app/index.html', '../NotePaeds-v8-Notepad-Shell.html']) {
  const file = path.resolve(__dirname, '..', relative);
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    new vm.Script(match[1], { filename: file });
  }
  const css = html.match(/scoreTip\.style\.cssText='([^']+)'/);
  assert.ok(css, 'Scoring tooltip style must be present');
  assert.match(css[1], /(?:^|;)pointer-events:none(?:;|$)/,
    'Hover reference must allow the underlying calculator to receive clicks');
  assert.ok(html.includes('<summary>Scoring reference</summary>'),
    'The full reference must remain available in a scrollable calculator view');
  assert.match(html, /hideScoreTip\(\);if\(d\.kind==='arithmetic'\)/,
    'Opening a calculator must dismiss the hover reference');
  console.log(relative + ': syntax and scoring tooltip regression PASS');
}
