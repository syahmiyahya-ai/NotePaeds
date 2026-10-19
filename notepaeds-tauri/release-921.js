// 9.2.1: cursor-local commands and tracked plain-text regimens.
const inlineEditor=$('#editor');
const inlinePanel=document.createElement('div');inlinePanel.className='inline-popover';inlinePanel.id='inlinePanel';inlinePanel.hidden=true;document.body.appendChild(inlinePanel);
const noteMirror=document.createElement('div');noteMirror.className='inline-note-mirror';noteMirror.setAttribute('aria-hidden','true');noteMirror.hidden=true;inlineEditor.before(noteMirror);
let inlineSession=null,inlineList=null,inlineScoreTarget=null,manualEditTimer=null,inlineComposing=false;
const inlineDismissed=new WeakMap();
function inlineTarget(start=inlineEditor.selectionStart,end=inlineEditor.selectionEnd){return {patientId:active().id,snapshot:active().text,start,text:active().text.slice(start,end)}}
function validInlineTarget(t){return t&&active().id===t.patientId&&active().text===t.snapshot&&t.start>=0&&active().text.slice(t.start,t.start+t.text.length)===t.text}
function closeInline(){inlinePanel.hidden=true;inlinePanel.innerHTML='';inlineSession=null;inlineList=null}
function positionInline(position=inlineEditor.selectionStart){
  const style=getComputedStyle(inlineEditor),rect=inlineEditor.getBoundingClientRect(),m=document.createElement('div');
  m.style.cssText='position:fixed;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:border-box;';
  for(const key of ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','tabSize','wordSpacing'])m.style[key]=style[key];
  m.style.width=inlineEditor.clientWidth+'px';m.style.left=(rect.left-inlineEditor.scrollLeft)+'px';m.style.top=(rect.top-inlineEditor.scrollTop)+'px';
  m.textContent=inlineEditor.value.slice(0,position);const marker=document.createElement('span');marker.textContent='\u200b';m.appendChild(marker);document.body.appendChild(m);const caret=marker.getBoundingClientRect();m.remove();
  inlinePanel.hidden=false;const box=inlinePanel.getBoundingClientRect();inlinePanel.style.left=Math.max(12,Math.min(caret.left,innerWidth-box.width-12))+'px';inlinePanel.style.top=Math.max(12,Math.min(caret.bottom+6,innerHeight-box.height-12,caret.bottom+box.height+12>innerHeight?caret.top-box.height-6:Infinity))+'px';
}
function replaceInline(t,text,anchor=null){
  if(!validInlineTarget(t))throw Error('The note or patient changed. Reopen the inline menu.');
  const p=active();pushHistory();p.text=p.text.slice(0,t.start)+text+p.text.slice(t.start+t.text.length);syncMedicationAnchors(p);
  p.medicationAnchors=p.medicationAnchors.filter(a=>a.start!==t.start);
  if(anchor)p.medicationAnchors.push({...anchor,start:t.start,text,edited:false});
  rememberMedicationAnchors(p);render();pushHistory();queueSave();inlineEditor.focus();inlineEditor.setSelectionRange(t.start+text.length,t.start+text.length);paintInlineNote();
}
function cleanAnchors(p){return (Array.isArray(p.medicationAnchors)?p.medicationAnchors:[]).filter(a=>a&&Number.isInteger(a.start)&&a.start>=0&&typeof a.text==='string'&&a.text.length>0&&p.text.slice(a.start,a.start+a.text.length)===a.text&&typeof a.medId==='string').map(a=>({...a}))}
syncMedicationAnchors=function(p){
  const cache=medicationSnapshots.get(p),old=cache?cache.text:p.text;let anchors=Array.isArray(p.medicationAnchors)?p.medicationAnchors:[];
  if(old!==p.text){
    if(cache.versions.has(p.text))anchors=cache.versions.get(p.text).map(a=>({...a}));
    else {let start=0,end=old.length,nextEnd=p.text.length;while(start<end&&start<nextEnd&&old[start]===p.text[start])start++;while(end>start&&nextEnd>start&&old[end-1]===p.text[nextEnd-1]){end--;nextEnd--}const delta=nextEnd-end;
      anchors=anchors.flatMap(a=>{const stop=a.start+a.text.length;
        // Insertion at the final boundary belongs to the regimen only on the same line.
        if(stop<start||(stop===start&&(end!==start||/[\r\n]/.test(p.text.slice(start,nextEnd)))))return [a];
        if(a.start>end||(a.start===end&&(start!==end||p.text.slice(start,nextEnd).endsWith('\n'))))return [{...a,start:a.start+delta}];
        if(start<a.start||end>stop)return []; // Cross-record replacement is intentionally untracked.
        const text=p.text.slice(a.start,stop+delta);return text.trim()?[{...a,text,edited:true}]:[];
      });
    }
  }
  p.medicationAnchors=cleanAnchors({...p,medicationAnchors:anchors});rememberMedicationAnchors(p);
};
function inlineNumber(n){return String(Number(Number(n).toFixed(3)))}
function calculatedRegimen(v){
  let total=Number(v.amount);if(!(total>0)||!Number.isFinite(total))throw Error('Enter a positive dose.');
  if(!['fixed','dose','day'].includes(v.basis))throw Error('Choose a dose basis.');
  const limits=['maxSingle','maxDaily'].map(k=>{if(v[k]===''||v[k]==null)return Infinity;const n=Number(v[k]);if(!(n>0)||!Number.isFinite(n))throw Error('Dose limits must be positive or blank.');return n});
  if(v.basis!=='fixed'){if(v.weight===''||v.weight==null)return null;if(!(Number(v.weight)>0)||!Number.isFinite(Number(v.weight)))throw Error('Weight must be positive or blank.');total*=Number(v.weight)}
  const count=Number(v.dosesPerDay);if(v.basis==='day'||Number.isFinite(limits[1])){if(!(count>0)||!Number.isFinite(count))throw Error('Enter doses per day for this daily calculation.');if(v.basis==='day')total/=count}
  const raw=total;total=Math.min(total,limits[0],limits[1]/(count>0?count:1));return {total:Number(total.toFixed(3)),capped:total<raw,raw};
}
regimenOrder=function(name,v,includeTotal=true){
  if(!name.trim()||!v.route.trim()||!v.unit.trim()||!v.frequency.trim())throw Error('Enter formulation/route, medicine, units and frequency.');
  const result=calculatedRegimen(v),basis=v.basis==='fixed'?'':v.basis==='day'?'/kg/day':'/kg';
  const total=includeTotal&&result&&(v.basis!=='fixed'||result.capped)?' ('+inlineNumber(result.total)+v.unit+(result.capped?'; maximum applied':'')+')':'';
  return `${v.route.trim()} ${name.trim()} ${inlineNumber(v.amount)}${v.unit.trim()}${basis}${total} ${v.frequency.trim()}`;
};
function parsedInlineAnchor(a){
  if(a.fluidInput)return parseFluid921(a);
  const m=a.text.match(/^(\S+) (.+?) (\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units|puffs?|drops?)(\/kg(?:\/(dose|day))?)?(?: \((\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units|puffs?|drops?)(?:\/dose)?(; maximum applied)?\))? ([^\n]+)$/i);
  if(!m)return null;const v={...a.regimen,route:m[1],name:m[2],amount:m[3],unit:m[4],basis:m[5]?(m[6]==='day'?'day':'dose'):'fixed',frequency:m[10],weight:a.regimen?.weight||patientWeight(active().text)||'',dosesPerDay:a.regimen?.dosesPerDay||'',maxSingle:a.regimen?.maxSingle||'',maxDaily:a.regimen?.maxDaily||''};
  if(a.regimen?.unit&&a.regimen.unit.toLowerCase()!==v.unit.toLowerCase()){v.maxSingle='';v.maxDaily=''}
  if(a.regimen?.frequency&&a.regimen.frequency!==v.frequency)v.dosesPerDay='';
  return {fluid:false,input:v,total:m[7]?Number(m[7]):null,totalUnit:m[8]||'',capped:!!m[9]};
}
function inlineMismatch(a){
  const parsed=parsedInlineAnchor(a);if(!parsed)return null;const v=parsed.input;
  if(parsed.fluid)return fluidMismatch921(parsed);
  if(parsed.total===null)return null;const unit=v.unit.toLowerCase(),writtenUnit=parsed.totalUnit.toLowerCase(),mass={mcg:.001,mg:1,g:1000};
  if(unit!==writtenUnit&&!(mass[unit]&&mass[writtenUnit]))return null;
  const written=unit===writtenUnit?parsed.total:parsed.total*mass[writtenUnit]/mass[unit];
  try{const result=calculatedRegimen(v);if(!result||result.total===Number(written.toFixed(3)))return null;return {message:`${v.amount}${v.unit}${v.basis==='fixed'?'': '/kg'+(v.basis==='day'?'/day':'')} ${v.basis==='fixed'?'': '× '+v.weight+'kg '}${v.basis==='day'?'÷ '+v.dosesPerDay+' doses ':''}= ${result.total}${v.unit}${result.capped?' after the entered limit':''}, but the written calculated dose is ${parsed.total}${parsed.totalUnit}.`,text:regimenOrder(v.name,v),input:v}}catch{return null}
}
function paintInlineNote(){
  const p=active();if(!p)return;const bad=(p.medicationAnchors||[]).filter(a=>inlineMismatch(a)).sort((a,b)=>a.start-b.start);
  noteMirror.hidden=!bad.length;inlineEditor.classList.toggle('inline-painted',!!bad.length);if(!bad.length){noteMirror.textContent='';return}
  const s=getComputedStyle(inlineEditor);for(const k of ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','padding','tabSize','wordSpacing','textIndent','wordBreak'])noteMirror.style[k]=s[k];
  noteMirror.style.width=inlineEditor.clientWidth+'px';let at=0;const parts=[];for(const a of bad){if(a.start<at)continue;parts.push(esc(p.text.slice(at,a.start)),`<span class="mismatch">${esc(a.text)}</span>`);at=a.start+a.text.length}parts.push(esc(p.text.slice(at)),'\n');noteMirror.innerHTML=parts.join('');noteMirror.scrollTop=inlineEditor.scrollTop;noteMirror.scrollLeft=inlineEditor.scrollLeft;
}
function inlineField(key,label,value,wide=false){return `<label class="${wide?'wide':''}">${label}<input data-field="${key}" aria-label="${label}" value="${esc(value??'')}"></label>`}
function openRegimenInline(m,target,fluid=false,choice='patient'){
  hideTooltip(true);closePanel();closeInline();const t=target||inlineTarget(),parsed=target?parsedInlineAnchor(target):null;
  let v=fluid?{fluid:'',volume:'',rate:'',duration:'',purpose:'',instructions:'',calculate:'',...m?.fluidTemplate,...target?.fluidInput,...(parsed?.fluid?parsed.input:{})}:{route:m?.orderPrefix||m?.route||'',name:m?.name||'',amount:m?.calcPerKg||'',unit:m?.calcPerKg?'mg':'',basis:m?.calcPerKg?'dose':'fixed',frequency:m?.frequency||'',weight:patientWeight(active().text)||'',dosesPerDay:'',maxSingle:'',maxDaily:'',...m?.regimen,...target?.regimen,...(parsed&&!parsed.fluid?parsed.input:{})};
  if(!fluid&&!parsed&&!target?.regimen&&!m?.regimen&&!m?.calcPerKg&&m?.text){const source=parsedInlineAnchor({text:m.text.replace(/\s*\[[^\]]*\]\s*$/,'').replace(/\s+/g,' ').trim()});if(source&&!source.fluid&&source.input.name.toLowerCase()===m.name.toLowerCase())v={...v,...source.input,route:m.orderPrefix||source.input.route}}
  if(!fluid&&!v.weight)v.weight=patientWeight(active().text)||'';
  if(!fluid&&!target&&!m?.regimen){for(const [key,source] of [['maxSingle',m?.maxSingle],['maxDaily',m?.maxDaily]]){const match=String(source||'').match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|g|units)(?:\/day)?$/i);if(match&&match[2].toLowerCase()===v.unit.toLowerCase())v[key]=match[1]}}
  inlineSession={target:t,fluid,m};inlinePanel.style.width='900px';inlinePanel.innerHTML=`<h3>${fluid?'IV fluids':'Medication'} <button class="closex" id="inlineCancel" style="float:right" aria-label="Cancel inline editing">×</button></h3>${target?.edited&&!parsed?'<p class="inline-error">Text could not be fully parsed. Review every field before replacing this line or saving a regimen.</p><pre>'+esc(target.text)+'</pre>':''}<div class="linear-row">${fluid?[['fluid','Fluid',true],['volume','Volume (mL)'],['rate','Rate (mL/hour)'],['duration','Duration (hours)'],['purpose','Purpose',true]].map(([k,l,w])=>inlineField(k,l,v[k],w)).join(''):[['route','Formulation/route'],['name','Medicine',true],['amount','Dose'],['unit','Units'],['frequency','Frequency'],['weight','Weight (kg)']].map(([k,l,w])=>inlineField(k,l,v[k],w)).join('')}${fluid?'':`<label>Basis<select data-field="basis" aria-label="Dose basis"><option value="fixed">Fixed</option><option value="dose">Per kg/dose</option><option value="day">Per kg/day</option></select></label>`}<button class="btn primary" id="inlineApply">Apply</button></div><div class="subrow"><select id="inlineSave" aria-label="Save choice"><option value="patient">Patient only</option><option value="new">Save as new regimen</option><option value="update" ${!m?'disabled':''}>Update saved regimen</option></select><input id="inlineName" aria-label="Saved regimen name" placeholder="Saved regimen name" value="${esc(m?.title||m?.name||'')}"></div><details><summary>More details</summary>${fluid?'<label>Instructions<textarea data-field="instructions" class="area">'+esc(v.instructions)+'</textarea></label><label>Optional calculation<select data-field="calculate"><option value="">Use entered values</option><option value="rate">Calculate rate</option><option value="duration">Calculate duration</option></select></label>':`<div class="subrow">${[['dosesPerDay','Doses per day'],['maxSingle','Maximum per dose'],['maxDaily','Maximum per day']].map(([k,l])=>inlineField(k,l,v[k])).join('')}</div><div class="tiny">Limits are optional. Blank means unspecified.</div>`}</details><div class="preview" id="inlinePreview" role="status"></div><div id="inlineReview" class="save-review" hidden></div><div class="inline-hint">Tab next · Enter apply · Esc cancel · Patient values are excluded from saved templates</div>`;
  if(!fluid){const basis=inlinePanel.querySelector('[data-field=basis]');basis.value=v.basis;inlinePanel.querySelector('[data-field=frequency]').closest('label').before(basis.closest('label'))}else installFluidControls(v);$('#inlineSave').value=choice;
  if(m){const reference=document.createElement('details');reference.innerHTML='<summary>Saved medication reference</summary><pre style="white-space:pre-wrap">'+esc(m.tip||m.text||'')+'</pre>';inlinePanel.appendChild(reference)}
  const read=()=>({...v,...Object.fromEntries([...inlinePanel.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value]))});
  let reviewed=null;const preview=()=>{reviewed=null;const out=$('#inlinePreview');if(!out)return;try{const input=read();out.textContent=fluid?fluidOrder(input):regimenOrder(input.name,input);out.classList.remove('inline-error')}catch(e){out.textContent=e.message;out.classList.add('inline-error')}$('#inlineReview').hidden=true;$('#inlineApply').textContent='Apply';};
  inlinePanel.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',preview));inlinePanel.querySelector('[data-field=unit]')?.addEventListener('input',()=>{for(const k of ['maxSingle','maxDaily'])inlinePanel.querySelector(`[data-field=${k}]`).value='';preview()});$('#inlineSave').onchange=preview;$('#inlineName').oninput=preview;
  const apply=async()=>{const button=$('#inlineApply');if(button.disabled)return;try{if(!validInlineTarget(t))throw Error('The note or patient changed. Reopen the editor.');const input=read(),text=fluid?fluidOrder(input):regimenOrder(input.name,input),save=$('#inlineSave').value;
    const entry=fluid?{name:$('#inlineName').value.trim()||input.fluid,title:$('#inlineName').value.trim()||input.fluid,route:'IV',orderPrefix:'IV',category:'IV fluids',...fluidTemplateEntry(input)}:{...moduleDocuments.medications.entries.find(x=>x.id===m?.id),name:input.name,title:$('#inlineName').value.trim()||input.name,route:input.route,orderPrefix:input.route,frequency:input.frequency,calcPerKg:null,dose:input.amount+input.unit+(input.basis==='fixed'?'':input.basis==='day'?'/kg/day':'/kg'),text:regimenOrder(input.name,input,false),regimen:{...input,weight:''}};
    const signature=JSON.stringify(entry);if(save==='update'&&reviewed!==signature){reviewed=signature;$('#inlineReview').textContent='Before: '+(moduleDocuments.medications.entries.find(x=>x.id===m?.id)?.text||'')+'\nAfter: '+entry.text;$('#inlineReview').hidden=false;button.textContent='Confirm update';return}
    button.disabled=true;const savedId=await persistRegimen(m,entry,save,true);if(!validInlineTarget(t))throw Error('Regimen saved, but the note changed. Reopen it to apply.');replaceInline(t,text,{medId:savedId||m?.id||'__fluid__',...(fluid?{fluidInput:input}:{regimen:input})});closeInline();toast(save==='patient'?'Applied to this patient only.':'Regimen saved and applied.');
  }catch(e){if($('#inlinePreview')){$('#inlinePreview').textContent=e.message||String(e);$('#inlinePreview').classList.add('inline-error')}toast(e.message||String(e))}finally{button.disabled=false}};
  $('#inlineApply').onclick=apply;$('#inlineCancel').onclick=()=>{closeInline();inlineEditor.focus()};inlinePanel.onkeydown=e=>{if(e.isComposing)return;if(e.key==='Enter'&&!(e.shiftKey&&e.target.tagName==='TEXTAREA')){e.preventDefault();e.stopPropagation();apply()}if(e.key==='Escape'){e.preventDefault();closeInline();inlineEditor.focus()}};preview();positionInline(t.start);inlinePanel.querySelector('[data-field]').focus();
}
medDialog=function(reference,target=null){const m=meds.find(x=>x.id===reference||x.name===reference);if(m||target)openRegimenInline(m,target,!!(target?.fluidInput||m?.fluidTemplate))};
fluidDialog=function(m=null,target=null){openRegimenInline(m,target,true)};
insertFastMedication=function(m,start=null,end=null){openRegimenInline(m,start===null?null:inlineTarget(start,end),!!m.fluidTemplate)};
function showInlineCommands(){
  if(inlineComposing||inlineSession)return;const caret=inlineEditor.selectionStart;if(caret!==inlineEditor.selectionEnd)return closeInline();const before=inlineEditor.value.slice(0,caret),match=before.match(/(?:^|\s)(\/\/|;;|##)([^\n]*?)$/);if(!match)return closeInline();
  const trigger=match[1],query=match[2].toLowerCase(),start=caret-query.length-2;let entries=trigger==='//'?allSnips().map(x=>({...x,inlineKind:'snippet'})):trigger===';;'?[{id:'__fluid__',title:'IV fluids',inlineKind:'fluid'},...meds.map(x=>({...x,inlineKind:'med'}))]:calculators.map(x=>({...x,inlineKind:'score'}));
  entries=entries.filter(x=>[x.title,x.name,x.desc,x.searchText].join(' ').toLowerCase().includes(query.trim())).slice(0,40);inlineList={entries,index:0,target:inlineTarget(start,caret)};drawInlineCommands();
}
function drawInlineCommands(){const list=inlineList;if(!list)return;inlinePanel.style.width='390px';inlinePanel.innerHTML='<h3>'+({'//':'Snippets',';;':'Medications / IV fluids','##':'Scoring'}[list.target.text.slice(0,2)])+'</h3>'+list.entries.map((x,i)=>`<button class="inline-option" role="option" aria-selected="${i===list.index}" data-inline-index="${i}">${esc(x.title||x.name)}<small>${esc(x.desc||x.dose||'')}</small></button>`).join('')+(list.entries.length?'':'<p>No matching items</p>')+'<div class="inline-hint">↑ ↓ choose · Enter open · Esc keep text</div>';inlinePanel.onkeydown=null;inlinePanel.querySelectorAll('[data-inline-index]').forEach(b=>b.onclick=()=>selectInlineCommand(Number(b.dataset.inlineIndex)));positionInline(list.target.start);inlinePanel.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'})}
function selectInlineCommand(index){const list=inlineList,item=list?.entries[index];if(!item)return;const t=list.target;closeInline();if(!validInlineTarget(t))return toast('The note changed. Type the command again.');if(item.inlineKind==='snippet'){replaceInline(t,item.text);return}if(item.inlineKind==='fluid'||item.inlineKind==='med'){openRegimenInline(item.inlineKind==='fluid'?null:item,t,item.inlineKind==='fluid'||!!item.fluidTemplate);return}
  if(item.kind==='arithmetic')basicCalculator();else if(item.kind==='score')scoreCalculator(item.id);else if(item.kind==='risk-rule')riskRuleCalculator(item.id);else if(item.kind==='resus')resusCalculator(item.id);else formulaCalculator(item.id);inlineScoreTarget=t;
}
const baseInsertText921=insertText;insertText=function(text){if(inlineScoreTarget){const t=inlineScoreTarget;replaceInline(t,text);inlineScoreTarget=null;return}baseInsertText921(text)};
const baseCloseDialog921=closeDialog;closeDialog=function(){inlineScoreTarget=null;baseCloseDialog921()};
// Existing close buttons captured the earlier function; observe cancellation too.
new MutationObserver(()=>{if(!$('#dialog').classList.contains('show'))inlineScoreTarget=null}).observe($('#dialog'),{attributes:true,attributeFilter:['class']});
function showManualEdit(a,at=null){
  if(inlineSession||inlineList||inlineComposing||$('#dialog').classList.contains('show'))return;const p=active(),t={...a,patientId:p.id,snapshot:p.text},bad=inlineMismatch(a);closeInline();inlinePanel.style.width='510px';inlinePanel.innerHTML=`<h3>${bad?'Dose / fluid mismatch':'Medication / fluid edited'}</h3>${bad?'<p class="inline-error">'+esc(bad.message)+'</p>':''}<div class="subrow"><button class="btn" data-choice="patient">Patient only</button><button class="btn" data-choice="new">Save as new</button><button class="btn" data-choice="update">Update original</button>${bad?'<button class="btn primary" id="inlineRecalculate">Recalculate</button>':''}<button class="btn" id="inlineEdit">Edit inline</button><button class="btn" id="inlineDismiss">Dismiss</button></div>`;
  const dismiss=()=>{inlineDismissed.set(p,a.text);closeInline()};inlinePanel.querySelector('[data-choice=patient]').onclick=dismiss;$('#inlineDismiss').onclick=dismiss;
  const m=meds.find(x=>x.id===a.medId);inlinePanel.querySelector('[data-choice=update]').disabled=!m;
  for(const choice of ['new','update'])inlinePanel.querySelector(`[data-choice=${choice}]`).onclick=()=>openRegimenInline(m,t,!!a.fluidInput,choice);
  $('#inlineEdit').onclick=()=>openRegimenInline(m,t,!!a.fluidInput);
  if(bad)$('#inlineRecalculate').onclick=()=>{try{replaceInline(t,bad.text,{...a,...(a.fluidInput?{fluidInput:bad.input}:{regimen:bad.input})});closeInline();toast('Calculated value updated.')}catch(e){toast(e.message)}};
  positionInline(at??a.start);
}
inlineEditor.addEventListener('compositionstart',()=>{inlineComposing=true;closeInline();clearTimeout(manualEditTimer)});inlineEditor.addEventListener('compositionend',()=>{inlineComposing=false;showInlineCommands();paintInlineNote()});
inlineEditor.addEventListener('input',()=>{syncMedicationAnchors(active());paintInlineNote();showInlineCommands();clearTimeout(manualEditTimer);const p=active();manualEditTimer=setTimeout(()=>{if(active()!==p)return;const a=(p.medicationAnchors||[]).find(a=>a.edited&&inlineEditor.selectionStart>=a.start&&inlineEditor.selectionStart<=a.start+a.text.length);if(a&&inlineDismissed.get(p)!==a.text)showManualEdit(a)},800)});
inlineEditor.addEventListener('keydown',e=>{if(e.isComposing)return;if(e.altKey&&e.key==='Enter'){const a=medicationNoteTargetAt(active(),Math.max(0,inlineEditor.selectionStart-1));if(a){e.preventDefault();e.stopImmediatePropagation();openRegimenInline(meds.find(m=>m.id===a.medId),a,!!a.fluidInput)}return}if(!inlineList)return;if(['ArrowDown','ArrowUp','Enter','Escape'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')closeInline();else if(e.key==='Enter')selectInlineCommand(inlineList.index);else{inlineList.index=Math.max(0,Math.min(inlineList.entries.length-1,inlineList.index+(e.key==='ArrowDown'?1:-1)));drawInlineCommands()}}},true);
inlineEditor.addEventListener('mousemove',e=>{if(inlineSession||inlineList||inlineComposing)return;const a=medicationAtPointer(inlineEditor,e.clientX,e.clientY);if(a&&inlineMismatch(a)){e.stopImmediatePropagation();hideTooltip(true);showManualEdit(a)}},true);
inlineEditor.addEventListener('scroll',()=>{paintInlineNote();if(inlineList)positionInline(inlineList.target.start);else if(inlineSession)positionInline(inlineSession.target.start);else closeInline()});inlineEditor.addEventListener('click',()=>{if(!inlineSession)closeInline()});
document.addEventListener('pointerdown',e=>{if(!inlinePanel.contains(e.target)&&e.target!==inlineEditor)closeInline()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){const wasOpen=!inlinePanel.hidden;closeInline();inlineScoreTarget=null;if(wasOpen)inlineEditor.focus()}},true);
const baseRender921=render;render=function(focus=false){if(inlineSession&&!validInlineTarget(inlineSession.target)||inlineList&&!validInlineTarget(inlineList.target))closeInline();baseRender921(focus);paintInlineNote()};
const basePrefs921=applyPrefs;applyPrefs=function(){basePrefs921();paintInlineNote()};new ResizeObserver(paintInlineNote).observe(inlineEditor);
shortcuts=function(){openDialog('Keyboard shortcuts','<div class="preview">// — Inline snippets\n;; — Inline medications / IV fluids\n## — Inline scoring\n==y / ==g + Enter — Zone clerking\n==yt / ==gt / ==rt + Enter — Zone trauma\n@B1 / @E2 / @C3 / @i2 + Enter — Yellow bed\n@5405 + Enter — Green QMS\nCtrl+Space — Spotlight\nF2 / F3 / F4 — Search snippets / medications / scoring\nF6 — Patient ID parser\nF7 — Vitals parser\nF8 — Timestamp\nAlt+Enter — Edit medication / fluid at cursor\nCtrl+Shift+S — Save Shift As\n\nSingle comparison signs remain text.</div>',[{label:'Close'}])};
paintInlineNote();

