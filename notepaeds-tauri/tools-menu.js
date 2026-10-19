// Keep the Tools menu short while preserving the original action buttons.
const toolsMenu=$('#menu-tools');
const toolsGroups=[['insert','Search & insert'],['patient','Patient & investigations'],['coding','AI & coding'],['library','Clinical library']];
const toolsActions=[...toolsMenu.querySelectorAll('button.menuitem')];
let toolsExpanded=null,toolsLeaveTimer=null;
function closeToolsGroups(){clearTimeout(toolsLeaveTimer);for(const group of toolsMenu.querySelectorAll('.tools-group')){group.querySelector('.tools-flyout').hidden=true;group.querySelector('[data-tools-group]').setAttribute('aria-expanded','false')}toolsExpanded=null}
const toolsBuckets=new Map(toolsGroups.map(([id])=>[id,[]])),toolsDirect=[];
for(const button of toolsActions){
 const text=button.textContent.trim(),action=button.dataset.action;
 if(button.id==='checkModules'){button.hidden=true;continue} // Same reviewed sync action is already in the library group.
 let group=null;
 if(['quick','timestamp'].includes(action)||/Spotlight search|^IV fluids$/i.test(text))group='insert';
 else if(['timer','idparser','vitals'].includes(action)||/^Blood investigation parser/i.test(text))group='patient';
 else if(button.id==='generateMenuButton'||/ICD-10|^AI connection$/i.test(text))group='coding';
 else if(/modules|library/i.test(text))group='library';
 button.setAttribute('role','menuitem');if(group)toolsBuckets.get(group).push(button);else toolsDirect.push(button);
}
toolsMenu.replaceChildren();toolsMenu.setAttribute('role','menu');toolsMenu.setAttribute('aria-label','Tools');
function positionToolsGroup(group){
 const trigger=group.querySelector('[data-tools-group]'),panel=group.querySelector('.tools-flyout');const r=trigger.getBoundingClientRect(),p=panel.getBoundingClientRect();
 if(innerWidth<=620){const box=toolsMenu.getBoundingClientRect();toolsMenu.style.top=Math.max(8,Math.min(box.top,innerHeight-box.height-8))+'px';return}
 const right=r.right-1,left=r.left-p.width+1;panel.style.left=Math.max(8,Math.min(right+p.width<=innerWidth-8?right:left,innerWidth-p.width-8))+'px';panel.style.top=Math.max(8,Math.min(r.top-5,innerHeight-p.height-8))+'px';
}
function openToolsGroup(group,focus=false){closeToolsGroups();const trigger=group.querySelector('[data-tools-group]'),panel=group.querySelector('.tools-flyout');panel.hidden=false;trigger.setAttribute('aria-expanded','true');toolsExpanded=group;positionToolsGroup(group);if(focus)panel.querySelector('button:not(:disabled):not([hidden])')?.focus()}
for(const [id,label] of toolsGroups){
 const actions=toolsBuckets.get(id);if(!actions.length)continue;
 const group=document.createElement('div');group.className='tools-group';const trigger=document.createElement('button');trigger.className='menuitem tools-group-trigger';trigger.type='button';trigger.dataset.toolsGroup=id;trigger.setAttribute('role','menuitem');trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','tools-submenu-'+id);trigger.innerHTML=esc(label)+'<span aria-hidden="true" class="tools-chevron">›</span>';
 const panel=document.createElement('div');panel.className='tools-flyout';panel.id='tools-submenu-'+id;panel.setAttribute('role','menu');panel.setAttribute('aria-label',label);panel.hidden=true;panel.append(...actions);group.append(trigger,panel);toolsMenu.appendChild(group);
 trigger.onclick=event=>openToolsGroup(group,event.detail===0);trigger.onpointerenter=event=>{if(event.pointerType!=='touch')openToolsGroup(group)};
 group.onpointerleave=()=>{toolsLeaveTimer=setTimeout(()=>{if(toolsExpanded===group)closeToolsGroups()},180)};panel.onpointerenter=()=>clearTimeout(toolsLeaveTimer);
}
if(toolsDirect.length){const divider=document.createElement('div');divider.className='sep';divider.setAttribute('role','separator');toolsMenu.append(divider,...toolsDirect)}
// Retain the legacy ID for code that updates this button's availability.
const duplicateToolsUpdate=toolsActions.find(button=>button.id==='checkModules');if(duplicateToolsUpdate)toolsMenu.appendChild(duplicateToolsUpdate);
const toolsCloseBefore=closeMenus;closeMenus=function(){closeToolsGroups();toolsCloseBefore()};
const toolsOpenBefore=openMenu;openMenu=function(name){closeToolsGroups();toolsOpenBefore(name);if(name==='tools'){const r=$('[data-menu=tools]').getBoundingClientRect(),box=toolsMenu.getBoundingClientRect();toolsMenu.style.position='fixed';toolsMenu.style.left=Math.max(8,Math.min(r.left,innerWidth-box.width-8))+'px';toolsMenu.style.top=Math.max(8,Math.min(r.bottom+4,innerHeight-box.height-8))+'px'}};
toolsMenu.addEventListener('keydown',event=>{
 if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;const button=event.target.closest('button');if(!button)return;
 const panel=button.closest('.tools-flyout'),group=button.closest('.tools-group');
 if((event.key==='ArrowRight'||event.key==='Enter')&&button.hasAttribute('data-tools-group')){event.preventDefault();event.stopPropagation();openToolsGroup(group,true);return}
 if(panel&&['ArrowLeft','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();closeToolsGroups();group.querySelector('[data-tools-group]').focus();return}
 if(!panel&&event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenus();$('[data-menu=tools]').focus();return}
 if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();const choices=panel?[...panel.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden):[...toolsMenu.children].flatMap(el=>el.classList.contains('tools-group')?[el.querySelector('[data-tools-group]')]:el.matches('button')&&!el.hidden&&!el.disabled?[el]:[]);const index=choices.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?choices.length-1:(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;choices[next]?.focus()}
 if(event.key==='Tab')closeMenus();
},true);
window.addEventListener('resize',closeMenus);
const toolsMenuTrigger=$('[data-menu=tools]');toolsMenuTrigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();closeMenus();openMenu('tools');const choices=[...toolsMenu.querySelectorAll(':scope > .tools-group > button,:scope > button:not([hidden])')];(event.key==='ArrowDown'?choices[0]:choices.at(-1))?.focus()}});
toolsMenuTrigger.addEventListener('click',event=>{if(event.detail===0)setTimeout(()=>{if(toolsMenu.classList.contains('open'))toolsMenu.querySelector('[data-tools-group]')?.focus()},0)});
const toolsCompactStyle=document.createElement('style');toolsCompactStyle.textContent='@media(max-width:620px){#menu-tools{max-height:calc(100vh - 16px);overflow:auto}#menu-tools .tools-flyout{position:static!important;width:100%;max-height:230px;max-width:100%;border:0;box-shadow:none;background:#eef3fa;margin:4px 0 6px;padding:4px;border-radius:7px}#menu-tools .tools-flyout .menuitem{font-size:12px}}';document.head.appendChild(toolsCompactStyle);
const toolsMenuStyle=document.createElement('style');toolsMenuStyle.textContent=`#menu-tools button[hidden]{display:none!important}#menu-tools{width:250px;min-width:230px;max-width:calc(100vw - 16px);padding:5px;overflow:visible}#menu-tools .tools-group-trigger{display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%}.tools-chevron{font-size:20px;line-height:1;color:#8d94a0}.tools-group{position:relative}.tools-flyout{position:fixed;z-index:750;box-sizing:border-box;width:290px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:5px;background:#fafbfe;border:1px solid #d9dee8;border-radius:10px;box-shadow:0 12px 35px #18233325}.tools-flyout[hidden]{display:none!important}.tools-flyout .menuitem{width:100%;white-space:normal;text-align:left;min-height:31px}.tools-group-trigger[aria-expanded=true]{background:#eaf2ff;color:#1764bd}#menu-tools button:focus-visible{outline:2px solid #007aff;outline-offset:-2px}`;document.head.appendChild(toolsMenuStyle);

// Compact overrides follow the base flyout rules.
document.head.appendChild(toolsCompactStyle);
