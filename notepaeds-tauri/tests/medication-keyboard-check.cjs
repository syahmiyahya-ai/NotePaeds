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
  assert.match(html, /id="medAmount"[^>]*aria-label="Dose"/);
  assert.match(html, /id="medDoseMode"[^>]*aria-label="Unit and dose basis"/);
  assert.match(html, /id="medFrequency"[^>]*aria-label="Frequency"/);
  assert.match(html, /id="medWeight"[^>]*aria-label="Weight in kilograms"/);
  assert.match(html, /id="medTipApply"[^>]*tabindex="-1"/,
    'The Add button is skipped because Enter applies directly from any medication field');
  assert.match(html, /id="medAmount"[\s\S]*?<option value="other">Other…<\/option>/,
    'Dose dropdown must include Other');
  assert.match(html, /id="medDoseMode"[\s\S]*?<option value="other">Other…<\/option>/,
    'Unit dropdown must include Other');
  assert.match(html, /id="medFrequency"[\s\S]*?<option value="other">Other…<\/option>/,
    'Frequency dropdown must include Other');
  assert.ok(html.includes('id="medAmountOther"') && html.includes('id="medDoseModeOther"') && html.includes('id="medFrequencyOther"'),
    'Every Other option must expose a keyboard-accessible custom control');
  assert.match(html, /e\.key==='Enter'.*submit\(\)/,
    'Enter must apply the dose without an extra confirmation control');
  assert.match(html, /e\.key==='Escape'.*hideTooltip/,
    'Escape must return to the note');
  assert.ok(html.includes('Use <kbd>↑↓</kbd> to choose'));
  assert.ok(!html.includes('id="medConfirmed"'),
    'Medication editor must not contain a confirmation checkbox');
  assert.ok(!html.includes("(_'+input.unit+')") && !html.includes('mg/kg/dose (_mg)'),
    'Weightless medication text must not contain a blank-to-fill dose');
  assert.match(html, /\(e\.key==='Tab'[\s\S]*?medicationNoteTargetAt/,
    'Tab on an anchored medication line must open its editor');
  assert.match(html, /Number\(weight\)>0.*calculatedMedicationOrder/,
    'Known patient weight must calculate the fast medication line automatically');
  console.log(relative + ': keyboard medication UI PASS');
}
