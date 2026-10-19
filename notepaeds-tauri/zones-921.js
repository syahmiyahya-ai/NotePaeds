// Zone starters expand only on Enter so ==y and ==yt can coexist.
const yellowBeds=['Bed 1','EYZ 1','Bed 2','Bed 3','EYZ 2','Bed 4','ISL 1','ISL 2','ISL 3','ISL 4','Cor 1','Cor 2','Cor 3','Cor 4','Bed 5','EYZ 3','Bed 6','Bed 7','EYZ 4','Bed 8'];
// Positions are percentages of the user's floor sketch; the walls are decorative.
const bedMap=[['Bed 7',5,8],['Bed 6',27,8],['Bed 3',44,8],['Bed 2',86,8],['EYZ 4',5,29],['EYZ 3',27,29],['EYZ 2',44,29],['EYZ 1',86,29],['ISL 3',59,14],['ISL 2',71,14],['ISL 4',59,33],['ISL 1',71,33],['Bed 8',5,50],['Bed 5',27,50],['Bed 4',44,50],['Bed 1',86,50],['Cor 4',49,84],['Cor 3',61,84],['Cor 2',73,84],['Cor 1',85,84]];
function canonicalBed(value){return /^\d+$/.test(value||'')?'Bed '+value:value||''}
locationLabel=function(p){return p.zone==='yellow'?(p.bed?'Y · '+canonicalBed(p.bed):'Yellow zone'):p.zone==='green'?(p.qms?'G · QMS '+p.qms:'Green zone'):p.zone==='red'?'Resus / Red zone':''};
locationDialog=function(){
  const p=active(),bed=canonicalBed(p.bed);
  openDialog('Patient location',`<div class="field"><label for="patientZone">Zone</label><select id="patientZone" class="select"><option value="">Unassigned</option><option value="yellow">Yellow zone</option><option value="green">Green zone</option><option value="red">Resus / Red zone</option></select></div><div id="bedField"><div class="field"><label for="patientBed">Bed (optional)</label><select id="patientBed" class="select"><option value="">Assign later</option>${(!yellowBeds.includes(bed)&&bed?[bed]:[]).concat(yellowBeds).map((b,i)=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div><details open><summary>Yellow zone bed map</summary><div class="yellow-bed-map" aria-label="Yellow zone bed map">${bedMap.map(([b,r,c])=>`<button type="button" data-zone-bed="${esc(b)}" class="zone-bed ${b.startsWith('EYZ')?'extra':b.startsWith('ISL')?'isolation':b.startsWith('Cor')?'corridor':'standard'}" style="left:${r}%;top:${c}%">${esc(b)}</button>`).join('')}</div></details></div><div class="field" id="qmsField"><label for="patientQms">QMS number (optional)</label><input id="patientQms" class="input" maxlength="30" value="${esc(p.qms||'')}"></div><p class="tiny">You can leave the bed or QMS blank and assign it anytime.</p><label><input id="locationInsert" type="checkbox"> Also insert location into the note</label>`,[{label:'Cancel'},{label:'Save location',primary:true,fn:()=>{
    if(active().id!==p.id){toast('Patient changed. Reopen Bed / QMS.');return}
    p.zone=$('#patientZone').value;p.bed=$('#patientBed').value;p.qms=$('#patientQms').value.trim();if($('#locationInsert').checked)insertText(locationLabel(p));render();queueSave();toast('Patient location saved.');
  }}]);
  $('#patientZone').value=p.zone||'';$('#patientBed').value=bed;
  const mark=()=>$$('[data-zone-bed]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.zoneBed===$('#patientBed').value)));
  $$('[data-zone-bed]').forEach(b=>b.onclick=()=>{$('#patientBed').value=b.dataset.zoneBed;mark()});$('#patientBed').onchange=mark;
  const update=()=>{$('#bedField').hidden=$('#patientZone').value!=='yellow';$('#qmsField').hidden=$('#patientZone').value!=='green'};$('#patientZone').onchange=update;update();mark();
};
locationButton.onclick=locationDialog;
inlineEditor.addEventListener('keydown',e=>{
  if(e.isComposing||e.key!=='Enter'||e.ctrlKey||e.altKey||e.shiftKey||e.metaKey||inlineEditor.selectionStart!==inlineEditor.selectionEnd)return;
  const at=inlineEditor.selectionStart;
  // Require whitespace or a line boundary and a complete token, protecting emails and ordinary text.
  if(at<inlineEditor.value.length&&!/\s/.test(inlineEditor.value[at]))return;
  const match=inlineEditor.value.slice(0,at).match(/(?:^|\s)(@(?:[beci]\d+|\d+))$/i);if(!match)return;
  const code=match[1].slice(1),numeric=/^\d+$/.test(code);let bed='';
  if(numeric){if(code.length>30)return}else{const prefix=code[0].toLowerCase(),n=Number(code.slice(1)),limit=prefix==='b'?8:4;if(n<1||n>limit)return;bed=({b:'Bed',e:'EYZ',c:'Cor',i:'ISL'}[prefix])+' '+n}
  e.preventDefault();e.stopImmediatePropagation();const p=active(),target=inlineTarget(at-match[1].length,at);closeInline();replaceInline(target,'');
  if(numeric){p.zone='green';p.qms=code}else{p.zone='yellow';p.bed=bed}
  render();queueSave();inlineEditor.focus();inlineEditor.setSelectionRange(target.start,target.start);toast('Location set: '+locationLabel(p));
},true);
inlineEditor.addEventListener('keydown',e=>{
  if(e.isComposing||e.key!=='Enter'||e.ctrlKey||e.altKey||e.shiftKey||e.metaKey||inlineEditor.selectionStart!==inlineEditor.selectionEnd)return;
  const at=inlineEditor.selectionStart,match=inlineEditor.value.slice(0,at).match(/(?:^|\s)(==(?:yt|gt|rt|y|g))$/i);if(!match)return;
  const code=match[1].slice(2).toLowerCase(),zone={y:'yellow',g:'green',r:'red'}[code[0]],trauma=code.endsWith('t'),items=allSnips();
  const snippet=items.find(s=>s.id===(trauma?'trauma':zone+'_clerking'))||(!trauma?items.find(s=>s.id==='ed_clerking'):null);
  e.preventDefault();e.stopImmediatePropagation();if(!snippet)return toast('Clerking template unavailable. Check the snippets module.');
  let text=snippet.text;
  if(!trauma&&snippet.id==='ed_clerking')text=text.replace(/^==[^\n]*==/,`== ${zone.toUpperCase()} ZONE CLERKING ==`);
  const p=active(),target=inlineTarget(at-match[1].length,at);closeInline();replaceInline(target,text);p.zone=zone;render();queueSave();inlineEditor.focus();inlineEditor.setSelectionRange(target.start+text.length,target.start+text.length);toast(`${zone==='red'?'Resus / Red':zone==='yellow'?'Yellow':'Green'} zone ${trauma?'trauma ':''}template inserted. Bed / QMS can be assigned anytime.`);
},true);

