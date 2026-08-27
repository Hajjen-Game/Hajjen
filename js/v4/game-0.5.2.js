import './game-0.5.1.js';

// Prototype 0.5.2 is intentionally a clarity/UI layer over the preserved 0.5.1 gameplay.
// This keeps the gameplay pass easy to compare or revert.

const $ = id => document.getElementById(id);
const board = $('board');
const logline = $('logline');
const combatLog = $('combatLog');
const drawCountdown = $('drawCountdown');
const deckPanel = document.querySelector('.deck-panel');
const mulliganControls = $('mulliganControls');
const mulliganText = $('mulliganText');
const startZoneBtn = $('startZoneBtn');
const rightcol = document.querySelector('.rightcol');
const boardWrap = document.querySelector('.board-wrap');

function applyReadableBoardIcons(){
  if(!board) return;
  const iconMap = [
    ['ingredient','✿'],
    ['mob','☠'],
    ['guardian','⚔'],
    ['shrine','✦'],
    ['treasure','◆'],
    ['heal','♥'],
    ['boss','♛'],
    ['mystery','?']
  ];
  iconMap.forEach(([className,mark])=>{
    board.querySelectorAll(`.tile.${className}`).forEach(tile=>{
      if(tile.dataset.mark!==mark) tile.dataset.mark=mark;
    });
  });
}

applyReadableBoardIcons();

