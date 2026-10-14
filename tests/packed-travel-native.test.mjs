import test from 'node:test';import assert from 'node:assert/strict';
import {nativeTravelWord,nativeBoardingWord} from '../src/original-packed-travel.js';
import {boardingDelay} from '../src/original-elevators.js';
test('native boarding forgives total stress and preserves packed parking depth on ordinary clocks',()=>{
 const word=nativeTravelWord(20,-3);
 assert.deepEqual(nativeBoardingWord(word,840,800,0,2),{word:nativeTravelWord(35,-3),delay:35,parkingFloor:-3});
 assert.equal(boardingDelay(20,20,0,3),0);assert.equal(boardingDelay(290,40,1,1),300);
});
test('native midnight clock borrow wraps stress and changes high parking bits instead of applying an invented lower clamp',()=>{
 const packed=nativeBoardingWord(nativeTravelWord(20,-3),0,2590,1,1);
 assert.deepEqual(packed,{word:502,delay:502,parkingFloor:0});
 assert.equal(boardingDelay(20,-2590,1,1),502);
 const noCar=nativeBoardingWord(nativeTravelWord(20),0,2590,1,1);
 assert.deepEqual(noCar,{word:62966,delay:502,parkingFloor:-61});
 assert.equal(nativeBoardingWord(nativeTravelWord(20,-3),0,2590,0,2).delay,0);
});

test('Tower boarding across midnight preserves the original display pointer while the reserved floor borrows',async()=>{
 const {Tower}=await import('../src/simulation.js'),{readFileSync}=await import('node:fs');
 const {syncActors,beginActorTrip,finishActorTrip}=await import('../src/original-people.js');
 const {hasParkingReservation}=await import('../src/original-parking-state.js');
 const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
 const t=new Tower(data,{sandbox:true});t.build('lobby',0,0,99);t.build('floor',1,0,99);
 for(let f=-1;f>=-3;f--){t.build('floor',f,0,99);t.build('ramp',f,30);}
 t.build('parking',-3,26);t.build('suite',1,10);t.finishConstruction();t.build('elevator',-3,60,60,1);t.state.star=3;syncActors(t);
 while(t.state.dialogs.length)t.answerEmergency(t.state.dialogs[0].id,1);
 const room=t.state.rooms.find(r=>r.key==='suite'),a=t.state.actors.find(a=>a.room===room.id&&a.index===1);t.checkInHotel(room);finishActorTrip(t,a,room,{to:1,tripDelay:0},true,'arrival');a.state=4;a.floor=1;
 assert.equal(t.bookParking(a,room),true);const space=t.state.rooms.find(r=>r.id===a.parking);
 beginActorTrip(t,a,room,1,0,'departure');const p=t.state.people.find(p=>p.id===a.trip),car=t.state.shafts[0].cars[0];
 p.queueTick=2590;p.tripDelay=20;t.state.tick=0;car.floor=1;car.target=1;car.doors=4;car.direction=0;car.motionCooldown=0;
 t.updateElevators();assert.equal(p.stage,'car');assert.equal(p.tripDelay,502);assert.equal(a.parkingFloor,0);
 assert.equal(a.parking,space.id);assert.equal(space.parkingActor,a.id);assert.equal(hasParkingReservation(a),false);
 const copy=new Tower(data);copy.load(t.save());assert.equal(copy.save(),t.save());
 t.releaseParking(a);assert.equal(space.parkingActor,a.id);
 const count=a.trips;car.floor=0;car.target=0;car.doors=0;car.motionCooldown=0;t.updateElevators();
 assert.equal(a.trip,null);assert.equal(a.delay,502);assert.equal(a.trips,(count+1)&255);
});
