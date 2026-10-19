function resusResults(def,weight){
  if(!Number.isFinite(weight)||weight<=0)throw Error('Enter a positive weight in kg.');
  return def.rows.map(row=>{const values=row.factors.map((factor,i)=>{let value=weight*factor;if(row.minimum!=null)value=Math.max(row.minimum,value);if(row.caps?.[i]!=null)value=Math.min(row.caps[i],value);if(row.round!=null)value=Math.round(value*10**row.round)/10**row.round;return Number(value.toPrecision(10));});return {row,values,text:row.name+': '+values.join('–')+' '+row.unit};});
}
function resusCalculator(id){
  const def=calculators.find(d=>d.id===id);if(!def)return;
  const patientId=active().id;
  openDialog(def.title,'<div class="field"><label for="resusWeight">Child’s weight (kg)</label><input class="input" id="resusWeight" type="number" min="0" step="any" value="'+esc(patientWeight(active().text))+'"></div><div class="tiny">'+esc(def.note||'')+'</div><div id="resusResults" aria-live="polite"></div>',[{label:'Close'},{label:'Copy all',close:false,fn:async()=>{try{const results=read();await navigator.clipboard.writeText('Resus medication calculations — '+$('#resusWeight').value+' kg\n'+results.map(r=>r.text).join('\n'));toast('Resus calculations copied.')}catch(e){toast(e.message)}}}]);
  const read=()=>{if(active().id!==patientId)throw Error('Return to the original patient.');return resusResults(def,Number($('#resusWeight').value));};
  const update=()=>{try{const results=read();$('#resusResults').innerHTML='<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr><th align="left">Medication / intervention</th><th align="left">Calculated dose</th></tr></thead><tbody>'+results.map((r,i)=>'<tr><td style="padding:8px 4px;border-bottom:1px solid #ddd">'+esc(r.row.name)+'<div class="tiny">'+esc(r.row.regimen||'')+'</div></td><td style="padding:8px 4px;border-bottom:1px solid #ddd"><button class="btn" data-resus-copy="'+i+'">'+esc(r.values.join('–')+' '+r.row.unit)+'</button></td></tr>').join('')+'</tbody></table>';$$('[data-resus-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(read()[Number(b.dataset.resusCopy)].text);toast('Copied.')}catch(e){toast(e.message)}})}catch(e){$('#resusResults').textContent=e.message}};
  $('#resusWeight').oninput=update;update();$('#resusWeight').focus();
}
function validateResus(e){
  if(!Array.isArray(e.rows)||!e.rows.length||e.rows.length>100)throw Error('Resus calculator needs 1–100 rows.');
  for(const r of e.rows){if(typeof r.name!=='string'||typeof r.unit!=='string'||!Array.isArray(r.factors)||!r.factors.length||r.factors.length>2||r.factors.some(n=>!Number.isFinite(n)||n<=0))throw Error('Invalid resus row.');if(r.caps&&(!Array.isArray(r.caps)||r.caps.length!==r.factors.length||r.caps.some(n=>n!==null&&(!Number.isFinite(n)||n<=0))))throw Error('Invalid resus maximum.');if(r.minimum!=null&&(!Number.isFinite(r.minimum)||r.minimum<0))throw Error('Invalid resus minimum.');if(r.round!=null&&(!Number.isInteger(r.round)||r.round<0||r.round>6))throw Error('Invalid resus rounding.');}
}
