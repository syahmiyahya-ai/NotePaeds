const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
const release = fs.readFileSync(path.join(root, 'release-93.js'), 'utf8');

function lineFunction(source, name) {
  const line = source.split('\n').find(item => item.startsWith('function ' + name + '('));
  if (!line) throw new Error('missing function ' + name);
  return line;
}

function sliceFunction(source, name, nextName) {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf('function ' + nextName + '(', start + 1);
  if (start < 0 || end < 0) throw new Error('missing function ' + name);
  return source.slice(start, end);
}

const helpers = [
  lineFunction(html, 'moduleString'),
  sliceFunction(html, 'validateModule', 'normalizedMedication'),
  lineFunction(html, 'moduleVersion'),
  lineFunction(html, 'compareModuleVersions')
].join('\n');

function runPublication(fnSource, label) {
  const ctx = vm.createContext({
    moduleKinds: ['snippets', 'medications', 'calculators'],
    moduleDocuments: {
      snippets: {schemaVersion: 1, kind: 'snippets', moduleVersion: '1.0.0', entries: []},
      medications: {
        schemaVersion: 1,
        kind: 'medications',
        moduleVersion: '1.0.0',
        entries: [{
          id: 'ns_1h',
          name: 'Sodium chloride 0.9%',
          text: 'IV fluids: Sodium chloride 0.9% over 1 hour',
          fluidTemplate: {duration: '1', durationUnit: 'hours', weight: 10, volume: 100, rate: 50}
        }]
      },
      calculators: {schemaVersion: 1, kind: 'calculators', moduleVersion: '1.1.0', entries: []}
    },
    prefs: {customSnippets: []},
    readLibraryBaseline() { return null; }
  });
  vm.runInContext(helpers + '\n' + fnSource, ctx);
  const published = vm.runInContext('publicationLibrary()', ctx);
  const template = published.medications.entries[0].fluidTemplate;
  assert.equal(template.duration, '1', label + ' duration');
  assert.equal(template.durationUnit, 'hours', label + ' durationUnit');
  assert.deepStrictEqual(Object.keys(template).sort(), ['duration', 'durationUnit'], label);
  assert.equal(template.weight, undefined, label + ' weight');
  assert.equal(template.volume, undefined, label + ' volume');
  assert.equal(template.rate, undefined, label + ' rate');
  const source = ctx.moduleDocuments.medications.entries[0].fluidTemplate;
  assert.equal(source.duration, '1', label + ' source duration');
  assert.equal(source.durationUnit, 'hours', label + ' source durationUnit');
  assert.equal(source.weight, 10, label + ' source weight');
  assert.equal(source.volume, 100, label + ' source volume');
  assert.equal(source.rate, 50, label + ' source rate');
}

for (const [label, source] of [['index.html', html], ['release-93.js', release]]) {
  assert.equal(source.includes("['weight','volume','rate','duration']"), false, label + ' still deletes duration');
  assert.equal(source.includes("['weight','volume','rate']"), true, label + ' keeps the patient-specific delete list');
  runPublication(lineFunction(source, 'publicationLibrary'), label);
}

console.log('publicationLibrary keeps fluid duration and durationUnit PASS');
