const fs=require('fs'),path=require('path'),root=path.join(__dirname,'..'),app=path.join(root,'notepaeds-tauri');let h=fs.readFileSync(path.join(app,'app/index.html'),'utf8');
for(const [start,end,file] of [['// RELEASE_92_START','// RELEASE_92_END','release-92.js'],['/* RELEASE_92_CSS */','/* RELEASE_92_CSS_END */','release-92.css'],['// GENERATION_UI_START','// GENERATION_UI_END','generation-ui.js']]){const a=h.indexOf(start),b=h.indexOf(end,a);if(a<0||b<0)throw Error('Missing marker '+start);h=h.slice(0,a)+start+'\n'+fs.readFileSync(path.join(app,file),'utf8')+'\n'+h.slice(b)}
const marker='// RELEASE_921_START',ending='// RELEASE_921_END';
const extension=marker+'\n'+fs.readFileSync(path.join(app,'release-921.js'),'utf8')+'\n'+fs.readFileSync(path.join(app,'fluid-921.js'),'utf8')+'\n'+fs.readFileSync(path.join(app,'zones-921.js'),'utf8')+'\n'+['icd-reference.js','release-93.js','release-94.js','onboarding.js'].filter(f=>fs.existsSync(path.join(app,f))).map(f=>fs.readFileSync(path.join(app,f),'utf8')).join('\n')+'\n'+ending;
if(h.includes(marker))h=h.slice(0,h.indexOf(marker))+extension+h.slice(h.indexOf(ending)+ending.length);
else h=h.replace('// RELEASE_92_END','// RELEASE_92_END\n'+extension);
const cssStart='/* RELEASE_921_CSS */',cssEnd='/* RELEASE_921_CSS_END */';
const css=cssStart+'\n'+fs.readFileSync(path.join(app,'release-921.css'),'utf8')+'\n'+cssEnd;
if(h.includes(cssStart))h=h.slice(0,h.indexOf(cssStart))+css+h.slice(h.indexOf(cssEnd)+cssEnd.length);
else h=h.replace('/* RELEASE_92_CSS_END */','/* RELEASE_92_CSS_END */\n'+css);
fs.writeFileSync(path.join(app,'app/index.html'),h);fs.writeFileSync(path.join(root,'NotePaeds-v9-Notepad-Shell.html'),h);
