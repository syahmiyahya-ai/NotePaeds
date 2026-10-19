const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../app/index.html'),'utf8');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const rules=html.match(/const ICD10_RULES=\[[\s\S]*?\n\];/)[0];
const functions=['diagnosisText','icdSuggestions','patientDisplayName','patientWeight'].map(name=>html.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n');
const runtime=fs.readFileSync(require('path').join(__dirname,'../release-91.js'),'utf8').split('function insertIntoPlaceholders')[0];
const ctx=vm.createContext({});vm.runInContext(rules+'\n'+functions+'\n'+runtime,ctx);
function run(code){return vm.runInContext(code,ctx)}
assert.equal(run("placeholderResult('Vitals:\\n<insert Vital sign here>','Vitals:\\nHR: 120 bpm','vitals').text"),'Vitals:\nHR: 120 bpm');
assert.equal(run("placeholderResult('<insert Patiend ID here>','Name: Test Child\\nMRN: 1234','id').count"),1);
assert.equal(run("placeholderResult('<HR> <RR>','HR: 120 bpm','vitals').text"),'120 bpm <RR>');
assert.equal(run("placeholderResult('<Weight>','Weight: _ kg','id').text"),'<Weight>');
assert.equal(run("icdSuggestions('Dx:\\nBronchiolitis')[0][0]"),'J21.9');
assert.equal(run("icdSuggestions('Imp:\\nNo pneumonia').length"),0);
assert.equal(run("icdSuggestions('Imp:\\nFebrile seizure').length"),1);
assert.equal(run("icdSuggestions('Imp:\\nViral-induced wheeze')[0][0]"),'J45.9');
assert.match(run("patientTabSummary('Name: Test Child Example\\nWeight: 12 kg\\nBed: YZ3\\nQMS: 148\\nDx: Bronchiolitis')"),/Test Child · 12 kg.*Bed: YZ3 · QMS: 148/);
assert(html.includes('id="statusAction"'));
console.log('9.1 syntax, placeholders, diagnosis matching and patient tooltip checks PASS');
