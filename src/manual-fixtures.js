// Documentation fixtures use the production model/renderer/dialog handlers.
// They only run through the explicit ?manual-scene URL; normal saves are untouched.
import {Tower} from './simulation.js';
import {syncActors,beginActorTrip} from './original-people.js';
import {inferPopulationCounters} from './original-population.js';
import {businessReceipt} from './original-economy.js';
import {startScheduledEvent,stepEmergency} from './original-events.js';

export const MANUAL_SCENES=['blank','starter','offices','mixed','hotel','services','cinema','fire','bomb','vip','cathedral'];
export function createManualFixture(data,scene='mixed') {
  if(!MANUAL_SCENES.includes(scene))throw new Error('Unknown manual scene');
  const tower=new Tower(data,{sandbox:true,seed:1994});const s=tower.state;
  s.name='SimTower Tutorial';s.cash=100000000;s.tick=300;
  const build=(key,f,x,end=x,last=f)=>{const r=tower.build(key,f,x,end,last);if(!r.ok)throw new Error(`Manual ${key} ${f},${x}: ${r.error}`);};
  if(scene==='blank'){s.sandbox=false;s.star=1;return tower;}
  build('lobby',0,44,139);
  const highest=scene==='starter'?3:scene==='cathedral'?99:12;
  for(let f=1;f<=highest;f++){if(f%15===14)build('lobby',f,44,139);else build('floor',f,44,139);}
  if(scene!=='starter'&&scene!=='offices'&&scene!=='cathedral')for(let f=-1;f>=-5;f--)build('floor',f,44,139);
  build('elevator',scene==='starter'||scene==='offices'||scene==='cathedral'?0:-2,88,88,Math.min(highest,12));
  if(scene==='starter') {
    for(const x of [44,53,62,71])build('office',1,x);
    for(const x of [44,60])build('fastfood',2,x);
    build('stairs',2,80);
  } else if(scene==='cathedral') {
    s.star=5;build('cathedral',103,57);
    build('elevator',89,88,88,99);
    build('express',0,100,100,89);
  } else if(scene==='offices') {
    for(let f=1;f<=12;f++)for(let x=44;x<80;x+=9)build('office',f,x);
  } else {
    build('elevator',scene==='offices'?0:-2,104,104,12);build('service',0,116,116,12);
    for(let f=1;f<=12;f++) {
      const key=scene==='offices'?'office':f<=2?'shop':f<=5?'office':f<=8?'condo':'twin';
      if(![4,6,9,10,11,12].includes(f))for(let x=44;x+({office:9,shop:12,condo:16,twin:6}[key])<=88;x+=({office:9,shop:12,condo:16,twin:6}[key]))build(key,f,x);
      if(f===3)build('security',f,120);else if(f===8)build('housekeeping',f,120);else if(f<=2)build('fastfood',f,120);
      else if(f!==11&&f!==12)build('office',f,120);
    }
    build('single',9,98);build('suite',10,92);build('restaurant',6,44);
    build('medical',4,44);build('cinema',12,44);build('partyhall',10,44);
    if(scene!=='offices'){
      for(let f=-1;f>=-2;f--){build('ramp',f,44);for(let x=60;x<88;x+=4)build('parking',f,x);}
      build('recycling',-2,98);build('metro',-3,55);
    }
    build('escalator',1,54);build('escalator',2,54);
  }
  while(s.construction.length)tower.finishConstruction();syncActors(tower);
  for(const room of s.rooms) {
    if(['office','condo','single','twin','suite','shop'].includes(room.key)){tower.admitTenant?.(room);room.occupied=true;room.accepting=true;}
    if(room.key==='office')room.tenantState=6;
    if(room.key==='condo'){room.tenantState=3;room.sold=true;room.salePrice=150000;}
    if(['single','twin','suite'].includes(room.key))room.hotelState=room.key==='single'?1:2;
  }
  for(const actor of s.actors){const room=s.rooms.find(r=>r.id===actor.room);if(['office','condo','single','twin','suite'].includes(room?.key)){actor.state=4;actor.floor=room.floor;actor.delay=80;actor.trips=4;}}
  s.nativePopulation=inferPopulationCounters(s.rooms);s.star=scene==='starter'||scene==='offices'?1:scene==='cathedral'?5:3;s.sandbox=false;
  if(s.star===3){tower.refreshParking(true);for(const actor of s.actors){const home=s.rooms.find(r=>r.id===actor.room);if(home?.key==='suite'||home?.key==='office'&&actor.index===2)tower.bookParking(actor,home);}}
  s.cash=2847500;s.ledger=[];s.income=0;s.expenses=0;s.dialogs=[];s.audioEvents=[];s.notices=[];
  tower.openBusinesses();tower.openBusinesses(true);tower.prepareShows();
  const office=s.rooms.find(r=>r.key==='office'),actors=s.actors.filter(a=>a.room===office?.id);
  for(const [i,actor] of actors.slice(3,5).entries())actor.name=['Alex','Robin'][i];
  const food=s.rooms.find(r=>r.key==='fastfood');if(food){food.commercial.visitors=34;food.commercial.generated=20;food.commercial.inside=8;food.commercial.state=1;food.visitors=34;food.lastProfit=businessReceipt(data,12,34,0);}
  if(office&&scene!=='starter')for(const actor of actors.slice(0,3)){actor.state=32;actor.floor=0;beginActorTrip(tower,actor,office,0,office.floor,'arrival');}
  if(scene==='hotel') {
    const rooms=s.rooms.filter(r=>['single','twin','suite'].includes(r.key));
    for(const [i,r] of rooms.entries())if(i%4===0){r.hotelState=40;r.dirt=100;r.occupied=false;}else if(i%4===1){r.hotelState=56;r.neglected=true;r.dirt=100;r.occupied=false;}
    for(const actor of s.actors){const r=s.rooms.find(r=>r.id===actor.room);if(r?.hotelState>=40){actor.state=32;actor.floor=0;}}
  }
  if(scene==='cinema') {const cinema=s.rooms.find(r=>r.key==='cinema');cinema.show.stage=3;cinema.movie.active=true;cinema.movie.days=7;cinema.show.inside=40;cinema.show.visitors=40;cinema.movie.receipts=30500;for(const actor of s.actors.filter(a=>a.room===cinema.id).slice(0,40)){actor.state=3;actor.floor=cinema.floor;}}
  if(scene==='services'){s.garbage.stage=3;s.garbage.working=true;for(const room of s.rooms)if(room.key==='recycling')room.recycleStage=3;}
  if(scene==='vip') {
    s.calendarDay=3;const suite=s.rooms.find(r=>r.key==='suite'),actor=s.actors.find(a=>a.room===suite.id&&a.index===1);
    actor.parkingFloor=-1;tower.reserveVIP(actor,suite);tower.answerEmergency(3000,1);tower.arriveVIP(actor);s.dialogs=[];
  }
  if(scene==='fire'||scene==='bomb') {
    s.calendarDay=scene==='fire'?83:59;s.tick=240;
    startScheduledEvent(s,data,n=>Math.min(n-1,scene==='fire'?5:3),tower.eventHooks());
    if(scene==='fire'){
      tower.answerEmergency(s.emergencyContinuation.id,1);
      tower.callFireRescue();tower.answerEmergency(3012,1);tower.answerEmergency(3014,1);
      tower.callFireRescue();tower.answerEmergency(3012,2);
      for(let i=0;i<6;i++){s.tick++;stepEmergency(s,data,tower.eventHooks());}
    }
    s.dialogs=[];
  }
  if(scene==='cathedral'){s.tick=400;s.calendarDay=2;const cathedral=s.rooms.find(r=>r.key==='cathedral');cathedral.worshipState=2;s.cathedralCeremony=true;s.cathedralCeremonyStep=18;}
  tower.updateTenantEvaluations();
  s.minute=600;s.day=s.calendarDay+1;
  return tower;
}

