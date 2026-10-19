// Next release: explicit laboratory values and immediate medication insertion.
function parseFbc(raw){
  const source=String(raw||'').replace(/\*\*|__/g,'').replace(/\r/g,'');
  const fields=[['Hb','(?:HB|HGB|Haemoglobin|Hemoglobin)'],['WBC','(?:WBC|White\\s+(?:Blood\\s+)?Cells?(?:\\s+Count)?)'],['PLT','(?:PLT|Platelets?(?:\\s+Count)?)'],['HCT','(?:PCV|HCT|Haematocrit|Hematocrit)'],['MCV','MCV'],['MCHC','MCHC']];
  const values={};
  for(const [name,alias] of fields){
    const pattern=new RegExp('(?:^|[\\s|;,])'+alias+'\\b\\s*(?:[:=|]\\s*)?(\\d+(?:\\.\\d+)?)(?=\\s|[|;,()%]|$)','im');
    const match=source.match(pattern);if(match)values[name]=match[1].replace(/(\.\d*?[1-9])0+$|\.0+$/,'$1');
  }
  const first=['Hb','WBC','PLT'].filter(k=>values[k]!==undefined).map(k=>k+' '+values[k]);
  const second=['HCT','MCV','MCHC'].filter(k=>values[k]!==undefined).map(k=>k+' '+values[k]);
  return {values,text:[first.length?'FBC : '+first.join(' / '):second.length?'FBC :':'',second.join(' / ')].filter(Boolean).join('\n')};
}
function fbcParser(){
  openDialog('Blood investigation parser — FBC','<p class="tiny">Paste labelled laboratory results. Only supplied Hb, WBC, PLT, HCT/PCV, MCV and MCHC values are included.</p><textarea id="fbcInput" class="area"></textarea><pre id="fbcPreview" class="preview" role="status">Paste results to preview.</pre>',[{label:'Cancel'},{label:'Insert',primary:true,close:false,fn:()=>{const result=parseFbc($('#fbcInput').value);if(!Object.keys(result.values).length)return toast('No recognised FBC values.');insertText(result.text);closeDialog()}}]);
  $('#fbcInput').oninput=()=>{$('#fbcPreview').textContent=parseFbc($('#fbcInput').value).text||'No recognised FBC values.'};$('#fbcInput').focus();
}
const fbcMenu=document.createElement('button');fbcMenu.className='menuitem';fbcMenu.textContent='Blood investigation parser — FBC';fbcMenu.onclick=()=>{closeMenus();fbcParser()};$('#menu-tools').appendChild(fbcMenu);
const regimenOrderBefore94=regimenOrder;regimenOrder=function(name,input,includeTotal=true){const text=regimenOrderBefore94(name,input,includeTotal);return text+(input.duration?.trim()?' '+input.duration.trim():'')};
const parsedAnchorBefore94=parsedInlineAnchor;parsedInlineAnchor=function(anchor){const parsed=parsedAnchorBefore94(anchor);const duration=anchor.regimen?.duration?.trim();if(parsed&&!parsed.fluid&&duration&&parsed.input.frequency.endsWith(' '+duration)){parsed.input.frequency=parsed.input.frequency.slice(0,-duration.length-1);if(parsed.input.frequency===anchor.regimen.frequency)parsed.input.dosesPerDay=anchor.regimen.dosesPerDay||''}return parsed};
const openRegimenBefore94=openRegimenInline;openRegimenInline=function(...args){openRegimenBefore94(...args);if(inlineSession&&!inlineSession.fluid){const field=document.createElement('label');field.innerHTML='Duration<input data-field="duration" aria-label="Duration" placeholder="e.g. x 5/7">';field.querySelector('input').value=args[1]?.regimen?.duration||args[0]?.regimen?.duration||'';$('#inlineApply').before(field);field.querySelector('input').addEventListener('input',()=>{inlinePanel.querySelector('[data-field=frequency]').dispatchEvent(new Event('input'))})}};
let recentMedicationInsertion=null;
function insertMedicationImmediately(m,t=inlineTarget()){
  if(!validInlineTarget(t))return toast('The note changed. Search again.');
  let input=m.regimen?{...m.regimen,name:m.name,weight:patientWeight(active().text)||''}:null;
  if(!input&&m.calcPerKg){const single=String(m.maxSingle||'').match(/^\s*(\d+(?:\.\d+)?)\s*mg\s*$/i),daily=String(m.maxDaily||'').match(/^\s*(\d+(?:\.\d+)?)\s*mg\/day\s*$/i),count={OD:1,BD:2,BID:2,TDS:3,TID:3,QID:4,Q6H:4,Q8H:3,Q12H:2}[String(m.frequency).toUpperCase()];input={route:m.orderPrefix||m.route,name:m.name,amount:m.calcPerKg,unit:'mg',basis:'dose',frequency:m.frequency,weight:patientWeight(active().text)||'',dosesPerDay:count?String(count):'',maxSingle:single?.[1]||'',maxDaily:count?daily?.[1]||'':''}}
  let text;try{text=input?regimenOrder(m.name,input):fastMedicationText(m)}catch(error){toast(error.message);return}
  closeInline();replaceInline(t,text,{medId:m.id,...(input?{regimen:input}:{})});
  recentMedicationInsertion={patientId:active().id,snapshot:active().text,start:t.start,end:t.start+text.length,medId:m.id};
  inlinePanel.style.width='210px';inlinePanel.innerHTML='<button class="btn" id="editInsertedMedication">Tab · Edit medication</button>';positionInline(t.start+text.length);
  $('#editInsertedMedication').onclick=()=>{const recent=recentMedicationInsertion;if(!recent||active().id!==recent.patientId||active().text!==recent.snapshot)return closeInline();const anchor=active().medicationAnchors.find(a=>a.start===recent.start&&a.medId===recent.medId);recentMedicationInsertion=null;if(anchor)openRegimenInline(m,{...anchor,patientId:active().id,snapshot:active().text},false)};
  toast('Medication inserted · Tab to edit');
}
insertFastMedication=function(m,start=null,end=null){if(m.fluidTemplate)return openRegimenInline(m,start===null?null:inlineTarget(start,end),true);insertMedicationImmediately(m,start===null?inlineTarget():inlineTarget(start,end))};
const selectInlineCommandBefore94=selectInlineCommand;
selectInlineCommand=function(index){const item=inlineList?.entries[index];if(item?.inlineKind==='med'&&!item.fluidTemplate)return insertMedicationImmediately(item,inlineList.target);return selectInlineCommandBefore94(index)};
inlineEditor.addEventListener('keydown',event=>{
  if(event.isComposing)return;const recent=recentMedicationInsertion;if(!recent)return;
  const valid=active().id===recent.patientId&&active().text===recent.snapshot&&inlineEditor.selectionStart===recent.end&&inlineEditor.selectionEnd===recent.end;
  recentMedicationInsertion=null;
  if(event.key==='Tab'&&!event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&valid){event.preventDefault();event.stopImmediatePropagation();const anchor=active().medicationAnchors.find(a=>a.start===recent.start&&a.medId===recent.medId);if(anchor)openRegimenInline(meds.find(m=>m.id===recent.medId),{...anchor,patientId:active().id,snapshot:active().text},false)}
},true);
inlineEditor.addEventListener('input',()=>{recentMedicationInsertion=null});
inlineEditor.addEventListener('pointerdown',()=>{recentMedicationInsertion=null});
