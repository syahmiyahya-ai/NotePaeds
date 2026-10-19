const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');const html=fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8'),runtime=fs.readFileSync(path.join(__dirname,'../release-92.js'),'utf8');
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const ctx=vm.createContext({});vm.runInContext(html.split('\n').find(l=>l.startsWith('function parseVitals(')),ctx);
const raw=` Vital_Sign
     Temperature     39.3 deg C (36.4~37.4) Critical High
     Heart (Pulse) Rate     169 /min (80~140) Critical High
     Respiratory Rate     28 /min (20~30)
     Systolic BP     118 /mmHg (81~100) Critical High
     Dystolic BP 63 /mmHg
     Pain Score 0  (<=1)
     SpO2 (%)     97.0  (94.0~100.0)
     Level of Consciousness Alert
     Weight 17.70 kg`;
// HIS sometimes spells diastolic as Dystolic; both need support.
ctx.raw=raw;const r=vm.runInContext('parseVitals(raw)',ctx);assert(r.ok);for(const value of ['39.3°C','HR: 169 bpm','RR: 28/min','BP: 118/63 mmHg','SpO2: 97%','Pain: 0','Consciousness: Alert','Weight: 17.7 kg'])assert(r.text.includes(value),value+' missing: '+r.text);assert(!/room air|GCS|Critical|36.4/.test(r.text));
vm.runInContext(runtime.split('\n').filter(l=>/^function (regimenOrder|fluidOrder|locationLabel|tabLabel)\(/.test(l)&&!l.startsWith('function regimenOrder')).join('\n'),ctx);
const dose=runtime.slice(runtime.indexOf('function regimenOrder'),runtime.indexOf('function medDialog'));vm.runInContext(dose,ctx);
assert.equal(vm.runInContext("locationLabel({zone:'green',qms:'128',bed:'3'})",ctx),'G · QMS 128');
assert.equal(vm.runInContext("fluidOrder({fluid:'Test fluid',volume:'100',rate:'',duration:'2',calculate:'rate',purpose:'',instructions:''})",ctx),'IV fluids: Test fluid 100 mL at 50 mL/hour over 2 hours');
assert.throws(()=>vm.runInContext("fluidOrder({fluid:'Test',volume:'100',rate:'',duration:'0',calculate:'rate'})",ctx));
const input={amount:'5',unit:'mg',route:'PO',frequency:'BD',basis:'dose',weight:'10',dosesPerDay:'2',maxSingle:'',maxDaily:''};ctx.input=input;assert.match(vm.runInContext("regimenOrder('Test',input)",ctx),/50 mg\/dose/);assert(!vm.runInContext("regimenOrder('Test',input,false)",ctx).includes('50 mg'));input.weight='';assert.throws(()=>vm.runInContext("regimenOrder('Test',input)",ctx));
assert(html.includes('function slashUpdate(){slashClose()}'));assert(html.includes("if(false&&pos&&editor.value[pos-1]==='#'"));assert(!html.includes("||(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey)"));
ctx.input={...input,basis:'fixed',amount:'10',maxSingle:'4',maxDaily:'',weight:''};assert.match(vm.runInContext("regimenOrder('Test',input)",ctx),/4 mg\/dose; maximum applied/);
console.log('9.2: HIS sample, uncertainty, IV arithmetic, regimen templates, locations, syntax and trigger removal PASS');
