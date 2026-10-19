const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, '..', 'module-feed', 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.modules.length, 3);
for (const item of manifest.modules) {
  const document = JSON.parse(fs.readFileSync(path.resolve(root, '..', 'module-feed', item.url), 'utf8'));
  assert.equal(document.kind, item.kind);
  assert.equal(document.moduleVersion, item.version);
}

for (const relative of ['app/index.html', '../NotePaeds-v8-Notepad-Shell.html', '../portable/NotePaeds-v8.4.0-Standalone.html']) {
  const file = path.resolve(root, relative);
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    new vm.Script(match[1], { filename: file });
  }
  assert.match(html, /Check module updates/);
  assert.match(html, /fetch_module_updates/);
  assert.match(html, /restore_module_backup/);
  assert.match(html, /Updates are never installed silently/);
  assert.match(html, /id":"westley_croup"/);
}
console.log('Module feed and updater regression PASS');
