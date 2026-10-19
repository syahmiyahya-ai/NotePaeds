async page=>{
 const checks=[];const ok=(v,s)=>{if(!v)throw Error(s);checks.push(s)};
 await page.setViewportSize({width:1100,height:850});await page.goto('http://127.0.0.1:9211/qa');await page.waitForFunction(()=>window.qa);
 const ed=page.locator('#editor');await ed.fill('Weight: 10 kg\n;;paracetamol');await ed.press('Enter');
 ok(!(await page.locator('#inlineApply').count()),'selection inserts without editor');
 ok((await ed.inputValue()).includes('mg/kg'),'prescription inserted');
 await ed.press('Tab');ok(await page.locator('#inlineApply').isVisible(),'immediate Tab edits');
 const before=await ed.inputValue();await page.locator('[data-field=amount]').fill('20');await page.locator('[data-field=amount]').press('Escape');ok(await ed.inputValue()===before,'Escape preserves inserted prescription');
 await ed.fill('Weight: 10 kg\n;;paracetamol');await ed.press('Enter');await ed.press('End');await ed.type(' x');await ed.press('Tab');ok(!(await page.locator('#inlineApply').count()),'typing cancels Tab opportunity');
 await ed.fill('Weight: 10 kg\n;;paracetamol');await ed.press('Enter');await page.locator('#editInsertedMedication').click();ok(await page.locator('#inlineApply').isVisible(),'discreet edit button');await page.locator('[data-field=amount]').press('Escape');
 await ed.fill('Weight: 10 kg\n;;paracetamol');await ed.press('Enter');await ed.press('Tab');await page.locator('[data-field=duration]').fill('x 5/7');await page.locator('#inlineApply').click();ok((await ed.inputValue()).endsWith('x 5/7'),'duration applies');await ed.press('Alt+Enter');ok((await page.locator('#inlinePreview').innerText()).split('x 5/7').length===2,'reopening does not duplicate duration');await page.locator('[data-field=amount]').press('Escape');
 await ed.fill('Weight: 10 kg\n;;paracetamol');await ed.press('Enter');await page.evaluate(()=>qa.addPatient());await ed.press('Tab');ok(!(await page.locator('#inlineApply').count()),'patient switching cancels edit opportunity');
 await page.locator('#menu-tools').evaluate(e=>e.classList.add('open'));await page.getByRole('button',{name:'Blood investigation parser — FBC',exact:true}).click();
 await page.locator('#fbcInput').fill('**MCHC** 32.80 g/dL (30–36)\nPCV 36.60 %\nRBC 4.85\nMCV 75.60\nPLT 119 Low\nWBC 2.80 Low\nHB 12.00 g/dL');
 ok(await page.locator('#fbcPreview').innerText()==='FBC : Hb 12 / WBC 2.8 / PLT 119\nHCT 36.6 / MCV 75.6 / MCHC 32.8','two-line reordered FBC');
 await page.locator('#fbcInput').fill('Haematocrit: 36.6\nMCH: 24\nRBC: 5');ok(await page.locator('#fbcPreview').innerText()==='FBC :\nHCT 36.6','missing fields omitted');
 await page.locator('#fbcInput').fill('HB (11–15)\nWBC not available');ok((await page.locator('#fbcPreview').innerText()).includes('No recognised'),'ranges never become values');
 return {passed:checks.length,checks};
}
