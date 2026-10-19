async page=>{
  const checks=[],ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
  await page.goto('http://127.0.0.1:9211/qa');await page.evaluate(()=>localStorage.setItem('notepaeds-v8-notepad-shell-prefs',JSON.stringify({moduleAutoCheck:false})));await page.reload();await page.waitForFunction(()=>window.qa);
  const ed=page.locator('#editor');
  for(const [token,bed] of [['@B1','Bed 1'],['@b8','Bed 8'],['@E2','EYZ 2'],['@e4','EYZ 4'],['@C3','Cor 3'],['@c4','Cor 4'],['@i2','ISL 2'],['@I1','ISL 1']]){
    await ed.fill('Before\n'+token+'\nAfter');await ed.evaluate((e,n)=>e.setSelectionRange(n,n),7+token.length);await ed.press('Enter');ok(await ed.inputValue()==='Before\n\nAfter','only token removed '+token);ok(await page.evaluate(b=>qa.active().bed===b&&qa.active().zone==='yellow',bed),'assigned '+bed);ok(await ed.evaluate(e=>e.selectionStart===7),'caret stays at token '+token);
  }
  for(const token of ['@5405','@0054']){await ed.fill(token);await ed.press('Enter');ok(await page.evaluate(q=>qa.active().qms===q&&qa.active().zone==='green',token.slice(1)),'QMS '+token);ok(await ed.inputValue()==='','QMS token removed');}
  for(const token of ['@B9','@E5','@i0','@C5','test@5405','@B1x']){await ed.fill(token);const before=await page.evaluate(()=>JSON.stringify([qa.active().zone,qa.active().bed,qa.active().qms]));await ed.press('Enter');ok((await ed.inputValue()).startsWith(token),'literal '+token);ok(await page.evaluate(()=>JSON.stringify([qa.active().zone,qa.active().bed,qa.active().qms]))===before,'unchanged location '+token)}
  await ed.fill('@B1suffix');await ed.evaluate(e=>e.setSelectionRange(3,3));await ed.press('Enter');ok((await ed.inputValue()).startsWith('@B1\nsuffix'),'partial token ignored');
  await ed.fill('@B1');await ed.press('Shift+Enter');ok((await ed.inputValue()).startsWith('@B1'),'modified Enter ignored');
  await ed.fill('@B1');await ed.press('Enter');await page.getByRole('button',{name:'Bed / QMS',exact:true}).click();ok(await page.locator('#patientBed').inputValue()==='Bed 1','dialog reflects shortcut');
  const rect=async b=>page.locator('[data-zone-bed="'+b+'"]').boundingBox();const b6=await rect('Bed 6'),b3=await rect('Bed 3'),b5=await rect('Bed 5'),b4=await rect('Bed 4'),c4=await rect('Cor 4'),c1=await rect('Cor 1');ok(b6.x<b3.x&&b5.x<b4.x&&Math.abs(b6.y-b3.y)<2,'bed columns');ok(c4.x>b3.x&&c4.x<c1.x&&c4.y>b4.y,'corridor lower right');
  ok(await page.locator('.zone-bed.standard').first().evaluate(e=>getComputedStyle(e).borderColor)==='rgb(246, 165, 0)','orange beds');ok(await page.locator('.zone-bed.isolation').first().evaluate(e=>getComputedStyle(e).borderColor)==='rgb(227, 39, 131)','pink isolation');ok(await page.locator('.zone-bed.corridor').first().evaluate(e=>getComputedStyle(e).borderColor)==='rgb(227, 39, 131)','pink corridor');ok(await page.locator('.yellow-bed-map').evaluate(e=>getComputedStyle(e,':after').backgroundColor)==='rgb(255, 255, 255)','white wall');
  await page.screenshot({path:'output/playwright/location-shortcuts-map.png'});await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.evaluate(()=>qa.saveShift());await page.reload();await page.waitForFunction(()=>window.qa);ok(await page.evaluate(()=>qa.active().bed==='Bed 1'&&qa.active().zone==='yellow'),'shortcut persists restart');
  return {passed:checks.length,checks};
}
