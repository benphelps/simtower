import {nativeMenuActivation,nativeMenuStep,nativeMenuMnemonic} from './original-menus.js';
import {AssetPreloader} from './asset-loading.js';
import {nativeElevatorExtensionAt,nativeElevatorExtensionRange,nativeFingerStopAt,nativeFingerShaftAt} from './original-elevator-construction-ui.js';
import {resizeDesktopRect,browserMaximizedRect} from './browser-window-geometry.js';
import {browserSaveFilename,browserSaveTitle,browserTowerTitle,browserSaveRequest} from './original-browser-saves.js';
import {nativeToolbarPopupRect,nativeDeparturePopupRect,nativeDeparturePopupChoice} from './original-held-popups.js';
import {nativeGameCursor} from './original-cursors.js';
import {nativeCarColumns} from './original-transport-slots.js';
import {nativeScheduleControls,nativeScheduleScroll} from './original-schedule-controls.js';
import {nativeStartupAction,nativeSaveGuardRequired,nativeSaveGuardText,nativeSaveGuardOutcome} from './original-startup.js';
import {newNativeApplicationTower} from './original-app-random.js';
import {findPersonTarget,createFindMarker,findMarkerExpired} from './original-markers.js';
import {nativeToolAllowed,nativePopupChoice,nativeScrollCamera,nativeScrollPosition,nativeCameraScroll,nativeCameraFromScroll,nativeOpenedCamera,nativeInitialCamera,nativeScrollbarGeometry,nativeAccelerator,nativeMainWindowGeometry,NATIVE_SITE_WIDTH,NATIVE_SITE_HEIGHT,nativeConstructionAutoScroll,nativeSimulationActive,nativeViewSelection} from './original-window-controls.js';
import {createElevatorPreview,restoreElevatorPreview} from './original-elevator-preview.js';
import {constructionDragBatch,constructionDragSpan,nativeConstructionPointer,linkAtPoint,elevatorScheduleCell,elevatorStopAllowed} from './original-construction.js';
import {nativeTransportInfo,nativeCarAtPoint,nativeOccupantLayout,nativePanelOccupants,nativeFacilityPanel,nativeInspectionTitle,nativeFacilityPreviewCrop,nativePreviewFit} from './original-inspection-controls.js';
import {roomInteriorSprites} from './original-interiors.js';
import {nativeFacilityStateLabel,nativePriceEnabled,nativeFacilityGraph,nativeFacilityDiagnostics,nativeQueuePersonAt,nativePersonLocation,nativeCarOccupants} from './original-inspection.js';
import {OriginalTickScheduler} from './original-speed.js';
import {OriginalAudioMixer,originalSoundRequest,inspectionSound,ambientSound} from './original-audio.js';
import {financeInfo,financePopulationRows,financeTextRuns,nativeInfoBar,nativeInfoMessage,expireInfoMessage,nativeNoticeMessage,nativeConstructionErrorIndex} from './original-finance-info.js';
import { Tower, demoTower } from './simulation.js';
import { CATALOG, CELL, FLOOR, TRANSPORT, LINKS, money, price } from './catalog.js';
import { Renderer, loadAssets, loadTextureAssets } from './renderer.js';
import { NORMAL_TICKS_PER_SECOND, clockHands } from './original-clock.js';
import { toolbarSlots } from './original-toolbar.js';
import { OriginalDialogs } from './original-dialogs.js';
import { tenantEvaluation, tenureLabel } from './original-systems.js';
import { personFrame } from './people-sprites.js';
import {nativePersonPortrait,nativePersonRole,nativePersonMean,nativeCurrentPersonStress,nativePersonDialogId,nativeStressBand} from './original-person-info.js';

const $ = id => document.getElementById(id);
const nativeModalOpen=()=>Boolean($('dialog')?.matches(':modal')||$('native-message-box')?.matches(':modal'));
const gameGuiCaptured=()=>nativeModalOpen()||Boolean($('construction-popup')||document.querySelector('.native-departure-menu,.menu-dropdown.open,.menu-button.active,.window-title .system.active,.native-system-menu,.native-dialog-system-menu'));
function setMenuCheck(id,checked,label){const button=$(id);button.textContent=label;button.dataset.checked=String(checked);button.setAttribute('aria-pressed',String(checked));}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SAVE_KEY = 'simtower-js-v1';
const manualScene=new URLSearchParams(location.search).get('manual-scene');
const iconOrder = [24, 0, 22, 27, 1, 43, 42, 7, 3, 4, 5, 12, 6, 10, 18, 29, 44, 11, 20, 31, 36, 14, 13, 15, 9, 17];
const toolbarChoices = {};
let infoMessage=null,seenNotice=null,startupLoad=false,upscaledTextures,startupIntroPending=false;
function postInfo(resource,index){infoMessage=nativeInfoMessage(expireInfoMessage(infoMessage,performance.now()),data,resource,index,performance.now());}
let tower, renderer, data, manifest, nativeUI, nativeScheduleUI, speed = 1, tool = 'office', mode = 'build', dragging = null, started = false, lastTime = 0, accumulator = 0, lastUI = 0, lastSave = 0, toastTimer, selected = null, lastStar = 0;
let desktopWindow={rect:null,maximized:false,minimized:false},windowCapture=false,scrollbarCapture=false,scrollingUntil=0,findMarkerSpeed=1,fastMode=false;
let soundOn = false;let elevatorPreview=null,previewSpeed=1;
const soundCategories=[true,true,true]; //274D7 / suppliedSIMTOWER.INI defaults.
const preloadedSounds=new Map();
const tickScheduler=new OriginalTickScheduler();
const soundMixer=new OriginalAudioMixer(id=>{const audio=new Audio(preloadedSounds.get(id)||`/assets/sounds/${id}.wav`);audio.volume=.2;return audio;},{enabled:soundCategories});

