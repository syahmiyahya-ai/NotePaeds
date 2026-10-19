// Routine maintenance: NICE NG29 1.4.1, exact daily Holliday–Segar formula.
// https://www.nice.org.uk/guidance/ng29/chapter/Recommendations
function hollidaySegar(weight,fraction='full'){
  const w=Number(weight);if(!(w>0)||!Number.isFinite(w))throw Error('Enter an explicit positive weight for Holliday–Segar.');
  const factor={full:1,twoThirds:2/3,half:1/2}[fraction];if(!factor)throw Error('Choose Full, 2/3 or Half Maintenance.');
  const daily=(Math.min(w,10)*100+Math.min(Math.max(w-10,0),10)*50+Math.max(w-20,0)*20)*factor;
  return {daily:Number(daily.toFixed(3)),hourly:Number((daily/24).toFixed(3))};
}
function fluidCalculation(v){
  const mode=v.mode||'ml';if(!['ml','perkg','bolus','maintenance'].includes(mode))throw Error('Choose a fluid calculation mode.');
  const input={...v,mode};
  if(mode==='maintenance'){const result=hollidaySegar(v.weight,v.maintenanceFraction||'full');return {...input,maintenanceFraction:v.maintenanceFraction||'full',volume:String(result.daily),rate:String(result.hourly),duration:'24',durationUnit:'hours',calculate:''}}
  if(mode==='perkg'||mode==='bolus'){
    const dose=Number(v.mlPerKg);if(!(dose>0)||!Number.isFinite(dose))throw Error('Enter the fluid dose in mL/kg.');
    if(v.weight!==''&&v.weight!=null&&(!(Number(v.weight)>0)||!Number.isFinite(Number(v.weight))))throw Error('Weight must be positive or blank.');
    input.volume=v.weight?inlineNumber(dose*Number(v.weight)):'';
  }
  for(const key of ['volume','rate','duration'])if(input[key]!==''&&input[key]!=null&&(!(Number(input[key])>0)||!Number.isFinite(Number(input[key]))))throw Error('Volume, rate and duration must be positive or blank.');
  const hours=Number(input.duration)/(input.durationUnit==='minutes'?60:1);
  if(input.calculate==='rate'){if(!input.volume||!hours)throw Error('Enter volume (or dose and weight) and duration.');input.rate=inlineNumber(Number(input.volume)/hours)}
  if(input.calculate==='duration'){if(!input.volume||!input.rate)throw Error('Enter volume (or dose and weight) and rate.');input.duration=inlineNumber(Number(input.volume)/Number(input.rate)*(input.durationUnit==='minutes'?60:1))}
  return input;
}
function fluidNoteRate(rate){const n=Number(rate);return n>=1?String(Math.round(n)):inlineNumber(n)}
function maintenancePurposeParts(purpose){
  const text=String(purpose||'').trim(),m=text.match(/^(full|half|2\/3)\s+maint\w*(?:\s+—\s+([\s\S]*))?$/i);
  return m?{fraction:{full:'full',half:'half','2/3':'twoThirds'}[m[1].toLowerCase()],label:text.split(' — ')[0],extra:m[2]||''}:null;
}
function maintenanceNotePurpose(v){
  const fraction=v.maintenanceFraction||'full',label={full:'Full Maintenance',twoThirds:'2/3 Maintenance',half:'Half Maintenance'}[fraction],purpose=String(v.purpose||'').trim();
  if(!purpose)return label;
  const old=maintenancePurposeParts(purpose);if(old)return (old.fraction===fraction?old.label:label)+(old.extra?' — '+old.extra:'');
  return label+' — '+purpose;
}
fluidOrder=function(v){
  if(!String(v.fluid||'').trim())throw Error('Enter the fluid name.');const f=fluidCalculation(v);let text='IV fluids '+f.fluid.trim()+' ';
  if(f.mode==='maintenance')text+=fluidNoteRate(f.rate)+'mL/hour';
  else {text+=(f.mode==='perkg'||f.mode==='bolus')?inlineNumber(f.mlPerKg)+'mL/kg'+(f.volume?' ('+f.volume+'mL)':''):(f.volume||'<volume>')+' mL';if(f.mode==='bolus')text+=' bolus';if(f.rate)text+=' at '+f.rate+' mL/hour';if(f.duration)text+=' over '+f.duration+' '+(f.durationUnit||'hours')}
  const purpose=f.mode==='maintenance'?maintenanceNotePurpose(f):String(f.purpose||'').trim();
  return text+(purpose?' — '+purpose:'')+(f.instructions?'\n'+f.instructions:'');
};
function fluidTemplateEntry(v){
  const template={fluid:v.fluid,purpose:v.purpose,instructions:v.instructions,mode:v.mode||'ml',durationUnit:v.durationUnit||'hours'};
  if(['perkg','bolus'].includes(template.mode))template.mlPerKg=v.mlPerKg;
  if(template.mode==='maintenance')template.maintenanceFraction=v.maintenanceFraction||'full';
  const text=template.mode==='maintenance'?'IV fluids '+v.fluid+' — '+maintenanceNotePurpose(template)+' (enter patient weight)':fluidOrder({...template,weight:'',volume:'',rate:'',duration:'',calculate:''});
  return {text,fluidTemplate:template};
}
function parseFluid921(a){
  const prior=a.fluidInput||{},weight=prior.weight||patientWeight(active().text)||'';
  const compact=a.text.match(/^IV fluids:? (.+?) (\d+(?:\.\d+)?)mL\/hour(?: — ([^\n]*))?(?:\n([\s\S]*))?$/);
  if(compact&&prior.mode==='maintenance')return {fluid:true,compact:true,input:{...prior,fluid:compact[1],mode:'maintenance',maintenanceFraction:maintenancePurposeParts(compact[3])?.fraction||prior.maintenanceFraction||'full',weight,rate:compact[2],purpose:compact[3]||'',instructions:compact[4]||'',calculate:''},writtenVolume:null,writtenRate:Number(compact[2])};
  const maintenance=a.text.match(/^IV fluids:? (.+?) (\d+(?:\.\d+)?)mL\/24 hours \((\d+(?:\.\d+)?)mL\/hour\) — Holliday–Segar maintenance(?: — ([^\n]*))?(?:\n([\s\S]*))?$/);
  if(maintenance)return {fluid:true,input:{fluid:maintenance[1],mode:'maintenance',maintenanceFraction:maintenancePurposeParts(maintenance[4])?.fraction||prior.maintenanceFraction||'full',weight,volume:maintenance[2],rate:maintenance[3],duration:'24',durationUnit:'hours',purpose:maintenance[4]||'',instructions:maintenance[5]||'',calculate:''},writtenVolume:Number(maintenance[2]),writtenRate:Number(maintenance[3])};
  const perkg=a.text.match(/^IV fluids:? (.+?) (\d+(?:\.\d+)?)mL\/kg(?: \((\d+(?:\.\d+)?)mL\))?( bolus)?(?: at (\d+(?:\.\d+)?) mL\/hour)?(?: over (\d+(?:\.\d+)?) (hours|minutes))?(?: — ([^\n]*))?(?:\n([\s\S]*))?$/);
  if(perkg)return {fluid:true,input:{fluid:perkg[1],mode:perkg[4]?'bolus':'perkg',mlPerKg:perkg[2],weight,volume:perkg[3]||'',rate:perkg[5]||'',duration:perkg[6]||'',durationUnit:perkg[7]||prior.durationUnit||'hours',purpose:perkg[8]||'',instructions:perkg[9]||'',calculate:''},writtenVolume:perkg[3]?Number(perkg[3]):null};
  const fixed=a.text.match(/^IV fluids:? (.+?) (\d+(?:\.\d+)?) mL(?: at (\d+(?:\.\d+)?) mL\/(?:hour|hr))?(?: over (\d+(?:\.\d+)?) (hours|minutes))?(?: — ([^\n]*))?(?:\n([\s\S]*))?$/);
  if(fixed)return {fluid:true,input:{fluid:fixed[1],mode:'ml',volume:fixed[2],rate:fixed[3]||'',duration:fixed[4]||'',durationUnit:fixed[5]||'hours',purpose:fixed[6]||'',instructions:fixed[7]||'',calculate:'',weight}};
  return null;
}
function fluidMismatch921(parsed){
  const v=parsed.input;try{
    if(v.mode==='maintenance'){
      if(!v.weight)return null;const r=hollidaySegar(v.weight,v.maintenanceFraction||'full');
      if(parsed.compact){const expected=Number(fluidNoteRate(r.hourly));if(expected===parsed.writtenRate)return null;return {message:`Calculated maintenance rate: ${r.hourly}mL/hour; rounded note rate: ${expected}mL/hour. The written rate is ${parsed.writtenRate}mL/hour.`,text:fluidOrder(v),input:fluidCalculation(v)}}
      if(r.daily===parsed.writtenVolume&&r.hourly===parsed.writtenRate)return null;
      return {message:`Holliday–Segar at ${v.weight}kg gives ${r.daily}mL/24 hours (${r.hourly}mL/hour). The written values are ${parsed.writtenVolume}mL/24 hours and ${parsed.writtenRate}mL/hour.`,text:fluidOrder(v),input:fluidCalculation(v)};
    }
    let input={...v};if(v.mode==='perkg'||v.mode==='bolus'){
      if(!v.weight)return null;input=fluidCalculation(v);if(parsed.writtenVolume!==null&&Number(input.volume)!==parsed.writtenVolume)return {message:`${v.mlPerKg}mL/kg × ${v.weight}kg = ${input.volume}mL, but the written volume is ${parsed.writtenVolume}mL.`,text:fluidOrder(input),input};
    }
    if(!input.volume||!input.rate||!input.duration)return null;const expected=Number((Number(input.volume)/(Number(input.duration)/(input.durationUnit==='minutes'?60:1))).toFixed(3));if(expected===Number(input.rate))return null;
    input={...input,rate:String(expected)};return {message:`${input.volume}mL over ${input.duration} ${input.durationUnit||'hours'} = ${expected}mL/hour, but the written rate is ${v.rate}mL/hour.`,text:fluidOrder(input),input};
  }catch{return null}
}
function installFluidControls(v){
  const row=inlinePanel.querySelector('.linear-row'),modeLabel=document.createElement('label');modeLabel.className='wide';modeLabel.innerHTML='Calculation<select data-field="mode" aria-label="Fluid calculation"><option value="ml">Direct mL</option><option value="perkg">mL/kg</option><option value="bolus">Bolus (mL/kg)</option><option value="maintenance">Holliday–Segar</option></select>';row.prepend(modeLabel);
  const fractionLabel=document.createElement('label');fractionLabel.className='wide';fractionLabel.innerHTML='Maintenance<select data-field="maintenanceFraction" aria-label="Maintenance fraction"><option value="full">Full Maintenance</option><option value="twoThirds">2/3 Maintenance</option><option value="half">Half Maintenance</option></select>';modeLabel.after(fractionLabel);fractionLabel.querySelector('select').value=v.maintenanceFraction||'full';
  const dose=document.createElement('div');dose.innerHTML=inlineField('mlPerKg','Dose (mL/kg)',v.mlPerKg||'')+inlineField('weight','Weight (kg)',v.weight||patientWeight(active().text)||'');const volume=inlinePanel.querySelector('[data-field=volume]').closest('label');while(dose.firstChild)row.insertBefore(dose.firstChild,volume);
  const durationUnit=document.createElement('label');durationUnit.innerHTML='Time unit<select data-field="durationUnit" aria-label="Fluid time unit"><option value="hours">Hours</option><option value="minutes">Minutes</option></select>';inlinePanel.querySelector('[data-field=duration]').closest('label').after(durationUnit);
  modeLabel.querySelector('select').value=v.mode||'ml';durationUnit.querySelector('select').value=v.durationUnit||'hours';
  const help=document.createElement('div');help.id='fluidCalculationHelp';help.className='inline-hint';row.after(help);
  const control=k=>inlinePanel.querySelector(`[data-field=${k}]`);
  const refresh=()=>{const mode=control('mode').value,hs=mode==='maintenance',kg=mode==='perkg'||mode==='bolus';fractionLabel.hidden=!hs;control('mlPerKg').closest('label').hidden=!kg;control('weight').closest('label').hidden=mode==='ml';volume.hidden=kg;durationUnit.hidden=hs;for(const key of ['volume','rate','duration'])control(key).readOnly=hs;control('calculate').disabled=hs;
    volume.firstChild.textContent=hs?'Volume (mL/24h)':'Volume (mL)';const timeLabel='Duration ('+(hs?'hours':control('durationUnit').value)+')';control('duration').closest('label').firstChild.textContent=timeLabel;control('duration').setAttribute('aria-label',timeLabel);
    if(hs){try{const r=hollidaySegar(control('weight').value,control('maintenanceFraction').value);control('volume').value=String(r.daily);control('rate').value=String(r.hourly);control('duration').value='24'}catch{control('volume').value='';control('rate').value='';control('duration').value=''}}
    help.textContent=hs?'Holliday–Segar: 100 / 50 / 20 mL/kg/day across the first 10kg, next 10kg and remaining weight. Hourly rate = daily volume ÷ 24. The inserted note shows the rounded hourly rate and purpose; full calculation stays here. Rates below 1mL/hour retain decimals. Routine maintenance only; neonatal and condition-specific fluid plans need separate review. Reference: NICE NG29 1.4.1.':mode==='bolus'?'Enter the bolus dose and any timing explicitly. No bolus dose or speed is assumed.':kg?'An explicit weight calculates the total volume. Without weight, only mL/kg is inserted.':'';
  };
  control('mode').addEventListener('input',()=>{for(const key of ['volume','rate','duration','calculate'])control(key).value='';control('durationUnit').value=control('mode').value==='bolus'?'minutes':'hours';refresh()});control('weight').addEventListener('input',refresh);control('durationUnit').addEventListener('input',refresh);control('maintenanceFraction').addEventListener('input',()=>{const purpose=control('purpose');if(/^(full|half|2\/3)\s+maint\w*$/i.test(purpose.value.trim()))purpose.value='';refresh()});refresh();
}
