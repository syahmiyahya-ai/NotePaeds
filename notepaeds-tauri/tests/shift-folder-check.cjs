const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  new vm.Script(match[1], { filename: 'app/index.html' });
}

const defaults = vm.runInNewContext(
  '(' + html.match(/Object\.assign\((\{.*?shiftFolder:''\})/)[1] + ')',
  { DEFAULT_MODULE_UPDATE_URL: 'https://example.test/manifest.json' }
);
assert.equal(defaults.shiftFolder, '');
assert.equal(typeof defaults.shiftFolder, 'string');

const label = html.match(/Shift save folder \(e\.g\. G:\\\\My Drive\\\\NotePaeds\)/);
assert.ok(label, 'Settings must label the shift folder with a plain Windows example');
assert.equal(
  vm.runInNewContext('`' + label[0] + '`'),
  'Shift save folder (e.g. G:\\My Drive\\NotePaeds)'
);
assert.equal(html.split('Shift save folder').length - 1, 1, 'The folder field belongs only in Settings');
assert.match(html, /<input id="shiftFolder" class="input"/);
assert.match(html, /prefs\.shiftFolder=\$\('#shiftFolder'\)\.value\.trim\(\)/);
assert.doesNotMatch(html, /<button[^>]*>[^<]*Shift save folder/);

function extract(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, signature);
  let i = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  for (; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote && source[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unclosed ' + signature);
}

const helpers = [
  'function unsafeShiftFilename(',
  'function shiftExportFilename(',
  'function downloadShiftFile(',
  'async function exportShift('
].map(signature => extract(html, signature)).join('\n');
const saveOverride = extract(html, 'saveShiftAs=async function(');

function browser() {
  const downloads = [];
  return {
    downloads,
    document: {
      createElement() {
        return { click() { downloads.push(this.download); } };
      }
    },
    URL: { createObjectURL() { return 'blob:shift'; }, revokeObjectURL() {} },
    Blob: class Blob {},
    setTimeout(fn) { fn(); }
  };
}

function runExport({ folder, payload = '===== Patient =====\nnote', invoke, filename }) {
  const toasts = [];
  const page = browser();
  const ctx = vm.createContext({
    prefs: { shiftFolder: folder },
    shiftPayload: () => payload,
    toast(msg) { toasts.push(String(msg)); },
    window: invoke ? { __TAURI__: { core: { invoke } } } : {},
    document: page.document,
    URL: page.URL,
    Blob: page.Blob,
    setTimeout: page.setTimeout
  });
  vm.runInContext(helpers, ctx);
  if (filename) ctx.shiftExportFilename = () => filename;
  return Promise.resolve(ctx.exportShift()).then(() => ({ toasts, downloads: page.downloads }));
}

const safeName = /^NotePaeds-shift-\d{4}-\d{2}-\d{2}\.txt$/;
for (const name of ['', '.', '..', '../x.txt', '..\\x.txt', 'a/b.txt', 'a\\b.txt', 'a:b.txt', 'bad?.txt', 'bad*.txt', 'q".txt', 'a<b', 'a>b', 'a|b', 'ends.', 'a\nb']) {
  const ctx = vm.createContext({});
  vm.runInContext(extract(html, 'function unsafeShiftFilename('), ctx);
  assert.equal(ctx.unsafeShiftFilename(name), true, name);
}
{
  const ctx = vm.createContext({});
  vm.runInContext(extract(html, 'function unsafeShiftFilename(') + '\n' + extract(html, 'function shiftExportFilename('), ctx);
  const generated = ctx.shiftExportFilename();
  assert.match(generated, safeName);
  assert.equal(ctx.unsafeShiftFilename(generated), false);
  assert.equal(ctx.unsafeShiftFilename('  NotePaeds-shift-2026-10-27.txt  '), false);
}

function runSave(folder) {
  const toasts = [];
  const calls = [];
  const ctx = vm.createContext({
    prefs: { shiftFolder: folder },
    shiftBackup: () => '{"app":"NotePaeds"}',
    saveShift() {},
    toast(msg) { toasts.push(String(msg)); },
    window: { __TAURI__: { core: { invoke: async (command, args) => { calls.push({ command, args }); return 'G:\\My Drive\\NotePaeds\\shift.json'; } } } },
    URL: { createObjectURL() { return 'blob:shift'; }, revokeObjectURL() {} },
    Blob: class Blob {},
    document: { createElement() { return { click() {} }; } },
    setTimeout(fn) { fn(); }
  });
  vm.runInContext(saveOverride, ctx);
  return Promise.resolve(ctx.saveShiftAs()).then(() => ({ toasts, calls }));
}

Promise.resolve()
  .then(() => runExport({
    folder: '',
    invoke: async () => { throw new Error('should not write'); }
  }))
  .then(result => {
    assert.equal(result.downloads.length, 1);
    assert.match(result.downloads[0], safeName);
    assert.equal(result.toasts.length, 0);
    const calls = [];
    return runExport({
      folder: 'G:\\My Drive\\NotePaeds',
      invoke: async (command, args) => {
        calls.push({ command, args });
        return 'G:\\My Drive\\NotePaeds\\' + args.filename;
      }
    }).then(saved => ({ saved, calls }));
  })
  .then(({ saved, calls }) => {
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, 'write_shift_file');
    assert.equal(calls[0].args.folder, 'G:\\My Drive\\NotePaeds');
    assert.match(calls[0].args.filename, safeName);
    assert.equal(calls[0].args.contents, '===== Patient =====\nnote');
    assert.deepEqual(saved.downloads, []);
    assert.equal(saved.toasts.length, 1);
    assert.equal(saved.toasts[0], 'Saved to G:\\My Drive\\NotePaeds\\' + calls[0].args.filename);
    return runExport({
      folder: 'G:\\My Drive\\NotePaeds',
      invoke: async () => { throw new Error('The shift save folder does not exist.'); }
    });
  })
  .then(result => {
    assert.equal(result.downloads.length, 1);
    assert.match(result.downloads[0], safeName);
    assert.equal(result.toasts.length, 1);
    assert.match(result.toasts[0], /The shift save folder does not exist/);
    assert.match(result.toasts[0], /Downloaded instead/);
    return runExport({ folder: 'G:\\My Drive\\NotePaeds' });
  })
  .then(result => {
    assert.equal(result.downloads.length, 1);
    assert.match(result.toasts[0], /Windows app/);
    assert.match(result.toasts[0], /Downloaded instead/);
    const calls = [];
    return runExport({
      folder: 'G:\\My Drive\\NotePaeds',
      filename: '..\\secret.txt',
      invoke: async (command) => { calls.push(command); return 'nope'; }
    }).then(blocked => ({ blocked, calls }));
  })
  .then(({ blocked, calls }) => {
    assert.deepEqual(calls, []);
    assert.equal(blocked.downloads.length, 1);
    assert.equal(blocked.downloads[0], '..\\secret.txt');
    assert.match(blocked.toasts[0], /not allowed/);
    assert.match(blocked.toasts[0], /Downloaded instead/);
    return runExport({ folder: 'G:\\My Drive\\NotePaeds', payload: '' });
  })
  .then(result => {
    assert.deepEqual(result.downloads, []);
    assert.deepEqual(result.toasts, ['No patient notes to export.']);
    return runSave('  G:\\My Drive\\NotePaeds  ');
  })
  .then(saved => {
    assert.equal(saved.calls[0].command, 'save_shift_as');
    assert.equal(saved.calls[0].args.initialDir, 'G:\\My Drive\\NotePaeds');
    assert.match(saved.calls[0].args.suggestedName, /^NotePaeds-shift-\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(saved.calls[0].args.contents, '{"app":"NotePaeds"}');
    assert.match(saved.toasts[0], /Shift and locations saved to G:\\My Drive\\NotePaeds\\shift\.json/);
    return runSave('');
  })
  .then(saved => {
    assert.equal(saved.calls[0].args.initialDir, '');
    return runSave('   ');
  })
  .then(saved => {
    assert.equal(saved.calls[0].args.initialDir, '');
    console.log('shift folder: pref default, quick export and Save Shift As PASS');
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