function toast(text, error = false) { $('toast').textContent = text; $('toast').className = `toast show${error ? ' error' : ''}`; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').className = 'toast', 3300); }
function playSound(id,force=false) {soundMixer.play(originalSoundRequest(id,2),{force:force||soundOn});}
function feedback(result) {if(result.error)postInfo(1003,nativeConstructionErrorIndex(data,result.error));updateUI();}
function setTool(key) {
  if(!nativeToolAllowed('build',{running:speed!==0,preview:Boolean(elevatorPreview),scheduleOpen:$('schedule-dialog').open}))return;
  tool = key;postInfo(1009,CATALOG[key].id+1);
  const icon = iconOrder.indexOf(CATALOG[key].id);
  for (const slot of toolbarSlots(data, tower.state.sandbox ? 5 : tower.state.star, toolbarChoices)) if (slot.icons.includes(icon)) toolbarChoices[slot.slot] = icon;
  $('construction-popup')?.remove(); renderCatalog(); setMode('build'); updateTools();
}
function setMode(value) {
  if(!nativeToolAllowed(value,{running:speed!==0,preview:Boolean(elevatorPreview)}))return;
  mode = value; renderer.preview = null;
  renderer.constructionTool = value === 'finger'?'finger':value === 'build' ? tool : null;
  document.querySelectorAll('[data-mode]').forEach(el => el.classList.toggle('selected', el.dataset.mode === mode));
  $('tower').style.cursor=nativeGameCursor(mode,speed!==0,mode==='finger'&&Boolean(dragging&&!dragging.pan));
  $('view-help').textContent = mode === 'inspect' ? 'Click a room or elevator to inspect · Scroll to pan' : mode === 'demolish' ? 'Click a room or elevator to remove' : 'Click to build · Scroll to pan · Right-drag to move';
}
function changeElevatorStop(sh,floor,done=()=>{}) {
  const result=tower.setElevatorStop(sh.id,floor);
  if(result.error){toast(result.error,true);return;}
  if(result.warning) {
    showDialog(`<div style="width:330px;padding:16px;font:12px Arial"><p>${escape(result.warning)}</p><div class="dialog-buttons"><button id="stop-yes">Yes</button><button id="stop-no">No</button></div></div>`,'SimTower');
    $('dialog').classList.add('native-dialog','native-caption');
    $('stop-yes').onclick=()=>{closeDialog();const applied=tower.setElevatorStop(sh.id,floor,true);if(applied.error)toast(applied.error,true);else done();};
    $('stop-no').onclick=()=>{closeDialog();done();};
    return;
  }
  done();
}
function updateTools() {
  const spec = CATALOG[tool];
  document.querySelectorAll('[data-tool]').forEach(el => {
    const key = el.dataset.tool, locked = !tower.state.sandbox && CATALOG[key].star > tower.state.star;
    el.classList.toggle('selected', key === tool); el.classList.toggle('locked', locked);
    el.setAttribute('aria-pressed', String(key === tool));
  });
  $('tool-name').textContent = spec.name;
  $('tool-description').textContent = TRANSPORT.has(tool) ? 'Click to create a shaft or add a car. Drag its top or bottom end to extend.' : ['floor', 'lobby'].includes(tool) ? 'Drag horizontally to set the width. Build each level above a supporting floor.' : LINKS.has(tool) ? 'Click to connect this floor to the floor immediately below.' : 'Click a supported floor to place this facility.';
  $('tool-cost').textContent = `${money(price(data, tool))}${['lobby', 'floor'].includes(tool) ? ' / segment' : TRANSPORT.has(tool) ? ' + car' : ''}`;
}
function renderCatalog() {
  const slots = toolbarSlots(data, tower.state.sandbox ? 5 : tower.state.star, toolbarChoices);
  $('catalog').innerHTML = slots.map(slot => {
    const spec = Object.values(CATALOG).find(c => c.id === slot.type), index = slot.icon;
    return `<button class="build-tool" data-slot="${slot.slot}" data-tool="${spec.key}" aria-label="${spec.name}${slot.group ? ' construction menu' : ''}" title="${spec.name}${slot.group ? ' — hold for choices' : ''}" aria-pressed="${tool === spec.key}"><span class="icon" style="background-position:-${index % 8 * 32}px -${Math.floor(index / 8) * 32}px"></span></button>`;
  }).join('');
  const openGroup = (button,event) => {
    const slot = slots[+button.dataset.slot]; if (!slot.group) return;
    $('construction-popup')?.remove();
    const popup = document.createElement('div'); popup.id = 'construction-popup'; popup.className = 'construction-popup';
    popup.setAttribute('role', 'menu');
    popup.innerHTML = slot.icons.map(i => {
      const spec = Object.values(CATALOG).find(c => c.id === data.toolbar.iconTypes[i]);
      return `<button role="menuitem" aria-label="${spec.name}" title="${escape(data.strings[1009][spec.id] || spec.name)}" data-choice="${spec.key}"><span class="menu-icon" style="background-position:-${i % 8 * 32}px -${Math.floor(i / 8) * 32}px"></span></button>`;
    }).join('');
    document.body.append(popup);
    const rect=nativeToolbarPopupRect(button.getBoundingClientRect(),slot.icons.indexOf(slot.icon),slot.icons.length,document.body.clientHeight);
    popup.style.left=`${rect.left}px`;popup.style.top=`${rect.top}px`;
    const entries=[...popup.querySelectorAll('button')];
    const choice=e=>nativePopupChoice({x:e.clientX-rect.left,y:e.clientY-rect.top},32,32,entries.length);
    const highlight=index=>entries.forEach((entry,i)=>entry.classList.toggle('native-hover',i===index));highlight(slot.icons.indexOf(slot.icon));
    const finish=(e,index)=>{e.preventDefault();e.stopPropagation();popup.remove();setTool(index===null?button.dataset.tool:entries[index].dataset.choice);};
    popup.onpointermove=e=>{const index=choice(e);if(index===null)finish(e,null);else highlight(index);};
    popup.onpointerup=e=>finish(e,choice(e));popup.onpointercancel=e=>finish(e,null);
    popup.onpointerdown=e=>finish(e,e.button===0?choice(e):null);
    popup.onclick=e=>{e.preventDefault();e.stopPropagation();};
    if(event)popup.setPointerCapture(event.pointerId);
  };
  $('catalog').onpointerdown=e=>{if(e.button!==0||!nativeToolAllowed('build',{running:speed!==0,preview:Boolean(elevatorPreview),scheduleOpen:$('schedule-dialog').open}))return;const button=e.target.closest('[data-slot]');if(!button)return;if(slots[+button.dataset.slot].group)openGroup(button,e);else setTool(button.dataset.tool);};
  $('catalog').onclick=e=>e.stopPropagation();
  $('catalog').oncontextmenu=e=>{e.preventDefault();e.stopPropagation();};
}
function updateUI() {
  const s = tower.state;
  $('call-fire-rescue').disabled=!tower.canCallFireRescue;document.querySelector('[data-map-mode="3"]').disabled=!s.sandbox&&s.star<2;
  const info=nativeInfoBar(data,s,tower.population);
  $('funds').textContent = info.cash; $('funds').style.color = s.cash < 0 ? '#9f694e' : '';
  $('population').textContent = info.population;
  $('rating').innerHTML=info.rating.sheet?`<img src="/assets/bitmaps/${info.rating.sheet}.png" alt="Tower">`:info.rating.map(r=>`<img src="/assets/bitmaps/${r.sheet}.png" alt="${r.sheet===322?'Star':'Empty star'}">`).join('');
  $('day').innerHTML=info.dateRuns.map(run=>`<span style="color:${run.color}">${escape(run.text)}</span>`).join('');
  $('time').textContent = `${String(Math.floor(s.minute / 60)).padStart(2, '0')}:${String(Math.floor(s.minute % 60)).padStart(2, '0')}`;
  const clock = $('clock').getContext('2d'); clock.drawImage(renderer.assets.get(321), 0, 0); clock.fillStyle = '#000';
  for (const [endX, endY] of Object.values(clockHands(s.tick))) {
    let x = 15, y = 15; const dx = Math.abs(endX - x), dy = -Math.abs(endY - y), sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1; let error = dx + dy;
    while (x !== endX || y !== endY) {
      clock.fillRect(x, y, 1, 1); const e2 = 2 * error;
      if (e2 >= dy) { error += dy; x += sx; }
      if (e2 <= dx) { error += dx; y += sy; }
    }
  }
  $('mode-label').textContent = s.sandbox ? 'SANDBOX' : s.star===6?'TOWER':`${s.star} STAR${s.star > 1 ? 'S' : ''}`;
  $('view-name').textContent = s.name.toUpperCase(); if (document.activeElement !== $('tower-name')) $('tower-name').value = s.name;
  $('window-caption').textContent = `SimTower - ${browserTowerTitle(s)}`;
  $('occupancy').textContent = `${s.rooms.filter(r => r.occupied).length} occupied rooms`;
  $('floor-count').textContent = `${Object.keys(s.floors).length} FLOORS`;
  const now=performance.now(),notice=s.notices[0];infoMessage=expireInfoMessage(infoMessage,now);
  if(notice&&notice!==seenNotice){seenNotice=notice;infoMessage=nativeNoticeMessage(infoMessage,data,notice,now);}
  $('message').textContent=infoMessage?.text??'';
  if (s.star !== lastStar) { lastStar = s.star; renderCatalog(); updateTools(); }
}
function showDialog(html, title = 'SimTower') { if($('dialog').open&&$('dialog').dataset.modeless==='true')$('dialog').close();$('dialog').dataset.modeless='false';$('dialog').dataset.template=''; $('dialog').classList.remove('native-dialog','native-caption'); $('dialog').dataset.title = title; $('dialog-content').innerHTML = html; if (!$('dialog').open) $('dialog').showModal(); }
function closeDialog() {renderer.sceneDirty=true;$('dialog').close();}
function showPendingNativeDialog(message) {
  const respond=(control,_element,_panel,{automatic=false}={})=>{
    tower.answerEmergency(message.id,control,{automatic});updateUI();
    if(tower.state.dialogs[0]?.id===1004&&!$('native-message-box')?.open){showPendingNativeDialog(tower.state.dialogs[0]);return;}
    closeDialog();
  };
  if(message.id!==1004){nativeUI.show(message.id,{value:[3040,3012,3020].includes(message.id)?message.value/data.moneyScale:message.value,command:respond});return;}
  //3D83D opens a nested USER MessageBox while DAD1's cost panel stays behind.
  const parent=tower.state.dialogs.find(dialog=>dialog.id===tower.state.affordabilityContinuation.id);
  if(!$('dialog').open||+$('dialog').dataset.template!==parent.id)nativeUI.show(parent.id,{value:parent.value/data.moneyScale,command:(_control,_element,_panel,context)=>{if(context?.automatic)closeDialog();}});
  const pane=document.createElement('dialog');pane.id='native-message-box';pane.dataset.title='SimTower';
  pane.innerHTML=`<div class="native-alert"><p>${escape(data.alerts[1004].text)}</p><div class="dialog-buttons"><button>OK</button></div></div>`;
  const finish=()=>{pane.close();pane.remove();respond(1);};pane.addEventListener('cancel',event=>{event.preventDefault();finish();});
  pane.addEventListener('keydown',event=>{if(event.altKey&&event.key==='F4'){event.preventDefault();finish();}});
  const button=pane.querySelector('button');button.onclick=finish;document.body.append(pane);pane.showModal();button.focus();
}
function setScheduleWindowInputs(enabled){for(const root of document.querySelectorAll('#native-main-window,.statusbar,.build-panel,.map-window'))root.inert=!enabled;}
function closeScheduleDialog(){renderer.sceneDirty=true;if(elevatorPreview)endElevatorPreview();$('schedule-dialog').close();setScheduleWindowInputs(true);}
function endElevatorPreview(){if(!elevatorPreview)return;const shaft=tower.state.shafts.find(sh=>sh.id===elevatorPreview.shaftId);restoreElevatorPreview(tower.state,elevatorPreview,shaft);elevatorPreview=null;setSpeed(previewSpeed);}
function toggleElevatorPreview(sh,day,phase){if(elevatorPreview)endElevatorPreview();else {previewSpeed=speed;elevatorPreview=createElevatorPreview(data,tower.state,sh.id);setSpeed(0);}elevatorDialog(tower.state.shafts.find(s=>s.id===sh.id),day,phase);}
function begin(next,opened=false) {
  startupLoad=false;$('native-startup-splash')?.remove();
  tickScheduler.reset();
  if($('schedule-dialog').open)closeScheduleDialog();
  const existingView=started;infoMessage=null;seenNotice=next.state.notices[0];
  tower = next;renderer.effectsClock.resetCounter();renderer.interiorPoses.clear();renderer.findMarker=null;setSpeed(1); started = true; accumulator = 0; selected = null; renderer.selected = null; $('inspector').hidden = true;
  tower.nativeVisualHook=()=>renderer.palettePhase(tower);
  tower.nativeFrameCompleteHook=()=>{renderer.nativeTickFrame=true;renderer.nativeVisualPending=true;};
  renderer.resetNativeGrid();tower.nativeGridHook=event=>renderer.bindNativeGrid(tower,event);
  renderer.setZoom(1);
  renderer.camera=opened?nativeOpenedCamera(tower.state,renderer.camera,renderer.width,renderer.height,existingView):nativeScrollCamera(renderer.camera,renderer.width,renderer.height);
  setTool(tower.bounds(0) ? 'office' : 'lobby'); closeDialog(); updateUI(); autosave();
}
function autosave() {
  if (manualScene||!started||!tower.bounds(0)) return;
  tower.state.editorScroll=nativeCameraScroll(renderer.camera,renderer.width,renderer.height);
  try { localStorage.setItem(SAVE_KEY, tower.save()); $('save-status').textContent = 'Saved locally'; }
  catch { $('save-status').textContent = 'Autosave unavailable'; }
}
function titleDialog() {
  //27255 keeps modeless TOWER_TITLE (RT_BITMAP256) behind dialog10000,
  //then495D destroys it before New, Load's file chooser, or Quit.
  $('native-startup-splash')?.remove();
  const splash=document.createElement('div');splash.id='native-startup-splash';
  const art=document.createElement('img');art.src='/assets/bitmaps/256.png';art.alt='SimTower title screen';splash.append(art);document.body.append(splash);
  nativeUI.show(10000,{command:cid=>{const action=nativeStartupAction(cid);if(action==='new')begin(newNativeApplicationTower(data,tower));else if(action==='open'){
    startupLoad=true;closeDialog();splash.remove();let saved;try{saved=localStorage.getItem(SAVE_KEY);}catch{}
    if(saved){try{const next=new Tower(data);next.load(saved);begin(next,true);}catch(error){toast(error.message,true);$('save-file').click();}}else $('save-file').click();
  }else if(action==='quit'){splash.remove();setSpeed(0);started=false;closeDialog();}}});
}
function guardedTowerAction(action,continueAction) {
  if(!started||!nativeSaveGuardRequired({groundRecords:tower.bounds(0)?1:0})){continueAction();return;}
  showDialog(`<div class="native-save-guard"><p>${escape(nativeSaveGuardText(data,browserTowerTitle(tower.state),action))}</p><div class="dialog-buttons"><button id="guard-yes">Yes</button><button id="guard-no">No</button><button id="guard-cancel">Cancel</button></div></div>`,'SimTower');
  $('guard-yes').onclick=()=>downloadSave({onSaved:()=>{if(nativeSaveGuardOutcome('yes',true)==='continue')continueAction();}});$('guard-no').onclick=continueAction;$('guard-cancel').onclick=closeDialog;
}
function newTowerDialog(){guardedTowerAction('new',()=>begin(newNativeApplicationTower(data,tower)));}
function inspect(grid,point) {
  const p=nativeQueuePersonAt(data,tower.state,grid.floor,grid.x) || tower.state.people.find(p=>p.actor&&p.stage!=='queue'&&p.stage!=='car'&&p.stage!=='link'&&p.floor===grid.floor&&Math.abs(p.x-grid.x)<2);
  if(p){const actor=tower.state.actors.find(a=>a.id===p.actor);if(actor){personDialog(actor);return;}}
  const s = tower.state;
  selected = s.shafts.find(sh => grid.floor >= sh.low-1 && grid.floor <= sh.high+1 && grid.x >= sh.x && grid.x < sh.x + sh.width) ||(point?linkAtPoint(s,point.x,point.y):null)|| tower.roomAt(grid.floor, grid.x);
  renderer.selected = selected;
  if (!selected) { $('inspector').hidden = true; toast('Click a room or elevator to view its details.'); return; }
  $('inspector').hidden = true;
  if(TRANSPORT.has(selected.key)){const car=point?nativeCarAtPoint(selected,point):null;if(car)transportDialog(selected,car);else elevatorDialog(selected);}else if(LINKS.has(selected.key))transportDialog(selected);
  else {const sound=inspectionSound(s,selected,max=>tower.randomInt(max));if(sound)soundMixer.play(sound);roomDialog(selected);}
}
function transportDialog(item,car) {
  const entries=car?nativeCarOccupants(tower.state,car):tower.state.people.filter(p=>p.stage==='link'&&p.path[0]?.id===item.id).map(person=>({person,actor:tower.state.actors.find(a=>a.id===person.actor)}));
  const info=nativeTransportInfo(data,item,car,entries),ui=nativeUI.show(info.dialog,{command:cid=>{if(cid===1)closeDialog();}});ui.text(3,info.title);ui.text(6,info.count);
  renderNativeOccupants(ui,entries.filter(e=>e.actor),()=>transportDialog(item,car),{secondStrip:info.dialog===761,personContext:1});
}
function renderNativeOccupants(ui,entries,back,{secondStrip=false,occupantInset=2,rightInset=2,personContext=2}={}) {
  const d=nativeUI.templates[$('dialog').dataset.template],rects=[d.hotspots[4],...(secondStrip?[d.hotspots[9]]:[])];
  for(const part of nativeOccupantLayout(entries,rects,tower.state.rooms,tower.state.vip?.actor,occupantInset,rightInset)) {
    const actor=part.actor,home=tower.state.rooms.find(r=>r.id===actor.room),button=document.createElement('button');
    button.title=actor.name||nativePersonRole(data,actor,home,tower.state.tick);button.setAttribute('aria-label',button.title);
    Object.assign(button.style,{padding:'0',border:'0',background:'transparent'});button.append(actorPortrait(actor));button.onclick=()=>personDialog(actor,back,personContext);
    ui.place(button,[part.x,part.y,part.width,part.height]);
  }
}
const floorLabel = f => f < 0 ? `B${-f}` : `${f + 1}F`;
function elevatorDialog(sh, day=tower.calendar.weekend?1:0, phase=Math.min(5,Math.trunc(tower.state.tick/400))) {
  const previousScroll=+$('schedule-dialog').dataset.shaftId===sh.id?$('schedule-dialog').querySelector('[data-control="7"]')?.getAttribute('aria-valuenow'):null;
  const ui=nativeScheduleUI.show(400,{title:CATALOG[sh.key].name});$('schedule-dialog').dataset.shaftId=sh.id;setScheduleWindowInputs(false);
  const program=sh.programs[day][phase];
  ui.hotspot(1,'OK',closeScheduleDialog);
  // 1E0A0 runs a static traffic-stress warm-up, preserving world accounting.
  const simulate=ui.hotspot(2,elevatorPreview?'Resume':'Simulate',()=>toggleElevatorPreview(sh,day,phase));if(elevatorPreview)simulate.style.backgroundImage="url('/assets/bitmaps/406.png')";
  for(const [cid,d] of [[12,0],[13,1]]) {
    const b=ui.hotspot(cid,d?'Weekend':'Weekday',()=>elevatorDialog(sh,d,phase));
    b.style.backgroundImage="url('/assets/bitmaps/401.png')";
    if(d!==day) b.style.backgroundImage='none';
  }
  const labels=['7:00–12:00','12:00–12:30','12:30–13:00','13:00–17:00','17:00–21:00','21:00–7:00'];
  for(let i=0;i<6;i++) {
    const b=ui.hotspot(23+i,labels[i],()=>elevatorDialog(sh,day,i),null);
    b.style.backgroundImage=`url('/assets/bitmaps/${402+sh.programs[day][i].departure}.png')`;b.style.backgroundPosition='0 0';
    b.style.border=i===phase?'2px solid #000':'0';
    b.oncontextmenu=e=>e.preventDefault();
    b.onpointerdown=e=>{if(e.button===0){e.preventDefault();departureMenu(ui,sh,day,i,e);}};
    b.onclick=e=>e.preventDefault();
  }
  for(const [cid,key,delta,min,max] of [[8,'response',1,1,100],[9,'response',-1,1,100],[10,'wait',1,0,3],[11,'wait',-1,0,3]]) ui.hotspot(cid,`${delta>0?'Increase':'Decrease'} ${key}`,()=>{tower.setElevatorProgram(sh.id,day,phase,{[key]:Math.max(min,Math.min(max,program[key]+delta))});elevatorDialog(sh,day,phase);});
  ui.text(41,program.response);ui.text(42,program.wait*30);
  const show=ui.hotspot(5,'Show elevator',()=>{sh.visible=!sh.visible;elevatorDialog(sh,day,phase);},null);show.style.backgroundImage=`url('/assets/bitmaps/${sh.visible?407:408}.png')`;show.style.backgroundPosition='0 0';
  const gridControls=nativeScheduleControls(sh),grid=document.createElement('div');grid.className='native-grid native-schedule-grid';ui.place(grid,[18,195,118,196]);
  if(gridControls.blankTopRows){const blank=document.createElement('div');blank.style.height=`${gridControls.blankTopRows*13}px`;grid.append(blank);}
  for(let f=sh.high;f>=sh.low;f--) {
    const row=document.createElement('div');row.className='native-grid-row';grid.append(row);
    const stop=document.createElement('button');stop.tabIndex=gridControls.bitmapTabIndex;stop.onpointerdown=e=>e.preventDefault();stop.dataset.floor=f;stop.className=sh.stops.includes(f)?'stop':'';stop.textContent=f<0?f:f+1;stop.setAttribute('aria-label',`${floorLabel(f)} stop`);stop.title=`${floorLabel(f)} stop`;row.append(stop);
    stop.disabled=Boolean(elevatorPreview)||!elevatorStopAllowed(tower.state,sh,f);
    stop.onclick=()=>changeElevatorStop(sh,f,()=>elevatorDialog(sh,day,phase));
    for(const car of nativeCarColumns(sh)) {
      const slot=car.nativeCarSlot;
      const b=document.createElement('button');b.tabIndex=gridControls.bitmapTabIndex;b.onpointerdown=e=>e.preventDefault();b.dataset.carSlot=slot;b.dataset.floor=f;row.append(b);
      if(!car){b.disabled=true;b.setAttribute('aria-label',`Car slot ${slot+1} empty`);continue;}
      b.dataset.car=car.id;b.className=car.parkingFloor===f?'park':'';b.setAttribute('aria-label',`Car ${slot+1} park at ${floorLabel(f)}`);b.title=`Car ${slot+1} parking floor`;
      b.disabled=Boolean(elevatorPreview)||!elevatorStopAllowed(tower.state,sh,f);
      b.onclick=()=>{if(!sh.stops.includes(f))return;car.parkingFloor=f;elevatorDialog(sh,day,phase);};
    }
  }
  const scrollbar=attachScheduleScrollbar(ui,sh,grid,previousScroll===null?undefined:Number(previousScroll));
  updateScheduleGrid();
  const host=$('schedule-dialog');host.tabIndex=-1;$('schedule-system').tabIndex=-1;
  (gridControls.scrollEnabled?scrollbar:host).focus();
}
function attachScheduleScrollbar(ui,shaft,grid,position) {
  const enabled=nativeScheduleControls(shaft).scrollEnabled,bar=document.createElement('div');bar.className='native-scrollbar vertical native-schedule-scrollbar';bar.dataset.control='7';bar.tabIndex=enabled?0:-1;bar.setAttribute('role','scrollbar');bar.setAttribute('aria-label','Elevator floor scrollbar');bar.setAttribute('aria-orientation','vertical');bar.setAttribute('aria-disabled',String(!enabled));
  bar.innerHTML='<button class="scroll-arrow back" tabindex="-1" aria-label="Scroll elevator floors up"></button><div class="scroll-track"><button class="scroll-thumb" tabindex="-1" aria-label="Elevator floor scroll thumb"></button></div><button class="scroll-arrow forward" tabindex="-1" aria-label="Scroll elevator floors down"></button>';
  ui.place(bar,[135,195,16,196]);for(const button of bar.querySelectorAll('button'))button.disabled=!enabled;
  const thumb=bar.querySelector('.scroll-thumb');thumb.hidden=!enabled;let scroll,gesture,timer;
  const move=(command,value)=>{scroll=nativeScheduleScroll(shaft,scroll?.position??position,command,value);grid.scrollTop=scroll.offset;bar.setAttribute('aria-valuemin',String(scroll.min));bar.setAttribute('aria-valuemax',String(scroll.max));bar.setAttribute('aria-valuenow',String(scroll.position));thumb.style.height='16px';thumb.style.top=`${scroll.max===scroll.min?0:(scroll.position-scroll.min)/(scroll.max-scroll.min)*148}px`;};
  const stop=()=>{clearTimeout(timer);gesture=null;scrollbarCapture=false;};
  const repeat=()=>{if(!gesture||gesture.thumb)return;move(gesture.command);timer=setTimeout(repeat,70);};
  bar.onpointerdown=e=>{if(!enabled||e.button!==0)return;e.preventDefault();bar.focus();bar.setPointerCapture(e.pointerId);scrollbarCapture=true;
    if(e.target===thumb)gesture={thumb:true,start:e.clientY,position:scroll.position};
    else {const box=thumb.getBoundingClientRect();gesture={command:e.target.closest('.back')?'lineBack':e.target.closest('.forward')?'lineForward':e.clientY<box.top?'pageBack':'pageForward'};move(gesture.command);timer=setTimeout(repeat,350);}
  };
  bar.onpointermove=e=>{if(gesture?.thumb)move('thumb',gesture.position+(e.clientY-gesture.start)*(scroll.max-scroll.min)/148);};
  bar.onpointerup=bar.onpointercancel=bar.onlostpointercapture=stop;
  bar.onkeydown=e=>{if(!enabled)return;const command={ArrowUp:'lineBack',ArrowDown:'lineForward',PageUp:'pageBack',PageDown:'pageForward',Home:'home',End:'end'}[e.key];if(command){e.preventDefault();move(command);}};
  grid.onwheel=e=>{if(enabled){e.preventDefault();move(e.deltaY<0?'lineBack':'lineForward');}};
  move();return bar;
}
function updateScheduleGrid(){if(!$('schedule-dialog').open)return;const sh=tower.state.shafts.find(sh=>sh.id===+$('schedule-dialog').dataset.shaftId);if(!sh)return;for(const button of $('schedule-dialog').querySelectorAll('[data-car]')){const car=sh.cars.find(c=>c.id===+button.dataset.car),cell=elevatorScheduleCell(sh,car,+button.dataset.floor,tower.state.people);button.classList.toggle('park',cell.waiting);button.style.backgroundImage=cell.sheet?`url('/assets/bitmaps/${cell.sheet}.png')`:'none';button.style.backgroundPosition='-2px -2px';}for(const button of $('schedule-dialog').querySelectorAll('[data-floor]:not([data-car-slot])')){const floor=+button.dataset.floor;button.classList.toggle('waiting-floor',sh.cars.some(c=>c.parkingFloor===floor));button.classList.toggle('stop',sh.stops.includes(floor));}}
function departureMenu(ui,sh,day,phase,event) {
  ui.panel.querySelector('.native-departure-menu')?.remove();
  const previous=sh.programs[day][phase].departure,[x,y]=ui.rect(23+phase),rect=nativeDeparturePopupRect({left:x,top:y},previous);
  const menu=document.createElement('div');menu.className='native-departure-menu';ui.place(menu,[rect.left,rect.top,rect.width,rect.height]);menu.style.backgroundImage="url('/assets/bitmaps/405.png')";
  const highlight=document.createElement('div');highlight.className='native-departure-highlight';menu.append(highlight);
  const mark=index=>{highlight.style.top=`${index*22}px`;highlight.style.backgroundPosition=`0 -${index*22}px`;};mark(previous);
  const choice=e=>{const box=menu.getBoundingClientRect();return nativeDeparturePopupChoice({x:e.clientX-box.left,y:e.clientY-box.top},previous);};
  const finish=(e,index)=>{e.preventDefault();e.stopPropagation();menu.remove();tower.setElevatorProgram(sh.id,day,phase,{departure:index});elevatorDialog(sh,day,phase);};
  menu.onpointermove=e=>{const box=menu.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)finish(e,previous);else mark(choice(e));};
  menu.onpointerup=e=>finish(e,e.button===0?choice(e):previous);menu.onpointercancel=e=>finish(e,previous);
  menu.onpointerdown=e=>e.preventDefault();menu.oncontextmenu=e=>e.preventDefault();
  menu.onclick=e=>{e.preventDefault();e.stopPropagation();};
  if(event)menu.setPointerCapture(event.pointerId);
}
function renameDialog(item,person=false,back=()=>{}) {
  nativeUI.show(person?730:732,{fields:{4:item.name || ''},command:(id,el,panel)=>{
    if(id===1){const value=panel.querySelector('[data-control="4"]').value;if(!value || value.length>15)return;const named=person?tower.state.actors:tower.state.rooms;if(!item.name&&named.filter(r=>r.name).length>=20){toast(`Only 20 ${person?'people':'tenants'} can be named.`,true);return;}item.name=value;}
    else if(id===3)delete item.name;
    else if(id!==2)return;
    back();
  }});
}
function inspectorGraph(ui,cid,graph) {
  const rect=ui.rect(cid),canvas=document.createElement('canvas');canvas.width=rect[2];canvas.height=rect[3];const ctx=canvas.getContext('2d'),w=canvas.width-4,h=canvas.height-4;
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(1,1,canvas.width-2,canvas.height-2);
  const amount=Math.max(0,Math.min(graph.maximum,graph.increasing?graph.value:graph.maximum-graph.value));ctx.fillStyle=['#0000ff','#ffff00','#ff0000'][graph.band];ctx.fillRect(2,2,Math.floor(w*amount/graph.maximum),h);
  ctx.fillStyle='#000';for(const threshold of graph.increasing?[]:[graph.good,graph.bad]){const x=2+Math.floor(w*(graph.increasing?threshold:graph.maximum-threshold)/graph.maximum);ctx.fillRect(x,0,1,canvas.height);}
  if(graph.label!==undefined){ctx.font='13px Arial';ctx.textBaseline='top';ctx.fillText(String(graph.label),2,4);} //21D94 signed%d at(2,4).
  canvas.setAttribute('aria-label',`Value ${graph.value}`);ui.place(canvas,rect);
}
function roomDialog(r) {
  renderer.drawNativeGui(tower); //1FE8E invokes A1EE synchronously before DialogBox.
  // 0x1FD89 selects category + 748; generic facilities use 756.
  const panel=nativeFacilityPanel(r),id=panel.dialog;
  const options={13:['High','Average','Low','Very low'].map((label,value)=>[value,`${label} ${money((data.rent[CATALOG[r.key].id]?.[value] || 0)*data.moneyScale)}`])};
  const ui=nativeUI.show(id,{fields:{13:r.price},options,command:(cid,el)=>{
    if(cid===1)closeDialog();
    else if(cid===7)renameDialog(r,false,()=>roomDialog(r));
    else if(cid===13) {
      if(r.key==='cinema')movieDialog(r);
      else {
        const result=tower.setRoomPrice(r.id,+el.value);
        if(result.error){el.value=r.price;toast(result.error,true);}
      }
    }
  }});
  if(!nativePriceEnabled(r))ui.panel.querySelector('[data-control="13"]').disabled=true;
  ui.text(3,nativeInspectionTitle(data,r));
  const crop=nativeFacilityPreviewCrop(r),preview=document.createElement('canvas');preview.width=crop.width;preview.height=crop.height;
  const ctx=preview.getContext('2d');const draw=Object.create(renderer);draw.ctx=ctx;ctx.imageSmoothingEnabled=false;ctx.translate(-crop.x,-crop.y);draw.room(r,tower,tower.state.tick>=1600);
  for(const part of roomInteriorSprites(r,renderer.interiorPoses.get(r.id)?.poses||[]))draw.sprite(part.sheet,part.x,part.y,part.width,part.height,part.sx,part.sy,part.width,part.height);
  const [x,y,width,height]=ui.rect(2),target=nativePreviewFit(crop,{x,y,width,height});ui.place(preview,[target.x,target.y,target.width,target.height]);
  renderNativeOccupants(ui,nativePanelOccupants(tower.state,r),()=>roomDialog(r),panel);
  if(ui.rect(8)[2]>0)ui.text(8,nativeFacilityDiagnostics(data,tower.state,r,tower.route(r.floor,0,false,r.x)).join('\n'));
  const graph=nativeFacilityGraph(data,tower.state,r);if(graph)inspectorGraph(ui,6,graph.increasing?{...graph,label:graph.value}:graph);
  if(panel.stateLabel) {
    ui.text(5,nativeFacilityStateLabel(data,r,tower.state.tick));

    if(r.key==='office'||r.key==='condo')ui.text(9,tenureLabel(data,r.tenure));
  }
  if(r.key==='shop'||r.key==='fastfood'||r.key==='restaurant'){if(r.key!=='shop')ui.text(9,money(r.lastProfit||0));}
  if(r.key==='cinema'){ui.text(6,data.strings[420][r.movie.index]);ui.text(5,`${r.movie.days} days`);ui.text(10,money(r.movie.receipts));}
}
function actorPortrait(actor) {
  const room=tower.state.rooms.find(r=>r.id===actor.room),f=nativePersonPortrait(actor,room,tower.state.vip?.actor===actor.id);
  const c=document.createElement('canvas');c.width=f.width;c.height=f.height;
  c.getContext('2d').drawImage(renderer.assets.get(f.sheet),f.x,f.y,f.width,f.height,0,0,f.width,f.height);return c;
}
function personDialog(actor,back=closeDialog,context=0) {
  const room=tower.state.rooms.find(r=>r.id===actor.room);if(!room)return;
  const p=tower.state.people.find(p=>p.id===actor.trip),ui=nativeUI.show(nativePersonDialogId(room),{command:id=>{if(id===1)back();else if(id===4)renameDialog(actor,true,()=>personDialog(actor,back,context));}});
  const portrait=actorPortrait(actor);portrait.style.objectFit='contain';portrait.style.imageRendering='pixelated';ui.place(portrait,ui.rect(2));
  ui.text(3,actor.name||nativePersonRole(data,actor,room,tower.state.tick));
  ui.text(5,`${room.name||CATALOG[room.key].name} · ${floorLabel(room.floor)}`);
  const stress=nativePersonMean(actor);
  if(nativePersonDialogId(room)===763){const tier=tower.state.star<3?0:tower.state.star===3?1:2;inspectorGraph(ui,6,{value:stress,maximum:300,band:nativeStressBand(data,stress,tower.state.star),good:data.tenantStress.good[tier],bad:data.tenantStress.bad[tier],increasing:false});}
  const venue=tower.state.rooms.find(r=>r.id===actor.job);
  ui.text(7,p?floorLabel(p.to):[32,33,37,38,39].includes(actor.state)?'Outside':room.key==='housekeeping'&&actor.state===2?'Cleaning':venue&&[34,35,65,66].includes(actor.state)?`${CATALOG[venue.key].name} · ${floorLabel(venue.floor)}`:'Inside');
  if(nativePersonDialogId(room)===763){const current=nativeCurrentPersonStress(actor,p,tower.state,context),tier=tower.state.star<3?0:tower.state.star===3?1:2;inspectorGraph(ui,8,{value:current,maximum:300,band:nativeStressBand(data,current,tower.state.star),increasing:true});}
}
function findPersonDialog() {
  const people=tower.state.actors.filter(a=>a.name);
  const ui=nativeUI.show(510,{options:{5:people.map(a=>[a.id,a.name])},command:(id,el,panel)=>{
    if(id===1){closeDialog();return;}
    const actor=people.find(a=>a.id===+panel.querySelector('[data-control="5"]').value);if(!actor)return;
    if(id===3){delete actor.name;findPersonDialog();}
    if(id===4){const location=findPersonTarget(tower.state,actor,data);if(!location||location.outside){toast(`${actor.name}: ${data.strings[700][0]}`);return;}closeDialog();findMarkerSpeed=speed||1;setSpeed(0);renderer.camera={x:location.x*CELL,y:-(location.floor+.5)*FLOOR};renderer.findMarker=createFindMarker(location,performance.now(),actor.id);}
  }});
  ui.panel.querySelector('[data-control="5"]').ondblclick=()=>ui.panel.querySelector('[data-control="4"]').click();
  for(const id of [3,4])ui.panel.querySelector(`[data-control="${id}"]`).disabled=!people.length;
}
function movieDialog(r) {nativeUI.show(731,{command:cid=>{if(cid===2){roomDialog(r);return;}const result=tower.changeMovie(r.id,cid===1?'new':'classic');if(result.error){toast(result.error,true);return;}roomDialog(r);updateUI();}});}
function findTenantDialog() {
  const rooms=tower.state.rooms.filter(r=>r.name);
  const ui=nativeUI.show(520,{options:{5:rooms.map(r=>[r.id,r.name])},command:(id,el,panel)=>{
    if(id===1){closeDialog();return;}
    const room=rooms.find(r=>r.id===+panel.querySelector('[data-control="5"]').value);
    if(!room)return;
    if(id===3){delete room.name;findTenantDialog();}
    else if(id===4){renderer.camera={x:(room.x+room.width/2)*CELL,y:-(room.floor+.5)*FLOOR};closeDialog();}
  }});
  const list=ui.panel.querySelector('[data-control="5"]');list.ondblclick=()=>ui.panel.querySelector('[data-control="4"]').click();
  for(const id of [3,4])ui.panel.querySelector(`[data-control="${id}"]`).disabled=!rooms.length;
}
function financesDialog() {
  const s=tower.state,a=s.accounts,ui=nativeUI.show(500);
  ui.hotspot(1,'OK',closeDialog);
  const info=financeInfo(s,financePopulationRows(s),data.moneyScale),canvas=document.createElement('canvas');canvas.width=parseInt(ui.panel.style.width);canvas.height=parseInt(ui.panel.style.height);canvas.style.pointerEvents='none';
  const ctx=canvas.getContext('2d');ctx.fillStyle='#000';for(const run of financeTextRuns(nativeUI.templates[500],info)){ctx.font=`${run.font}px Arial`;ctx.textAlign=run.align;ctx.textBaseline=run.baseline;ctx.fillText(run.text,run.x,run.y);}
  canvas.setAttribute('aria-label',`Finance: income ${info.fields[6]}, maintenance ${info.fields[7]}, balance ${info.fields[14]}`);ui.place(canvas,[0,0,canvas.width,canvas.height]);
}
function helpDialog(context) {
  // 0x2B39B..2B3AC delegates to WINHELP without pausing the tower.
  const query=new URLSearchParams({from:'game'});if(typeof context==='string')query.set('q',context);
  const url=`/assets/manual/index.html?${query}`;
  // A modeless local pane reliably exposes help in embedded-browser hosts.
  // It is independent of the game's modal dialog and does not pause its clock.
  const existing=document.getElementById('manual-help-window');if(existing){existing.querySelector('iframe').src=url+'&embedded=1';return;}
  const pane=document.createElement('dialog');pane.id='manual-help-window';pane.dataset.title='SimTower Help';
  const width=Math.min(1054,document.body.clientWidth*.9),height=Math.min(830,document.body.clientHeight*.85);
  Object.assign(pane.style,{left:`${(document.body.clientWidth-width)/2}px`,top:`${(document.body.clientHeight-height)/2}px`,width:`${width}px`,height:`${height}px`});
  const caption=document.createElement('div');caption.className='manual-window-caption';caption.textContent='SimTower Help';
  const close=document.createElement('button');close.className='dialog-close';close.setAttribute('aria-label','Close Help');close.textContent='×';
  const frame=document.createElement('iframe');frame.title='SimTower user manual';frame.src=url+'&embedded=1';
  let gesture;
  const stop=()=>{gesture=null;windowCapture=false;pane.classList.remove('window-gesture');};
  const start=(event,edge='')=>{if(event.button!==0)return;event.preventDefault();const box=pane.getBoundingClientRect();gesture={x:event.clientX,y:event.clientY,rect:{x:box.left,y:box.top,width:box.width,height:box.height},edge};event.currentTarget.setPointerCapture(event.pointerId);windowCapture=true;pane.classList.add('window-gesture');};
  const move=event=>{if(!gesture)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,r=gesture.rect,next=gesture.edge?resizeDesktopRect(r,gesture.edge,dx,dy,{width:280,height:180}):{...r,x:Math.max(36-r.width,Math.min(document.body.clientWidth-36,r.x+dx)),y:Math.max(0,Math.min(document.body.clientHeight-20,r.y+dy))};Object.assign(pane.style,{left:`${next.x}px`,top:`${next.y}px`,width:`${next.width}px`,height:`${next.height}px`});};
  caption.onpointerdown=event=>start(event);
  const listener=event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data==='close-simtower-help')finish();};
  const finish=()=>{stop();window.removeEventListener('message',listener);pane.close();pane.remove();};close.onclick=finish;pane.addEventListener('cancel',event=>{event.preventDefault();finish();});
  pane.append(caption,close,frame);
  for(const [edge,name] of [['n','north'],['s','south'],['e','east'],['w','west'],['ne','northeast'],['nw','northwest'],['se','southeast'],['sw','southwest']]){const handle=document.createElement('div');handle.className=`native-resize-edge ${name}`;handle.dataset.resize=edge;handle.onpointerdown=event=>start(event,edge);pane.append(handle);}
  pane.onpointermove=move;pane.onpointerup=pane.onpointercancel=pane.onlostpointercapture=stop;
  document.body.append(pane);window.addEventListener('message',listener);pane.show();
}
function aboutDialog() {
  // 0x4D9F / 0x529B: bitmap 257 plus a 240px credit pane, 55ms/pixel.
  const image=renderer.assets.get(257),width=image.width+270,height=image.height+20;
  showDialog(`<div class="original-about" style="width:${width}px;height:${height}px"><img src="/assets/bitmaps/257.png" width="${image.width}" height="${image.height}" alt="SimTower"><div class="original-credits" style="height:${image.height}px"><div>${escape(data.credits)}</div></div></div>`, 'SimTower - About');
  $('dialog').classList.add('native-dialog');
  const pane=document.querySelector('.original-credits'),text=pane.firstElementChild;
  const distance=pane.clientHeight+text.offsetHeight;
  text.animate([{transform:`translateY(${pane.clientHeight}px)`},{transform:`translateY(-${text.offsetHeight}px)`}],{duration:distance*55,iterations:Infinity,easing:`steps(${distance})`});
  document.querySelector('.original-about').onclick=closeDialog;
}
function galleryDialog() {
  const bitmaps = manifest.resources.filter(r => r.type === 2), wavs = manifest.resources.filter(r => r.path.endsWith('.wav'));
  showDialog(`<span class="dialog-eyebrow">FROM THE ORIGINAL EXECUTABLE</span><h2>The original artwork.</h2><p class="dialog-copy">${bitmaps.length} bitmap resources and ${wavs.length} sound clips, extracted losslessly. IDs match the Windows executable.</p><div class="gallery">${bitmaps.map(r => `<div class="gallery-item"><small>RESOURCE ${r.id} · ${r.width} × ${r.height}</small><img loading="lazy" src="/assets/bitmaps/${r.id}.png" alt="Original SimTower bitmap ${r.id}"></div>`).join('')}</div><div class="dialog-section"><h3>Sound archive</h3><div class="sound-list">${wavs.map(r => `<button data-sound="${r.id}" aria-label="Play sound ${r.id}">${r.id} ▶</button>`).join('')}</div></div>`);
  document.querySelectorAll('[data-sound]').forEach(button => button.onclick = () => playSound(+button.dataset.sound, true));
}
function downloadSave({saveAs=false,onSaved=()=>{}}={}) {
  const request=browserSaveRequest(tower.state,saveAs);
  const download=filename=>{
    const oldName=tower.state.name,oldFilename=tower.state.browserSaveFilename;
    try {
      tower.state.name=browserSaveTitle(filename);tower.state.browserSaveFilename=filename;
      tower.state.editorScroll=nativeCameraScroll(renderer.camera,renderer.width,renderer.height);
      const blob=new Blob([tower.save()],{type:'application/json'}),url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
      closeDialog();updateUI();autosave();toast('Tower saved.');onSaved();
    }catch(error){tower.state.name=oldName;if(oldFilename===undefined)delete tower.state.browserSaveFilename;else tower.state.browserSaveFilename=oldFilename;toast(error.message,true);}
  };
  if(!request.prompt){download(request.filename);return;}
  showDialog(`<form id="browser-save-form" class="native-browser-save"><label for="browser-save-name">File name:</label><input id="browser-save-name" value="${escape(request.filename)}" maxlength="94" autocomplete="off"><div class="dialog-buttons"><button type="submit">Save</button><button type="button" id="browser-save-cancel">Cancel</button></div></form>`,'Save Tower data file');
  $('dialog').classList.add('native-dialog','native-caption');
  $('browser-save-form').onsubmit=e=>{e.preventDefault();const filename=browserSaveFilename($('browser-save-name').value);if(filename)download(filename);else $('browser-save-name').focus();};
  $('browser-save-cancel').onclick=closeDialog;$('browser-save-name').focus();$('browser-save-name').select();
}
function canvasPosition(e) { const box = $('tower').getBoundingClientRect(); return { x: e.clientX - box.left, y: e.clientY - box.top }; }
function constructionGrid(pos) {
  const point=renderer.screenToWorld(pos.x,pos.y);
  //3C7C7 centers the selected footprint before3921D rounds to cells.
  //15920 adds a car only when this left column equals the shaft's+3E.
  return nativeConstructionPointer(tool,point.x,point.y);
}
function updatePreview(pos,modifiers) {
  if (!['build','finger'].includes(mode) || !started || $('dialog').open || $('schedule-dialog').open) { renderer.preview = null; return; }
  const raw=renderer.grid(pos.x,pos.y),at=mode==='build'&&!dragging?.shaft?constructionGrid(pos):raw,start=dragging?.pan?at:dragging?.grid||at;
  $('tower').style.cursor=nativeGameCursor(mode,speed!==0,mode==='finger'&&Boolean(dragging&&!dragging.pan));
  //14DE4 dispatches extension through Finger.3C5D4 draws no construction
  //outline in that mode; the native SIZENS cursor starts on capture only.
  if(dragging?.shaft){renderer.preview=null;return;}
  if(mode==='finger'){renderer.preview=null;return;}
  const endFloor = start.floor;
  const span=constructionDragSpan(tool,start,at),endX=span?.endX??start.x,left=span?.x??start.x;
  const p = tower.plan(tool, start.floor, left, endX, endFloor, dragging?.modifiers??modifiers);
  const width = p.width || (span?endX-left+1:CATALOG[tool].width);
  renderer.preview = { ...p, key:tool, x: p.x ?? left, width, low: p.low ?? Math.min(start.floor, endFloor), high: p.high ?? Math.max(start.floor, endFloor), error: p.error || !tower.canAfford(p.cost) };
}
function buildDragBatch(target) {
  const batch=constructionDragBatch(tool,dragging.grid,target,dragging.progress);dragging.progress=batch.progress;
  let built=false;for(const placement of batch.placements){const result=tower.build(placement.key,placement.floor,placement.x,placement.x,placement.floor,dragging.modifiers);feedback(result);built ||= !result.error;}
  return built;
}
function buildDragSpan(target) {
  const span=constructionDragSpan(tool,dragging.grid,target),signature=`${span.x}:${span.endX}`;
  if(dragging.spanSignature===signature)return false;dragging.spanSignature=signature;
  const result=tower.build(span.key,span.floor,span.x,span.endX,span.floor,dragging.modifiers);feedback(result);return !result.error;
}
function scrollConstruction(pos,axis) {
  renderer.camera=nativeConstructionAutoScroll(renderer.camera,pos,renderer.width,renderer.height,axis,renderer.zoom);
}
function attachDesktopWindow() {
  const frame=$('native-main-window'),title=frame.querySelector('.window-title'),maximize=frame.querySelector('[aria-label="Maximize"]');
  const icon=document.createElement('button');icon.className='native-app-icon';icon.setAttribute('aria-label','SimTower application icon');icon.innerHTML='<img src="/assets/icons/application.png" alt=""><span>SimTower</span>';icon.hidden=true;document.body.append(icon);
  const limits=()=>nativeMainWindowGeometry(document.body.clientWidth,document.body.clientHeight);
  desktopWindow.rect={...limits().normal};let gesture,systemMenu;
  const closeSystemMenu=()=>{systemMenu?.remove();systemMenu=null;};
  const layout=()=>{
    const scroll=renderer&&nativeCameraScroll(renderer.camera,renderer.width,renderer.height),rect=desktopWindow.maximized?browserMaximizedRect(document.body.clientWidth,document.body.clientHeight):desktopWindow.rect;
    Object.assign(frame.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    document.body.classList.toggle('desktop-minimized',desktopWindow.minimized);icon.hidden=!desktopWindow.minimized;frame.classList.toggle('maximized',desktopWindow.maximized);
    maximize.setAttribute('aria-label',desktopWindow.maximized?'Restore':'Maximize');maximize.title=desktopWindow.maximized?'Restore':'Maximize';
    if(renderer){renderer.resize();renderer.camera=nativeCameraFromScroll(scroll,renderer.width,renderer.height);updateScrollbars();}
  };
  const restore=()=>{closeSystemMenu();const fromMinimized=desktopWindow.minimized;desktopWindow.minimized=false;if(!fromMinimized)desktopWindow.maximized=false;soundMixer.enabled[1]=soundCategories[1];layout();};
  const maximizeWindow=()=>{closeSystemMenu();desktopWindow.minimized=false;desktopWindow.maximized=true;soundMixer.enabled[1]=soundCategories[1];layout();};
  const minimizeWindow=()=>{closeSystemMenu();desktopWindow.minimized=true;for(let i=0;i<soundMixer.channels.length;i++)if(soundMixer.channels[i]?.category===1)soundMixer.stopChannel(i);soundMixer.enabled[1]=false;layout();};
  const start=(e,edge='',system=false)=>{if(desktopWindow.maximized||desktopWindow.minimized)return;gesture={startX:e.clientX,startY:e.clientY,rect:{...desktopWindow.rect},edge,system};windowCapture=true;closeSystemMenu();if(!system)e.currentTarget.setPointerCapture(e.pointerId);};
  const stop=()=>{gesture=null;windowCapture=false;};
  const move=e=>{
    if(!gesture)return;const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY,r=gesture.rect,next={...r};
    if(!gesture.edge){next.x=Math.max(36-r.width,Math.min(document.body.clientWidth-36,r.x+dx));next.y=Math.max(0,Math.min(document.body.clientHeight-18,r.y+dy));}
    else Object.assign(next,resizeDesktopRect(r,gesture.edge,dx,dy,limits().minimum));
    desktopWindow.rect=next;layout();
  };
  const menu=e=>{
    closeSystemMenu();systemMenu=document.createElement('div');systemMenu.className='native-system-menu';systemMenu.setAttribute('role','menu');
    systemMenu.innerHTML=[['restore','<u>R</u>estore',!desktopWindow.maximized&&!desktopWindow.minimized],['move','<u>M</u>ove',desktopWindow.maximized||desktopWindow.minimized],['size','<u>S</u>ize',desktopWindow.maximized||desktopWindow.minimized],['minimize','Mi<u>n</u>imize',desktopWindow.minimized],['maximize','Ma<u>x</u>imize',desktopWindow.maximized],['close','<u>C</u>lose',false]].map(([action,label,disabled])=>`${action==='close'?'<hr>':''}<button role="menuitem" data-mnemonic="${({restore:'r',move:'m',size:'s',minimize:'n',maximize:'x',close:'c'})[action]}" data-window-command="${action}" ${disabled?'disabled':''}>${label}${action==='close'?'<span>Alt+F4</span>':''}</button>`).join('');
    const anchor=e.currentTarget.getBoundingClientRect();systemMenu.style.left=`${anchor.left}px`;systemMenu.style.top=`${desktopWindow.minimized?Math.max(0,anchor.top-172):anchor.bottom}px`;document.body.append(systemMenu);
    systemMenu.onclick=event=>{const command=event.target.closest('[data-window-command]')?.dataset.windowCommand;if(!command)return;event.stopPropagation();closeSystemMenu();if(command==='restore')restore();else if(command==='maximize')maximizeWindow();else if(command==='minimize')minimizeWindow();else if(command==='close')$('exit').click();else start(event,command==='size'?'se':'',true);};e.stopPropagation();
  };
  frame.querySelector('[aria-label="System menu"]').onclick=menu;
  frame.querySelector('[aria-label="Minimize"]').onclick=minimizeWindow;maximize.onclick=()=>desktopWindow.maximized?restore():maximizeWindow();
  title.onpointerdown=e=>{if(e.button===0&&e.target.tagName!=='BUTTON'){e.preventDefault();start(e);}};title.ondblclick=e=>{if(e.target.tagName!=='BUTTON')desktopWindow.maximized?restore():maximizeWindow();};
  for(const edge of frame.querySelectorAll('[data-resize]'))edge.onpointerdown=e=>{if(e.button===0){e.preventDefault();start(e,edge.dataset.resize);}};
  document.addEventListener('pointermove',move);document.addEventListener('pointerup',()=>{if(!gesture?.system)stop();});document.addEventListener('pointercancel',stop);
  document.addEventListener('pointerdown',e=>{if(gesture?.system){stop();e.preventDefault();e.stopPropagation();}},true);
  document.addEventListener('click',closeSystemMenu);icon.onclick=menu;icon.ondblclick=restore;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSystemMenu();if(gesture){desktopWindow.rect=gesture.rect;stop();layout();}}else if(e.key==='Enter'&&gesture?.system)stop();});
  window.addEventListener('resize',layout);
  layout();
}
function attachScheduleWindow(){
  const dialog=$('schedule-dialog'),caption=dialog.querySelector('.native-modeless-caption'),system=$('schedule-system');let drag;
  const closeMenu=()=>dialog.querySelector('.native-dialog-system-menu')?.remove();
  const stop=()=>{drag=null;windowCapture=false;};
  const start=(e,pending=false)=>{const box=dialog.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:box.left,top:box.top,pending};if(!pending)caption.setPointerCapture(e.pointerId);windowCapture=true;};
  caption.onpointerdown=e=>{if(e.button===0&&e.target.tagName!=='BUTTON'){e.preventDefault();start(e);}};
  document.addEventListener('pointermove',e=>{if(!drag)return;dialog.style.margin='0';dialog.style.left=`${Math.max(0,Math.min(document.body.clientWidth-dialog.offsetWidth,drag.left+e.clientX-drag.x))}px`;dialog.style.top=`${Math.max(0,Math.min(document.body.clientHeight-dialog.offsetHeight,drag.top+e.clientY-drag.y))}px`;});
  caption.onpointerup=caption.onpointercancel=stop;
  system.onclick=e=>{closeMenu();const menu=document.createElement('div');menu.className='native-dialog-system-menu';menu.setAttribute('role','menu');menu.innerHTML='<button disabled>Restore</button><button data-schedule-move data-mnemonic="m"><u>M</u>ove</button><button disabled>Size</button><button disabled>Minimize</button><button disabled>Maximize</button><hr><button data-schedule-close data-mnemonic="c"><u>C</u>lose <span>Alt+F4</span></button>';dialog.append(menu);menu.querySelector('[data-schedule-close]').onclick=closeScheduleDialog;menu.querySelector('[data-schedule-move]').onclick=event=>{closeMenu();start(event,true);};menu.querySelector('[data-schedule-move]').focus();e.stopPropagation();};system.ondblclick=closeScheduleDialog;
  document.addEventListener('pointerdown',e=>{if(drag?.pending){stop();e.preventDefault();e.stopImmediatePropagation();return;}if(!e.target.closest('#schedule-system,.native-dialog-system-menu'))closeMenu();},true);
  document.addEventListener('keydown',e=>{
    if(!dialog.open||nativeModalOpen())return;
    if(e.altKey&&e.key==='F4'){e.preventDefault();e.stopImmediatePropagation();closeScheduleDialog();return;}
    const menu=dialog.querySelector('.native-dialog-system-menu');
    if(e.altKey&&e.key===' '||e.key==='F10'){e.preventDefault();e.stopImmediatePropagation();system.click();return;}
    if(e.key==='Escape'&&(menu||drag)){e.preventDefault();e.stopImmediatePropagation();closeMenu();if(drag){dialog.style.margin='0';dialog.style.left=`${drag.left}px`;dialog.style.top=`${drag.top}px`;stop();}return;}
    if(!menu)return;const buttons=[...menu.querySelectorAll('button')],current=buttons.indexOf(document.activeElement),metadata=buttons.map(button=>({disabled:button.disabled,mnemonic:button.dataset.mnemonic}));let index=-1;
    if(['ArrowDown','ArrowUp'].includes(e.key))index=nativeMenuStep(metadata,current,e.key==='ArrowDown'?1:-1);
    else if(e.key==='Enter'){if(current>=0&&!buttons[current].disabled)buttons[current].click();}
    else if(e.key.length===1){index=nativeMenuMnemonic(metadata,e.key);if(index>=0){buttons[index].click();index=-1;}}
    else return;e.preventDefault();e.stopImmediatePropagation();if(index>=0)buttons[index].focus();
  },true);
  dialog.addEventListener('close',()=>{closeMenu();stop();if(elevatorPreview)endElevatorPreview();setScheduleWindowInputs(true);});
}

