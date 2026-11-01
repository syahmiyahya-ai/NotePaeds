const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const ui = [
  'generation-ui.js',
  'release-91.js',
  'release-92.js',
  'release-93.js',
  'onboarding.js',
  'app/index.html',
].map((file) => [file, read(file)]);

for (const [file, source] of ui) {
  assert(!/openai/i.test(source), file + ' still names OpenAI');
}

const html = ui.find(([file]) => file === 'app/index.html')[1];
assert(html.includes('Send this diagnosis text to Google Gemini for coding suggestions'));
assert(html.includes('I reviewed this text and agree to send it to Google Gemini'));
assert(html.includes('I reviewed all fields and agree to send this de-identified information and instructions to Google Gemini.'));
assert(html.includes('I reviewed this text and agree to send it and the appearance instructions to Google Gemini to generate a leaflet image.'));
assert(html.includes('Google Gemini API key'));
assert(html.includes('Enter a Google Gemini API key from Google AI Studio.'));
assert(html.includes('AI search requires a configured Google Gemini API key and consent.'));
assert(html.includes('>Save image</button>'));
assert(html.includes('id="leafletPrint">Print image</button>'));
assert(!html.includes('>Save PNG</button>'));

const uiSource = read('generation-ui.js');
const fileNameFn = uiSource.match(/function leafletFileName\(uri\)\{.*\}/)[0];
const names = vm.runInNewContext(fileNameFn + '\n({png:leafletFileName("data:image/png;base64,abc"),jpeg:leafletFileName("data:image/jpeg;base64,abc")})');
assert.equal(names.png, 'NotePaeds-discharge-leaflet-draft.png');
assert.equal(names.jpeg, 'NotePaeds-discharge-leaflet-draft.jpg');

const generation = read('src-tauri/src/generation.rs');
assert(!/openai|gpt-4|gpt-image|bearer_auth|OPENAI/i.test(generation));
assert(generation.includes('x-goog-api-key'));
assert(generation.includes('https://generativelanguage.googleapis.com/v1beta'));
assert(generation.includes('gemini-3.8-flash'));
assert(generation.includes('gemini-nano-banana-2.1'));
assert(generation.includes('GEMINI_API_KEY'));
assert(generation.includes('GOOGLE_API_KEY'));
assert(generation.includes('GEMINI_MODEL'));
assert(generation.includes('fn models_url()'));
assert(!generation.includes('models?key'));

const credentials = read('src-tauri/src/credentials.rs');
assert(credentials.includes('pub const REGISTRY_VALUE: &str = "GeminiApiKey"'));
assert(credentials.includes('get_raw_value(super::REGISTRY_VALUE)'));
assert(!credentials.includes('get_raw_value("ApiKey")'));
assert(!credentials.includes('set_raw_value("ApiKey"'));

const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
const csp = conf.app.security.csp;
assert(!/openai|generativelanguage/i.test(csp));
assert(csp.includes("connect-src ipc: http://ipc.localhost https://syahmiyahya-ai.github.io"));

console.log('Gemini provider wording, key slot and CSP checks PASS');
