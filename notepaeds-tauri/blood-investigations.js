// Local, label-based extraction. No reference-range or clinical interpretation.
const bloodFields=[
 ['FBC','hb','Hb',String.raw`H(?:B|GB)|Haemoglobin|Hemoglobin`],
 ['FBC','wbc','WBC',String.raw`WBC|White[ \t]+(?:Blood[ \t]+)?Cells?(?:[ \t]+Count)?`],
 ['FBC','plt','PLT',String.raw`PLT|Platelets?(?:[ \t]+Count)?`],
 ['FBC2','hct','HCT',String.raw`PCV|HCT|Haematocrit|Hematocrit`],['FBC2','mcv','MCV','MCV'],['FBC2','mchc','MCHC','MCHC'],
 ['RP','na','Na',String.raw`Sodium|Na(?:\+)?`],['RP','k','K',String.raw`Potassium|K(?:\+)?`],
 ['RP','urea','Urea',String.raw`Urea|Ur`],['RP','cr','Cr',String.raw`Creatinine|Creat|Cr`],
 ['RP','cl','Cl',String.raw`Chloride|Cl(?:-)?`],['RP','hco3','HCO3',String.raw`Bicarbonate|HCO3(?:-)?|HCO₃(?:⁻)?`],
 ['RP','egfr','eGFR',String.raw`eGFR|Estimated[ \t]+GFR`],['RP','bun','BUN',String.raw`Blood[ \t]+Urea[ \t]+Nitrogen|Urea[ \t]+Nitrogen|BUN`],
 ['LFT','alt','ALT',String.raw`ALT|SGPT|Alanine[ \t]+(?:Aminotransferase|Transaminase)`],
 ['LFT','ast','AST',String.raw`AST|SGOT|Aspartate[ \t]+(?:Aminotransferase|Transaminase)`],
 ['LFT','alp','ALP',String.raw`ALP|Alkaline[ \t]+Phosphatase`],['LFT','ggt','GGT',String.raw`GGT|Gamma[ \t-]+(?:Glutamyl[ \t]+Transferase|GT)`],
 ['LFT','tbili','T.Bili',String.raw`Total[ \t]+Bilirubin|T\.?[ \t]*Bili(?:rubin)?|TBIL|Bilirubin`],
 ['LFT','dbili','D.Bili',String.raw`Direct[ \t]+Bilirubin|Conjugated[ \t]+Bilirubin|D\.?[ \t]*Bili(?:rubin)?|DBIL`],
 ['LFT','alb','Alb',String.raw`Albumin|Alb`],['LFT','tp','TP',String.raw`Total[ \t]+Protein|T\.?[ \t]*Protein|TP`],
 ['CRP','crp','CRP',String.raw`C[ \t-]*Reactive[ \t]+Protein|CRP`],
 ['Minerals','ca','Ca',String.raw`Total[ \t]+Calcium|Calcium|Ca(?:\+\+)?`],
 ['Minerals','cca','Adj.Ca',String.raw`(?:Corrected|Adjusted)[ \t]+(?:Calcium|Ca)|(?:cCa|Adj\.?[ \t]*Ca)`],
 ['Minerals','ica','iCa',String.raw`Ionis?ed[ \t]+Calcium|Ionized[ \t]+Calcium|iCa`],
 ['Minerals','mg','Mg',String.raw`Magnesium|Mg`],['Minerals','po4','PO4',String.raw`Inorganic[ \t]+(?:Phosphate|Phosphorus)|Phosphate|Phosphorus|PO4|PO₄`],
 ['Cardiac','tropi','TropI',String.raw`(?:hs[ \t-]*)?(?:Troponin[ \t-]*I|Trop[ \t-]*I|TnI)`],
 ['Cardiac','tropt','TropT',String.raw`(?:hs[ \t-]*)?(?:Troponin[ \t-]*T|Trop[ \t-]*T|TnT)`],
 ['Coag','pt','PT',String.raw`Prothrombin[ \t]+Time|PT`],['Coag','aptt','APTT',String.raw`Activated[ \t]+Partial[ \t]+Thromboplastin[ \t]+Time|aPTT|APTT`],
 ['Coag','inr','INR','INR'],['Coag','ddimer','D-dimer',String.raw`D[ \t-]*Dimer`],['Coag','fibrinogen','Fibrinogen','Fibrinogen'],
 ['TFT','tsh','TSH',String.raw`Thyroid[ \t]+Stimulating[ \t]+Hormone|TSH`],['TFT','ft4','FT4',String.raw`Free[ \t]+T4|FT4`],['TFT','ft3','FT3',String.raw`Free[ \t]+T3|FT3`],
 ['Lipids','chol','Chol',String.raw`Total[ \t]+Cholesterol|Cholesterol|Chol`],['Lipids','ldl','LDL',String.raw`LDL(?:[ \t-]+Cholesterol)?`],['Lipids','hdl','HDL',String.raw`HDL(?:[ \t-]+Cholesterol)?`],['Lipids','tg','TG',String.raw`Triglycerides?|TG`],
 ['Gas','ph','pH','pH'],['Gas','pco2','pCO2',String.raw`pCO2|pCO₂`],['Gas','po2','pO2',String.raw`pO2|pO₂`],['Gas','be','BE',String.raw`Base[ \t]+Excess|BE`],
 ['Other','esr','ESR',String.raw`Erythrocyte[ \t]+Sedimentation[ \t]+Rate|ESR`],['Other','pct','Procalcitonin',String.raw`Procalcitonin`],
 ['Other','lactate','Lactate',String.raw`Lactate|Lactic[ \t]+Acid`],['Other','glucose','Glucose',String.raw`Blood[ \t]+Glucose|Glucose|Random[ \t]+Blood[ \t]+Sugar|RBS|FBS`],
 ['Other','hba1c','HbA1c',String.raw`HbA1c|Ha?emoglobin[ \t]+A1c|Glycated[ \t]+Ha?emoglobin`],
 ['Other','ck','CK',String.raw`Creatine[ \t]+Kinase|CK|CPK`],['Other','ldh','LDH',String.raw`Lactate[ \t]+Dehydrogenase|LDH`],
 ['Other','amylase','Amylase','Amylase'],['Other','lipase','Lipase','Lipase'],['Other','ferritin','Ferritin','Ferritin'],['Other','urate','Urate',String.raw`Uric[ \t]+Acid|Urate`]
].map(([panel,id,label,alias])=>({panel,id,label,alias}));
const bloodUnitPattern=String.raw`(?:mL\s*\/\s*min\s*\/\s*1\.73\s*m(?:2|²)|(?:[x×]\s*)?10(?:\^|\*|\*\*)?(?:9|12)\s*\/\s*L|(?:mmol|µmol|μmol|umol|pmol|nmol|mEq|mg|ng|pg|µg|μg|ug|mcg|g|mIU|µIU|μIU|uIU|IU|mU|U)\s*\/\s*(?:dL|mL|L|mol)|mmHg|kPa|mm\s*\/\s*h(?:r)?|seconds?|secs?|s|fL|pg|%)`;
function bloodNumber(value){if(!/\d/.test(value))return value.replace(/[ \t]+/g,' ');return value.replace(/(\.\d*?[1-9])0+(?=[eE]|$)|\.0+(?=[eE]|$)/,'$1').replace(/[ \t]+/g,'')}
function parseBloodInvestigations(raw){
 const source=String(raw||'').replace(/\*\*|__/g,'').replace(/\r/g,'');const candidates=[];
 for(const field of bloodFields){
  const pattern=new RegExp(String.raw`(^|[\s|;/])(?<label>${field.alias})(?![A-Za-z0-9])[ \t]*(?:[([](?<preunit>${bloodUnitPattern})[)\]][ \t]*)?(?:[:=|][ \t]*)?(?:(?<bareunit>${bloodUnitPattern})[ \t]*(?:[|:][ \t]*)?)?(?:(?:Critical[ \t]+)?(?:High|Low|H|L)[ \t]+)?(?<value>(?:[<>≤≥]=?[ \t]*)?[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?|Not[ \t]+Detected|Non[ \t-]*Reactive|Negative|Positive|Reactive|Detected|Pending|Haemolysed|Hemolyzed)(?![A-Za-z\d.,]|[ \t]*[-–—~][ \t]*\d)(?:[ \t]*(?:\|[ \t]*)?(?<postunit>${bloodUnitPattern})(?![A-Za-z]))?`,'gimu');
  for(const match of source.matchAll(pattern)){
   const labelStart=match.index+match[1].length,labelEnd=labelStart+match.groups.label.length;
   // A generic alias must not consume the tail of a more specific label.
   if(/^hs[ \t-]*$/i.test(source.slice(Math.max(0,labelStart-3),labelStart))&&!/^hs/i.test(match.groups.label))continue;
   const unit=(match.groups.postunit||match.groups.preunit||match.groups.bareunit||'').trim();let label=field.label;
   if(/^hs/i.test(match.groups.label)&&/^Trop/.test(label))label='hs-'+label;
   candidates.push({field,label,labelStart,labelEnd,value:bloodNumber(match.groups.value),unit});
  }
 }
 candidates.sort((a,b)=>(b.labelEnd-b.labelStart)-(a.labelEnd-a.labelStart)||a.labelStart-b.labelStart);
 const accepted=[];for(const candidate of candidates)if(!accepted.some(other=>candidate.labelStart<other.labelEnd&&candidate.labelEnd>other.labelStart))accepted.push(candidate);
 const values={},warnings=[],items=[];
 for(const field of bloodFields){const readings=accepted.filter(x=>x.field.id===field.id);const unique=[...new Map(readings.map(x=>[[x.label,x.value,x.unit.toLowerCase().replace(/\s/g,'')].join('|'),x])).values()];if(unique.length>1){warnings.push('Multiple '+field.label+' results: '+unique.map(x=>x.value+(x.unit?' '+x.unit:'')).join('; ')+'. Not inserted automatically; choose the intended result in the preview.');continue}if(unique.length){const item=unique[0];values[field.id]=item.value;items.push(item)}}
 const format=item=>item.label+' '+item.value+(/^FBC/.test(item.field.panel)||!item.unit?'':' '+item.unit);
 const byPanel=panel=>items.filter(item=>item.field.panel===panel).map(format);
 const lines=[],fbc=byPanel('FBC'),fbc2=byPanel('FBC2');if(fbc.length)lines.push('FBC : '+fbc.join(' / '));else if(fbc2.length)lines.push('FBC :');if(fbc2.length)lines.push(fbc2.join(' / '));
 for(const panel of ['RP','LFT','CRP','Minerals','Cardiac','Coag','TFT','Lipids','Gas','Other']){const found=byPanel(panel);if(!found.length)continue;if(['CRP','Minerals','Cardiac','Other'].includes(panel))lines.push(found.join(' / '));else{let label=panel;if(panel==='Gas')label=/\bVBG\b/i.test(source)&&!/\bABG\b/i.test(source)?'VBG':/\bABG\b/i.test(source)&&!/\bVBG\b/i.test(source)?'ABG':'Blood gas';lines.push(label+' : '+found.join(' / '))}}
 return {values,items,warnings,text:lines.join('\n')};
}