function attachNativeMenus() {
  const topButtons=[...document.querySelectorAll('[data-menu]')],systemButton=document.querySelector('[aria-label="System menu"]'),topEntries=[systemButton,...topButtons];let barActive=false,cancelledPointer=false;
  //USER popup menus are independent windows. Keep the menu bar inside Edit,
  //but let its open menus appear over palettes even while Edit is maximized.
  for(const menu of document.querySelectorAll('.menu-dropdown'))document.body.append(menu);
  const close=()=>{barActive=false;document.querySelectorAll('.menu-dropdown,.menu-button,.submenu,.window-title .system.active').forEach(el=>el.classList.remove('open','active'));document.querySelector('.native-system-menu')?.remove();};
  const openSystem=()=>{close();const icon=document.querySelector('.native-app-icon:not([hidden])');(icon||systemButton).click();focusFirst(document.querySelector('.native-system-menu'));};
  const items=container=>[...container.children].map(el=>el.tagName==='BUTTON'?el:el.classList.contains('submenu')?el.querySelector(':scope > button'):null).filter(Boolean);
  const metadata=entries=>entries.map(el=>({disabled:el.disabled,mnemonic:el.dataset.mnemonic||el.querySelector('u')?.textContent}));
  const focusFirst=container=>{const list=items(container),index=nativeMenuStep(metadata(list),-1,1);if(index>=0)list[index].focus();};
  const open=button=>{close();barActive=true;const menu=$(`menu-${button.dataset.menu}`),anchor=button.getBoundingClientRect();menu.style.left=`${anchor.left}px`;menu.style.top=`${anchor.bottom}px`;menu.classList.add('open');button.classList.add('active');focusFirst(menu);};
  const activateBar=()=>{close();barActive=true;topButtons[0].classList.add('active');topButtons[0].focus();};
  for(const button of topButtons){button.onclick=e=>{const wasOpen=$(`menu-${button.dataset.menu}`).classList.contains('open');if(wasOpen)close();else open(button);e.stopPropagation();};button.onpointerenter=()=>{if(document.querySelector('.menu-dropdown.open'))open(button);};}
  for(const button of document.querySelectorAll('.submenu > button'))button.onclick=e=>{const submenu=button.parentElement;submenu.classList.add('open');focusFirst(submenu.querySelector('.submenu-items'));e.stopPropagation();};
  for(const menu of document.querySelectorAll('.menu-dropdown')) {
    menu.addEventListener('focusin',e=>{const current=e.target.closest('.submenu');for(const sub of menu.querySelectorAll('.submenu.open'))if(sub!==current)sub.classList.remove('open');});
    for(const button of menu.querySelectorAll('button'))button.onpointerenter=()=>{
      if(button.disabled)return;button.focus();
      if(button.parentElement.classList.contains('submenu')){button.parentElement.classList.add('open');focusFirst(button.parentElement.querySelector('.submenu-items'));}
    };
  }
  document.addEventListener('pointerdown',e=>{if(!(barActive||document.querySelector('.menu-dropdown.open,.native-system-menu'))||e.target.closest('.menu-button,.menu-dropdown,.native-system-menu'))return;close();cancelledPointer=true;e.preventDefault();e.stopImmediatePropagation();},true);
  document.addEventListener('pointercancel',()=>{cancelledPointer=false;},true);
  document.addEventListener('pointerup',e=>{if(!cancelledPointer)return;e.preventDefault();e.stopImmediatePropagation();},true);
  document.addEventListener('click',e=>{if(cancelledPointer){cancelledPointer=false;e.preventDefault();e.stopImmediatePropagation();return;}if(!e.target.closest('.menu-button,.submenu > button'))close();$('construction-popup')?.remove();},true);
  document.addEventListener('keydown',e=>{
    if(nativeModalOpen()||$('schedule-dialog').open)return;
    const activation=nativeMenuActivation(e);
    if(activation){e.preventDefault();e.stopImmediatePropagation();if(activation==='system')openSystem();else if(activation==='bar'){if(barActive)close();else activateBar();}else open(topButtons.find(button=>button.dataset.menu===activation));return;}
    const system=document.querySelector('.native-system-menu'),menu=document.querySelector('.menu-dropdown.open');if(!barActive&&!system&&!menu)return;
    const focused=document.activeElement,sub=focused.closest('.submenu-items'),container=sub||system||menu,list=container?items(container):topEntries,index=list.indexOf(focused);
    const handled=()=>{e.preventDefault();e.stopImmediatePropagation();};
    if(e.key==='Escape'){handled();if(sub){const parent=sub.parentElement;parent.classList.remove('open');parent.querySelector(':scope > button').focus();}else {close();$('tower').focus();}return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){handled();if(!container){if(focused===systemButton)openSystem();else open(focused.dataset.menu?focused:topButtons[0]);return;}const next=nativeMenuStep(metadata(list),index,e.key==='ArrowDown'?1:-1);if(next>=0)list[next].focus();return;}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      handled();if(e.key==='ArrowLeft'&&sub){sub.parentElement.classList.remove('open');sub.parentElement.querySelector(':scope > button').focus();return;}
      if(e.key==='ArrowRight'&&focused.parentElement?.classList.contains('submenu')){focused.parentElement.classList.add('open');focusFirst(focused.parentElement.querySelector('.submenu-items'));return;}
      const current=system?0:topEntries.findIndex(button=>button.classList.contains('active')),next=(current+(e.key==='ArrowRight'?1:-1)+topEntries.length)%topEntries.length;if(system||menu){if(next===0)openSystem();else open(topEntries[next]);}else {topEntries.forEach(button=>button.classList.remove('active'));topEntries[next].classList.add('active');topEntries[next].focus();}return;
    }
    if(e.key==='Enter'){handled();if(!container){if(focused===systemButton)openSystem();else open(focused.dataset.menu?focused:topButtons[0]);}else if(focused.parentElement?.classList.contains('submenu')){focused.parentElement.classList.add('open');focusFirst(focused.parentElement.querySelector('.submenu-items'));}else if(!focused.disabled){close();focused.click();}return;}
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){const match=nativeMenuMnemonic(metadata(list),e.key);if(match>=0){handled();const command=list[match];close();command.click();}}
  },true);
}
function updateScrollbars() {
  const scroll=nativeCameraScroll(renderer.camera,renderer.width,renderer.height);
  for(const bar of document.querySelectorAll('[data-scroll-axis]')) {
    const axis=bar.dataset.scrollAxis,track=bar.querySelector('.scroll-track'),thumb=bar.querySelector('.scroll-thumb');
    const geometry=nativeScrollbarGeometry(axis==='x'?bar.clientWidth:bar.clientHeight,axis==='x'?renderer.width:renderer.height,axis==='x'?NATIVE_SITE_WIDTH:NATIVE_SITE_HEIGHT,scroll[axis]);
    thumb.style[axis==='x'?'width':'height']=`${geometry.thumb}px`;
    thumb.style[axis==='x'?'left':'top']=`${geometry.offset}px`;
    bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(geometry.max));bar.setAttribute('aria-valuenow',String(scroll[axis]));
  }
}
function attachScrollbars() {
  for(const bar of document.querySelectorAll('[data-scroll-axis]')) {
    const axis=bar.dataset.scrollAxis,track=bar.querySelector('.scroll-track');let gesture,timer;
    const extent=()=>axis==='x'?renderer.width:renderer.height,site=axis==='x'?NATIVE_SITE_WIDTH:NATIVE_SITE_HEIGHT;
    const coordinate=e=>axis==='x'?e.clientX:e.clientY;
    const move=(command,value)=>{const scroll=nativeCameraScroll(renderer.camera,renderer.width,renderer.height);scroll[axis]=nativeScrollPosition(scroll[axis],command,extent(),site,value);renderer.camera=nativeCameraFromScroll(scroll,renderer.width,renderer.height);updateScrollbars();};
    const stop=()=>{clearTimeout(timer);gesture=null;scrollbarCapture=false;};
    const repeat=()=>{if(!gesture||gesture.thumb)return;move(gesture.command);timer=setTimeout(repeat,70);};
    bar.onpointerdown=e=>{
      if(e.button!==0||elevatorPreview||nativeModalOpen()||$('schedule-dialog').open)return;e.preventDefault();bar.setPointerCapture(e.pointerId);scrollbarCapture=true;
      const thumb=bar.querySelector('.scroll-thumb'),scroll=nativeCameraScroll(renderer.camera,renderer.width,renderer.height);
      if(e.target===thumb)gesture={thumb:true,start:coordinate(e),position:scroll[axis]};
      else {const back=e.target.closest('.back'),forward=e.target.closest('.forward');const box=thumb.getBoundingClientRect();gesture={command:back?'lineBack':forward?'lineForward':coordinate(e)<(axis==='x'?box.left:box.top)?'pageBack':'pageForward'};move(gesture.command);timer=setTimeout(repeat,350);}
    };
    bar.onpointermove=e=>{if(!gesture?.thumb)return;const geometry=nativeScrollbarGeometry(axis==='x'?bar.clientWidth:bar.clientHeight,extent(),site,gesture.position);move('thumb',gesture.position+(coordinate(e)-gesture.start)*(geometry.travel?geometry.max/geometry.travel:0));};
    bar.onpointerup=bar.onpointercancel=bar.onlostpointercapture=stop;
  }
  updateScrollbars();
}
function attachEvents() {
  const canvas = $('tower');attachScrollbars();
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    renderer.controlHeld=e.ctrlKey;
    if (!started || $('dialog').open||$('schedule-dialog').open||!nativeToolAllowed(mode,{running:speed!==0,preview:Boolean(elevatorPreview)})) return;
    const pos = canvasPosition(e),point=renderer.screenToWorld(pos.x,pos.y);
    //148A0 consumes a visible served-floor press before14DE4 captures.
    //The compatibility MouseDown's detail excludes the second press of a
    //double-click, which USER delivers as WM_LBUTTONDBLCLK instead.
    if(mode==='finger'&&e.button===0&&!e.altKey&&nativeFingerStopAt(tower.state,point.x,point.y)){dragging=null;return;}
    canvas.setPointerCapture(e.pointerId);
    dragging = { pos, grid:mode==='build'?constructionGrid(pos):renderer.grid(pos.x,pos.y), modifiers:{ctrlKey:e.ctrlKey,shiftKey:e.shiftKey},pan: mode === 'pan' || e.button !== 0 || e.altKey, camera: { ...renderer.camera }, moved: false };
    if (!dragging.pan && mode==='finger') {
      const point=renderer.screenToWorld(pos.x,pos.y),hit=nativeElevatorExtensionAt(tower.state,mode,point.x,point.y);
      if(hit){dragging.shaft=hit.shaft;dragging.end=hit.end;}
    }
    canvas.style.cursor=nativeGameCursor(mode,speed!==0,mode==='finger'&&!dragging.pan);
    if(!dragging.pan&&mode==='build'&&['parking','ramp'].includes(tool)){dragging.batch=true;buildDragBatch(dragging.grid);}
    if(!dragging.pan&&mode==='build'&&['floor','lobby'].includes(tool)){dragging.span=true;buildDragSpan(dragging.grid);}
    if (!dragging.pan) updatePreview(pos);
  });
  canvas.addEventListener('mousedown',e=>{
    if(e.detail!==1||e.button!==0||e.altKey||mode!=='finger'||!started||$('dialog').open||$('schedule-dialog').open||!nativeToolAllowed(mode,{running:speed!==0,preview:Boolean(elevatorPreview)}))return;
    const pos=canvasPosition(e),point=renderer.screenToWorld(pos.x,pos.y),hit=nativeFingerStopAt(tower.state,point.x,point.y);
    if(hit)changeElevatorStop(hit.shaft,hit.floor,updateUI);
  });
  canvas.addEventListener('pointermove', e => {
    renderer.controlHeld=e.ctrlKey;
    const pos = canvasPosition(e);
    if (dragging?.pan) { renderer.camera.x = dragging.camera.x - (pos.x - dragging.pos.x) / renderer.zoom; renderer.camera.y = dragging.camera.y - (pos.y - dragging.pos.y) / renderer.zoom;renderer.camera=nativeScrollCamera(renderer.camera,renderer.width,renderer.height,renderer.zoom); dragging.moved = true; }
    else {
      if(dragging?.batch&&buildDragBatch(constructionGrid(pos)))scrollConstruction(pos,tool==='ramp'?'y':'x');
      if(dragging?.span&&buildDragSpan(constructionGrid(pos)))scrollConstruction(pos,'x');
      if(dragging?.shaft){
        const point=renderer.screenToWorld(pos.x,pos.y),sh=dragging.shaft,range=nativeElevatorExtensionRange(sh,dragging.end,point.x,point.y);
        if(range&&(range.low!==sh.low||range.high!==sh.high)){const result=tower.resizeShaft(sh.id,range.low,range.high);if(!result.error){scrollConstruction(pos,'y');updateUI();}}
      }
      updatePreview(pos,{ctrlKey:e.ctrlKey,shiftKey:e.shiftKey});
    }
  });
  canvas.addEventListener('pointerup', e => {
    renderer.controlHeld=e.ctrlKey;
    if (!dragging) return;
    const drag=dragging,pos=canvasPosition(e),at=mode==='build'&&!dragging.shaft?constructionGrid(pos):renderer.grid(pos.x,pos.y); dragging = null;canvas.style.cursor=nativeGameCursor(mode,speed!==0);
    if (!drag.pan) {
      if(drag.batch||drag.span){/* Held construction has already committed each piece. */}
      else if (drag.shaft) {const point=renderer.screenToWorld(pos.x,pos.y),range=nativeElevatorExtensionRange(drag.shaft,drag.end,point.x,point.y);if(range)feedback(tower.resizeShaft(drag.shaft.id,range.low,range.high));}
      else if (mode === 'inspect') inspect(at,renderer.screenToWorld(pos.x,pos.y));
      else if (mode==='finger') {/*Native served-floor action was consumed on MouseDown.*/}
      else if (mode === 'demolish') { feedback(tower.demolish(at.floor, at.x, renderer.screenToWorld(pos.x,pos.y))); selected = null; renderer.selected = null; $('inspector').hidden = true; }
      else feedback(tower.build(tool, drag.grid.floor, drag.grid.x, ['floor', 'lobby'].includes(tool) ? at.x : drag.grid.x, drag.grid.floor, drag.modifiers));
    }
    updatePreview(pos);
  });
  canvas.addEventListener('pointercancel', () => { dragging = null; renderer.preview = null;canvas.style.cursor=nativeGameCursor(mode,speed!==0); });
  canvas.addEventListener('dblclick',e=>{if(mode!=='finger'||e.button!==0||!started||$('dialog').open||$('schedule-dialog').open)return;const pos=canvasPosition(e),point=renderer.screenToWorld(pos.x,pos.y),sh=nativeFingerShaftAt(tower.state,point.x,point.y);if(sh)elevatorDialog(sh);});
  canvas.addEventListener('pointerleave', () => { if (!dragging) renderer.preview = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault();if(elevatorPreview||nativeModalOpen()||$('schedule-dialog').open)return;scrollingUntil=performance.now()+120; renderer.camera.y += e.shiftKey?0:e.deltaY; renderer.camera.x += e.deltaX + (e.shiftKey ? e.deltaY : 0); renderer.camera=nativeScrollCamera(renderer.camera,renderer.width,renderer.height,renderer.zoom);updatePreview(canvasPosition(e)); updateUI(); }, { passive: false });
  let mapHeld=false;$('minimap').onpointerdown=e=>{mapHeld=true;$('minimap').setPointerCapture(e.pointerId);navigateMap(e);};$('minimap').onpointermove=e=>{if(mapHeld)navigateMap(e);};$('minimap').onpointerup=$('minimap').onpointercancel=()=>mapHeld=false;
  const navigateMap=e=>{const b=$('minimap').getBoundingClientRect();renderer.mapNavigate((e.clientX-b.left)*200/b.width,(e.clientY-b.top)*288/b.height);};
  $('minimap').onclick = e => { const b = $('minimap').getBoundingClientRect(); renderer.mapNavigate((e.clientX - b.left) * 200 / b.width, (e.clientY - b.top) * 288 / b.height); };
  document.querySelectorAll('[data-map-mode]').forEach(button=>button.onclick=()=>{const controls=nativeViewSelection({running:speed!==0,view:renderer.mapMode||0,star:tower.state.sandbox?5:tower.state.star,mode,preview:Boolean(elevatorPreview)},+button.dataset.mapMode);renderer.mapMode=controls.view;renderer.evaluation=renderer.mapMode===1;setSpeed(controls.running?1:0);setMode(controls.mode);document.querySelectorAll('[data-map-mode]').forEach(b=>b.classList.toggle('selected',b===button));});
  for(const handle of document.querySelectorAll('.native-window-handle')) {
    let drag;
    handle.onpointerdown=e=>{if(e.target.tagName==='BUTTON')return;windowCapture=true;const panel=handle.parentElement;drag={x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};handle.setPointerCapture(e.pointerId);};
    handle.onpointermove=e=>{if(!drag)return;const panel=handle.parentElement,parent=panel.offsetParent;panel.style.left=`${Math.max(0,Math.min(parent.clientWidth-panel.offsetWidth,drag.left+e.clientX-drag.x))}px`;panel.style.top=`${Math.max(0,Math.min(parent.clientHeight-panel.offsetHeight,drag.top+e.clientY-drag.y))}px`;panel.style.right='auto';};
    handle.onpointerup=handle.onpointercancel=()=>{drag=null;windowCapture=false;};
  }
  document.querySelectorAll('[data-hide]').forEach(button=>button.onclick=()=> $(`toggle-${button.dataset.hide}`).click());
  document.querySelectorAll('[data-mode]').forEach(el => el.onclick = () => setMode(el.dataset.mode));
  $('time-control').onclick = () => setSpeed(speed ? 0 : 1);
  $('new').onclick = newTowerDialog; $('save').onclick = ()=>downloadSave(); $('load').onclick=()=>guardedTowerAction('open',()=>{closeDialog();$('save-file').click();});
  $('save-as').onclick = ()=>downloadSave({saveAs:true});
  $('exit').onclick=()=>guardedTowerAction('quit',()=>{autosave();setSpeed(0);started=false;titleDialog();});
  attachNativeMenus();
  $('toggle-map').onclick = () => { const map = document.querySelector('.map-window'); map.hidden = !map.hidden; };
  $('toggle-tools').onclick = () => { const panel = document.querySelector('.build-panel'); panel.hidden = !panel.hidden; panel.style.display = panel.hidden ? 'none' : ''; };
  $('toggle-info').onclick = () => { const panel = document.querySelector('.statusbar'); panel.hidden = !panel.hidden; panel.style.display = panel.hidden ? 'none' : ''; };
  $('toggle-effects').onclick=()=>{renderer.effectsEnabled=!renderer.effectsEnabled;setMenuCheck('toggle-effects',renderer.effectsEnabled,'Effects');};
  $('toggle-people').onclick = () => { renderer.showPeople = !renderer.showPeople;setMenuCheck('toggle-people',renderer.showPeople,'People');};
  for(const [id,enhanced] of [['textures-upscaled',true],['textures-original',false]])$(id).onclick=()=>{
    renderer.textureAssets=enhanced?upscaledTextures:null;renderer.sceneDirty=true;renderer.resetNativeGrid();
    setMenuCheck('textures-upscaled',enhanced,'Upscaled (waifu2x)');setMenuCheck('textures-original',!enhanced,'Original');
  };
  for(const [id,index,label] of [['toggle-sound',0,'Elevators'],['toggle-background',1,'Background'],['toggle-events',2,'Events']]) $(id).onclick=()=>{soundCategories[index]=!soundCategories[index];soundMixer.setEnabled(index,soundCategories[index]);setMenuCheck(id,soundCategories[index],label);};
  $('fast-mode').onclick = () => {fastMode=!fastMode;setSpeed(speed?1:0);};
  $('call-fire-rescue').onclick=()=>tower.callFireRescue();
  $('save-file').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 64*1024*1024) throw new Error('Save file is too large.'); const next = new Tower(data); next.load(await file.text());next.state.browserSaveFilename=browserSaveFilename(file.name)||'untitled.simtower.json';next.state.name=browserSaveTitle(next.state.browserSaveFilename);begin(next,true); toast('Tower opened.'); } catch (err) { if(startupLoad)begin(newNativeApplicationTower(data,tower));toast(err.message || 'Could not open this save.', true); } e.target.value = ''; };
  $('save-file').addEventListener('cancel',()=>{if(startupLoad)begin(newNativeApplicationTower(data,tower));});
  $('help').onclick = ()=>helpDialog(); $('about').onclick = aboutDialog; $('finances').onclick = financesDialog; $('dialog-close').onclick = closeDialog;
  $('find-tenant').onclick=findTenantDialog;
  $('find-person').onclick=findPersonDialog;
  document.addEventListener('keydown', e => {
    renderer.controlHeld=e.ctrlKey;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || nativeModalOpen() || $('schedule-dialog').open) return;
    if(nativeAccelerator(e)===40021){e.preventDefault();helpDialog();}
  });
  document.addEventListener('keyup',e=>{renderer.controlHeld=e.ctrlKey;});
  window.addEventListener('blur',()=>{renderer.controlHeld=false;});
  window.addEventListener('pagehide', autosave);
}
function setSpeed(value) {
  if(value===8)fastMode=true;speed=value===0?0:fastMode?8:1;if(speed===0)setMode('inspect');else if(renderer.mapMode){renderer.mapMode=0;renderer.evaluation=false;setMode('inspect');document.querySelectorAll('[data-map-mode]').forEach(b=>b.classList.toggle('selected',+b.dataset.mapMode===0));}
  if(renderer)renderer.nativePaused=speed===0;
  document.querySelectorAll('.build-tool,[data-mode]').forEach(button=>{button.disabled=speed===0&&button.dataset.mode!=='inspect';});
  const button = $('time-control'); button.classList.toggle('paused', speed === 0);
  button.setAttribute('aria-label', speed ? 'Pause' : 'Resume'); button.title = speed ? 'Pause' : 'Resume';
  setMenuCheck('fast-mode',fastMode,'Fast Mode');
}
function frame(time) {
  renderer.nativePaused=speed===0;
  renderer.nativeTickFrame=Boolean(renderer.nativeVisualPending);renderer.nativeVisualPending=false;
  renderer.guiCapture=gameGuiCaptured();
  if(started)renderer.palettePhase(tower,time); //4A30A begins after27255's startup choices return.
  if(!renderer.guiCapture&&renderer.findMarker&&findMarkerExpired(renderer.findMarker,time)){renderer.findMarker=null;setSpeed(findMarkerSpeed);}
  if (started && !manualScene && nativeSimulationActive({running:speed!==0,preview:Boolean(elevatorPreview),scrolling:windowCapture||scrollbarCapture||Boolean(dragging?.pan)||time<scrollingUntil,menuCapture:Boolean($('construction-popup')||document.querySelector('.native-departure-menu,.menu-dropdown.open,.menu-button.active,.window-title .system.active,.native-system-menu,.native-dialog-system-menu')),modalOpen:$('dialog').open||$('native-message-box')?.open}) && !document.hidden) {
    if(!tower.state.dialogs.length)tickScheduler.frame(()=>{tower.step();const viewport={x:renderer.camera.x/CELL-renderer.width/renderer.zoom/CELL/2,width:renderer.width/renderer.zoom/CELL,topFloor:Math.floor(-(renderer.camera.y-renderer.height/renderer.zoom/2)/FLOOR),height:renderer.height/renderer.zoom/FLOOR};const sound=ambientSound(tower.state,viewport,max=>tower.randomInt(max));if(sound)soundMixer.play(sound);return tower.state.dialogs.length===0;},{fast:fastMode,paused:speed===0});
    const message=tower.state.dialogs[0];
    //Keep unanswered native prompts in saved state. Autosaving while a modal
    //is open must not silently discard its decision on the next load.
    if(message)showPendingNativeDialog(message);
    if(tower.state.viewFocus){const {floor,x}=tower.state.viewFocus;renderer.camera={x:x*CELL,y:-(floor+.5)*FLOOR};delete tower.state.viewFocus;}
  }
  renderer.guiCapture=gameGuiCaptured(); //A new native DialogBox may have yielded inside this tick.
  //27255 keeps the game windows hidden until New/Open invokes F296.
  //Rendering behind the title would consume the first cloud RNG draws early.
  if(started){if(elevatorPreview){const original=tower.state.shafts.find(sh=>sh.id===elevatorPreview.shaftId),display=elevatorPreview.displayState.shafts[0];display.visible=original.visible;renderer.render({...tower,state:elevatorPreview.displayState,data},time/1000);}else renderer.render(tower, time / 1000);}
  updateScrollbars();
  for(const sound of tower.state.audioEvents.splice(0))soundMixer.play(originalSoundRequest(sound.id,sound.category,sound));
  if ((renderer.nativeTickFrame||time - lastUI > 250) && !renderer.guiCapture) { updateScheduleGrid();updateUI(); lastUI = time; }
  if(renderer.nativeTickFrame)renderer.palettePhase(tower,undefined,{present:true}); //FD4B:1007C updates the presented palette after Info Bar drawing.
  renderer.nativeVisualPending=false;
  if (time - lastSave > 15000) { autosave(); lastSave = time; }
  requestAnimationFrame(frame);
}
async function init() {
  const nativePaletteGateStartedAt=performance.now(); //274D7 initializes5696C before resource decoding.
  await $('loading').querySelector('img').decode();
  //27255: resource128 while27D51 decodes assets; sound20000,priority1
  //starts after initialization, just before53F0 opens the startup choices.
  const unlockIntro=()=>{if(startupIntroPending){startupIntroPending=false;soundMixer.play(originalSoundRequest(20000,1));}};
  document.addEventListener('pointerdown',unlockIntro,{capture:true});document.addEventListener('keydown',unlockIntro,{capture:true});
  const preloader=new AssetPreloader({onProgress:({loaded,total,percent})=>{
    const fill=$('loading-progress-fill'),label=$('loading-progress-label'),bar=$('loading-progress');
    if(!fill)return;fill.style.width=`${percent}%`;bar.setAttribute('aria-valuenow',String(percent));label.textContent=total?`Loading assets: ${loaded} of ${total} (${percent}%)`:'Preparing assets...';
  }});
  const metadataURLs=['/assets/game-data.json','/assets/manifest.json','/assets/dialogs.json','/assets/lobby-transports.json','/assets/native-indices.json','/assets/scene-indices.json','/assets/upscaled/waifu2x/manifest.json'];
  const loaded=await Promise.all(metadataURLs.map(preloader.loadJSON));
  [data,manifest]=loaded;
  const tallTransports=loaded[3];
  manifest.resources.push(...tallTransports);
  const imageURLs=manifest.resources.filter(r=>r.path.endsWith('.png')).map(r=>r.path.replace('public/','/'));
  const sounds=manifest.resources.filter(r=>r.path.endsWith('.wav'));
  const soundURLs=sounds.map(r=>r.path.replace('public/','/'));
  const fontURLs=['/assets/fonts/vgasys.ttf','/assets/fonts/microsoftsansserif.ttf'];
  const cursorURLs=[1002,1003,1004,1005].map(id=>`/assets/cursors/${id}.cur`);
  const uiImageURLs=[...cursorURLs.map(url=>url.replace('.cur','.png')),'/assets/icons/file.png','/assets/icons/application.png'];
  preloader.register([...metadataURLs,...imageURLs,...Object.values(loaded[4].resources).map(r=>r.path),...loaded[6].resources.map(r=>`/${r.path}`),...soundURLs,...fontURLs,...cursorURLs,...uiImageURLs]);
  const [{originals:assets,textures}]=await Promise.all([
    loadAssets(manifest,preloader).then(async originals=>({originals,textures:await loadTextureAssets(loaded[6],originals,preloader)})),
    Promise.all([preloader.loadFont(fontURLs[0],'Win31System',{weight:'700'}),preloader.loadFont(fontURLs[1],'HelpSans'),...sounds.map(async r=>preloadedSounds.set(r.id,await preloader.loadSound(r.path.replace('public/','/')))),...cursorURLs.map(preloader.loadBinary),...uiImageURLs.map(preloader.loadImage)])
  ]);
  attachDesktopWindow();
  tower = newNativeApplicationTower(data); renderer = new Renderer($('tower'), $('minimap'), assets);
  renderer.effectsClock.lastUnits=Math.trunc(nativePaletteGateStartedAt/16);
  upscaledTextures=textures;
  renderer.textureAssets=upscaledTextures;
  renderer.sceneIndices=loaded[5].resources;
  nativeUI=new OriginalDialogs($('dialog'),loaded[2],assets);nativeScheduleUI=new OriginalDialogs($('schedule-dialog'),loaded[2],assets);attachScheduleWindow();
  renderer.setZoom(1);renderer.camera=nativeInitialCamera(renderer.width,renderer.height);
  renderCatalog(); updateTools(); attachEvents(); updateUI();
  document.querySelector('.statusbar').append($('message'));
  $('loading').remove();
  if(manualScene){
    const fixture=await import('./manual-fixtures.js');begin(fixture.createManualFixture(data,manualScene));
    fixture.applyManualCaptureUI({tower,renderer,updateUI,roomDialog,personDialog,elevatorDialog,financesDialog,findPersonDialog,findTenantDialog,movieDialog,nativeUI,closeDialog},manualScene,new URLSearchParams(location.search).get('manual-action')||'');
  }else {soundMixer.play(originalSoundRequest(20000,1),{onBlocked:error=>{startupIntroPending=error?.name==='NotAllowedError';}});titleDialog();}
  requestAnimationFrame(frame);
}
init().catch(err => { const loading=$('loading')||document.body.appendChild(document.createElement('div'));loading.id='loading';loading.classList.add('failed');loading.textContent = `Could not start SimTower: ${err.message}. Run npm run extract to regenerate the game assets.`; console.error(err); });