export function applyManualCaptureUI(api,scene,action='') {
  const {tower,renderer}=api,s=tower.state;
  renderer.home(tower);renderer.camera.x=736;
  renderer.camera.y=scene==='cathedral'?-3580:scene==='services'?40:scene==='hotel'?-350:scene==='cinema'?-420:-190;
  api.updateUI();renderer.render(tower,0);
  const room=s.rooms.find(r=>r.key===action);
  if(room)api.roomDialog(room);
  else if(action==='person')api.personDialog(s.actors.find(a=>a.room===s.rooms.find(r=>r.key==='office')?.id&&a.trip===null));
  else if(action==='elevator')api.elevatorDialog(s.shafts[0]);
  else if(action==='elevator-alert'){api.elevatorDialog(s.shafts[0]);api.nativeUI.show(3012,{value:tower.data.events.fireCrewCost,command:id=>{tower.answerEmergency(3012,id);api.closeDialog();}});}
  else if(action==='finance')api.financesDialog();
  else if(action==='find-person')api.findPersonDialog();
  else if(action==='find-tenant')api.findTenantDialog();
  else if(action==='movie')api.movieDialog(s.rooms.find(r=>r.key==='cinema'));
  else if(action==='fire-alert')api.nativeUI.show(3012,{value:tower.data.events.fireCrewCost,command:id=>{tower.answerEmergency(3012,id);api.closeDialog();}});
  else if(action==='bomb-alert')api.nativeUI.show(3020,{value:s.emergency.demand/tower.data.moneyScale,command:id=>{tower.answerEmergency(3020,id);api.closeDialog();}});
  else if(action==='vip-alert')api.nativeUI.show(3001,{command:api.closeDialog});
  const label=document.createElement('button');label.textContent='Documentation capture: hide this label';label.setAttribute('aria-label','Hide documentation capture label');
  Object.assign(label.style,{position:'fixed',bottom:'8px',left:'8px',zIndex:99999,font:'12px Arial'});label.onclick=()=>label.remove();if(!document.querySelector('dialog[open]'))document.body.append(label);
  document.getElementById('save-status').textContent='Documentation fixture - autosave disabled';
}
