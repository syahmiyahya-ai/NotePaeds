async page=>{
  const checks=[],ok=(b,n)=>{if(!b)throw Error(n);checks.push(n)};
  await page.evaluate(()=>{localStorage.clear();localStorage.setItem('notepaeds-v8-notepad-shell-prefs',JSON.stringify({moduleAutoCheck:false}))});await page.reload();await page.waitForFunction(()=>!!window.qa);
  const results=await page.evaluate(()=>{
    const q=qa,checks=[],ok=(b,n)=>checks.push([!!b,n]);const v={mode:'maintenance',fluid:'NSD5%',weight:'41.4',maintenanceFraction:'full',purpose:'Full Maintenace',instructions:''};
    ok(q.fluidOrder(v)==='IV fluids NSD5% 80mL/hour — Full Maintenace','exact requested full-maintenance text');
    ok(q.fluidOrder({...v,maintenanceFraction:'twoThirds'})==='IV fluids NSD5% 54mL/hour — 2/3 Maintenance','two thirds applied before rounding');
    ok(q.fluidOrder({...v,maintenanceFraction:'half'})==='IV fluids NSD5% 40mL/hour — Half Maintenance','half maintenance compact output');
    ok(q.fluidOrder({...v,purpose:''}).endsWith('— Full Maintenance'),'default full label');
    ok(q.fluidOrder({...v,purpose:'Full Maintenance — review'}).endsWith('— Full Maintenance — review'),'custom purpose not duplicated');
    ok(q.fluidOrder({...v,weight:'0.1',purpose:''}).includes('0.417mL/hour'),'sub-unit rate never rounded to zero');
    const a={text:q.fluidOrder(v),fluidInput:v};ok(!q.inlineMismatch(a),'rounded full rate is not a mismatch');
    ok(q.inlineMismatch({...a,text:a.text.replace('80mL/hour','79mL/hour')})?.text===a.text,'changed hourly rate recalculates');
    const half={...a,text:'IV fluids NSD5% 80mL/hour — Half Maintenance'};ok(q.inlineMismatch(half)?.text==='IV fluids NSD5% 40mL/hour — Half Maintenance','manual fraction edit is tracked');
    const legacy={...a,text:'IV fluids: NSD5% 1928mL/24 hours (80.333mL/hour) — Holliday–Segar maintenance — Full Maintenace'};ok(!q.inlineMismatch(legacy),'old verbose notes remain compatible');
    ok(q.parsedInlineAnchor(legacy).input.mode==='maintenance','old note reopens as maintenance');
    return checks;
  });results.forEach(([b,n])=>ok(b,n));
  const editor=page.locator('#editor');await editor.fill('Weight: 41.4 kg\n;;iv fluids');await editor.press('Enter');await page.getByRole('textbox',{name:'Fluid',exact:true}).fill('NSD5%');await page.getByRole('combobox',{name:'Fluid calculation',exact:true}).selectOption('maintenance');await page.getByRole('textbox',{name:'Purpose',exact:true}).fill('Full Maintenace');
  ok(await page.locator('#inlinePreview').innerText()==='IV fluids NSD5% 80mL/hour — Full Maintenace','editor preview matches exact request');ok(await page.locator('[data-field=volume]').inputValue()==='1928'&&await page.locator('[data-field=rate]').inputValue()==='80.333','exact calculation retained in editor');
  await page.getByRole('combobox',{name:'Maintenance fraction',exact:true}).selectOption('twoThirds');ok(await page.locator('#inlinePreview').innerText()==='IV fluids NSD5% 54mL/hour — 2/3 Maintenance','two-thirds selector updates preview');ok(await page.locator('[data-field=volume]').inputValue()==='1285.333','two-thirds daily detail retained');
  await page.getByRole('combobox',{name:'Maintenance fraction',exact:true}).selectOption('half');ok(await page.locator('#inlinePreview').innerText()==='IV fluids NSD5% 40mL/hour — Half Maintenance','half selector updates preview');
  await page.getByRole('combobox',{name:'Save choice',exact:true}).selectOption('new');await page.getByRole('textbox',{name:'Saved regimen name',exact:true}).fill('QA half maintenance');await page.getByRole('button',{name:'Apply',exact:true}).click();ok((await editor.inputValue()).endsWith('IV fluids NSD5% 40mL/hour — Half Maintenance'),'compact note applied');ok(await page.locator('.mismatch').count()===0,'rounded half rate is not red');
  const template=await page.evaluate(()=>{const a=qa.active().medicationAnchors[0];return qa.getModules().medications.entries.find(x=>x.id===a.medId).fluidTemplate});ok(template.maintenanceFraction==='half'&&!template.weight&&!template.volume&&!template.rate,'template saves fraction without patient totals');
  await editor.focus();await editor.press('Alt+Enter');ok(await page.getByRole('combobox',{name:'Maintenance fraction',exact:true}).inputValue()==='half','compact note reopens with selected fraction');await page.screenshot({path:'output/playwright/fluid-compact-maintenance.png'});await page.keyboard.press('Escape');
  await page.evaluate(r=>window.__fluidDisplayChecks=r,{passed:checks.length,checks});
}
