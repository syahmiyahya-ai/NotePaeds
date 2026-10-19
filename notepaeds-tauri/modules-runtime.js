// Embedded in both HTML editions. Modules are data, never executable scripts.
const moduleKinds=['snippets','medications','calculators'];
const moduleDefaults={
  snippets:{schemaVersion:1,moduleVersion:'1.0.0',kind:'snippets',entries:JSON.parse(JSON.stringify(snippets))},
  medications:{schemaVersion:1,moduleVersion:'1.0.0',kind:'medications',entries:JSON.parse(JSON.stringify(meds))},
  calculators:{schemaVersion:1,moduleVersion:'1.1.0',kind:'calculators',entries:DEFAULT_CALCULATORS}
};
let moduleDocuments=JSON.parse(JSON.stringify(moduleDefaults)),moduleFiles={},moduleDirectory='',moduleError='',modulesReady=false;
let calculators=[];
const moduleStorageKey='notepaeds_modules_v1';
function moduleString(value,label,max=40000){if(typeof value!=='string'||value.length>max)throw Error(label+' must be text (maximum '+max+' characters).');return value}
function validateModule(value,kind){
  if(!value||value.schemaVersion!==1||value.kind!==kind||!Array.isArray(value.entries)||value.entries.length>1500)throw Error('Expected schemaVersion 1, kind '+kind+', and an entries array (maximum 1500).');
  if(value.moduleVersion!==undefined&&!/^\d+\.\d+\.\d+$/.test(value.moduleVersion))throw Error('moduleVersion must use major.minor.patch numbers, for example 1.2.0.');
  const ids=new Set(),labels=new Set();
  const id=(v,label)=>{if(typeof v!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(v))throw Error(label+' needs a stable letters/numbers ID.');return v};
  const options=list=>{if(!Array.isArray(list)||!list.length||list.length>100)throw Error('Each scoring field needs 1–100 options.');for(const o of list){moduleString(o.label,'Option label',1000);if(!Number.isInteger(o.score)||Math.abs(o.score)>1000)throw Error('Option scores must be integers between -1000 and 1000.')}};
  for(const e of value.entries){
    if(!e||typeof e!=='object')throw Error('Invalid module entry.');id(e.id,'Entry');
    if(ids.has(e.id))throw Error('Duplicate ID: '+e.id);ids.add(e.id);
    if(e.enabled!==undefined&&typeof e.enabled!=='boolean')throw Error('enabled must be true or false.');
    if(kind==='snippets'){for(const key of ['title','group','text'])moduleString(e[key],key);if(e.desc!==undefined)moduleString(e.desc,'Description');}
    if(kind==='medications'){
      for(const key of ['name','text'])moduleString(e[key],key);
      for(const key of ['orderPrefix','type','otherName','route','category','indication','targetAge','formulations','dose','maxSingle','maxDaily','toxicLimit','duration','administration','weightBands','organRisk','warnings','emergency','revision','frequency'])if(e[key]!==undefined)moduleString(e[key],key);
      if(e.calcPerKg!=null&&(!(e.calcPerKg>0)||!Number.isFinite(e.calcPerKg)))throw Error('calcPerKg must be a positive number or null.');
      if(e.calcPerKg!=null&&!['OD','BD','TDS','QID','ON','STAT','6 times/day'].includes(e.frequency))throw Error('An automatic dose needs an explicit supported frequency.');
    }
    if(kind==='calculators'){
      moduleString(e.title,'Calculator title',200);
      if(!['arithmetic','score','formula','risk-rule','resus'].includes(e.kind))throw Error('Supported calculator kinds: arithmetic, score, formula, risk-rule, resus.');
      if(e.note!==undefined)moduleString(e.note,'Notes');if(e.source!==undefined)moduleString(e.source,'Source');
      if(e.sourceUrl!==undefined&&!/^https:\/\/[^\s]+$/.test(e.sourceUrl))throw Error('Source URL must use HTTPS.');
      if(e.kind==='risk-rule'){
        moduleString(e.label,'Rule label',40);moduleString(e.eligibility,'Eligibility');moduleString(e.reference,'Reference');
        if(!Array.isArray(e.bands)||!e.bands.length||e.bands.length>10)throw Error('Risk rules need 1–10 bands.');
        const bands=new Set();for(const b of e.bands){id(b.id,'Band');if(bands.has(b.id))throw Error('Duplicate rule band.');bands.add(b.id);moduleString(b.label,'Band label',200);
          if(!Array.isArray(b.fields)||!b.fields.length||b.fields.length>30)throw Error('Risk band needs 1–30 findings.');
          const fields=new Set();for(const f of b.fields){id(f.id,'Finding');if(fields.has(f.id))throw Error('Duplicate finding.');fields.add(f.id);moduleString(f.label,'Finding label',1000);if(!['high','intermediate'].includes(f.risk))throw Error('Unknown risk class.');}
          for(const k of ['high','intermediate','low'])moduleString(b.outcomes?.[k],'Rule outcome',2000);
        }
      }
      if(e.kind==='score'){
        if(typeof e.label!=='string'||! /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/.test(e.label))throw Error('Score label must start with a letter and use letters, numbers, spaces, _ or -.');
        if(labels.has(e.label.toLowerCase()))throw Error('Score labels must be unique.');labels.add(e.label.toLowerCase());
        if(!Array.isArray(e.fields)||!e.fields.length||e.fields.length>30)throw Error('A score needs 1–30 fields.');
        const contexts=e.contexts||[];if(!Array.isArray(contexts)||contexts.length>10)throw Error('Invalid score contexts.');
        const contextIds=new Set();
        for(const c of contexts){id(c.id,'Context');if(contextIds.has(c.id))throw Error('Duplicate context ID.');contextIds.add(c.id);moduleString(c.label,'Context label');if(!Array.isArray(c.options)||!c.options.length||c.options.length>100||new Set(c.options).size!==c.options.length)throw Error('Context options must be unique.');c.options.forEach(o=>moduleString(o,'Context option',1000));}
        const fields=new Set();let min=0,max=0;
        for(const f of e.fields){id(f.id,'Field');if(fields.has(f.id))throw Error('Duplicate field ID.');fields.add(f.id);moduleString(f.label,'Field label');let lists;
          if(f.context){const c=contexts.find(c=>c.id===f.context);if(!c||!f.variants)throw Error('Unknown field context.');lists=c.options.map(v=>f.variants[v]);}else lists=[f.options];
          lists.forEach(options);const values=lists.flat().map(o=>o.score);min+=Math.min(...values);max+=Math.max(...values);
        }
        if(!Array.isArray(e.severity)||!e.severity.length||e.severity.length>100)throw Error('Supply severity ranges.');
        const bands=[...e.severity].sort((a,b)=>a.min-b.min);let next=min;
        for(const band of bands){moduleString(band.label,'Severity label');if(!Number.isInteger(band.min)||!Number.isInteger(band.max)||band.min!==next||band.max<band.min)throw Error('Severity ranges must cover the score without gaps or overlap.');next=band.max+1;}
        if(next!==max+1)throw Error('Severity ranges must cover the possible score '+min+' to '+max+'.');
      }
      if(e.kind==='formula'){
        if(!Array.isArray(e.inputs)||!e.inputs.length||e.inputs.length>20)throw Error('A formula needs 1–20 inputs.');
        const names=new Set();for(const f of e.inputs){if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.id)||names.has(f.id))throw Error('Formula input IDs must be unique variable names.');names.add(f.id);moduleString(f.label,'Input label');if(f.unit!==undefined)moduleString(f.unit,'Input unit',100);for(const k of ['min','max'])if(f[k]!==undefined&&!Number.isFinite(f[k]))throw Error('Input limits must be numbers.');if(f.min!==undefined&&f.max!==undefined&&f.min>f.max)throw Error('Input minimum exceeds maximum.');}
        moduleString(e.expression,'Formula',1000);if(!e.expression.trim())throw Error('Formula is empty.');
        const expression=e.expression.replace(/[A-Za-z][A-Za-z0-9_]*/g,name=>{if(!names.has(name))throw Error('Unknown formula variable: '+name);return '1'});
        if(!/^[\d\s.()+*/%+-]+$/.test(expression))throw Error('Formula supports arithmetic only, not scripts.');
        try{arithmetic(expression)}catch(error){if(!/zero|finite/i.test(error.message))throw error}
        moduleString(e.outputLabel,'Output label',200);if(e.unit!==undefined)moduleString(e.unit,'Output unit',100);
        if(e.decimals!==undefined&&(!Number.isInteger(e.decimals)||e.decimals<0||e.decimals>6))throw Error('Decimals must be 0–6.');
      }
      if(e.kind==='resus')validateResus(e);
    }
  }
  return JSON.parse(JSON.stringify(value));
}
function normalizedMedication(e){
  const m={...e,enabled:e.enabled!==false,group:'Medications',type:e.type||'',orderPrefix:e.orderPrefix||e.type||'',calcPerKg:e.calcPerKg??null,frequency:e.frequency||''};
  for(const key of ['category','indication','targetAge','formulations','dose','maxSingle','maxDaily','toxicLimit','duration','administration','weightBands','organRisk','warnings','emergency','revision'])m[key]=e[key]||'';
  m.title=m.text;m.desc=[m.route,m.category,m.indication].filter(Boolean).join(' · ');
  m.searchText=Object.values(m).filter(v=>typeof v==='string').join(' ').toLowerCase();
  m.tip=medicationHeading(m)+'\n'+['category','indication','targetAge','formulations','dose','maxSingle','maxDaily','toxicLimit','duration','administration','weightBands','organRisk','warnings','emergency','revision'].map((key,i)=>medicationTooltipLabels[i]+': '+(m[key]||'—')).join('\n');
  return m;
}
function installModuleDocuments(documents){
  const checked={};for(const kind of moduleKinds)checked[kind]=validateModule(documents[kind],kind);
  moduleDocuments=checked;
  snippets.splice(0,snippets.length,...checked.snippets.entries.filter(e=>e.enabled!==false));
  meds.splice(0,meds.length,...checked.medications.entries.filter(e=>e.enabled!==false).map(normalizedMedication));
  calculators=checked.calculators.entries.filter(e=>e.enabled!==false);
  moduleError='';modulesReady=true;hideTooltip(true);hideScoreTip();slashClose();
  $$('[data-med]').forEach(b=>{const m=meds.find(m=>m.name.toLowerCase()===b.dataset.med.toLowerCase());b.disabled=!m;if(m)b.dataset.tipMed=m.id;else delete b.dataset.tipMed;});
  $('#modulesNotice').textContent='';$('#modulesNotice').style.display='none';
}
function modulesAvailable(){if(!modulesReady||moduleError){toast(moduleError?'Modules need attention — open Tools > Manage modules.':'Modules are loading.');return false}return true}
async function reloadModules(){
  modulesReady=false;
  try{
    let documents=JSON.parse(JSON.stringify(moduleDefaults));const invoke=window.__TAURI__?.core?.invoke;
    if(invoke){const result=await invoke('load_modules');moduleDirectory=result.directory;moduleFiles=Object.fromEntries(result.files.map(file=>[file.kind,file.text]));for(const file of result.files){if(file.text!==null)documents[file.kind]=JSON.parse(file.text.replace(/^\uFEFF/,''));}}
    else {const saved=JSON.parse(localStorage.getItem(moduleStorageKey)||'null');if(saved)for(const kind of moduleKinds)if(saved[kind])documents[kind]=saved[kind];}
    installModuleDocuments(documents);
  }catch(error){moduleError=String(error);snippets.splice(0);meds.splice(0);calculators=[];$('#modulesNotice').textContent='Modules not loaded: '+moduleError+' — Tools > Manage modules';$('#modulesNotice').style.display='block';}
}
const moduleRemoteBackupKey='notepaeds_module_remote_backup_v1';
function moduleVersion(value){return /^\d+\.\d+\.\d+$/.test(String(value?.moduleVersion||''))?value.moduleVersion:'0.0.0'}
function compareModuleVersions(left,right){const a=String(left).split('.').map(Number),b=String(right).split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]-b[i]}return 0}
function moduleChangeSummary(current,next){
  const before=new Map((current?.entries||[]).map(e=>[e.id,e])),after=new Map((next?.entries||[]).map(e=>[e.id,e]));let added=0,changed=0,removed=0;
  for(const [id,value] of after){if(!before.has(id))added++;else if(JSON.stringify(before.get(id))!==JSON.stringify(value))changed++}
  for(const id of before.keys())if(!after.has(id))removed++;
  return [added+' added',changed+' changed',removed+' removed'].join(' · ');
}
async function fetchModuleUpdateFeed(address){
  if(!/^https:\/\/[^\s]+$/i.test(address))throw Error('Enter the HTTPS manifest address supplied for NotePaeds.');
  const invoke=window.__TAURI__?.core?.invoke;if(invoke)return invoke('fetch_module_updates',{manifestUrl:address});
  const get=async url=>{if(!/^https:\/\/[^\s]+$/i.test(url))throw Error('Every module update must use HTTPS.');const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Update server returned HTTP '+response.status+'.');const text=await response.text();if(text.length>2000000)throw Error('A module-update file is too large.');return text};
  const manifest=JSON.parse((await get(address)).replace(/^\uFEFF/,''));if(manifest.schemaVersion!==1||!Array.isArray(manifest.modules)||!manifest.modules.length||manifest.modules.length>3)throw Error('Invalid module-update manifest.');
  const seen=new Set(),modules=[];for(const item of manifest.modules){if(!moduleKinds.includes(item.kind)||seen.has(item.kind)||!/^\d+\.\d+\.\d+$/.test(item.version))throw Error('Invalid or duplicate module entry in update manifest.');seen.add(item.kind);const moduleUrl=new URL(item.url,address).href,text=await get(moduleUrl),value=validateModule(JSON.parse(text.replace(/^\uFEFF/,'')),item.kind);if(value.moduleVersion!==item.version)throw Error(item.kind+' version does not match the manifest.');modules.push({kind:item.kind,version:item.version,text})}
  return {publishedAt:manifest.publishedAt||'',modules};
}
async function checkModuleUpdates(silent=false){
  const address=String(prefs.moduleUpdateUrl||'').trim();if(!address){if(!silent)toast('Add the module update address in Settings first.');return}
  if(!modulesReady){if(!silent)toast('Wait for local modules to finish loading.');return}
  if(!silent)toast('Checking module updates…');
  try{
    const feed=await fetchModuleUpdateFeed(address),available=[];
    for(const remote of feed.modules){const value=validateModule(JSON.parse(remote.text.replace(/^\uFEFF/,'')),remote.kind),current=moduleDocuments[remote.kind];if(compareModuleVersions(remote.version,moduleVersion(current))>0)available.push({...remote,value,currentVersion:moduleVersion(current),summary:moduleChangeSummary(current,value)})}
    if(!available.length){if(!silent)toast('Your NotePaeds modules are up to date.');return}
    const html='<div class="tiny" style="margin-bottom:10px">'+esc(feed.publishedAt?'Published '+feed.publishedAt:'A reviewed module release is available.')+'</div>'+available.map((item,i)=>'<label class="module-editor-review" style="display:flex;margin:6px 0;padding:9px"><input type="checkbox" data-update-index="'+i+'" checked><span><b>'+esc({snippets:'Snippets',medications:'Medications',calculators:'Scoring'}[item.kind])+'</b><br><span class="tiny">'+esc(item.currentVersion)+' → '+esc(item.version)+' · '+esc(item.summary)+'</span></span></label>').join('')+'<div class="warn">Clinical content can change. Review the listed module versions before installation. The previous local files will be retained for rollback.</div><label class="module-editor-review"><input type="checkbox" id="remoteUpdateReviewed"> I reviewed these clinical module changes</label>';
    openDialog('Module updates available',html,[{label:'Later'},{label:'Install selected',primary:true,close:false}]);
    const buttons=$$('#dialogFoot .btn'),install=buttons[1];install.onclick=async()=>{try{if(!$('#remoteUpdateReviewed').checked)throw Error('Review the clinical changes before installing.');const selected=available.filter((_,i)=>$('[data-update-index="'+i+'"]').checked);if(!selected.length)throw Error('Select at least one module.');install.disabled=true;const invoke=window.__TAURI__?.core?.invoke;if(invoke){for(const item of selected){await invoke('save_module',{input:{kind:item.kind,text:JSON.stringify(item.value,null,2),expected:moduleFiles[item.kind]??null}})}}else{localStorage.setItem(moduleRemoteBackupKey,JSON.stringify(moduleDocuments));const next={...moduleDocuments};for(const item of selected)next[item.kind]=item.value;localStorage.setItem(moduleStorageKey,JSON.stringify(next))}prefs.lastModuleUpdate={at:new Date().toISOString(),kinds:selected.map(x=>x.kind)};savePrefs();await reloadModules();closeDialog();toast('Module update installed. Previous version retained for rollback.')}catch(error){toast(String(error));await reloadModules()}finally{install.disabled=false}};
  }catch(error){if(!silent)toast('Module update check failed: '+String(error));}
}
async function rollbackLastModuleUpdate(){
  const last=prefs.lastModuleUpdate;if(!last?.kinds?.length)return toast('No module update is available to roll back.');
  if(!confirm('Restore the module versions used before the last online update?'))return;
  try{const invoke=window.__TAURI__?.core?.invoke;if(invoke){for(const kind of last.kinds)await invoke('restore_module_backup',{kind})}else{const previous=JSON.parse(localStorage.getItem(moduleRemoteBackupKey)||'null');if(!previous)throw Error('No previous browser module set is available.');localStorage.setItem(moduleStorageKey,JSON.stringify(previous))}prefs.lastModuleUpdate=null;savePrefs();await reloadModules();closeDialog();toast('Previous module version restored.')}catch(error){toast('Rollback failed: '+String(error))}
}
function calculatorReference(def){
  if(!def)return 'This calculator module is not enabled.';
  if(def.kind==='risk-rule')return [def.title,def.eligibility,def.reference,...def.bands.map(b=>b.label+'\n'+b.fields.map(f=>f.label+' ['+f.risk+']').join('\n')+'\n'+Object.values(b.outcomes).join('\n')),def.source].join('\n\n');
  if(def.kind!=='score')return [def.title,def.note,def.source].filter(Boolean).join('\n\n');
  const parts=[def.title.toUpperCase(),def.note||''];
  for(const f of def.fields){parts.push(f.label.toUpperCase());if(f.context){for(const [band,options] of Object.entries(f.variants))parts.push(band+'\n'+options.map(o=>o.score+' point(s): '+o.label).join('\n'));}else parts.push(f.options.map(o=>o.score+' point(s): '+o.label).join('\n'));}
  parts.push('TOTAL: Sum of all component scores.','SEVERITY\n'+def.severity.map(s=>s.min+'–'+s.max+': '+s.label).join('\n'));
  if(def.source)parts.push('Source: '+def.source);return parts.join('\n\n');
}
function riskRuleResult(def,bandId,eligible,values){
  const band=def.bands.find(b=>b.id===bandId);if(!band||eligible!=='yes')return null;
  if(band.fields.some(f=>!['yes','no'].includes(values[f.id])))return null;
  const positive=band.fields.filter(f=>values[f.id]==='yes');
  const risk=positive.some(f=>f.risk==='high')?'high':positive.length?'intermediate':'low';
  return {risk,text:def.label+' ('+band.label+'): '+band.outcomes[risk],findings:positive.map(f=>f.label)};
}
function riskRuleCalculator(id){
  if(!modulesAvailable())return;const def=calculators.find(d=>d.id===id&&d.kind==='risk-rule');if(!def)return;
  const patientId=active().id;
  openDialog(def.title,'<div class="warn">'+esc(def.eligibility)+'</div><div class="field"><label for="ruleEligible">Eligibility assessed</label><select id="ruleEligible" class="select"><option value="">Choose…</option><option value="yes">Yes — eligibility checked, no exclusions</option><option value="no">No / uncertain — do not apply this rule</option></select></div><div class="field"><label for="ruleBand">Age group</label><select id="ruleBand" class="select"><option value="">Choose…</option>'+def.bands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.label)+'</option>').join('')+'</select></div><div id="ruleFindings"></div><div id="ruleResult" class="preview" data-score-tip="'+esc(def.id)+'" tabindex="0">Confirm eligibility and assess every finding.</div><details><summary>Rule reference / exclusions</summary><pre style="white-space:pre-wrap">'+esc(calculatorReference(def))+'</pre></details>',[{label:'Back',close:false,fn:calculatorPanel},{label:'Insert '+def.label,close:false,primary:true,fn:()=>{const r=result();if(!r)return;if(active().id!==patientId)return toast('Return to the original patient.');insertText(r.text);hideScoreTip();closeDialog()}}]);
  const result=()=>{const band=def.bands.find(b=>b.id===$('#ruleBand').value);return riskRuleResult(def,$('#ruleBand').value,$('#ruleEligible').value,Object.fromEntries((band?.fields||[]).map((f,i)=>[f.id,$('#ruleFinding'+i).value])))};
  const update=()=>{const r=result();$('#ruleResult').textContent=r?r.text:$('#ruleEligible').value==='no'?'Not applicable / uncertain. Use clinical assessment and the relevant pathway.':'Confirm eligibility and assess every finding.';$('#dialogFoot .primary').disabled=!r};
  $('#ruleBand').onchange=()=>{const band=def.bands.find(b=>b.id===$('#ruleBand').value);$('#ruleFindings').innerHTML=(band?.fields||[]).map((f,i)=>'<div class="field"><label for="ruleFinding'+i+'">'+esc(f.label)+'</label><select id="ruleFinding'+i+'" class="select"><option value="">Not yet assessed</option><option value="no">No</option><option value="yes">Yes</option></select></div>').join('');(band?.fields||[]).forEach((f,i)=>$('#ruleFinding'+i).onchange=update);update()};
  $('#ruleEligible').onchange=update;update();
}
function scoreModuleResult(def,values,contextValues={}){
  let total=0;
  for(const c of def.contexts||[])if(!c.options.includes(contextValues[c.id]))return null;
  for(const f of def.fields){const list=f.context?f.variants[contextValues[f.context]]:f.options,choice=values[f.id];if(choice===''||choice==null||!Number.isInteger(Number(choice))||!list||!list[Number(choice)])return null;total+=list[Number(choice)].score;}
  const band=def.severity.find(s=>total>=s.min&&total<=s.max);if(!band)return null;
  return {total,severity:band.label,text:def.label+': '+total};
}
function scoreCalculator(id){
  if(!modulesAvailable())return;const def=calculators.find(d=>d.id===id&&d.kind==='score');if(!def)return;
  const patientId=active().id;
  const html='<div class="tiny" style="margin-bottom:10px">'+esc(def.note||'Select every assessed component.')+'</div>'+(def.contexts||[]).map((c,i)=>'<div class="field"><label for="scoreContext'+i+'">'+esc(c.label)+'</label><select class="select" id="scoreContext'+i+'"><option value="">Choose…</option>'+c.options.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></div>').join('')+def.fields.map((f,i)=>'<div class="field"><label for="scoreField'+i+'">'+esc(f.label)+'</label><select class="select" id="scoreField'+i+'"></select></div>').join('')+'<div id="moduleScoreResult" class="preview" data-score-tip="'+esc(def.id)+'" tabindex="0">Complete all assessed components.</div><details><summary>Scoring reference</summary><pre style="white-space:pre-wrap">'+esc(calculatorReference(def))+'</pre></details>';
  const contexts=()=>Object.fromEntries((def.contexts||[]).map((c,i)=>[c.id,$('#scoreContext'+i).value]));
  const result=()=>scoreModuleResult(def,Object.fromEntries(def.fields.map((f,i)=>[f.id,$('#scoreField'+i).value])),contexts());
  openDialog(def.title,html,[{label:'Back',close:false,fn:calculatorPanel},{label:'Insert '+def.label,primary:true,close:false,fn:()=>{if(active().id!==patientId)return toast('Return to the original patient.');const r=result();if(!r)return;insertText(r.text);hideScoreTip();closeDialog()}}]);
  const update=()=>{const r=result();$('#moduleScoreResult').textContent=r?r.text+' ('+r.severity+')':'Complete all assessed components.'};
  const fill=(f,i)=>{const list=f.context?f.variants[contexts()[f.context]]:f.options;const select=$('#scoreField'+i);select.innerHTML='<option value="">Select assessed finding…</option>'+(list||[]).map((o,j)=>'<option value="'+j+'">'+o.score+' — '+esc(o.label)+'</option>').join('');select.disabled=!list;};
  def.fields.forEach((f,i)=>{fill(f,i);$('#scoreField'+i).onchange=update});
  (def.contexts||[]).forEach((c,i)=>$('#scoreContext'+i).onchange=()=>{def.fields.forEach((f,j)=>{if(f.context===c.id)fill(f,j)});update()});
}
function formulaModuleResult(def,values){
  const numbers={};for(const f of def.inputs){const value=values[f.id];if(value==null||String(value).trim()===''||!Number.isFinite(Number(value)))throw Error('Complete all inputs.');const n=Number(value);if((f.min!==undefined&&n<f.min)||(f.max!==undefined&&n>f.max))throw Error('Check the allowed range for '+f.label+'.');numbers[f.id]=n;}
  const expression=def.expression.replace(/[A-Za-z][A-Za-z0-9_]*/g,name=>{if(!Object.hasOwn(numbers,name))throw Error('Unknown formula input.');return '('+numbers[name]+')'});
  const value=arithmetic(expression);return def.outputLabel+': '+Number(value.toFixed(def.decimals??2))+(def.unit?' '+def.unit:'');
}
function formulaCalculator(id){
  if(!modulesAvailable())return;const def=calculators.find(d=>d.id===id&&d.kind==='formula');if(!def)return;
  const patientId=active().id;
  const result=()=>formulaModuleResult(def,Object.fromEntries(def.inputs.map((f,i)=>[f.id,$('#formulaInput'+i).value])));
  openDialog(def.title,'<div class="tiny">'+esc(def.note||'')+'</div>'+def.inputs.map((f,i)=>'<div class="field"><label for="formulaInput'+i+'">'+esc(f.label+(f.unit?' ('+f.unit+')':''))+'</label><input class="input" type="number" step="any" id="formulaInput'+i+'"></div>').join('')+'<div class="preview" id="formulaResult">Complete all inputs.</div><div class="tiny">'+esc(def.source||'')+'</div>',[{label:'Back',close:false,fn:calculatorPanel},{label:'Insert result',primary:true,close:false,fn:()=>{try{if(active().id!==patientId)throw Error('Return to the original patient.');insertText(result());closeDialog()}catch(e){$('#formulaResult').textContent=e.message}}}]);
  def.inputs.forEach((f,i)=>$('#formulaInput'+i).oninput=()=>{try{$('#formulaResult').textContent=result()}catch(e){$('#formulaResult').textContent=e.message}});
}
const moduleMedicationFields=[['name','Name'],['text','Inserted text'],['type','Type'],['orderPrefix','Order prefix'],['otherName','Other name'],['route','Route'],['category','Category'],['indication','Indication'],['targetAge','Target age'],['formulations','Formulations / strengths'],['dose','Dose per kg or regimen'],['maxSingle','Maximum single dose'],['maxDaily','Maximum daily dose'],['toxicLimit','Toxic limit'],['duration','Duration'],['administration','Administration'],['weightBands','Weight-band dosing'],['organRisk','Organ risks'],['warnings','Warnings'],['emergency','Emergency toxicity management'],['revision','Revision'],['frequency','Frequency']];
function moduleIdBase(value){return String(value||'entry').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'entry'}
function moduleUniqueId(entries,base,except){let root=moduleIdBase(base),id=root,n=2;while(entries.some(e=>e!==except&&e.id===id))id=root+'_'+n++;return id}
function moduleLines(list,shape){return (list||[]).map(shape).join('\n')}
function moduleParseLines(text,parser){return String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(parser)}
function moduleInput(label,key,value,wide=false,type='text'){return '<div class="field'+(wide?' wide':'')+'"><label>'+esc(label)+'</label><input class="input" type="'+type+'" data-module-key="'+esc(key)+'" value="'+esc(value??'')+'"></div>'}
function moduleArea(label,key,value,wide=true,help=''){return '<div class="field'+(wide?' wide':'')+'"><label>'+esc(label)+'</label><textarea class="area" data-module-key="'+esc(key)+'">'+esc(value??'')+'</textarea>'+(help?'<div class="tiny">'+esc(help)+'</div>':'')+'</div>'}
function moduleCommonForm(e){return '<div class="module-editor-grid">'+moduleInput('Stable ID','id',e.id)+moduleInput('Title','title',e.title||e.name||'')+'</div><label class="module-editor-check"><input type="checkbox" data-module-enabled '+(e.enabled===false?'':'checked')+'> Show this entry in NotePaeds</label>'}
function moduleNewEntry(kind,entries){
  if(kind==='snippets')return{id:moduleUniqueId(entries,'new_snippet'),title:'New snippet',group:'My snippets',desc:'',text:'',enabled:true};
  if(kind==='medications')return{id:moduleUniqueId(entries,'new_medication'),name:'New medication',text:'',enabled:true,calcPerKg:null,frequency:''};
  return{id:moduleUniqueId(entries,'new_score'),kind:'score',title:'New score',label:'SCORE',enabled:true,fields:[{id:'finding',label:'Finding',options:[{label:'Not present',score:0},{label:'Present',score:1}]}],severity:[{min:0,max:0,label:'0'},{min:1,max:1,label:'1'}]};
}
function moduleManager(){
  const native=!!window.__TAURI__?.core?.invoke,state={kind:'snippets',docs:JSON.parse(JSON.stringify(moduleDocuments)),selected:{},dirty:new Set(),search:''};
  for(const kind of moduleKinds)state.selected[kind]=state.docs[kind].entries[0]?.id||null;
  openDialog('Manage modules','<div class="module-editor-shell"><div class="module-editor-tabs">'+moduleKinds.map(k=>'<button class="module-editor-tab" data-module-tab="'+k+'">'+({snippets:'Snippets',medications:'Medications',calculators:'Scoring'}[k])+'<span data-dirty-tab="'+k+'"></span></button>').join('')+'</div><div class="module-editor-tools"><input id="moduleSearch" class="search" placeholder="Search this list"><button class="btn" id="moduleAdd">Add</button><button class="btn" id="moduleImportButton">Import</button><input hidden type="file" accept=".json,application/json" id="moduleImport"><button class="btn" id="moduleExport">Export</button><button class="btn" id="moduleReload">Reload</button><span class="tiny module-editor-location">'+esc(native?(moduleDirectory||'modules folder'):'Saved in this browser')+'</span></div><div class="module-editor-main"><div class="module-editor-list" id="moduleEntryList"></div><div class="module-editor-form" id="moduleEntryForm"></div></div><div class="module-editor-status" id="moduleStatus" aria-live="polite"></div></div>',[{label:'Close',close:false},{label:'Validate & save',primary:true,close:false}]);
  $('#dialog').classList.add('module-editor-dialog');
  const status=(message='',error=false)=>{const n=$('#moduleStatus');if(n){n.textContent=message;n.classList.toggle('error',error)}};
  const markDirty=()=>{state.dirty.add(state.kind);$('#moduleReviewed').checked=false;renderTabs();status('Unsaved changes. Review and save when ready.')};
  const entries=()=>state.docs[state.kind].entries;
  const current=()=>entries().find(e=>e.id===state.selected[state.kind]);
  function renderTabs(){for(const b of $$('[data-module-tab]')){const k=b.dataset.moduleTab;b.classList.toggle('active',k===state.kind);const d=b.querySelector('[data-dirty-tab]');d.textContent=state.dirty.has(k)?' •':''}}
  function renderList(){const q=state.search.trim().toLowerCase(),list=entries().filter(e=>!q||JSON.stringify(e).toLowerCase().includes(q));$('#moduleEntryList').innerHTML=list.map(e=>'<button class="module-editor-item '+(e.id===state.selected[state.kind]?'active ':'')+(e.enabled===false?'disabled':'')+'" data-module-id="'+esc(e.id)+'"><strong>'+esc(e.title||e.name||e.label||e.id)+'</strong><span>'+esc(state.kind==='snippets'?(e.group||'No group'):state.kind==='medications'?([e.route,e.category].filter(Boolean).join(' · ')||e.id):((e.kind||'score')+' · '+e.id))+'</span></button>').join('')||'<div class="module-editor-empty">No matching entries.</div>';for(const b of $$('[data-module-id]'))b.onclick=()=>{state.selected[state.kind]=b.dataset.moduleId;renderList();renderForm()}}
  function basicForm(e){
    if(state.kind==='snippets')return moduleCommonForm(e)+'<div class="module-editor-grid">'+moduleInput('Group','group',e.group)+moduleInput('Description','desc',e.desc)+moduleArea('Snippet text','text',e.text,true)+'</div>';
    if(state.kind==='medications')return moduleCommonForm(e)+'<div class="module-editor-grid">'+moduleMedicationFields.filter(([k])=>!['name','text'].includes(k)).map(([k,l])=>(['administration','weightBands','organRisk','warnings','emergency'].includes(k)?moduleArea(l,k,e[k]):moduleInput(l,k,e[k]))).join('')+moduleInput('Automatic mg/kg/dose','calcPerKg',e.calcPerKg??'',false,'number')+moduleArea('Inserted text','text',e.text,true)+'</div>';
    return calculatorForm(e);
  }
  function calculatorForm(e){
    let html='<div class="module-editor-grid">'+moduleInput('Stable ID','id',e.id)+moduleInput('Title','title',e.title)+'</div><label class="module-editor-check"><input type="checkbox" data-module-enabled '+(e.enabled===false?'':'checked')+'> Show this tool in NotePaeds</label><div class="field"><label>Calculator type</label><select class="select" id="moduleCalculatorKind">'+['arithmetic','score','formula','risk-rule'].map(k=>'<option '+(e.kind===k?'selected':'')+' value="'+k+'">'+k+'</option>').join('')+'</select></div>';
    if(e.kind==='arithmetic')return html+'<div class="tiny">The built-in arithmetic calculator has no editable scoring rules.</div>';
    html+='<div class="module-editor-grid">'+moduleArea('Clinical note','note',e.note||'',true)+moduleInput('Source','source',e.source||'')+moduleInput('HTTPS source link','sourceUrl',e.sourceUrl||'')+'</div>';
    if(e.kind==='formula'){
      html+='<div class="module-editor-grid">'+moduleInput('Output label','outputLabel',e.outputLabel)+moduleInput('Output unit','unit',e.unit||'')+moduleInput('Decimal places','decimals',e.decimals??2,false,'number')+moduleArea('Formula expression','expression',e.expression||'',true)+'</div><details class="module-editor-section" open><summary>Inputs</summary><div class="module-editor-sectionbody"><div class="module-editor-repeater">'+(e.inputs||[]).map((f,i)=>'<div class="module-editor-block" data-input-index="'+i+'"><div class="module-editor-blockhead">Input '+(i+1)+'<button class="btn" data-remove-input="'+i+'">Remove</button></div><div class="module-editor-grid">'+moduleInput('Variable ID','input.id',f.id)+moduleInput('Label','input.label',f.label)+moduleInput('Unit','input.unit',f.unit||'')+moduleInput('Minimum','input.min',f.min??'',false,'number')+moduleInput('Maximum','input.max',f.max??'',false,'number')+'</div></div>').join('')+'</div><button class="btn module-editor-actions" id="moduleAddInput">Add input</button></div></details>';
    }else if(e.kind==='score'){
      html+='<div class="module-editor-grid">'+moduleInput('Inserted score label','label',e.label)+'</div><details class="module-editor-section" open><summary>Age or context groups</summary><div class="module-editor-sectionbody"><div class="module-editor-repeater">'+(e.contexts||[]).map((c,i)=>'<div class="module-editor-block" data-context-index="'+i+'"><div class="module-editor-blockhead">Context '+(i+1)+'<button class="btn" data-remove-context="'+i+'">Remove</button></div><div class="module-editor-grid">'+moduleInput('ID','context.id',c.id)+moduleInput('Label','context.label',c.label)+moduleArea('Choices — one per line','context.options',(c.options||[]).join('\n'),true)+'</div></div>').join('')+'</div><button class="btn module-editor-actions" id="moduleAddContext">Add context</button></div></details>';
      html+='<details class="module-editor-section" open><summary>Scored components</summary><div class="module-editor-sectionbody"><div class="module-editor-repeater">'+(e.fields||[]).map((f,i)=>scoreFieldForm(e,f,i)).join('')+'</div><button class="btn module-editor-actions" id="moduleAddField">Add component</button></div></details>'+moduleArea('Result bands — min | max | label','severityText',moduleLines(e.severity,b=>b.min+' | '+b.max+' | '+b.label),true,'Ranges must cover every possible total without gaps or overlaps.')+scoreEditorPreview(e);
    }else{
      html+='<div class="module-editor-grid">'+moduleInput('Inserted rule label','label',e.label)+moduleArea('Eligibility statement','eligibility',e.eligibility||'',true)+moduleArea('Reference shown to clinician','reference',e.reference||'',true)+'</div><details class="module-editor-section" open><summary>Age bands and findings</summary><div class="module-editor-sectionbody"><div class="module-editor-repeater">'+(e.bands||[]).map((b,i)=>riskBandForm(b,i)).join('')+'</div><button class="btn module-editor-actions" id="moduleAddBand">Add age band</button></div></details>';
    }
    return html;
  }
  function scoreFieldForm(e,f,i){const contexts=e.contexts||[],context=contexts.find(c=>c.id===f.context),lists=context?(context.options||[]).map(option=>'<div class="field wide"><label>'+esc(option)+' — score | label</label><textarea class="area module-editor-lines" data-variant-option="'+esc(option)+'">'+esc(moduleLines(f.variants?.[option],o=>o.score+' | '+o.label))+'</textarea></div>').join(''):moduleArea('Options — score | label','field.options',moduleLines(f.options,o=>o.score+' | '+o.label),true);return '<div class="module-editor-block" data-field-index="'+i+'"><div class="module-editor-blockhead">Component '+(i+1)+'<button class="btn" data-remove-field="'+i+'">Remove</button></div><div class="module-editor-grid">'+moduleInput('ID','field.id',f.id)+moduleInput('Label','field.label',f.label)+'<div class="field wide"><label>Uses context</label><select class="select" data-field-context><option value="">None</option>'+contexts.map(c=>'<option value="'+esc(c.id)+'" '+(f.context===c.id?'selected':'')+'>'+esc(c.label)+'</option>').join('')+'</select></div>'+lists+'</div></div>'}
  function scoreEditorPreview(e){return '<details class="module-editor-section"><summary>Preview current score</summary><div class="module-editor-sectionbody">'+(e.contexts||[]).map((c,i)=>'<div class="field"><label>'+esc(c.label)+'</label><select class="select" data-preview-context="'+i+'"><option value="">Choose…</option>'+c.options.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></div>').join('')+(e.fields||[]).map((f,i)=>'<div class="field"><label>'+esc(f.label)+'</label><select class="select" data-preview-field="'+i+'"><option value="">Choose…</option></select></div>').join('')+'<div class="preview" id="moduleScorePreview">Complete all components to preview the result.</div></div></details>'}
  function riskBandForm(b,i){return '<div class="module-editor-block" data-band-index="'+i+'"><div class="module-editor-blockhead">Band '+(i+1)+'<button class="btn" data-remove-band="'+i+'">Remove</button></div><div class="module-editor-grid">'+moduleInput('ID','band.id',b.id)+moduleInput('Label','band.label',b.label)+moduleArea('Findings — risk | id | label','band.fields',moduleLines(b.fields,f=>f.risk+' | '+f.id+' | '+f.label),true,'Risk must be high or intermediate.')+moduleArea('High-risk outcome','band.high',b.outcomes?.high||'',true)+moduleArea('Intermediate-risk outcome','band.intermediate',b.outcomes?.intermediate||'',true)+moduleArea('Low-risk outcome','band.low',b.outcomes?.low||'',true)+'</div></div>'}
  function renderForm(){const e=current();if(!e){$('#moduleEntryForm').innerHTML='<div class="module-editor-empty">Choose an entry or add a new one.</div>';return}$('#moduleEntryForm').innerHTML='<div class="module-editor-formhead"><h3>'+esc(e.title||e.name||'Entry')+'</h3><div class="row"><button class="btn" id="moduleDuplicate">Duplicate</button><button class="btn" id="moduleRevertEntry">Revert</button><button class="btn danger" id="moduleDelete">Delete</button></div></div>'+basicForm(e)+'<details class="module-editor-section"><summary>Advanced JSON for this entry</summary><div class="module-editor-sectionbody"><textarea id="moduleEntryJson" class="area" spellcheck="false">'+esc(JSON.stringify(e,null,2))+'</textarea><button class="btn module-editor-actions" id="moduleApplyEntryJson">Apply JSON to form</button></div></details>';bindForm(e)}
  function setKey(e,key,value){if(key==='title'&&state.kind==='medications')e.name=value;else if(key==='sourceUrl'&&!value)delete e[key];else e[key]=value}
  function scoreOptions(value){return moduleParseLines(value,line=>{const p=line.split('|');if(p.length<2)throw Error('Use score | label on every option line.');return{score:Number(p.shift().trim()),label:p.join('|').trim()}})}
  function bindForm(e){
    for(const n of $$('[data-module-key]'))n.oninput=()=>{let value=n.value;if(n.type==='number')value=value===''?undefined:Number(value);setKey(e,n.dataset.moduleKey,value);if(n.dataset.moduleKey==='title'){$('#moduleEntryForm h3').textContent=value;renderList()}markDirty()};
    $('[data-module-enabled]').onchange=n=>{};$('[data-module-enabled]').onchange=ev=>{e.enabled=ev.target.checked;markDirty();renderList()};
    $('#moduleCalculatorKind')?.addEventListener('change',ev=>{const kind=ev.target.value,id=e.id,title=e.title,enabled=e.enabled!==false;Object.keys(e).forEach(k=>delete e[k]);Object.assign(e,moduleNewEntry('calculators',entries()),{id,title,enabled,kind});if(kind==='arithmetic')Object.assign(e,{kind:'arithmetic'});if(kind==='formula')Object.assign(e,{kind,title,outputLabel:'Result',inputs:[{id:'value',label:'Value'}],expression:'value',decimals:2});if(kind==='risk-rule')Object.assign(e,{kind,label:'RULE',eligibility:'',reference:'',bands:[{id:'band',label:'Age band',fields:[{id:'finding',label:'Finding',risk:'intermediate'}],outcomes:{high:'',intermediate:'',low:''}}]});markDirty();renderForm()});
    if(state.kind==='calculators'&&e.kind==='score')bindScore(e);if(state.kind==='calculators'&&e.kind==='formula')bindFormula(e);if(state.kind==='calculators'&&e.kind==='risk-rule')bindRisk(e);
    $('#moduleDuplicate').onclick=()=>{const copy=JSON.parse(JSON.stringify(e));copy.id=moduleUniqueId(entries(),e.id+'_copy');copy.title=(e.title||e.name||'Entry')+' copy';if(state.kind==='medications')copy.name=copy.title;entries().push(copy);state.selected[state.kind]=copy.id;markDirty();renderList();renderForm()};
    $('#moduleRevertEntry').onclick=()=>{const original=moduleDocuments[state.kind].entries.find(x=>x.id===e.id);if(!original)return status('This new entry has no saved version.');Object.assign(e,JSON.parse(JSON.stringify(original)));for(const key of Object.keys(e))if(!(key in original))delete e[key];markDirty();renderList();renderForm();status('Entry restored to its last saved version.')};
    $('#moduleDelete').onclick=()=>{if(!confirm('Remove this entry? The change is not permanent until you save.'))return;const i=entries().indexOf(e);entries().splice(i,1);state.selected[state.kind]=entries()[Math.min(i,entries().length-1)]?.id||null;markDirty();renderList();renderForm()};
    $('#moduleApplyEntryJson').onclick=()=>{try{const value=JSON.parse($('#moduleEntryJson').value);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected one entry object.');const i=entries().indexOf(e);entries()[i]=value;state.selected[state.kind]=value.id;markDirty();renderList();renderForm();status('Advanced JSON applied to this draft.')}catch(error){status(String(error),true)}};
  }
  function bindScore(e){
    for(const block of $$('[data-context-index]')){const c=e.contexts[Number(block.dataset.contextIndex)];for(const n of block.querySelectorAll('[data-module-key]'))n.oninput=()=>{const key=n.dataset.moduleKey.split('.')[1];c[key]=key==='options'?moduleParseLines(n.value,x=>x):n.value;markDirty()}}
    for(const block of $$('[data-field-index]')){const f=e.fields[Number(block.dataset.fieldIndex)];for(const n of block.querySelectorAll('[data-module-key]'))n.oninput=()=>{const key=n.dataset.moduleKey.split('.')[1];try{f[key]=key==='options'?scoreOptions(n.value):n.value;markDirty();status()}catch(error){status(String(error),true)}};block.querySelector('[data-field-context]').onchange=ev=>{const context=e.contexts?.find(c=>c.id===ev.target.value);if(context){f.context=context.id;f.variants=Object.fromEntries(context.options.map(x=>[x,[{label:'Option',score:0}]]));delete f.options}else{delete f.context;delete f.variants;f.options=[{label:'Option',score:0}]}markDirty();renderForm()};for(const n of block.querySelectorAll('[data-variant-option]'))n.oninput=()=>{try{f.variants[n.dataset.variantOption]=scoreOptions(n.value);markDirty();status()}catch(error){status(String(error),true)}}}
    $('#moduleAddContext').onclick=()=>{(e.contexts??=[]).push({id:moduleUniqueId(e.contexts,'context'),label:'Context',options:['Choice']});markDirty();renderForm()};$$('[data-remove-context]').forEach(b=>b.onclick=()=>{const c=e.contexts.splice(Number(b.dataset.removeContext),1)[0];for(const f of e.fields)if(f.context===c.id){delete f.context;delete f.variants;f.options=[{label:'Option',score:0}]}markDirty();renderForm()});
    $('#moduleAddField').onclick=()=>{e.fields.push({id:moduleUniqueId(e.fields,'field'),label:'Finding',options:[{label:'Not present',score:0},{label:'Present',score:1}]});markDirty();renderForm()};$$('[data-remove-field]').forEach(b=>b.onclick=()=>{e.fields.splice(Number(b.dataset.removeField),1);markDirty();renderForm()});
    $('[data-module-key="severityText"]').oninput=ev=>{try{e.severity=moduleParseLines(ev.target.value,line=>{const p=line.split('|');if(p.length<3)throw Error('Use min | max | label on every result line.');return{min:Number(p.shift().trim()),max:Number(p.shift().trim()),label:p.join('|').trim()}});markDirty();status()}catch(error){status(String(error),true)}};bindScorePreview(e);
  }
  function bindScorePreview(e){const contextValues=()=>Object.fromEntries((e.contexts||[]).map((c,i)=>[c.id,$('[data-preview-context="'+i+'"]').value]));const fill=()=>{const contexts=contextValues();for(const [i,f] of e.fields.entries()){const select=$('[data-preview-field="'+i+'"]'),list=f.context?f.variants?.[contexts[f.context]]:f.options;select.innerHTML='<option value="">Choose…</option>'+((list||[]).map((o,j)=>'<option value="'+j+'">'+esc(o.label)+' ('+o.score+')</option>').join(''));select.value=''}update()};const update=()=>{try{const result=scoreModuleResult(e,Object.fromEntries(e.fields.map((f,i)=>[f.id,$('[data-preview-field="'+i+'"]').value])),contextValues());$('#moduleScorePreview').textContent=result?result.text+' ('+result.severity+')':'Complete all components to preview the result.'}catch(error){$('#moduleScorePreview').textContent=String(error)}};(e.contexts||[]).forEach((c,i)=>$('[data-preview-context="'+i+'"]').onchange=fill);e.fields.forEach((f,i)=>$('[data-preview-field="'+i+'"]').onchange=update);fill()}
  function bindFormula(e){for(const block of $$('[data-input-index]')){const f=e.inputs[Number(block.dataset.inputIndex)];for(const n of block.querySelectorAll('[data-module-key]'))n.oninput=()=>{const key=n.dataset.moduleKey.split('.')[1],value=n.type==='number'?(n.value===''?undefined:Number(n.value)):n.value;if(value===undefined)delete f[key];else f[key]=value;markDirty()}}$('#moduleAddInput').onclick=()=>{e.inputs.push({id:moduleUniqueId(e.inputs,'value'),label:'Value'});markDirty();renderForm()};$$('[data-remove-input]').forEach(b=>b.onclick=()=>{e.inputs.splice(Number(b.dataset.removeInput),1);markDirty();renderForm()})}
  function bindRisk(e){for(const block of $$('[data-band-index]')){const b=e.bands[Number(block.dataset.bandIndex)];for(const n of block.querySelectorAll('[data-module-key]'))n.oninput=()=>{const key=n.dataset.moduleKey.split('.')[1];try{if(key==='fields')b.fields=moduleParseLines(n.value,line=>{const p=line.split('|');if(p.length<3)throw Error('Use risk | id | label on every finding line.');return{risk:p.shift().trim(),id:p.shift().trim(),label:p.join('|').trim()}});else if(['high','intermediate','low'].includes(key))(b.outcomes??={})[key]=n.value;else b[key]=n.value;markDirty();status()}catch(error){status(String(error),true)}}}$('#moduleAddBand').onclick=()=>{e.bands.push({id:moduleUniqueId(e.bands,'band'),label:'Age band',fields:[{id:'finding',label:'Finding',risk:'intermediate'}],outcomes:{high:'',intermediate:'',low:''}});markDirty();renderForm()};$$('[data-remove-band]').forEach(b=>b.onclick=()=>{e.bands.splice(Number(b.dataset.removeBand),1);markDirty();renderForm()})}
  function guardedClose(){if(state.dirty.size&&!confirm('Discard all unsaved module changes?'))return;$('#dialog').classList.remove('module-editor-dialog');closeDialog()}
  $$('[data-module-tab]').forEach(b=>b.onclick=()=>{state.kind=b.dataset.moduleTab;state.search='';$('#moduleSearch').value='';renderTabs();renderList();renderForm();status(state.dirty.has(state.kind)?'Unsaved changes in this module.':'')});
  $('#moduleSearch').oninput=e=>{state.search=e.target.value;renderList()};$('#moduleAdd').onclick=()=>{const e=moduleNewEntry(state.kind,entries());entries().push(e);state.selected[state.kind]=e.id;markDirty();renderList();renderForm()};
  $('#moduleImportButton').onclick=()=>$('#moduleImport').click();$('#moduleImport').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Module is too large.');const value=validateModule(JSON.parse((await file.text()).replace(/^\uFEFF/,'')),state.kind);state.docs[state.kind]=value;state.selected[state.kind]=value.entries[0]?.id||null;markDirty();renderList();renderForm();status('Imported for review. Save to apply.')}catch(error){status(String(error),true)}finally{ev.target.value=''}};
  $('#moduleExport').onclick=()=>{try{const value=validateModule(state.docs[state.kind],state.kind),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=state.kind+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){status(String(error),true)}};
  $('#moduleReload').onclick=async()=>{if(state.dirty.size&&!confirm('Discard unsaved changes and reload the module files?'))return;await reloadModules();state.docs=JSON.parse(JSON.stringify(moduleDocuments));state.dirty.clear();for(const k of moduleKinds)state.selected[k]=state.docs[k].entries[0]?.id||null;renderTabs();renderList();renderForm();status(moduleError||'Files reloaded.',!!moduleError)};
  $('#dialogFoot').insertAdjacentHTML('afterbegin','<label class="module-editor-review"><input type="checkbox" id="moduleReviewed"> I reviewed these clinical changes</label>');const footButtons=$$('#dialogFoot .btn');footButtons[0].onclick=guardedClose;footButtons[1].onclick=async()=>{const kind=state.kind,button=footButtons[1];try{if(!$('#moduleReviewed').checked)throw Error('Review the clinical changes before saving.');const value=validateModule(state.docs[kind],kind),next={...moduleDocuments,[kind]:value};for(const k of moduleKinds)validateModule(next[k],k);button.disabled=true;if(native){const text=JSON.stringify(value,null,2);await window.__TAURI__.core.invoke('save_module',{input:{kind,text,expected:moduleFiles[kind]??null}});moduleFiles[kind]=text;await reloadModules()}else{localStorage.setItem(moduleStorageKey,JSON.stringify(next));installModuleDocuments(next)}if(prefs.lastModuleUpdate?.kinds?.includes(kind)){prefs.lastModuleUpdate=null;savePrefs()}state.docs[kind]=JSON.parse(JSON.stringify(moduleDocuments[kind]));state.dirty.delete(kind);$('#moduleReviewed').checked=false;renderTabs();renderList();renderForm();status(moduleError?'Saved, but another module needs attention: '+moduleError:'Saved and loaded. No rebuild needed.',!!moduleError)}catch(error){status(String(error),true)}finally{button.disabled=false}};
  const closeX=$('#dialog .closex'),oldClose=closeX.onclick,oldOverlay=$('#overlay').onclick;closeX.onclick=guardedClose;$('#overlay').onclick=guardedClose;$('#dialog').addEventListener('transitionend',()=>{closeX.onclick=oldClose;$('#overlay').onclick=oldOverlay},{once:true});
  renderTabs();renderList();renderForm();status(moduleError,!!moduleError);
}
const modulesButton=document.createElement('button');modulesButton.className='menuitem';modulesButton.textContent='Manage modules';modulesButton.id='manageModules';modulesButton.onclick=()=>{closeMenus();moduleManager()};$('#generateMenuButton').parentElement.appendChild(modulesButton);
function exportClinicalLibrary(){
  const payload={app:'NotePaeds',format:'clinical-library',version:9,exportedAt:new Date().toISOString(),modules:moduleDocuments,customSnippets:prefs.customSnippets||[]};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='NotePaeds-Clinical-Library-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Clinical library exported.');
}
async function importClinicalLibraryFile(file){
  try{
    const payload=JSON.parse(await file.text());if(payload?.app!=='NotePaeds'||payload?.format!=='clinical-library'||!payload.modules)throw Error('This is not a NotePaeds clinical library export.');
    const next={};for(const kind of moduleKinds)next[kind]=validateModule(payload.modules[kind],kind);
    if(!confirm('Import '+next.snippets.entries.length+' snippets, '+next.medications.entries.length+' medication entries and '+next.calculators.entries.length+' scoring/calculator entries? Current module files will be retained as backups.'))return;
    const invoke=window.__TAURI__?.core?.invoke;if(invoke){for(const kind of moduleKinds)await invoke('save_module',{input:{kind,text:JSON.stringify(next[kind],null,2),expected:moduleFiles[kind]??null}});await reloadModules()}else{localStorage.setItem(moduleRemoteBackupKey,JSON.stringify(moduleDocuments));localStorage.setItem(moduleStorageKey,JSON.stringify(next));installModuleDocuments(next)}
    if(Array.isArray(payload.customSnippets)){prefs.customSnippets=payload.customSnippets;savePrefs()}toast('Clinical library imported and loaded.');
  }catch(error){toast('Import failed: '+String(error?.message||error))}
}
const libraryExportButton=document.createElement('button');libraryExportButton.className='menuitem';libraryExportButton.textContent='Export clinical library';libraryExportButton.onclick=()=>{closeMenus();exportClinicalLibrary()};
const libraryImportButton=document.createElement('button');libraryImportButton.className='menuitem';libraryImportButton.textContent='Import clinical library';
const libraryImportInput=document.createElement('input');libraryImportInput.type='file';libraryImportInput.accept='.json,application/json';libraryImportInput.hidden=true;libraryImportInput.onchange=()=>{const file=libraryImportInput.files?.[0];if(file)importClinicalLibraryFile(file);libraryImportInput.value=''};
libraryImportButton.onclick=()=>{closeMenus();libraryImportInput.click()};document.body.appendChild(libraryImportInput);modulesButton.after(libraryImportButton);modulesButton.after(libraryExportButton);
const moduleUpdatesButton=document.createElement('button');moduleUpdatesButton.className='menuitem';moduleUpdatesButton.textContent='Check module updates';moduleUpdatesButton.id='checkModules';moduleUpdatesButton.onclick=()=>{closeMenus();checkModuleUpdates(false)};$('#generateMenuButton').parentElement.appendChild(moduleUpdatesButton);
const modulesNotice=document.createElement('div');modulesNotice.id='modulesNotice';modulesNotice.className='warn';modulesNotice.style.cssText='display:none;margin:0;border-radius:0;';$('.workspace').before(modulesNotice);
reloadModules().then(()=>{if(prefs.moduleAutoCheck&&prefs.moduleUpdateUrl)setTimeout(()=>checkModuleUpdates(true),1200)});
