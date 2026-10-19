function patientTabSummary(text){
  const name=patientDisplayName(text).split(/\s+/).slice(0,2).join(' ')||'—';
  const field=re=>String(text).match(re)?.[1]?.trim()||'—';
  return `${name} · ${patientWeight(text)?patientWeight(text)+' kg':'—'} · Dx: ${diagnosisText(text)||'—'} · Bed: ${field(/^\s*(?:bed(?:\s*(?:no|number))?|bay)\s*[:#=-]\s*([^\n]+)/mi)} · QMS: ${field(/^\s*qms(?:\s*(?:no|number))?\s*[:#=-]\s*([^\n]+)/mi)}`;
}
function placeholderResult(note,parsed,kind){
  const values={};for(const line of parsed.split('\n')){const m=line.match(/^([^:]+):\s*(.+)$/);if(m&&!m[2].includes('_'))values[m[1].trim().toLowerCase()]=m[2].trim()}
  const aliases={temperature:'t',temp:'t',pulse:'hr',pr:'hr','heart rate':'hr','respiratory rate':'rr','spo₂':'spo2',wt:'weight',gender:'sex','date of birth':'dob','patient name':'name'};
  let count=0;
  const text=note.replace(/<([^<>\n]+)>/g,(token,label)=>{
    const key=label.trim().toLowerCase();
    if(kind==='id'&&/^(?:insert\s+)?pati?en[dt]\s*(?:id|identifiers?)(?:\s+here)?$/.test(key)){count++;return parsed}
    if(kind==='vitals'&&/^(?:insert\s+)?vital(?:s| signs?| sign)?(?:\s+here)?$/.test(key)){count++;return parsed.replace(/^Vitals:\n/,'')}
    const canonical=aliases[key]||key;
    const allowed=kind==='id'?['name','wch','mrn','rn','patient id','dob','age','sex','weight']:['t','hr','rr','bp','map','spo2','oxygen','weight','height','pain','gcs','capillary glucose'];
    if(allowed.includes(canonical)&&values[canonical]){count++;return values[canonical]}
    return token;
  });return {text,count};
}
function insertIntoPlaceholders(text,kind){const p=active(),result=placeholderResult(p.text,text,kind);if(!result.count)return false;pushHistory();p.text=result.text;render();pushHistory();queueSave();toast('Filled '+result.count+' placeholder(s). Missing values kept.');return true}
function insertParsedPatientId(text){if(!insertIntoPlaceholders(text,'id')){insertText(text);toast('Patient details inserted at cursor; no matching placeholder found.')}}
async function aiIcdPanel(){
  const invoke=window.__TAURI__?.core?.invoke;
  openDialog('AI ICD-10 check','<div class="tiny">Review the diagnosis only. Remove names and identifiers. Suggestions need clinician review.</div><textarea id="aiIcdInput" class="area"></textarea><label><input id="aiIcdConsent" type="checkbox"> Send this diagnosis text to OpenAI for coding suggestions</label><pre id="aiIcdResult" class="preview" style="white-space:pre-wrap"></pre>',[{label:'Close'},{label:'Check diagnosis',close:false,primary:true,fn:async()=>{
    const input=$('#aiIcdInput'),output=$('#aiIcdResult'),button=$$('#dialogFoot .btn')[1];
    if(!invoke)return toast('AI coding requires the Windows desktop app.');
    if(!$('#aiIcdConsent').checked)return toast('Review and approve the diagnosis text first.');
    if(!input.value.trim())return toast('Enter a diagnosis first.');
    if(hasPatientIdentifiers(input.value))return toast('Remove patient identifiers first.');
    button.disabled=true;output.textContent='Checking diagnosis…';toast('Checking ICD-10 with AI…');
    try{output.textContent=await invoke('check_icd10',{diagnosis:input.value});toast('AI ICD-10 suggestions ready for review.')}catch(e){output.textContent=String(e);toast('AI ICD-10 failed: '+String(e))}finally{button.disabled=false}
  }}]);$('#aiIcdInput').value=diagnosisText(active().text);toast('AI ICD-10: review diagnosis before checking.');
}
$('#aiIcdCheck').onclick=aiIcdPanel;
