// Persistent reminders include inactive tabs and overdue alarms restored on startup.
const alarmReminder=document.createElement('section');alarmReminder.id='alarmReminder';alarmReminder.className='alarm-reminder';alarmReminder.hidden=true;alarmReminder.setAttribute('aria-label','Due patient reminders');document.body.appendChild(alarmReminder);
let alarmSignature='',lastAlarmSound=0;
function dueAlarms(now=Date.now()){return state.patients.filter(p=>Number.isFinite(p.alarmAt)&&p.alarmAt>0&&p.alarmAt<=now)}
function alarmAction(id,action){
  const p=state.patients.find(p=>p.id===id);if(!p)return;
  if(action==='open'){pushHistory();state.activeId=id;render(true);queueSave();return}
  if(action==='snooze'){p.alarmAt=Date.now()+5*60000;p.alarmFired=false}
  else if(action==='acknowledge'){p.alarmAt=null;p.alarmFired=false}
  else return;
  queueSave();render();updateAlarmReminders();
}
function updateAlarmReminders(now=Date.now()){
  const due=dueAlarms(now),signature=JSON.stringify(due.map(p=>[p.id,p.name,p.alarmLabel,p.alarmAt]));
  $$('.tab').forEach(tab=>{const button=tab.querySelector('[data-switch]');tab.classList.toggle('alarm-active',!!button&&due.some(p=>p.id===button.dataset.switch))});
  if(signature!==alarmSignature){
    alarmSignature=signature;alarmReminder.hidden=!due.length;
    alarmReminder.innerHTML=due.length?'<div class="alarm-heading" role="alert">REMINDER DUE'+(due.length>1?' · '+due.length:'')+'</div>'+due.map(p=>'<div class="alarm-item"><strong>'+esc(p.name)+'</strong><div>'+esc(p.alarmLabel||'Patient review due')+'</div><div class="row"><button class="btn" data-reminder-id="'+esc(p.id)+'" data-reminder-action="open">Open patient</button><button class="btn" data-reminder-id="'+esc(p.id)+'" data-reminder-action="snooze">Snooze 5 min</button><button class="btn danger" data-reminder-id="'+esc(p.id)+'" data-reminder-action="acknowledge">Acknowledge</button></div></div>').join(''):'';
    if(window.__TAURI__?.core?.invoke)window.__TAURI__.core.invoke('window_action',{action:due.length?'alarm-attention':'alarm-clear'}).catch(()=>{});
  }
  if(due.length&&now-lastAlarmSound>=30000){lastAlarmSound=now;beep()}
  if(!due.length)lastAlarmSound=0;
}
alarmReminder.addEventListener('click',e=>{const button=e.target.closest('[data-reminder-action]');if(button)alarmAction(button.dataset.reminderId,button.dataset.reminderAction)});
setInterval(()=>{const now=Date.now();let changed=false;state.patients.forEach(p=>{if(p.alarmAt&&p.alarmAt<=now&&!p.alarmFired){p.alarmFired=true;changed=true}});updateStatus();renderTabs();updateAlarmReminders(now);if(changed)queueSave()},1000);
