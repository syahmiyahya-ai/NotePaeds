async page=>{
 const checks=[];const ok=(v,s)=>{if(!v)throw Error(s);checks.push(s)};
 await page.goto('http://127.0.0.1:9211/qa');await page.waitForFunction(()=>window.qa);
 const ed=page.locator('#editor');await ed.fill('Before\nAfter');await ed.evaluate(e=>{e.focus();e.setSelectionRange(7,7)});
 await ed.press('F5');ok(await page.locator('#fbcInput').isVisible(),'F5 opens parser without refreshing');
 await page.locator('#fbcInput').fill('Na 140 mmol/L\nCRP <5 mg/L\nTropI 12 ng/L');
 ok((await page.locator('#fbcPreview').inputValue()).includes('TropI 12 ng/L'),'expanded panels preview');
 await page.locator('#fbcInput').press('F5');ok((await page.locator('#fbcInput').inputValue()).includes('Na 140'),'F5 preserves source');
 await page.locator('#fbcPreview').fill('Reviewed\nRP : Na 140 mmol/L');await page.getByRole('button',{name:'Insert',exact:true}).click();
 ok(await ed.inputValue()==='Before\nReviewed\nRP : Na 140 mmol/L\nAfter','editable preview inserted at original cursor');
 await ed.press('F5');await page.locator('#fbcInput').fill('Na 140\nNa 141');ok((await page.locator('#bloodWarnings').innerText()).includes('Multiple Na'),'conflicting results visible');ok(await page.locator('#fbcPreview').inputValue()==='','conflict omitted');
 await page.locator('#fbcInput').press('Control+Shift+A');ok(await page.locator('#fbcInput').isVisible(),'alarm shortcut preserves open parser');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();const before=await ed.inputValue();await ed.press('F5');await page.locator('#fbcInput').fill('CRP 1');await page.evaluate(()=>qa.addPatient());await page.getByRole('button',{name:'Insert',exact:true}).click();ok(!(await ed.inputValue()).includes('CRP 1'),'patient switch blocks insertion');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await ed.press('Control+Shift+A');ok(await page.locator('#alarmMin').isVisible(),'alarm shortcut opens timer');ok(await page.locator('#alarmMin').evaluate(e=>document.activeElement===e),'alarm minutes focused');await page.locator('#alarmMin').fill('5');await page.locator('#alarmLabel').fill('Synthetic review');await page.locator('#setAlarm').click();ok(await page.evaluate(()=>!!qa.active().alarmAt),'alarm saved to active patient');
 await ed.press('F5');await page.getByRole('button',{name:'Cancel',exact:true}).click();ok(!(await ed.inputValue()).includes('RP :'),'cancel does not insert');
 return {passed:checks.length,checks};
}