if(board){
  const boardObserver = new MutationObserver(()=>applyReadableBoardIcons());
  boardObserver.observe(board,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
}

// Mulligan guidance is shown in the normal Deck draw-status area instead of a separate start panel.
function mulliganActive(){
  return !!mulliganControls && mulliganControls.style.display!=='none';
}

function mulliganSelectedCount(){
  const match = mulliganText?.textContent?.match(/(\d+)\s*\/\s*3/);
  return match ? Number(match[1]) : 0;
}

function renderDeckStartState(){
  if(!deckPanel || !drawCountdown) return;
  if(mulliganActive()){
    const selected=mulliganSelectedCount();
    deckPanel.classList.add('mulligan-active');
    deckPanel.classList.remove('draw-ready');
    const markup=`<strong>START — REPLACE UP TO 3 CARDS</strong><br><span>${selected}/3 selected · replacements stay in the same category</span>`;
    if(drawCountdown.innerHTML!==markup) drawCountdown.innerHTML=markup;
  }else{
    deckPanel.classList.remove('mulligan-active');
  }
}

renderDeckStartState();

if(mulliganText){
  new MutationObserver(renderDeckStartState).observe(mulliganText,{childList:true,subtree:true,characterData:true});
}
if(drawCountdown){
  new MutationObserver(()=>{
    if(mulliganActive()) renderDeckStartState();
  }).observe(drawCountdown,{childList:true,subtree:true,characterData:true});
}
if(startZoneBtn){
  startZoneBtn.addEventListener('click',()=>{
    setTimeout(()=>{
      deckPanel?.classList.remove('mulligan-active');
      deckPanel?.classList.add('draw-ready');
      setTimeout(()=>deckPanel?.classList.remove('draw-ready'),1400);
    },0);
  });
}

// EVENT LOG panel: preserve the compact latest-event strip and add short history.
let eventLogList=null;
if(rightcol){
  const panel=document.createElement('section');
  panel.className='panel event-log-panel';
  panel.innerHTML='<h2>EVENT LOG</h2><div id="eventLogList" class="event-log-list"><div class="event-log-empty">Events will appear here as the zone reacts.</div></div>';
  rightcol.appendChild(panel);
  eventLogList=panel.querySelector('#eventLogList');
}

// Short transient messages live over the board, but never block clicks.
let toastArea=null;
if(boardWrap){
  toastArea=document.createElement('div');
  toastArea.className='toast-area';
  toastArea.setAttribute('aria-live','polite');
  boardWrap.appendChild(toastArea);
}

function classifyEvent(text){
  const t=text.toLowerCase();
  if(/new .*card|card drawn|drawn:|redraw/.test(t)) return {cls:'event-card',icon:'▣',label:'CARD'};
  if(/ingredient|bloomcap|cinder seed|harvest|keen eye/.test(t)) return {cls:'event-ingredient',icon:'✿',label:'RESOURCE'};
  if(/danger/.test(t)) return {cls:'event-danger',icon:'!',label:'DANGER'};
  if(/combat|enemy|guardian|rootmaw|bogling|stalker|mireling|defeated|attack/.test(t)) return {cls:'event-combat',icon:'⚔',label:'ENCOUNTER'};
  if(/shrine|objective|zone complete|boss shrine/.test(t)) return {cls:'event-objective',icon:'✦',label:'OBJECTIVE'};
  if(/sharkan|moved|landade|rerolled|riktning|direction|movement/.test(t)) return {cls:'event-move',icon:'→',label:'MOVE'};
  return {cls:'event-system',icon:'•',label:'EVENT'};
}

const recentEvents=[];
let lastMainLog='';
let lastCombatLog='';

function addEvent(text,{toast=false}={}){
  const clean=(text||'').replace(/\s+/g,' ').trim();
  if(!clean) return;
  const info=classifyEvent(clean);
  recentEvents.unshift({text:clean,...info});
  if(recentEvents.length>7) recentEvents.length=7;

  if(eventLogList){
    eventLogList.innerHTML='';
    recentEvents.forEach(event=>{
      const entry=document.createElement('div');
      entry.className=`event-log-entry ${event.cls}`;
      entry.innerHTML=`<span class="event-icon">${event.icon}</span><span><strong>${event.label}</strong> · ${escapeHtml(event.text)}</span>`;
      eventLogList.appendChild(entry);
    });
  }

  if(toast && toastArea && shouldToast(clean,info.cls)){
    const toastEl=document.createElement('div');
    toastEl.className=`game-toast ${info.cls}`;
    toastEl.textContent=`${info.icon} ${toastText(clean)}`;
    toastArea.prepend(toastEl);
    setTimeout(()=>toastEl.classList.add('fade'),1500);
    setTimeout(()=>toastEl.remove(),1800);
  }
}

function escapeHtml(text){
  return text.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function shouldToast(text,cls){
  if(cls==='event-card'||cls==='event-ingredient'||cls==='event-objective') return true;
  if(cls==='event-danger') return /\+2|10|15|20|critical|hostile|dangerous/i.test(text);
  if(cls==='event-combat') return /guardian|rootmaw|combat|encounter|defeated/i.test(text);
  return false;
}

function toastText(text){
  if(/new .*card|card drawn/i.test(text)) return 'NEW CARD DRAWN';
  if(/ingredient/i.test(text)) return 'INGREDIENT COLLECTED';
  if(/guardian/i.test(text) && /defeated/i.test(text)) return 'GUARDIAN DEFEATED';
  if(/guardian/i.test(text)) return 'GUARDIAN ENCOUNTER';
  if(/rootmaw/i.test(text)) return 'BOSS ENCOUNTER';
  if(/danger.*\+2|danger \+2/i.test(text)) return 'DANGER +2 — ZONE IRRITATED';
  if(/shrine/i.test(text)) return 'SHRINE UPDATED';
  return text.length>54?`${text.slice(0,51)}…`:text;
}

// Zone 1 starter resources are useful onboarding information for first-time players.
addEvent('Zone 1 starts with Bloomcap + Cinder Seed.',{toast:false});

if(logline){
  lastMainLog=logline.textContent.trim();
  addEvent(lastMainLog,{toast:false});
  new MutationObserver(()=>{
    const text=logline.textContent.trim();
    if(text && text!==lastMainLog){
      lastMainLog=text;
      addEvent(text,{toast:true});
    }
  }).observe(logline,{childList:true,subtree:true,characterData:true});
}

if(combatLog){
  lastCombatLog=combatLog.textContent.trim();
  new MutationObserver(()=>{
    const text=combatLog.textContent.trim();
    if(text && text!==lastCombatLog){
      lastCombatLog=text;
      addEvent(text,{toast:false});
    }
  }).observe(combatLog,{childList:true,subtree:true,characterData:true});
}

// Small visual identity for Sharkan without replacing the prototype avatar.
const player=$('player');
if(player){
  player.style.borderColor='#3f72a9';
  player.style.color='#2f6fb2';
  player.style.background='#f3f8fd';
}