// BLOOD_PARSER_UI
fbcParser=function(){
 if($('#fbcInput')&&$('#dialog').classList.contains('show')){$('#fbcInput').focus();return}
 const target=inlineTarget();openDialog('Blood investigations parser','<p class="tiny">Paste labelled results. FBC, RP, LFT, CRP, Ca/Mg/PO4, troponin, coagulation, TFT, lipids, blood gas and common additional tests are recognised. Supplied units and comparison signs are preserved; no results or normal ranges are invented.</p><label for="fbcInput">Source report</label><textarea id="fbcInput" class="area" spellcheck="false" autocomplete="off" placeholder="Paste your laboratory report here"></textarea><div id="bloodWarnings" role="status"></div><label for="fbcPreview">Review and edit before inserting</label><textarea id="fbcPreview" class="area" spellcheck="false" placeholder="Paste results to preview"></textarea><p class="tiny">Only recognised labels are included. Add other tests by editing this preview. Changing the source regenerates the preview. Parsing runs locally.</p>',[{label:'Cancel'},{label:'Insert',primary:true,close:false,fn:()=>{const text=$('#fbcPreview').value.trim();if(!text)return toast('No results to insert.');if(!validInlineTarget(target))return toast('The patient or note changed. Reopen the blood parser.');const before=target.snapshot.slice(0,target.start),after=target.snapshot.slice(target.start+target.text.length);replaceInline(target,(before&&!before.endsWith('\n')?'\n':'')+text+(after&&!after.startsWith('\n')?'\n':''));closeDialog();toast('Blood investigations inserted.')}}]);
 $('#fbcInput').oninput=()=>{const result=parseBloodInvestigations($('#fbcInput').value);$('#fbcPreview').value=result.text;$('#bloodWarnings').textContent=result.warnings.join('\n')||(!result.text&&$('#fbcInput').value.trim()?'No recognised results. Review the source labels.':'');$('#bloodWarnings').style.whiteSpace='pre-wrap'};$('#fbcInput').focus();
};
fbcMenu.innerHTML='Blood investigation parser <span class="shortcut" aria-hidden="true">F5</span>';
const alarmMenu=$('[data-action=timer]');if(alarmMenu)alarmMenu.insertAdjacentHTML('beforeend',' <span class="shortcut" aria-hidden="true">Ctrl+Shift+A</span>');
window.addEventListener('keydown',event=>{
 if(event.isComposing||event.repeat)return;const blood=event.key==='F5'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey,alarm=event.ctrlKey&&event.shiftKey&&!event.metaKey&&!event.altKey&&event.code==='KeyA';if(!blood&&!alarm)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(blood&&$('#fbcInput')&&$('#dialog').classList.contains('show')){$('#fbcInput').focus();return}
 if(alarm&&$('#alarmMin')&&$('#dialog').classList.contains('show')){$('#alarmMin').focus();$('#alarmMin').select();return}
 if($('#dialog').classList.contains('show')||inlineSession){toast('Apply, cancel or close the current editor first.');return}
 closeMenus();if(blood)fbcParser();else{timerDialog();$('#alarmMin')?.focus();$('#alarmMin')?.select()}
},true);
const shortcutsBeforeBlood=shortcuts;shortcuts=function(){shortcutsBeforeBlood();const preview=$('#dialogBody .preview');if(preview)preview.textContent='F5 — Blood investigations parser\nCtrl+Shift+A — Patient alarm\n'+preview.textContent};
