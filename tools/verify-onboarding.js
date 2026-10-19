async page=>{
 const passed=[],ok=(v,s)=>{if(!v)throw Error(s);passed.push(s)};await page.goto('http://127.0.0.1:9211/qa');await page.waitForFunction(()=>window.qa);
 await page.locator('#editor').fill('TEST NOTE — keep unchanged');const original=await page.evaluate(()=>JSON.stringify(qa.state.patients.map(({history,hi,...patient})=>patient)));
 ok(!(await page.locator('#dialogBody .onboarding-chapters').count()),'no automatic onboarding popup');
 const open=async()=>{await page.locator('#menu-help').evaluate(e=>e.classList.add('open'));await page.locator('#menu-help').getByRole('button',{name:/Quick start/}).click()};await open();
 ok(await page.getByRole('heading',{name:'A quick start',exact:true}).isVisible(),'guide opens from Help');
 const practice=page.locator('#onboardingPractice');await practice.fill('//');await practice.press('Escape');ok(await practice.inputValue()==='//','Escape keeps practice query');ok(await page.locator('#dialog .onboarding-chapters').isVisible(),'practice Escape leaves guide open');
 await practice.fill('//Example');await practice.press('ArrowDown');await practice.press('Enter');ok((await practice.inputValue()).includes('[Practice snippet]'),'sample search selection');
 await page.locator('[data-onboarding-step="1"]').click();await practice.fill('@i2');await practice.press('Enter');ok((await page.locator('#onboardingFeedback').innerText()).includes('ISL 2'),'location practice');
 await page.locator('[data-onboarding-step="4"]').click();await practice.fill(';;');await practice.press('Enter');await practice.press('Tab');ok(await page.locator('#practiceDuration').isVisible(),'medication Tab practice');await page.locator('#practiceDuration').press('Escape');ok(!(await page.locator('#practiceDuration').count()),'practice edit cancels');ok(await page.locator('#dialog .onboarding-chapters').isVisible(),'edit cancellation keeps guide');
 await page.getByRole('button',{name:'Close / resume later',exact:true}).click();await page.reload();await open();ok(await page.getByRole('heading',{name:'Insert first; edit when needed',exact:true}).isVisible(),'resume survives reload');
 await page.locator('[data-onboarding-step="6"]').click();await page.getByRole('button',{name:'Finish',exact:true}).click();ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('notepaeds-onboarding-v1')).complete),'completion persisted');
 await open();await page.getByRole('button',{name:'Restart guide',exact:true}).click();ok(await page.getByRole('heading',{name:'A quick start',exact:true}).isVisible(),'restart guide');
 ok(await page.evaluate(()=>JSON.stringify(qa.state.patients.map(({history,hi,...patient})=>patient)))===original,'all patient data unchanged');await page.setViewportSize({width:720,height:500});ok(await page.locator('#dialog').evaluate(e=>e.getBoundingClientRect().width<=720),'fits compact window');await page.screenshot({path:'output/playwright/notepaeds-onboarding.png'});return {passed:passed.length,checks:passed};
}
