// Embedded in both HTML editions; credentials are handled by native commands only.
const generationSessions=new Map();
let generationBusy=false;
function hasPatientIdentifiers(text){return /\bWCH\s*\d+|\b\d{6}-\d{2}-\d{4}\b|\b(?:MRN|NRIC|IC number|patient name|DOB|date of birth)\s*:/i.test(text)}
function refreshGeneration(){for(const s of generationSessions.values())s.refresh?.()}
async function generationPanel(){
  const sourcePatient=active().id,invoke=window.__TAURI__?.core?.invoke;
  let s=generationSessions.get(sourcePatient);
  if(!s){s={form:{...generationDemographics(active().text),kind:'Summary',language:'English',clinical:'',additional_prompt:''},draft:'',image:'',style:'Calm colours, simple illustrations and large clear text.',busy:false,started:0,stage:'',message:'',connected:false,reviewed:false,imageReviewed:false};generationSessions.set(sourcePatient,s)}
  const html=`<div class="generation-status" id="generationStatus" role="status" aria-live="polite"></div>
  <details class="key-settings"><summary>API key settings</summary><div class="tiny">Uses the existing Windows OPENAI_API_KEY if available. A key entered here is encrypted by Windows and remembered for this account. It is not saved in notes, modules or HTML.</div><label for="generationKey">OpenAI API key</label><input id="generationKey" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="Paste key here — never into the clinical note"><div class="row"><button id="generationUseKey" class="btn">Save key securely</button><button id="generationTestKey" class="btn">Test connection</button></div><div id="generationKeyStatus" class="tiny" role="status"></div></details>
  <fieldset id="generationInputs" style="border:0;padding:0;margin:12px 0">
  <div class="timergrid"><div class="field"><label for="generationKind">Document</label><select id="generationKind" class="select"><option>Summary</option><option>Referral memo</option><option>Home advice leaflet</option></select></div><div class="field"><label for="generationLanguage">Language</label><select id="generationLanguage" class="select"><option>English</option><option>Bahasa Melayu</option></select></div></div>
  <div class="demographic-grid"><div class="field"><label for="generationAge">Age</label><input id="generationAge" class="input"></div><div class="field"><label for="generationGender">Gender</label><select id="generationGender" class="select"><option>Not specified</option><option>Girl</option><option>Boy</option><option>Female</option><option>Male</option></select></div><div class="field"><label for="generationWeight">Weight (kg)</label><input id="generationWeight" class="input" type="number" min="0" step="any"></div></div>
  <div class="field"><label for="generationClinical">De-identified clinical information</label><textarea id="generationClinical" class="area" maxlength="40000" placeholder="Relevant history, examination, results and plan. Exclude names, IDs, DOB, addresses and contact details."></textarea></div>
  <div class="field"><label for="generationPrompt">Additional instructions (optional)</label><textarea id="generationPrompt" class="area" maxlength="4000" style="min-height:75px" placeholder="e.g. Short referral memo; use headings; explain in simple Bahasa Melayu. Do not include identifiers."></textarea></div>
  <label class="review-line"><input id="generationReviewed" type="checkbox"> I reviewed all fields and agree to send this de-identified information and instructions to OpenAI.</label></fieldset>
  <button id="generationSend" class="btn primary">Generate text</button>
  <div class="field" style="margin-top:16px"><label for="generationResult">Text draft — review and edit before use</label><textarea id="generationResult" class="area" style="min-height:180px"></textarea></div>
  <section id="leafletImageSection"><h3 style="font-size:14px">Discharge leaflet image</h3><div class="warn">Review the text above first (maximum 5,000 characters). Image generation is a separate billed API request and may take several minutes. Check every word, dose and warning in the finished image against your text before use.</div><div class="field"><label for="leafletStyle">Image appearance (optional; no identifiers)</label><input class="input" id="leafletStyle" maxlength="1000"></div><label class="review-line"><input type="checkbox" id="leafletReviewed"> I reviewed this text and agree to send it and the appearance instructions to OpenAI to generate a leaflet image.</label><button id="leafletGenerate" class="btn primary">Generate leaflet image</button><div id="leafletPreview" style="margin-top:12px"></div><button class="btn" id="leafletSave">Save PNG</button><button class="btn" id="leafletPrint">Print image</button></section>
  <div class="tiny" style="margin-top:12px">Drafts stay in memory for this app session. No automatic insertion or sending. Approved SCAN, asthma action plan and measles forms remain KIV.</div>`;
  openDialog('Generate',html,[{label:'Close'},{label:'Copy draft',close:false,fn:async()=>{if(!s.draft||s.busy)return;try{await navigator.clipboard.writeText(s.draft);toast('Draft copied.')}catch{toast('Select the draft and press Ctrl+C.')}}},{label:'Insert draft',close:false,fn:()=>{if(!s.draft||s.busy)return;if(active().id!==sourcePatient)return toast('Return to the original patient before inserting.');insertText(s.draft);closeDialog()}}]);
  const el=id=>$('#'+id),send=el('generationSend'),result=el('generationResult'),status=el('generationStatus'),keyStatus=el('generationKeyStatus');
  const fieldIds={kind:'generationKind',language:'generationLanguage',age:'generationAge',gender:'generationGender',weight:'generationWeight',clinical:'generationClinical',additional_prompt:'generationPrompt'};
  for(const [key,id] of Object.entries(fieldIds)){el(id).value=s.form[key];el(id).oninput=()=>{s.form[key]=el(id).value;s.reviewed=false;s.imageReviewed=false;refreshGeneration()}}
  result.value=s.draft;result.oninput=()=>{s.draft=result.value;s.image='';s.imageReviewed=false;refreshGeneration()};
  el('leafletStyle').value=s.style;el('leafletStyle').oninput=()=>{s.style=el('leafletStyle').value;s.imageReviewed=false;refreshGeneration()};
  el('generationReviewed').onchange=e=>{s.reviewed=e.target.checked;refreshGeneration()};
  el('leafletReviewed').onchange=e=>{s.imageReviewed=e.target.checked;refreshGeneration()};
  s.refresh=()=>{
    if($('#generationSend')!==send)return;
    if(result.value!==s.draft)result.value=s.draft;
    const elapsed=s.busy?Math.floor((Date.now()-s.started)/1000):0;
    status.className='generation-status'+(s.busy?' is-running':'');
    status.textContent=s.busy?`${s.stage} — ${elapsed}s elapsed. You can close this panel and return; keep the app open.`:generationBusy?'Another generation is running. Please wait.':s.message||(!invoke?'Generation requires the desktop app; no key is stored in HTML.':s.connected?'API key available (use Test connection to verify access).':'API key needed — open API key settings.');
    status.setAttribute('aria-busy',String(s.busy));
    el('generationInputs').disabled=generationBusy;result.readOnly=generationBusy;
    send.disabled=generationBusy;send.textContent=s.busy&&s.stage==='Generating text'?'Generating…':'Generate text';
    el('generationReviewed').checked=s.reviewed;
    el('generationUseKey').disabled=!invoke||generationBusy;el('generationTestKey').disabled=!invoke||generationBusy;el('generationKey').disabled=!invoke||generationBusy;
    el('leafletImageSection').hidden=s.form.kind!=='Home advice leaflet';
    el('leafletReviewed').checked=s.imageReviewed;el('leafletReviewed').disabled=generationBusy;el('leafletStyle').disabled=generationBusy;
    el('leafletGenerate').disabled=generationBusy;
    el('leafletSave').disabled=!s.image||generationBusy;el('leafletPrint').disabled=!s.image||generationBusy;
    const preview=el('leafletPreview');if(preview.dataset.image!==s.image){preview.dataset.image=s.image;preview.replaceChildren();if(s.image){const image=document.createElement('img');image.src=s.image;image.alt='Generated discharge leaflet draft — check wording before use';image.style.cssText='width:100%;height:auto;border:1px solid #ccc';preview.appendChild(image)}}
    $$('#dialogFoot .btn').slice(1).forEach(b=>b.disabled=!s.draft||generationBusy);
  };
  const run=async(stage,operation)=>{
    if(generationBusy)return;generationBusy=true;s.busy=true;s.started=Date.now();s.stage=stage;s.message='';toast(stage+'…');refreshGeneration();
    const timer=setInterval(()=>{refreshGeneration();const badge=$('#generationActivity');badge.hidden=false;badge.textContent=stage+' · '+Math.floor((Date.now()-s.started)/1000)+'s';},1000);
    try{await operation();s.message=stage==='Generating text'?'Text ready. Review before use.':'Image ready. Compare every word with the approved text before use.';toast(s.message)}
    catch(error){s.message=String(error);toast('Generation failed: '+s.message)}
    finally{clearInterval(timer);s.busy=false;generationBusy=false;$('#generationActivity').hidden=true;refreshGeneration();if($('#generationResult')===result)result.value=s.draft}
  };
  send.onclick=()=>{
    if(send.disabled)return;
    if(!invoke||!s.connected){s.message='Setup required: open API key settings, enter a key and test the connection on this computer.';toast(s.message);document.querySelector('.key-settings').open=true;refreshGeneration();return}
    if(!s.reviewed||!s.form.clinical.trim()){s.message='Enter clinical information and tick the review checkbox before generating.';toast(s.message);refreshGeneration();return}
    const input={...s.form};if(hasPatientIdentifiers(input.clinical+'\n'+input.additional_prompt)){s.message='Remove patient identifiers from clinical information and additional instructions.';refreshGeneration();return}
    run('Generating text',async()=>{const draft=await invoke('generate_document',{input});s.draft=draft;s.image='';s.imageReviewed=false;s.reviewed=false});
  };
  el('leafletGenerate').onclick=()=>{
    if(el('leafletGenerate').disabled)return;
    if(!invoke||!s.connected){s.message='Image setup required: enter an API key and test the connection.';toast(s.message);document.querySelector('.key-settings').open=true;refreshGeneration();return}
    if(!s.imageReviewed||!s.draft.trim()||s.draft.length>5000){s.message='Review the text draft (1–5,000 characters) and tick the image review checkbox first.';toast(s.message);refreshGeneration();return}
    if(hasPatientIdentifiers(s.draft+'\n'+s.style)){s.message='Remove identifiers from the leaflet text and appearance instructions.';refreshGeneration();return}
    const input={text:s.draft,language:s.form.language,style:s.style,reviewed:s.imageReviewed};
    run('Generating leaflet image',async()=>{s.image=await invoke('generate_leaflet_image',{input});s.imageReviewed=false});
  };
  el('leafletSave').onclick=()=>{if(!s.image)return;const a=document.createElement('a');a.href=s.image;a.download='NotePaeds-discharge-leaflet-draft.png';a.click()};
  el('leafletPrint').onclick=async()=>{if(!s.image)return;const page=$('#leafletPrintPage');page.replaceChildren();const img=document.createElement('img');img.src=s.image;page.appendChild(img);try{await img.decode();document.body.classList.add('print-leaflet');window.print()}catch{toast('The image is not ready to print. Try again.')}};
  el('generationUseKey').onclick=async()=>{
    const key=el('generationKey').value;el('generationKey').value='';
    try{await invoke('set_session_api_key',{key});for(const item of generationSessions.values())item.connected=true;keyStatus.textContent='Key saved securely. Test connection to verify.';s.message='';refreshGeneration()}catch(error){keyStatus.textContent=String(error)}
  };
  el('generationTestKey').onclick=async()=>{const button=el('generationTestKey');button.disabled=true;keyStatus.textContent='Testing connection…';try{await invoke('verify_api_key');s.connected=true;keyStatus.textContent='Connection verified. Individual model access and available quota may differ.';s.message=''}catch(error){keyStatus.textContent=String(error)}finally{button.disabled=false;refreshGeneration()}};
  refreshGeneration();
  if(invoke){try{s.connected=await invoke('generation_status')}catch{s.message='This desktop build needs updating to use Generate.'}refreshGeneration()}
}
const generationActivity=document.createElement('button');generationActivity.id='generationActivity';generationActivity.hidden=true;generationActivity.className='generation-activity';generationActivity.onclick=()=>{const running=[...generationSessions.entries()].find(([,s])=>s.busy);if(running&&state.patients.some(p=>p.id===running[0])){pushHistory();state.activeId=running[0];render();}generationPanel()};document.body.appendChild(generationActivity);
const leafletPrintPage=document.createElement('div');leafletPrintPage.id='leafletPrintPage';document.body.appendChild(leafletPrintPage);
window.addEventListener('afterprint',()=>document.body.classList.remove('print-leaflet'));
$('#generateMenuButton').onclick=()=>{closeMenus();generationPanel()};
