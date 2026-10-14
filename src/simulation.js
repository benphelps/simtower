import {newConstructionRing,constructionRecordParts,enqueueConstructionRecord,completeConstructionHead,advanceConstructionRing,removeConstructionRoom,initializeConstructionRing,validateConstructionRing,nativeRoomHasCompletedActors} from './original-construction-ring.js';
import {initializeNativeEmergency} from './original-emergency-entry.js';
import {newNativeShaftSlotTypes,loadedNativeShaftSlotTypes,nativeShaftType,nativeShaftTransportCollision} from './original-shaft-placement.js';
import {nativeAddedFloorSpans} from './original-cell-grid.js';
import {markInteriorDirty,validateNativeInteriors} from './original-interiors.js';
import {nativeIncomeInfoIndex} from './original-finance-info.js';
import {nativeUnaffordableChoice,validateAffordabilityContinuation} from './original-alerts.js';
import {nativeCarAtPoint} from './original-inspection-controls.js';
import {nativeTransportRoute} from './original-transport-choice.js';
import {parkingBookingPlan,parkingReleasePlan,hasParkingReservation,parkingDemolitionPlan} from './original-parking-state.js';
import {newParkingQuotas,recomputeParkingQuotas,claimParkingQuota,releaseParkingQuota,validateParkingQuotas,inferParkingQuotas,parkingCatalogPlan} from './original-parking-quotas.js';
import {nativePopulationCategory} from './original-population.js';
import {firstFreeNativeCarSlot,firstFreeNativeTransportSlot,migrateNativeTransportSlots,NATIVE_SHAFT_SLOTS,NATIVE_LINK_SLOTS} from './original-transport-slots.js';
import {newPopulationCounters,changeNativePopulation,clearNativePopulationCategory,nativePopulationEvent,inferPopulationCounters,validatePopulationCounters} from './original-population.js';
import {newActorPool,reserveRoomActorBlocks,completeRoomActorBlocks,allocateActorBlock,completeActorBlock,releaseActorBlock,nativeActorSlotForResident,validateActorPoolRooms} from './original-actor-pool.js';
import {reserveVIPGuest,admitVIPGuest,checkoutVIPGuest,failVIPGuest,expireVIPReservation,acknowledgeVIPDialog,validateVIPContinuation} from './original-vip.js';
import {actorRouteOrigin} from './original-actor-geometry.js';
import {nativeActorMean,normalizeActorHistory,validateActorHistory} from './original-actor-stats.js';
import {tenantSlotAllocation} from './original-tenant-slots.js';
import {METRO_ACTORS,metroTrainTick} from './original-metro.js';
import {recyclingPlacementAllowed,initializeRecyclingRoom,validateRecyclingRoom,processRecycling,collectRecycling,finishRecyclingCollection} from './original-recycling.js';
import {SHOW_TYPES,newShowState,newCinemaMovie,completeCinemaMovie,prepareShowDay,openShowBatch,projectShow,closeShowBatch,validateShowState,validateShowActor,showActorCount,finishShowActorTrip} from './original-shows.js';
import {originalSoundRequest,dialogSoundRequest,validateSoundRequest} from './original-audio.js';
import { CATALOG, TRANSPORT, LINKS, HOTELS, COMMERCIAL, price, SITE_CELLS, BASEMENT_LIMIT, facilityHeight, skyLobbyFloor, elevatorCapacity, POPULATION_TYPES } from './catalog.js';
import { CLOCK_PERIOD, INITIAL_TICK, MIDNIGHT_TICK, QUARTER_TICK, DAY_COUNTER_PERIOD, clockTime, tickAtMinute, calendar } from './original-clock.js';
import { rentAmount, maintenanceAmount, lobbyMaintenance, businessReceipt, quarterAccounts, recordAccount } from './original-economy.js';
import { nextRandom, meanTenantStress, noisyNeighbor, recyclingStage, movieAudience, movieReceipt, newElevatorPrograms,elevatorProgram } from './original-systems.js';
import { findRoute, lateralStress } from './original-routes.js';
import { initializeDispatch, updateNativeElevators,assignHallCall } from './original-elevators.js';
import { initializeProgression, noteProgressionConstruction, resetMedicalDemand, promotionDecision, acknowledgeProgressionWarning, resetAfterPromotion } from './original-progression.js';
import {initializeMedicalRegistry,registerMedicalRoom,removeMedicalRoom,resetMedicalRegistryDay,medicalRegistryCount,validateMedicalRegistry} from './original-medical.js';
import { quarterTenancyPlan, dailyTenancyPlan, quarterContract, initialTenancyPayment, residentStress,tenantRoomAdmitted,tenantRoomClock,validateTenantRoomState,tenantRoomEntry,nativeTenantSlot,nativeLeaseOccupied } from './original-tenancy.js';
import { linkPlacementError, linkAtPoint, CAR_LIMIT, SHAFT_LIMIT, elevatorStopAllowed, elevatorStopError,cappedShaftRange,cappedCarState,removedShaftFloors,stopEvacuationPeople,stopIsolationWarning,shiftReplacementRooms,rampPlacementError,parkingPlacementError,immediateConstruction,rampConnected,parkingReachable } from './original-construction.js';
import { nativeJourneyStressEnabled,queueTimeoutExpired, actorCohortDue, queuePrefix, interruptionState,recordJourneyStress } from './original-journeys.js';
import { initialLobbyHeight, lobbyHeight,lobbyLinkPlacement,cranePlacement } from './original-lobbies.js';
import { COMMERCIAL_TYPES, newCommercialState, openCommercialDay, closeCommercialDay, finishCommercialActorTrip,validateCommercialState,validateCommercialActor,commercialStyleCount,leaveCommercialVisit } from './original-commercial.js';
import {initializeCommercialRegistry,registerCommercialRoom,removeCommercialRoom,prepareCommercialLists,commercialRegistryCount,validateCommercialRegistry} from './original-commercial-registry.js';
import {newFacilityStyleCounters,inferFacilityStyleCounters,takeFacilityStyle,validateFacilityStyleCounters} from './original-facility-styles.js';
import { hotelCheckIn, hotelCheckOut, hotelEveningPlan,nativeHotelState,hotelRoomEntry,hotelRoomClock,validateHotelState,hotelStyleCount } from './original-hotels.js';
import {initializeEvents,startScheduledEvent,stepEmergency,resumeEmergencyWork,acknowledgeEmergencyDialog,requestFireRescue,fireRescueAvailable,emergencyActive,validateEvents,disasterDamageDecision,resetEmergencySecurity} from './original-events.js';
import {resetCathedralDay,closeCathedralWorship,validateCathedral} from './original-cathedral.js';
import { RESIDENT_TYPES, PERSISTENT_TYPES, syncActors, updateActors, resumeVIPActor, finishActorTrip, requiresParking, parkingQuota } from './original-people.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const intersects = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width;
export class Tower {
  constructor(data, { sandbox = false, seed = 1994, shaftSlotTypes } = {}) {
    this.data = data;
    this.state = { version: 2, name: 'Untitled tower', sandbox, seed: seed & 0xffff, cash: 2000000, tick: INITIAL_TICK, calendarDay: 0, elapsedTicks: 0, minute: clockTime(INITIAL_TICK).minuteOfDay, day: 1, star: 1, nextId: 1, floors: {}, rooms: [], shafts: [], links: [], people: [], construction: [], ledger: [], notices: [], history: [], income: 0, expenses: 0, rain:false, garbage:{stage:0,working:false}, nativeFlags:{treasure:false,vipPassed:false,medicalReady:false}, dialogs:[], trackedPeople:[], quarterBalance:2000000 };
    this.state.accounts=quarterAccounts(this.state.cash);
    this.state.audioEvents=[];this.state.santa=null;
    this.state.nativeActorPool=newActorPool();this.state.nativeConstructionRing=newConstructionRing();
    this.state.nativeShaftSlotTypes=newNativeShaftSlotTypes(shaftSlotTypes);
    this.state.nativePopulation=newPopulationCounters();
    this.state.nativeFacilityStyles=newFacilityStyleCounters();
    this.state.nativeParkingQuotas=newParkingQuotas();this.state.nativeParkingAvailable=[];
    this.state.actors=[];this.state.nextActorSlot=0;this.state.vip=null;this.state.nextQueueOrder=0;
    this.state.lobbyHeight=1;this.state.commercialSpecialDay=false;
    this.state.crane=null;
    this.state.rubble=[];this.state.cathedralCeremony=false;this.state.cathedralCeremonyStep=0;initializeEvents(this.state);
    initializeProgression(this.state);
    initializeMedicalRegistry(this.state);
    initializeCommercialRegistry(this.state);
  }
  random() { const next = nextRandom(this.state.seed); this.state.seed = next.seed; return next.value / 32768; }
  randomInt(max) { return Math.trunc(this.random()*32768)%max; }
  nativeDialog(id, value = 0) { this.state.dialogs.push({id,value});this.state.audioEvents.push(dialogSoundRequest(id));this.state.audioEvents=this.state.audioEvents.slice(-32); }
  nativeSound(id,category=0,options={}) {this.state.audioEvents.push(originalSoundRequest(id,category,options));this.state.audioEvents=this.state.audioEvents.slice(-32);}
  id() { return this.state.nextId++; }
  notice(text,source) { this.state.notices.unshift({ text,...source, day: this.state.day, minute: this.state.minute }); this.state.notices.length = Math.min(40, this.state.notices.length); }
  bounds(floor) { return this.state.floors[floor]; }
  roomAt(floor, x) { return this.state.rooms.find(r => floor <= r.floor && floor > r.floor - (r.height || 1) && r.x <= x && x < r.x + r.width); }
  get population() { return this.state.nativePopulation.total; }
  changePopulation(type,delta) {this.state.nativePopulation=changeNativePopulation(this.state.nativePopulation,type,delta);}
  populationEvent(room,event) {const change=nativePopulationEvent(room,event);this.changePopulation(change.type,change.delta);}
  get highest() { return Math.max(0, ...Object.keys(this.state.floors).map(Number)); }
  get lowest() { return Math.min(0, ...Object.keys(this.state.floors).map(Number)); }
  heightLimit() { return 99; } // 0x3B91B: the prototype's rating-dependent cap was invented.
  get calendar() { return calendar(this.state.calendarDay); }
  setClock(minute, dayCounter = this.state.calendarDay) {
    this.state.tick = Math.floor(tickAtMinute(minute)); this.state.calendarDay = dayCounter;
    this.state.minute = clockTime(this.state.tick).minuteOfDay; this.state.day = dayCounter + 1;
  }
  canAfford(cost) { return this.state.sandbox || this.state.cash >= cost; }
  transact(amount, label, type=null, kind=null) {
    this.state.cash = clamp(this.state.cash + amount, -999999999, 9999999900);
    if (amount > 0) this.state.income += amount; else this.state.expenses -= amount;
    recordAccount(this.state.accounts,amount,type,kind);
    const info=amount>0?nativeIncomeInfoIndex(type):0;
    if(info)this.notice(this.data.strings[1007][info-1],{resource:1007,index:info});
    this.state.ledger.unshift({ day: this.state.day, minute: this.state.minute, amount, label });
    this.state.ledger.length = Math.min(100, this.state.ledger.length);
  }
  plan(key, floor, x, endX = x, endFloor = floor, modifiers) {
    const s = this.state, spec = CATALOG[key];
    if (!spec || ![floor, x, endX, endFloor].every(Number.isInteger)) return { error: 'Invalid construction coordinates.' };
    const linkPlacement=LINKS.has(key)?lobbyLinkPlacement(s,floor):null;
    if(linkPlacement){floor=linkPlacement.floor;endFloor=floor;}
    if (!s.sandbox && spec.star > s.star) return { error: `${spec.name} unlocks at ${spec.star} stars.` };
    const hit = TRANSPORT.has(key) && floor === endFloor && s.shafts.find(sh => sh.key === key && floor >= sh.low && floor <= sh.high && x === sh.x);
    if (hit) return hit.cars.length >= 8 ? { error: 'No more cars in this shaft.' } : { key, floor, addCar: hit.id, x: hit.x, width: hit.width, low: floor, high: floor, cost: this.carCost(key), additions: [] };
    if(TRANSPORT.has(key)&&floor>0&&floor<lobbyHeight(s))return {error:'This floor cannot be an elevator stop.'};
    const limit = key === 'cathedral' ? 103 : this.heightLimit();
    if (x < 0 || x >= SITE_CELLS || endX < 0 || endX >= SITE_CELLS || floor < BASEMENT_LIMIT || floor > limit || endFloor < BASEMENT_LIMIT || endFloor > limit) return { error: 'Maximum height or width has been reached.' };
    const width = key === 'floor' || key === 'lobby' ? Math.max(key === 'lobby' ? 4 : 1, Math.abs(endX - x) + 1) : spec.width;
    const left = key === 'floor' || key === 'lobby' ? Math.min(x, endX) : x;
    const area = { x: left, width };
    const height = key==='lobby'&&floor===0?initialLobbyHeight(s,modifiers):facilityHeight(key);
    const low = TRANSPORT.has(key) ? Math.min(floor, endFloor) : LINKS.has(key)?floor-linkPlacement.span:key==='lobby'&&floor===0?0:floor-height+1;
    const high = key==='lobby'&&floor===0?height-1:Math.max(floor,endFloor);
    if (low < BASEMENT_LIMIT) return { error: 'Maximum basement depth has been reached.' };
    if (left + width > SITE_CELLS) return { error: 'Items cannot be wider than the site.' };
    if (!s.floors[0] && key !== 'lobby') return { error: 'Build a lobby on the ground floor first.' };
    if (floor >=0 && floor<lobbyHeight(s) && !['lobby', ...TRANSPORT, ...LINKS, 'ramp'].includes(key)) return { error: 'First floor is only for Lobby.' };
    if (floor > 0 && low <= 0 && ['cinema', 'partyhall'].includes(key)) return { error: 'First floor is only for Lobby.' };
    if (key === 'lobby' && floor !== 0 && !skyLobbyFloor(floor)) return { error: 'Lobbys are only every 15 floors.' };
    if (floor < 0 && !['floor', ...TRANSPORT, ...LINKS, 'parking', 'ramp', 'metro', 'fastfood', 'restaurant', 'shop', 'cinema', 'recycling'].includes(key)) return { error: 'Item not available underground.' };
    if (floor >= 0 && ['parking', 'metro', 'recycling'].includes(key)) return { error: 'Item unavailable above ground.' };
    if (key === 'cathedral' && low !== 99) return { error: 'Cathedral is available only on 100th floor (five floors high).' };
    if (['metro', 'cathedral', 'secom'].includes(key) && s.rooms.some(r => r.key === key)) return { error: `Only one ${spec.name} allowed.` };
    // 0x390FC keeps fixed native pools; cinema and party hall share one.
    if((key==='medical'?medicalRegistryCount(s):key==='security'?s.rooms.filter(r=>r.key===key).length:0)>=10)return {error:'No more service centers available.'};
    if(['cinema','partyhall'].includes(key) && s.rooms.filter(r=>['cinema','partyhall'].includes(r.key)).length>=16)return {error:'No more theaters available.'};
    if(COMMERCIAL_TYPES.has(key) && commercialRegistryCount(s)>=512)return {error:'No more commercial facilities available.'};
    if(key==='parking'&&s.rooms.filter(r=>r.key==='parking').length>=512)return {error:'No more parking spaces available.'};
    if (key === 'metro' && floor < this.lowest) return { error: 'Place Metro station on bottom floor.' };
    if (floor < this.lowest && s.rooms.some(r => r.key === 'metro')) return { error: 'Cannot place items under Metro.' };
    const ground = s.floors[0];
    if (ground && (left < ground.x || left + width > ground.x + ground.width) && floor !== 0) return { error: 'Items cannot be wider than Lobby.' };
    let structuralCost = 0;
    const additions = [];
    const levels = TRANSPORT.has(key) ? [] : LINKS.has(key)?[floor]:Array.from({ length: height }, (_, i) => low + i).sort((a, b) => floor < 0 ? b - a : a - b);
    for (const level of levels) {
      const old = s.floors[level];
      const nx = old ? Math.min(old.x, left) : left;
      const right = old ? Math.max(old.x + old.width, left + width) : left + width;
      const supportLevel = level > 0 ? level - 1 : level + 1;
      const supporting = level === 0 ? null : additions.find(a => a.level === supportLevel) || s.floors[supportLevel];
      if (level !== 0 && (!supporting || nx < supporting.x || right > supporting.x + supporting.width)) return { error: 'Cannot place items wider than floor below.' };
      const newCells = right - nx - (old?.width || 0);
      structuralCost += newCells * price(this.data, key === 'lobby' ? 'lobby' : 'floor');
      additions.push({ level, x: nx, width: right - nx });
    }
    if (TRANSPORT.has(key)) {
      if (low < -9) return { error: 'Elevators cannot reach the lowest basement floor.' };
      if (key === 'express' && floor > 0 && !skyLobbyFloor(floor)) return { error: 'Express elevators must begin at a Lobby.' };
      if (key !== 'express' && high - low + 1 > 30) return { error: 'Elevator shaft can cover only 30 floors.' };
      if (s.shafts.length >= SHAFT_LIMIT) return { error: 'No more elevator shafts available.' };
      for (let f = low; f <= high; f++) {
        const bounds = s.floors[f];
        if (!bounds || left < bounds.x || left + width > bounds.x + bounds.width) return { error: 'Build floors along the entire elevator shaft first.' };
      }
      //39904→15988 inspects the independent elevator/link pools, never
      //ordinary floor records. New shafts can cover existing facilities.
      const slot=firstFreeNativeTransportSlot(s.shafts,NATIVE_SHAFT_SLOTS);
      if(nativeShaftTransportCollision(s,{x:left,low,high,slot,type:s.nativeShaftSlotTypes[slot]}))return {error:'Cannot place over other transportation items.'};
      const carCost = this.carCost(key);
      return { key, floor, x: left, width, low, high,nativeTransportSlot:slot,cost:price(this.data,key)+carCost,additions };
    }
    if (LINKS.has(key)) {
      const error=linkPlacementError(s,key,floor,left,width,linkPlacement.span);
      if(error)return {error};
    } else if (!['lobby', 'floor'].includes(key) && s.rooms.some(r => low <= r.floor && high >= r.floor - (r.height || 1) + 1 && intersects(r, area))) return { error: 'Cannot place on top of other items.' };
    // 3A117/3BBDF validate facility floor records independently of C05A
    // elevator records: ordinary construction may occupy the floor behind a
    // shaft or link. Dedicated shaft/link placement above still protects
    // transport; escalator endpoint restrictions are checked on its placement.
    if (key === 'lobby' && s.rooms.some(r => r.floor === floor && intersects(r, area))) return { error: 'Cannot place on top of other items.' };
    const placementError=key==='ramp'?rampPlacementError(s,floor,left):key==='parking'?parkingPlacementError(s,floor):null;if(placementError)return {error:placementError};
    if(key==='recycling'&&!recyclingPlacementAllowed(s.rooms,floor,left,width))return {error:'Recycling centers must be built adjacent to an existing center.'};
    const cost = structuralCost + (['floor', 'lobby'].includes(key) ? 0 : price(this.data, key));
    return { key, floor, x: left, width, height, low, high, cost, additions,span:linkPlacement?.span };
  }
  build(key, floor, x, endX = x, endFloor = floor, modifiers) {
    if(modifiers?.shiftKey)for(const item of shiftReplacementRooms(this.state,key,floor,x,CATALOG[key].width)){if(item.blocked)return {error:'This item cannot be removed.'};this.removeRoom(item.room);}
    const p = this.plan(key, floor, x, endX, endFloor, modifiers);
    if (p.error) return p;
    if (p.addCar) return this.addCar(p.addCar, floor);
    if (!this.canAfford(p.cost)) return { error: 'Not enough money for construction.' };
    const previousFloors=new Map(p.additions.map(a=>[a.level,this.state.floors[a.level]]));
    if(key==='lobby'&&floor===0&&!this.state.floors[0])this.state.lobbyHeight=p.height;
    this.transact(-p.cost, `Build ${CATALOG[key].name}`,CATALOG[key].id,'construction');
    for (const a of p.additions) this.state.floors[a.level] = { x: a.x, width: a.width, lobby: key === 'lobby' || this.state.floors[a.level]?.lobby || false,nativeTenantIndex:this.state.floors[a.level]?.nativeTenantIndex };
    if(!['floor','lobby',...TRANSPORT,...LINKS].includes(key))this.clearRubble(p.x,p.width,p.low,p.high);
    if (TRANSPORT.has(key)) {
      this.state.nativeShaftSlotTypes[p.nativeTransportSlot]=nativeShaftType(key);
      this.state.shafts.push({ id: this.id(), nativeTransportSlot:p.nativeTransportSlot, key, x: p.x, width: p.width, low: p.low, high: p.high, visible:true, programs:newElevatorPrograms(), stops: Array.from({ length: p.high - p.low + 1 }, (_, i) => i + p.low).filter(f => key !== 'express' || f <= 0 || skyLobbyFloor(f)), cars: [{ id: this.id(), nativeCarSlot:0, floor, target: floor, parkingFloor:floor, doors: 0, people: [] }] });
    } else if (LINKS.has(key)) this.state.links.push({ id: this.id(), nativeTransportSlot:firstFreeNativeTransportSlot(this.state.links,NATIVE_LINK_SLOTS), key, floor:p.floor,span:p.span,x:p.x,width:p.width });
    else if (!['lobby', 'floor'].includes(key)) {
      const room = { id: this.id(), key, floor, height: p.height, x: p.x, width: p.width, built: this.totalMinutes, constructionRemaining:immediateConstruction(key)?0:12, occupied: false, satisfaction: 80, price: 1, dirt: 0, sold: false, visitors: 0, tenure:0, trips:Array.from({length:['office','condo',...HOTELS].includes(key) ? CATALOG[key].capacity : 0},()=>({delay:0,trips:0})), variant: this.state.rooms.filter(r => r.key === key).length % (key === 'office' ? 6 : key === 'restaurant' ? 2 : 3) };
      if(key==='recycling')initializeRecyclingRoom(room);
      if(key==='condo')room.salePrice=0;
      if(['office','condo','shop'].includes(key))room.accepting=true;
      if(HOTELS.has(key))room.accepting=true;
      if(COMMERCIAL_TYPES.has(key))room.commercial=newCommercialState(key,this.state.tick);
      if(['single','twin','suite','office','condo'].includes(key)){const style=takeFacilityStyle(this.state.nativeFacilityStyles,key,'placement');this.state.nativeFacilityStyles=style.counters;room.variant=style.variant;}else if(COMMERCIAL_TYPES.has(key))room.variant=0;
      if(SHOW_TYPES.has(key)){room.show=newShowState();room.dailyPopulation=0;}
      if (key === 'cinema') room.movie=newCinemaMovie();
      this.state.rooms.push(room);room.nativeActorBlocks=[];room.nativeConstructionParts=[];
      for(const part of constructionRecordParts(room,this.state.tick)){
        room.nativeConstructionParts.push(part);this.registerTenantSlots();
        const allocation=allocateActorBlock(this.state.nativeActorPool,{owner:`${room.id}:${part.level}`,type:part.type,floor:part.floor,construction:true,tenantIndex:room.nativeTenantSlots.find(slot=>slot.floor===part.floor&&slot.type===part.type)?.index});
        if(allocation.failed)throw new Error('Native actor pool exhausted.');
        this.state.nativeActorPool=allocation.pool;room.nativeActorBlocks.push({...allocation.block,level:part.level,completedType:part.completedType});
        enqueueConstructionRecord(this.state,room,part,this.state.tick,(entry,part)=>this.completeConstructionPart(entry,part));
      }
    }
    for(const sh of this.state.shafts){sh.stops=sh.stops.filter(f=>elevatorStopAllowed(this.state,sh,f));initializeDispatch(sh);}
    this.registerTenantSlots();
    if(['parking','ramp'].includes(key))this.refreshParking(true);
    const previousCrane=this.state.crane;
    this.state.crane=cranePlacement(this.state.floors,previousCrane);
    noteProgressionConstruction(this.state,key);
    //3C3F2 rebinds each mutated visible row before9D0F marks only newly
    //added structural spans. The grid belongs to the active GUI viewport.
    const builtRoom=this.state.rooms.at(-1),gridFloors=!['floor','lobby',...TRANSPORT,...LINKS].includes(key)
      ?builtRoom.nativeConstructionParts?.length?builtRoom.nativeConstructionParts.map(part=>part.floor):[floor]
      :p.additions.map(a=>a.level);
    for(const level of new Set(gridFloors))this.nativeGridHook?.({floor:level,spans:nativeAddedFloorSpans(previousFloors.get(level),this.state.floors[level])});
    //397B9→356CA: a changed crane rebuilds every visible row before the
    //explicit F296 draw. A narrow highest floor with no old crane does not.
    if(previousCrane?.floor!==this.state.crane?.floor||previousCrane?.x!==this.state.crane?.x)this.nativeGridHook?.({rebind:true,redraw:true});
    this.checkTreasure();
    return { ok: true, cost: p.cost };
  }
  carCost(key) { return key === 'express' ? 150000 : key === 'service' ? 50000 : 80000; }
  setRoomPrice(id,tier) {
    const room=this.state.rooms.find(r=>r.id===id);
    if(!room||![0,1,2,3].includes(tier))return {error:'Invalid price selection.'};
    // 0x204E8 disables control 13 for an occupied condominium (state <24).
    if(room.key==='condo'&&(Number.isInteger(room.tenantState)?nativeLeaseOccupied(room):room.occupied||room.sold))return {error:'An occupied condominium cannot change its sale price.'};
    room.price=tier;return {ok:true};
  }
  refundCondo(room,nativeEviction=false) {
    if(room.key!=='condo'||!room.sold&&!nativeEviction)return;
    // 0x29200 -> 0x2DAF2 -> 0x2D356 posts a negative condo-income entry.
    // Old browser saves have no recorded sale value: infer their frozen tier.
    //2DAF2 reads price+16 even after a late returned family restores an
    // occupied facade without a new sale. Keep recorded firstsale for old
    // browser edits; this native repeated-refund path uses the current tier.
    const amount=room.sold?(room.salePrice??rentAmount(this.data,9,room.price)):rentAmount(this.data,9,room.price);
    if(amount)this.transact(-amount,'Repay condominium sale',9);
    room.sold=false;room.salePrice=0;
  }
  vacateRoom(room) {
    const occupied=nativeLeaseOccupied(room,this.state.tick);
    if(occupied)this.populationEvent(room,'vacate');
    this.refundCondo(room,occupied);room.occupied=false;room.accepting=false;room.tenure=0;if(['office','condo'].includes(room.key))room.tenantState=(room.key==='office'?16:24)+(this.state.tick<1600?0:8);
    if(room.key==='shop'&&room.commercial)room.commercial.state=-1;
    markInteriorDirty(room); //2D7A9/2DAF2/2DC45 write+13 even for the same facade.
    //29200→2D7A9/2DAF2/2DC45 changes the lease only. Existing actors,
    // queues, car passengers, venue counters and parking continue naturally.
  }
  releaseVenue(actor) {
    const venue=this.state.rooms.find(r=>r.id===actor.job||(r.id===actor.room&&COMMERCIAL_TYPES.has(r.key)));
    if(actor.commercialInside&&venue?.commercial)venue.commercial=leaveCommercialVisit(venue.commercial);
    actor.commercialInside=false;
  }
  parkingSpaces() {
    // Native300BB keeps an index list in metadata-slot order; topology flags
    // change only on parking/ramp changes, independently of later room edits.
    return this.state.nativeParkingAvailable.map(id=>this.state.rooms.find(room=>room.id===id)).filter(Boolean);
  }
  refreshParking(topology=false) {
    if(!topology)this.finishAllConstruction(); //300BB begins with385F6.
    const plan=parkingCatalogPlan(this.state,parkingReachable,{topology});
    for(const patch of plan.rooms)Object.assign(this.state.rooms.find(room=>room.id===patch.roomId),{nativeParkingSlot:patch.nativeParkingSlot,parkingAccessible:patch.parkingAccessible,nativeParkingFrame:patch.nativeParkingFrame});
    this.state.nativeParkingAvailable=plan.available;
    this.state.nativeParkingQuotas=recomputeParkingQuotas(this.state.nativeParkingQuotas,plan.available.length);
  }
  rampConnected(floor) {return rampConnected(this.state,floor);}
  parkingFloor(actor) {return actor.parkingFloor??this.state.rooms.find(r=>r.id===actor.parking)?.floor??0;}
  bookParking(actor,room) {
    actor.parkingFloor=0;actor.currentStress=0;delete actor.nativeParkingBorrow; //3022A clears the packed word before EVERY attempt.
    const spaces=this.parkingSpaces();
    const required=requiresParking(room.key,actor.index,room.floor,nativeTenantSlot(this.state.rooms,room),this.state.star);
    const category=nativePopulationCategory(CATALOG[room.key].id),quotas=this.state.nativeParkingQuotas;
    const plan=parkingBookingPlan(spaces,required,quotas.used[category]??0,quotas.limits[category]??0,n=>this.randomInt(n));
    if(plan.status==='not-required')return true;
    if(plan.status!=='booked'){this.notice(this.data.strings[1010][4]);return false;}
    this.state.nativeParkingQuotas=claimParkingQuota(quotas,CATALOG[room.key].id).quotas;
    const space=spaces.find(r=>r.id===plan.spaceId);
    actor.parking=space.id;actor.parkingFloor=plan.floor;delete actor.nativeParkingBorrow;
    space.parkingActor=actor.id;space.carVariant=plan.carVariant;space.occupied=true;
    space.nativeParkingFrame=plan.carVariant;
    if(Number.isInteger(actor.slot))space.parkingActorSlot=actor.slot;else delete space.parkingActorSlot;
    return true;
  }
  releaseParking(actor) {
    if(!hasParkingReservation(actor))return; //30399 returns before either quota or display cleanup when highbits are zero.
    const home=this.state.rooms.find(room=>room.id===actor.room);
    if(home)this.state.nativeParkingQuotas=releaseParkingQuota(this.state.nativeParkingQuotas,CATALOG[home.key].id);
    const space=this.state.rooms.filter(room=>room.key==='parking'&&parkingReleasePlan(room,actor.id,actor.slot)).sort((a,b)=>a.nativeParkingSlot-b.nativeParkingSlot)[0],plan=parkingReleasePlan(space,actor.id,actor.slot);
    if(plan){delete space.parkingActor;delete space.parkingActorSlot;space.occupied=plan.occupied;space.carVariant=plan.carVariant;space.nativeParkingFrame=plan.nativeParkingFrame??(space.parkingAccessible===false?1:0);}
    actor.parking=null;delete actor.parkingFloor;delete actor.nativeParkingBorrow;
  }
  vipHooks(){return {deferDialogs:true,dialog:(id,value)=>this.nativeDialog(id,value),notice:text=>this.notice(text)};}
  reserveVIP(actor,room){return reserveVIPGuest(this.state,actor,room,this.vipHooks());}
  arriveVIP(actor){return admitVIPGuest(this.state,actor,this.data,this.vipHooks());}
  checkoutVIP(actor){return checkoutVIPGuest(this.state,actor,this.vipHooks());}
  failVIP(actor){return failVIPGuest(this.state,actor,this.vipHooks());}
  addCar(id, floor) {
    const shaft = this.state.shafts.find(s => s.id === id);
    if (!shaft) return { error: 'Elevator not found.' };
    if (floor !== undefined && (!Number.isInteger(floor) || floor < shaft.low || floor > shaft.high)) return { error: 'Choose a floor within the elevator shaft.' };
    if(floor!==undefined&&!elevatorStopAllowed(this.state,shaft,floor))return {error:'This floor cannot be an elevator stop.'};
    if (shaft.cars.length >= CAR_LIMIT) return { error: 'No more cars in this shaft.' };
    const cost = this.carCost(shaft.key);
    if (!this.canAfford(cost)) return { error: 'Not enough money.' };
    this.transact(-cost, 'Add elevator car',CATALOG[shaft.key].id,'construction');
    floor ??= shaft.low;
    shaft.cars.push({ id: this.id(), nativeCarSlot:firstFreeNativeCarSlot(shaft.cars), floor, target: floor, parkingFloor:floor, doors: 0, people: [] });
    initializeDispatch(shaft);
    return { ok: true, cost };
  }
  removeCar(id,carId) {
    const sh=this.state.shafts.find(shaft=>shaft.id===id),car=sh?.cars.find(car=>car.id===carId);
    if(!car)return {error:'Elevator car not found.'};
    if(sh.cars.length===1)return this.demolish(Math.floor(car.floor),sh.x);
    //14C0E->15DEA unloads every destination and clears this car's hall
    // assignments, then redispatches waiting rings using surviving cars.
    const riders=car.people.map(id=>this.state.people.find(p=>p.id===id)).filter(Boolean);
    sh.cars=sh.cars.filter(other=>other!==car);for(const key of Object.keys(sh.calls||{}))if(sh.calls[key]===car.id)delete sh.calls[key];
    for(const rider of riders)this.constructionReplan(rider,true);
    this.state.people=this.state.people.filter(p=>p.stage!=='done');
    const halls=new Map();for(const p of this.state.people)if(p.stage==='queue'&&p.path[0]?.id===id)halls.set(`${p.floor}:${Number(p.path[0].to>p.floor)}`,p);
    const program=elevatorProgram(sh,this.state.tick,this.calendar.weekend);for(const p of halls.values())assignHallCall(sh,p.floor,Number(p.path[0].to>p.floor),this.state.people,program.response);
    return {ok:true};
  }
  setElevatorStop(id,floor,confirmed=false) {
    const sh=this.state.shafts.find(sh=>sh.id===id);
    if(!sh)return {error:'Elevator not found.'};
    if(!elevatorStopAllowed(this.state,sh,floor))return {error:'This floor cannot be an elevator stop.'};
    if(sh.stops.includes(floor)) {
      const error=elevatorStopError(this.state,sh,floor);if(error)return {error};
      const warningCode=stopIsolationWarning(this.state,sh,floor);
      if(warningCode&&!confirmed)return {warning:this.data.strings[1005][warningCode-1],warningCode};
      const evacuated=stopEvacuationPeople(this.state,sh,[floor]);
      sh.stops=sh.stops.filter(f=>f!==floor);
      for(const key of Object.keys(sh.calls))if(Number(key.split(':')[0])===floor)delete sh.calls[key];
      for(const p of evacuated.riders)this.constructionReplan(p,true);
      for(const p of evacuated.waiters)this.constructionReplan(p,false);
    } else sh.stops.push(floor);
    sh.stops.sort((a,b)=>a-b);return {ok:true};
  }
  constructionReplan(p,rider=false) {
    const s=this.state,r=s.rooms.find(r=>r.id===p.room),a=s.actors.find(a=>a.id===p.actor);
    if(!r)return;
    const sh=s.shafts.find(sh=>sh.id===p.path[0]?.id);
    if(rider)p.floor=p.path[0].to; // 0x3EB23 native destination-floor write.
    if(sh)p.x=sh.x+sh.width/2;
    for(const shaft of s.shafts)for(const car of shaft.cars)car.people=car.people.filter(id=>id!==p.id);
    p.tripDelay=nativeJourneyStressEnabled(r.key)?Math.min(300,p.tripDelay+this.data.transport.boardingFailureStress):0;
    p.wait=0;delete p.queueTick;delete p.hallRegistered;
    const path=this.route(p.floor,p.to,r.key==='housekeeping',p.actor?actorRouteOrigin(r):p.x);
    if(path){p.path=path;p.stage='walk';if(a)a.floor=p.floor;}
    else {if(a)finishActorTrip(this,a,r,p,false);p.stage='done';}
  }
  resizeShaft(id, low, high, apply = true) {
    // 0x150B9 / 0x15427: independent top and bottom, with a 30-floor cap.
    const sh = this.state.shafts.find(sh => sh.id === id);
    if (!sh || !Number.isInteger(low) || !Number.isInteger(high) || low > high || low < -9 || high > 99) return { error: 'Invalid elevator range.' };
    if(low===sh.low&&high===sh.high)return apply?{ok:true,cost:0}:{key:sh.key,x:sh.x,width:sh.width,low,high,cost:0,capped:false}; //150DD/1544D skip unchanged ends.
    //15141/154BA validate the raw dragged end, and2CB62 checks its entire
    //added structure BEFORE151E0/15557 applies the30-floor cap.
    if(nativeShaftTransportCollision(this.state,{x:sh.x,low,high,slot:sh.nativeTransportSlot,type:nativeShaftType(sh.key)}))return {error:'Cannot place over other transportation items.'};
    let requestedCost=0;
    for(let f=low;f<=high;f++)if(f<sh.low||f>sh.high){const b=this.bounds(f),left=b?Math.min(b.x,sh.x):sh.x,right=b?Math.max(b.x+b.width,sh.x+sh.width):sh.x+sh.width;requestedCost+=(right-left-(b?.width||0))*price(this.data,'floor');}
    if(!this.canAfford(requestedCost))return {error:'Not enough money for construction.'};
    const range=cappedShaftRange(sh,low,high);low=range.low;high=range.high;
    const additions = [];
    let cost=0;
    for (let f = low; f <= high; f++) {
      const b = this.bounds(f);
      // 0x39F11 expands/creates structural floor records under the shaft.
      // Retraction changes stops and queues, never these floor records.
      const left=b?Math.min(b.x,sh.x):sh.x,right=b?Math.max(b.x+b.width,sh.x+sh.width):sh.x+sh.width;
      cost+=(right-left-(b?.width||0))*price(this.data,'floor');
      //15988 already protects other transportation. Ordinary facility
      //records remain underneath;39F11 retains their floor runs.
      additions.push({floor:f,x:left,width:right-left,newStop:f<sh.low||f>sh.high});
    }
    if(!this.canAfford(cost))return {error:'Not enough money for construction.'};
    if (!apply) return { key: sh.key, x: sh.x, width: sh.width, low, high, cost,capped:range.capped };
    const previousFloors=new Map(additions.map(a=>[a.floor,this.state.floors[a.floor]]));
    const evacuated=stopEvacuationPeople(this.state,sh,removedShaftFloors(sh,low,high));
    if(cost)this.transact(-cost,'Elevator floor structure',0,'construction');
    for(const a of additions)this.state.floors[a.floor]={...this.state.floors[a.floor],x:a.x,width:a.width,lobby:this.state.floors[a.floor]?.lobby||false};
    sh.stops = sh.stops.filter(f => f >= low && f <= high);
    for (const a of additions) if(a.newStop && !(a.floor>0&&a.floor<lobbyHeight(this.state)) && (sh.key !== 'express' || a.floor <= 0 || skyLobbyFloor(a.floor))) sh.stops.push(a.floor);
    sh.stops.sort((a, b) => a - b); sh.low = low; sh.high = high;
    initializeDispatch(sh);
    for(const key of Object.keys(sh.calls))if(Number(key.split(':')[0])<low||Number(key.split(':')[0])>high)delete sh.calls[key];
    for(const car of sh.cars){Object.assign(car,cappedCarState(car,low,high));car.target=clamp(car.target,low,high);car.turnFloor=clamp(car.turnFloor,low,high);car.departureFloor=clamp(car.departureFloor,low,high);}
    for(const p of evacuated.waiters)this.constructionReplan(p,false);
    for(const p of evacuated.riders)this.constructionReplan(p,true);
    this.state.people=this.state.people.filter(p=>p.stage!=='done');
    this.registerTenantSlots();
    const previousCrane=this.state.crane;
    this.state.crane=cranePlacement(this.state.floors,previousCrane);
    for(const a of additions)if(nativeAddedFloorSpans(previousFloors.get(a.floor),this.state.floors[a.floor]).length)this.nativeGridHook?.({floor:a.floor,spans:nativeAddedFloorSpans(previousFloors.get(a.floor),this.state.floors[a.floor])});
    if(previousCrane?.floor!==this.state.crane?.floor||previousCrane?.x!==this.state.crane?.x)this.nativeGridHook?.({rebind:true,redraw:true});
    this.checkTreasure();
    return { ok: true, cost };
  }
  registerTenantSlots(reallocateRoomId=null,reallocateFloor=null){const plan=tenantSlotAllocation(this.state,{reallocateRoomId,reallocateFloor});for(const patch of plan.rooms){const room=this.state.rooms.find(r=>r.id===patch.roomId);room.nativeTenantIndex=patch.nativeTenantIndex;room.nativeTenantSlots=patch.nativeTenantSlots;}for(const patch of plan.floors)this.state.floors[patch.floor].nativeTenantIndex=patch.nativeTenantIndex;}
  finishConstruction() {return completeConstructionHead(this.state,(entry,part)=>this.completeConstructionPart(entry,part));}
  finishAllConstruction(){while(this.state.nativeConstructionRing.count)this.finishConstruction();}
  completeConstructionPart(entry,part) {
    const s=this.state,r=s.rooms.find(room=>room.id===entry.room);if(!r)return;
    const index=r.nativeActorBlocks.findIndex(block=>block.level===part.level),old=r.nativeActorBlocks[index];
    const completion=completeActorBlock(s.nativeActorPool,{...old,type:part.completedType});s.nativeActorPool=completion.pool;r.nativeActorBlocks[index]=completion.block;
    completeCinemaMovie(r,n=>this.randomInt(n));
    if(r.key==='medical')registerMedicalRoom(s,r);
    if(['office','condo'].includes(r.key))r.tenantState=(r.key==='office'?16:24)+(s.tick<1600?0:8);
    if(COMMERCIAL_TYPES.has(r.key)){const style=takeFacilityStyle(s.nativeFacilityStyles,r.key,'completion');s.nativeFacilityStyles=style.counters;r.variant=style.variant;r.commercial=newCommercialState(r.key,s.tick);this.changePopulation(CATALOG[r.key].id,r.commercial.population);registerCommercialRoom(s,r);}
    this.registerTenantSlots(r.id,part.floor);markInteriorDirty(r,part.floor);syncActors(this);
    this.nativeGridHook?.({floor:part.floor,spans:[]}); //387B0→9D89.
  }
  clearRubble(x,width,low,high) {
    this.state.rubble=this.state.rubble.flatMap(r=>{
      if(r.floor<low||r.floor>high||r.x>=x+width||r.x+r.width<=x)return [r];
      const remains=[];if(r.x<x)remains.push({...r,width:x-r.x});
      if(r.x+r.width>x+width)remains.push({...r,x:x+width,width:r.x+r.width-x-width});return remains;
    });
  }
  eventHooks() {
    return {deferDialogs:true,isPaused:()=>this.state.dialogs.length>0,activate:mode=>this.activateEmergency(mode),dialog:(id,value)=>this.nativeDialog(id,value),sound:(id,category)=>this.nativeSound(id,category),spend:(amount,label)=>this.transact(-amount,label),
      focus:(floor,x)=>{this.state.viewFocus={floor,x};},damage:(floor,x)=>this.damageFacilityAt(floor,x),
      evacuate:(mode=0)=>resetEmergencySecurity(this.state,mode),
      setTick:tick=>{this.state.tick=tick;this.state.minute=clockTime(tick).minuteOfDay;}};
  }
  activateEmergency(mode){this.finishAllConstruction();initializeNativeEmergency(this.state);} //17FE0;mode controls only immediate native redraw.
  answerEmergency(id,control,{automatic=false}={}) {
    if(![1,2].includes(control))return false;
    if(this.state.affordabilityContinuation){
      if(id!==1004)return false;
      const pending=this.state.affordabilityContinuation;delete this.state.affordabilityContinuation;
      this.state.dialogs=this.state.dialogs.filter(dialog=>dialog.id!==1004);
      return this.answerEmergency(pending.id,pending.control);
    }
    if(nativeUnaffordableChoice(this.state,this.data,id,control)){
      if(automatic)return this.answerEmergency(id,1); //DAD1 timer's silent refusal.
      this.state.affordabilityContinuation={id,control:1};
      this.state.dialogs.unshift({id:1004,value:0});return true;
    }
    const index=this.state.dialogs.findIndex(dialog=>dialog.id===id);
    if(index>=0)this.state.dialogs.splice(index,1);
    const handled=acknowledgeVIPDialog(this.state,this.data,id,this.vipHooks())||acknowledgeEmergencyDialog(this.state,this.data,id,control,this.eventHooks());
    if(!this.state.vipContinuation&&this.state.facilityContinuation){
      const pending=this.state.facilityContinuation,room=this.state.rooms.find(r=>r.id===pending.room);
      if(room){if(pending.kind==='damage')this.damageFacilityAt(pending.floor,pending.x);else this.removeRoom(room);}
    }
    if(!this.state.vipContinuation)resumeEmergencyWork(this.state,this.data,this.eventHooks());
    resumeVIPActor(this);
    if(!this.state.dialogs.length)this.continueTick();
    return handled;
  }
  get canCallFireRescue() {return fireRescueAvailable(this.state);}
  callFireRescue() {return requestFireRescue(this.state,this.data,this.eventHooks());}
  damageFacilityAt(floor,x) {
    const s=this.state,r=this.roomAt(floor,x);if(!r||!disasterDamageDecision(r).damaged)return false;
    if(!this.cleanupRoomActors(r,'damage',{floor,x}))return true;
    this.populationEvent(r,'remove');
    const ownActors=new Set(s.actors.filter(a=>a.room===r.id).map(a=>a.id));
    if(r.key==='parking')for(const a of s.actors){const plan=parkingDemolitionPlan(a,r);if(plan)Object.assign(a,plan);}
    for(const a of s.actors)if(a.job===r.id&&!ownActors.has(a.id)) {
      const home=s.rooms.find(room=>room.id===a.room),p=s.people.find(p=>p.id===a.trip);
      if(r.key==='medical'&&a.state===66||p&&['clinic-arrival','lunch-arrival'].includes(p.purpose))a.missingVenue=true;a.job=null;a.commercialInside=false;
    }
    for(const block of r.nativeActorBlocks||[])s.nativeActorPool=releaseActorBlock(s.nativeActorPool,block.owner);
    if(r.key==='medical')removeMedicalRoom(s,r);
    if(COMMERCIAL_TYPES.has(r.key)&&!r.constructionRemaining)removeCommercialRoom(s,r);
    this.refundCondo(r,nativeLeaseOccupied(r,s.tick));s.rooms=s.rooms.filter(room=>room.id!==r.id);s.actors=s.actors.filter(a=>!ownActors.has(a.id));
    s.people=s.people.filter(p=>p.room!==r.id&&p.stage!=='done');removeConstructionRoom(s,r.id);
    for(const sh of s.shafts)for(const car of sh.cars)car.people=car.people.filter(id=>s.people.some(p=>p.id===id));
    if(s.emergency){s.emergency.staff=s.emergency.staff.filter(staff=>s.actors.some(a=>a.id===staff.actor));for(const id of Object.keys(s.emergency.searchRanges))if(!s.rooms.some(room=>room.id===+id))delete s.emergency.searchRanges[id];}
    if(['parking','ramp'].includes(r.key))this.refreshParking(true);
    for(let level=0;level<(r.height||1);level++)s.rubble.push({floor:r.floor-level,x:r.x,width:r.width});
    for(let level=0;level<(r.height||1);level++)this.nativeGridHook?.({floor:r.floor-level,spans:[]});
    return true;
  }
  checkTreasure() {
    // 0x2A1E7 / 0x2A22C / 0x2A293: once, when a sufficiently wide
    // basement at B3/B4/B5 for ratings 1/2/3 respectively. The native
    // pointer is BE66, two entries before the floor table's BE6E base.
    const s=this.state,b=s.floors[-s.star-2];
    if(s.nativeFlags.treasure || s.star>3 || !b || b.width<=s.star*25) return;
    s.nativeFlags.treasure=true;
    const amount=this.data.events.treasure[s.star-1]*this.data.moneyScale;
    this.transact(amount,'Buried treasure'); this.nativeDialog(3040,amount);
  }
  setElevatorProgram(id,day,phase,values) {
    const sh=this.state.shafts.find(sh=>sh.id===id);
    if(!sh || ![0,1].includes(day) || !Number.isInteger(phase) || phase<0 || phase>6) return {error:'Invalid elevator program.'};
    const slot={...sh.programs[day][phase],...values};
    if(!Number.isInteger(slot.response) || slot.response<1 || slot.response>100 || !Number.isInteger(slot.wait) || slot.wait<0 || slot.wait>3) return {error:'Invalid elevator program settings.'};
    sh.programs[day][phase]=slot;
    return {ok:true};
  }
  changeMovie(id,kind) {
    const room=this.state.rooms.find(r=>r.id===id && r.key==='cinema');
    if(!room || !nativeRoomHasCompletedActors(room) || !['new','classic'].includes(kind)) return {error:'Movie theater is not available.'};
    const cost=this.data.movie[kind==='new'?'newCost':'classicCost']*this.data.moneyScale;
    if(!this.canAfford(cost)) return {error:'Not enough money.'};
    room.movie.index=(room.movie.index+1)%7+(kind==='new'?7:0); room.movie.days=0;
    this.transact(-cost,kind==='new'?'New movie':'Classic movie'); return {ok:true,cost};
  }
  prepareShows() {this.finishAllConstruction();for(const type of [18,29])this.state.nativePopulation=clearNativePopulationCategory(this.state.nativePopulation,type);for(const room of this.state.rooms)if(SHOW_TYPES.has(room.key)&&nativeRoomHasCompletedActors(room)){prepareShowDay(room,this.data);this.changePopulation(CATALOG[room.key].id,room.dailyPopulation);}}
  startShows(key,half=0) {for(const room of this.state.rooms)if(room.key===key&&nativeRoomHasCompletedActors(room))openShowBatch(room,this.state.actors,half);}
  finishShows(key,half=1) {for(const room of this.state.rooms)if(room.key===key&&nativeRoomHasCompletedActors(room)){const receipts=closeShowBatch(room,this.state.actors,half,this.state,this.data);if(receipts)this.transact(receipts,`${CATALOG[key].name} receipts`,CATALOG[key].id);}}
  recyclingHooks(){return {notice:index=>this.notice(this.data.strings[1010][index-1]),sound:id=>this.nativeSound(id,1)};}
  updateGarbage(stage) {processRecycling(this.state,this.population,stage,this.recyclingHooks());}
  updateConstruction() {advanceConstructionRing(this.state,(entry,part)=>this.completeConstructionPart(entry,part));}
  cleanupRoomActors(room,kind,fields={}) {
    //3BF6D→417F8/4191B cancels transport and releases each hotel child
    //before48F7D; population/refund/metadata/room teardown follows its return.
    const s=this.state,actors=s.actors.filter(a=>a.room===room.id).sort((a,b)=>a.slot-b.slot);
    const pending=s.facilityContinuation??{room:room.id,kind,nextActor:0,...fields};
    for(let index=pending.nextActor;index<actors.length;index++){
      const actor=actors[index],person=s.people.find(p=>p.id===actor.trip);
      if(person){if(nativeJourneyStressEnabled(room.key)){Object.assign(actor,recordJourneyStress(actor,person.tripDelay||0));const stat=room.trips?.[actor.resident];if(stat)Object.assign(stat,recordJourneyStress(stat,person.tripDelay||0));}
        s.people=s.people.filter(p=>p.id!==person.id);for(const sh of s.shafts)for(const c of sh.cars)c.people=c.people.filter(id=>id!==person.id);actor.trip=null;
      }
      actor.commercialInside=false;this.releaseParking(actor);this.failVIP(actor);
      if(s.vipContinuation){s.facilityContinuation={...pending,nextActor:index+1};return false;}
    }
    delete s.facilityContinuation;return true;
  }
  removeRoom(room) {
    if(!this.cleanupRoomActors(room,'remove'))return {ok:true};
    this.populationEvent(room,'remove');
    const s=this.state,ids=new Set(s.people.filter(p=>p.room===room.id).map(p=>p.id));
    if(room.key==='parking')for(const actor of s.actors){const plan=parkingDemolitionPlan(actor,room);if(plan)Object.assign(actor,plan);}
    s.actors=s.actors.filter(a=>a.room!==room.id);for(const actor of s.actors)if(actor.job===room.id){if(room.key==='medical'&&actor.state===66||actor.trip!==null&&[65,66].includes(actor.state))actor.missingVenue=true;actor.job=null;}
    s.people=s.people.filter(p=>!ids.has(p.id));for(const sh of s.shafts)for(const car of sh.cars)car.people=car.people.filter(id=>!ids.has(id));
    for(const block of room.nativeActorBlocks||[])s.nativeActorPool=releaseActorBlock(s.nativeActorPool,block.owner);
    if(room.key==='medical')removeMedicalRoom(s,room);
    if(COMMERCIAL_TYPES.has(room.key)&&!room.constructionRemaining)removeCommercialRoom(s,room);
    s.rooms=s.rooms.filter(r=>r.id!==room.id);removeConstructionRoom(s,room.id);this.refundCondo(room,nativeLeaseOccupied(room,s.tick));if(['parking','ramp'].includes(room.key))this.refreshParking(true);
    for(let level=0;level<(room.height||1);level++)this.nativeGridHook?.({floor:room.floor-level,spans:[]});
    return {ok:true};
  }
  demolish(floor, x, point) {
    const s = this.state;
    // 0xC3B0: elevators, then diagonal link artwork (0x18F66), then
    // the room beneath. Keep pointer pixels for the two-storey diagonal.
    const shaft=s.shafts.find(sh=>sh.x<=x&&x<sh.x+sh.width&&floor>=sh.low&&floor<=sh.high);
    const car=shaft&&point&&nativeCarAtPoint(shaft,point);if(car&&shaft.cars.length>1)return this.removeCar(shaft.id,car.id);
    const link=!shaft&&(point?linkAtPoint(s,point.x,point.y):s.links.find(l=>[l.floor,l.floor-1].includes(floor)&&l.x<=x&&x<l.x+l.width));
    const room=!shaft&&!link?this.roomAt(floor,x):undefined;
    const target = shaft || link || room;
    if (!target) return { error: 'Select a room, stairway, or elevator to demolish.' };
    if (room && (room.constructionRemaining > 0 || ['security', 'housekeeping', 'metro', 'cathedral','secom'].includes(room.key))) return { error: 'This item cannot be removed.' }; // 0x3BD44
    if(room)return this.removeRoom(room);
    const ids = new Set(shaft ? shaft.cars.flatMap(c => c.people) : []);
    for(const a of s.actors.filter(a=>a.room===room?.id||a.parking===room?.id)){this.releaseParking(a);this.failVIP(a);}
    s.actors=s.actors.filter(a=>a.room!==room?.id);
    for(const a of s.actors)if(room&&a.job===room.id)a.job=null;
    s.people = s.people.filter(p => p.room !== room?.id && !ids.has(p.id));
    for(const sh of s.shafts)for(const car of sh.cars)car.people=car.people.filter(id=>s.people.some(p=>p.id===id));
    for(const a of s.actors)if(a.trip!==null&&!s.people.some(p=>p.id===a.trip)){a.trip=null;a.state=38;}
    s.rooms = s.rooms.filter(r => r.id !== target.id);
    s.shafts = s.shafts.filter(sh => sh.id !== target.id);
    s.links = s.links.filter(l => l.id !== target.id);
    // 0x3BF6D: ordinary removal is free; an occupied condo returns its sale.
    if(room)this.refundCondo(room);
    return { ok: true };
  }
  get totalMinutes() { return (this.state.day - 1) * 1440 + this.state.minute; }
  route(from, to, service = false, originX) {
    return nativeTransportRoute(this.state,from,to,service,originX);
  }
  status(room) {
    const s = this.state, spec = CATALOG[room.key];
    if (room.constructionRemaining > 0) return 'Under construction';
    if (room.key === 'parking' && !this.rampConnected(room.floor)) return 'Not connected to Ramp';
    if (this.route(0, room.floor) === null) return 'No transportation connected';
    if (HOTELS.has(room.key) && !s.rooms.some(r => r.key === 'housekeeping' && !r.constructionRemaining && this.route(r.floor,room.floor,true)!==null)) return 'Housekeeping needed';
    if (room.dirt >= 80) return 'Room is too dirty';
    if (['office','condo',...HOTELS].includes(room.key) && noisyNeighbor(room,s.rooms)) return 'Neighbors are too noisy';
    if (room.key === 'recycling' && !s.garbage.working && s.star>=3) return 'Full of Garbage';
    if (s.people.some(p => p.room === room.id && p.wait > 40)) return 'Elevator service is slow';
    if (room.satisfaction < 30) return 'Conditions are terrible';
    return room.occupied ? 'Transportation access is good' : 'For Rent';
  }
  tenantStress(room) {
    return RESIDENT_TYPES.has(room.key)?residentStress(room,this.state.rooms):meanTenantStress(room.trips);
  }
  resetTenantStress(room) {
    for(const stat of room.trips){stat.delay=0;stat.trips=0;}
    for(const a of this.state.actors.filter(a=>a.room===room.id)){a.delay=0;a.trips=0;}
  }
  admitTenant(room,continuation=false) {
    if(nativeLeaseOccupied(room,this.state.tick)||room.accepting===false&&!continuation||room.constructionRemaining)return;
    this.populationEvent(room,'admit');
    const amount=initialTenancyPayment(this.data,room,continuation);
    this.resetTenantStress(room); // 2D71E/2DA4D/2DBAB: a new accepted contract starts fresh histories.
    room.occupied=true;room.tenure=0;if(['office','condo'].includes(room.key))room.tenantState=tenantRoomAdmitted(room,this.state.tick);
    if(room.key==='shop'&&room.commercial)room.commercial.state=0; //2DBAB initial contract replaces unleasedFF.
    markInteriorDirty(room); //2D71E/2DA4D/2DBAB.
    if(room.key==='condo'){room.sold=true;room.salePrice=amount;}
    if(amount)this.transact(amount,room.key==='condo'?'Condominium sale':`${CATALOG[room.key].name} move-in rent`,CATALOG[room.key].id);
  }
  checkInHotel(room) {if(nativeHotelState(room,this.state.tick)>=24){this.populationEvent(room,'admit');Object.assign(room,hotelCheckIn(room,this.state.tick));markInteriorDirty(room);}}
  spawn(room, from, to, actor=null, fromX) {
    //3E2BE..2D4 maps negative native floor sentinels to the ground lobby.
    if(actor){if(from<BASEMENT_LIMIT)from=0;if(to<BASEMENT_LIMIT)to=0;}
    if (this.state.people.length >= 100000) return;
    const lobby = this.state.floors[0];
    const parking=this.state.rooms.find(r=>r.id===actor?.parking);
    const origin=parking&&from===parking.floor?parking:room;
    const originX=actor?actorRouteOrigin(room):fromX??(from===0?lobby.x+2:origin.x+origin.width/2);
    const path=this.route(from,to,room.key==='housekeeping',originX);
    if(!path)return;
    const firstShaft=this.state.shafts.find(sh=>sh.id===path[0]?.id);
    const person={ id: this.id(), actor:actor?.id??null,room: room.id, floor: from, x: originX, to, path, stage: 'walk', wait: 0, tripDelay:nativeJourneyStressEnabled(room.key)&&path[0]&&(path[0].kind==='stairs'||firstShaft?.key!=='express')?lateralStress((path[0].accessX??path[0].x)-originX):0, resident:actor?.resident??(room.trips.length ? Math.floor(this.random()*room.trips.length) : -1), appearance: actor?.appearance??Math.floor(this.random() * 5), direction: 1, walkDistance: 0 };
    this.state.people.push(person);return person;
  }
  selectNextActorLeg(p) {
    // 0x3EB23 calls the actor category handler at every car alight;
    // 0x428CA releases a link and re-enters3E2A0 at the next cohort.
    // Both select transport afresh from HOME left edge, not a saved path.
    const r=this.state.rooms.find(r=>r.id===p.room),a=this.state.actors.find(a=>a.id===p.actor);
    if(!r||!a)return false;
    a.floor=p.floor;
    const path=this.route(p.floor,p.to,r.key==='housekeeping',actorRouteOrigin(r));
    if(!path){
      p.tripDelay=nativeJourneyStressEnabled(r.key)?Math.min(300,p.tripDelay+this.data.transport.noRouteStress):0;
      const stat=r.trips[p.resident];if(stat&&nativeJourneyStressEnabled(r.key))Object.assign(stat,recordJourneyStress(stat,p.tripDelay));
      finishActorTrip(this,a,r,p,false);p.stage='done';return false;
    }
    p.path=path;p.stage='walk';p.wait=0;
    delete p.hallRegistered;delete p.queueTick;delete p.retryTick;delete p.linkTick;
    return true;
  }
  updatePeople(dt,onlyId) {
    const s = this.state;
    for (let position=onlyId===undefined?s.peopleTickResume??0:0;position<s.people.length;position++) {
      if(s.dialogs.length){
        if(s.peopleTickResume!==undefined)s.peopleTickResume=s.people.slice(0,s.peopleTickResume).filter(p=>p.stage!=='done').length;
        s.people=s.people.filter(p=>p.stage!=='done');return;
      }
      if(onlyId===undefined)s.peopleTickResume=position+1;
      const p=s.people[position];
      if(onlyId!==undefined&&p.id!==onlyId)continue;
      if (p.stage === 'done' || p.stage === 'car') continue;
      let edge = p.path[0]; const r = s.rooms.find(r => r.id === p.room);
      if (!r) { p.stage = 'done'; continue; }
      const actor=s.actors.find(a=>a.id===p.actor),parking=s.rooms.find(r=>r.id===actor?.parking);
      if(p.stage==='link') {
        // 0x3E2A0 advances actor floor and registers usage immediately;
        // 0x428CA releases that usage on the next actor cohort.
        if(p.linkTick===s.tick||!actorCohortDue(s,p))continue;
        if(actor){if(!this.selectNextActorLeg(p))continue;}else{p.path.shift();p.stage='walk';delete p.linkTick;}edge=p.path[0];
      }
      if(p.stage==='retry') {
        // 0x3E490 returns zero with access byte FF; 0x42513 / 0x427C7
        // retries that transport choice on the actor's next 16-tick cohort.
        if(p.retryTick===s.tick || (actor?.slot??p.id)%16!==s.tick%16)continue;
        const path=this.route(p.floor,p.to,r.key==='housekeeping',p.actor?actorRouteOrigin(r):p.x);
        if(!path){if(nativeJourneyStressEnabled(r.key))p.tripDelay=Math.min(300,p.tripDelay+this.data.transport.noRouteStress);if(actor)finishActorTrip(this,actor,r,p,false);p.stage='done';continue;}
        p.path=path;edge=path[0];p.stage='walk';delete p.retryTick;
      }
      const destination=parking&&p.to===parking.floor?parking:r;
      const destX = edge ? edge.x : p.destX ?? (p.to === 0 ? s.floors[0].x + 2 : destination.x + destination.width / 2);
      if(actor)p.x=destX;
      if (!actor&&Math.abs(p.x - destX) > 0.1) {
        p.direction = Math.sign(destX - p.x);
        const distance = Math.min(Math.abs(destX - p.x), dt * 0.8);
        p.x += p.direction * distance;
        p.walkDistance = (p.walkDistance || 0) + distance * 8;
        p.stage = 'walk';
      }
      else if (!edge) {
        p.stage = 'done';
        const resident=r.trips[p.resident];
        if (resident&&nativeJourneyStressEnabled(r.key)) { Object.assign(resident,recordJourneyStress(resident,p.tripDelay)); }
        if (p.to === r.floor && COMMERCIAL.has(r.key)) r.visitors = (r.visitors || 0) + 1;
        if(p.to===r.floor && r.movie && p.showHalf!==undefined){r.movie.halfVisitors??=[0,0];r.movie.halfVisitors[p.showHalf]++;}
        if(actor)finishActorTrip(this,actor,r,p,true);
        else if (p.to === 0 && HOTELS.has(r.key)) this.checkOut(r);
      }
      else if (edge.kind === 'stairs') { const type=edge.type??s.links.find(l=>l.id===edge.id)?.key;if(nativeJourneyStressEnabled(r.key))p.tripDelay=Math.min(300,p.tripDelay+Math.abs(edge.to-edge.from)*(type==='escalator'?this.data.transport.escalatorStress:this.data.transport.stairStress));p.floor = edge.to;p.stage='link';p.linkTick=s.tick;if(actor)actor.floor=p.floor; }
      else {
        // Native directional rings hold 40 people each (0x3F2F0).
        // Full-ring applicants retry; timed prefix evacuation (0x41D80 /
        // 0x3FC21) still needs the remaining journey recovery states.
        if(p.stage!=='queue') {
          const direction=Number(edge.to>p.floor);
          if(s.people.filter(other=>other.stage==='queue'&&other.path[0]?.id===edge.id&&other.floor===p.floor&&Number(other.path[0].to>other.floor)===direction).length>=40) {
            if(nativeJourneyStressEnabled(r.key))p.tripDelay=Math.min(300,p.tripDelay+this.data.transport.fullQueueStress);
            p.stage='retry';p.retryTick=s.tick;continue;
          }
          p.queueOrder=s.nextQueueOrder++;p.stage='queue';p.wait=0;p.queueTick=s.tick;
          if(actor){const shaft=s.shafts.find(sh=>sh.id===edge.id);if(shaft){const first=!s.people.some(other=>other!==p&&other.stage==='queue'&&other.floor===p.floor&&other.path[0]?.id===shaft.id&&Number(other.path[0].to>other.floor)===direction&&other.hallRegistered);p.hallRegistered=true;if(first)assignHallCall(shaft,p.floor,direction,s.people,elevatorProgram(shaft,s.tick,this.calendar.weekend).response);}}
        } else {
          p.queueTick??=Math.max(0,s.tick-Math.floor(p.wait*2));p.wait+=dt;
          if(actorCohortDue(s,p)&&queueTimeoutExpired(s.tick,p.queueTick,this.data.transport.queueTimeout))
            for(const waiter of queuePrefix(s.people,p))this.interruptJourney(waiter);
        }
      }
    }
    if(s.dialogs.length){
      if(s.peopleTickResume!==undefined)s.peopleTickResume=s.people.slice(0,s.peopleTickResume).filter(p=>p.stage!=='done').length;
      s.people=s.people.filter(p=>p.stage!=='done');return;
    }
    if(onlyId===undefined)delete s.peopleTickResume;
    s.people = s.people.filter(p => p.stage !== 'done');
  }
  interruptJourney(p) {
    if(p.stage==='done')return;
    const s=this.state,r=s.rooms.find(r=>r.id===p.room),a=s.actors.find(a=>a.id===p.actor);
    const recovery=interruptionState(r?.key,p.purpose);
    if(recovery.recordStress) {
      p.tripDelay=Math.min(300,p.tripDelay+(p.queueTick===undefined?p.wait*2:Math.max(0,s.tick-p.queueTick)));
      const stat=r?.trips[p.resident];if(stat){Object.assign(stat,recordJourneyStress(stat,p.tripDelay));}
      if(a){Object.assign(a,recordJourneyStress(a,p.tripDelay));}
    }
    if(a){this.releaseVenue(a);a.trip=null;a.admissionTick=0;a.currentStress=0;a.state=recovery.state;a.job=null;if(recovery.state===4||recovery.state===5){a.floor=r.floor;if(['office','condo'].includes(r.key)){r.tenantState=tenantRoomEntry(r,s.tick);markInteriorDirty(r);}else if(HOTELS.has(r.key)){r.hotelState=hotelRoomEntry(r,s.tick);markInteriorDirty(r);}}
      if(recovery.releaseParking)this.releaseParking(a);if(recovery.failVIP)this.failVIP(a);}
    if(a&&SHOW_TYPES.has(r?.key))finishShowActorTrip(this,a,r,false,p.purpose,p);
    if(a&&COMMERCIAL_TYPES.has(r?.key)&&p.purpose?.startsWith('commercial-'))finishCommercialActorTrip(this,a,r,false,p.purpose);
    for(const sh of s.shafts){for(const car of sh.cars)car.people=car.people.filter(id=>id!==p.id);}
    p.stage='done';
  }
  updateElevators() { updateNativeElevators(this); }
  checkOut(room,nativeDeparture=false) {
    //438B5 gates the native call on facade low bits, not a lease Boolean.
    //2D914 then posts its receipt/population change unconditionally.
    if (!room.occupied&&!nativeDeparture) return;
    this.populationEvent(room,'checkout');
    const amount = rentAmount(this.data, CATALOG[room.key].id, room.price);
    if (amount) this.transact(amount, `${CATALOG[room.key].name} checkout`,CATALOG[room.key].id);
    Object.assign(room,hotelCheckOut(this.state.tick)); // 0x2D914: departure posts income.
    markInteriorDirty(room);
  }
  closeBusinesses(restaurant = false) {
    for (const r of this.state.rooms) {
      if (r.constructionRemaining > 0 || (r.key === 'restaurant') !== restaurant) continue;
      if(COMMERCIAL_TYPES.has(r.key)&&r.commercial) {
        r.commercial=closeCommercialDay(r.commercial,r.key,this.data,this.state.calendarDay);
        markInteriorDirty(r); //32552 writes+13 unconditionally.
        r.lastProfit=r.commercial.lastProfit;
        if(r.lastProfit)this.transact(r.lastProfit,`${CATALOG[r.key].name} receipts`,CATALOG[r.key].id);
        r.visitors=r.commercial.visitors;continue;
      }
      if(!r.occupied)continue;
      const amount = businessReceipt(this.data, CATALOG[r.key].id, r.visitors || 0, this.state.calendarDay);
      if (amount) this.transact(amount, `${CATALOG[r.key].name} receipts`,CATALOG[r.key].id);
      r.lastProfit=amount; r.visitors = 0;
    }
  }
  openBusinesses(restaurant=false) {
    if(!restaurant)this.finishAllConstruction(); //32024, unlike restaurant320F0.
    prepareCommercialLists(this.state,restaurant);
    for(const type of restaurant?[6]:[12,10])this.state.nativePopulation=clearNativePopulationCategory(this.state.nativePopulation,type);
    for(const r of this.state.rooms)if(COMMERCIAL_TYPES.has(r.key)&&!r.constructionRemaining&&(r.key==='restaurant')===restaurant) {
      r.commercial=openCommercialDay(r.commercial??newCommercialState(r.key),r.key,this.calendar.weekend,this.state.commercialSpecialDay);
      markInteriorDirty(r); //32192 writes+13 unconditionally.
      this.changePopulation(CATALOG[r.key].id,r.commercial.population);
      r.visitors=r.commercial.visitors;
    }
  }
  evaluateHotels() {
    const plan=hotelEveningPlan(this.data,this.state.rooms,this.state.star,r=>this.tenantStress(r),this.state.tick);
    for(const decision of plan){const r=this.state.rooms.find(r=>r.id===decision.roomId);
      for(const key of ['hotelState','hotelDays','evaluation','accepting'])r[key]=decision[key];
      if(decision.neglected)markInteriorDirty(r); //289E2's propagated infestation write.
      if(decision.neglected)r.dirt=100;
      if(decision.resetStress)this.resetTenantStress(r);
    }
  }
  settleQuarter() {
    const s = this.state;
    s.accounts=quarterAccounts(s.cash);
    s.quarterBalance=s.cash; s.income=0; s.expenses=0; // 0xCCDA
    const tenancy=quarterTenancyPlan(this.data,s.rooms,s.star,r=>this.tenantStress(r));
    for(const decision of tenancy) {
      const r=s.rooms.find(r=>r.id===decision.roomId);
      if(decision.evict){this.vacateRoom(r);this.notice(`${CATALOG[r.key].name} on floor ${r.floor+1} lost its tenants.`);}
      r.evaluation=decision.evaluation;r.accepting=decision.accepting;
      if(decision.resetStress)this.resetTenantStress(r);
    }
    for (const r of s.rooms) {
      if (r.constructionRemaining > 0) continue;
      const contract=quarterContract(this.data,r);
      if(contract.payment)this.transact(contract.payment,`${CATALOG[r.key].name} rent`,CATALOG[r.key].id);
      r.tenure=contract.tenure;
      if(contract.resetStress)this.resetTenantStress(r);
      const upkeep = maintenanceAmount(this.data, CATALOG[r.key].id);
      if (upkeep) this.transact(-upkeep, `${CATALOG[r.key].name} maintenance`,CATALOG[r.key].id,'maintenance');
    }
    for (const sh of s.shafts) {
      const amount = maintenanceAmount(this.data, CATALOG[sh.key].id, sh.cars.length);
      if (amount) this.transact(-amount, 'Elevator maintenance',CATALOG[sh.key].id,'maintenance');
    }
    for (const l of s.links) {
      const amount = maintenanceAmount(this.data, CATALOG[l.key].id);
      if (amount) this.transact(-amount, `${CATALOG[l.key].name} maintenance`,CATALOG[l.key].id,'maintenance');
    }
    for (const b of Object.values(s.floors)) if (b.lobby) {
      const amount = lobbyMaintenance(this.data, b.width, s.star);
      if (amount) this.transact(-amount, 'Lobby maintenance',24,'maintenance');
    }
    s.history.push({ day: s.day, cash: s.cash, population: this.population }); s.history = s.history.slice(-60);
    this.notice(`Year ${this.calendar.year}, quarter ${this.calendar.quarter}: rent and maintenance posted.`);
  }
  updateTenantEvaluations() {
    const plan=dailyTenancyPlan(this.data,this.state.rooms,this.state.star,r=>this.tenantStress(r));
    for(const decision of plan){const r=this.state.rooms.find(r=>r.id===decision.roomId);r.evaluation=decision.evaluation;r.accepting=decision.accepting;}
  }
  checkRating() {
    const s = this.state;
    const decision=promotionDecision(s,this.population,this.data.populationThresholds);
    if(decision.info){this.notice(this.data.strings[1010][decision.info-1]);acknowledgeProgressionWarning(s);}
    if(!decision.eligible)return;
    s.star++;
    resetAfterPromotion(s);
    const treasureBasement=s.floors[-s.star-2];
    s.nativeFlags.treasure=s.star<=3 && Boolean(treasureBasement && treasureBasement.width>s.star*25); // 0x2A0BD
    this.nativeDialog(3028+s.star);
    this.notice(`Congratulations! Your tower earned ${s.star} stars. New facilities are available.`);
  }
  step(ticks = 1) {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('Advance by whole native clock ticks.');
    for (let i = 0; i < ticks; i++) {if(this.state.tickContinuation||this.state.dialogs.length)break;this.tick();}
  }
  tick() {
    const s = this.state;if(s.tickContinuation||s.dialogs.length)return;const dialogCount=s.dialogs.length;
    s.tick = (s.tick + 1) % CLOCK_PERIOD; s.elapsedTicks++;
    if (s.tick === MIDNIGHT_TICK) { s.calendarDay = (s.calendarDay + 1) % DAY_COUNTER_PERIOD; s.day = s.calendarDay + 1; }
    s.minute = clockTime(s.tick).minuteOfDay;
    if(s.santa){s.santa.x-=10;s.santa.y++;if(s.santa.x+140<=0)s.santa=null;} // 0x35220
    if(s.tick===2000 && s.calendarDay%12===11 && !s.santa){s.santa={x:2860,y:-1764};this.nativeSound(10002,1);this.notice(this.data.strings[1010]?.[6] || 'Santa Claus is coming to your tower!');}
    if(s.tick===2550)this.nativeSound(s.calendarDay%5===4?5001:5000,2);
    if(s.tick===80 && s.rain)this.nativeSound(5005,2);
    if(s.tick===120 && s.rain)this.nativeSound(5003,2);
    if(s.tick===160)this.nativeSound(5004,2);
    if(s.tick===1700)this.nativeSound(5002,2);
    if (s.tick === QUARTER_TICK) {if(s.calendarDay%3===0)this.settleQuarter();else this.updateTenantEvaluations();}
    if (s.tick === 2000) this.closeBusinesses(false);
    if (s.tick === 2200) this.closeBusinesses(true);
    if([0,1600].includes(s.tick))for(const room of s.rooms)if(['office','condo'].includes(room.key)&&!room.constructionRemaining){const before=room.tenantState;room.tenantState=tenantRoomClock(room,s.tick,this.calendar.weekend);if(before!==room.tenantState||room.key==='office'&&s.tick===0)markInteriorDirty(room);}
    if(s.tick===0)for(const room of s.rooms)if(HOTELS.has(room.key)&&!room.constructionRemaining){const before=room.hotelState;room.hotelState=hotelRoomClock(room,s.tick);if(before!==room.hotelState)markInteriorDirty(room);}
    //480AE/4829F's explicit ancillary cases; default types remain untouched.
    if([0,1600].includes(s.tick))for(const room of s.rooms)if([13,31,32,33,36,37,38,39,40].includes(CATALOG[room.key].id)){
      if(room.nativeConstructionParts)for(const part of room.nativeConstructionParts){if(part.completed)markInteriorDirty(room,part.floor);}
      else if(!room.constructionRemaining)for(let level=0;level<room.height;level++)markInteriorDirty(room,room.floor-level);
    }
    if (s.tick === 0) {
      this.refreshParking(); //300BB rebuilds selectable metadata indices, preserving cached topology and usedquota LONGs.
      for (const r of s.rooms) if(!COMMERCIAL_TYPES.has(r.key))r.visitors = 0;
      for(const r of s.rooms) if(r.key==='metro')r.metroTrain=false;
      s.rain=s.calendarDay%8===4 && s.star<5; // 0x63CD
      s.commercialSpecialDay=s.rain; // Native rainy-day patron bucket persists until dawn.
      resetMedicalRegistryDay(s);resetMedicalDemand(s);
      resetCathedralDay(s,{cancelTrip:a=>{s.people=s.people.filter(p=>p.id!==a.trip);for(const sh of s.shafts)for(const c of sh.cars)c.people=c.people.filter(id=>id!==a.trip);}});
      collectRecycling(s,this.recyclingHooks());
    }
    if(s.tick===240) {this.prepareShows();this.openBusinesses(false);startScheduledEvent(s,this.data,n=>this.randomInt(n),this.eventHooks());}
    s.tickContinuation='calendar-tail';
    if(s.dialogs.length>dialogCount)return;
    this.continueTick();
  }
  continueTick() {
    const s=this.state;
    while(s.tickContinuation&&!s.dialogs.length){
      const stage=s.tickContinuation;
      if(stage==='calendar-tail') {
        s.tickContinuation='construction';
    if(s.tick===1000) this.startShows('cinema',0);
    if(s.tick===1200){this.startShows('partyhall',1);for(const r of s.rooms)if(r.movie)projectShow(r);}
    if(s.tick===1200)closeCathedralWorship(s);
    if(s.tick===1400)this.startShows('cinema',1);
    if(s.tick===1500)this.finishShows('cinema',0);
    if(s.tick===1600){this.finishShows('partyhall');s.rain=false;this.updateGarbage(0);this.openBusinesses(true);this.evaluateHotels();for(const room of s.rooms)if(HOTELS.has(room.key)&&!room.constructionRemaining){const before=room.hotelState;room.hotelState=hotelRoomClock(room,s.tick);if(before!==room.hotelState)markInteriorDirty(room);}}
    if(s.tick===1600)expireVIPReservation(s); // 0x48FC3.
    if(s.tick===1900) this.finishShows('cinema');
    metroTrainTick(s,max=>this.randomInt(max),{sound:id=>this.nativeSound(id,1)});
    if(s.tick===32)finishRecyclingCollection(s);
    const garbageTick={1800:1,2000:2,2200:3,2400:4,2566:5}[s.tick];
    if(garbageTick!==undefined) this.updateGarbage(garbageTick);
      } else if(stage==='construction') {
        s.tickContinuation='rating';this.updateConstruction();
      } else if(stage==='rating') {
        //FDCA runs promotion after construction, before emergency/cohorts.
        s.tickContinuation='emergency';this.checkRating();
      } else if(stage==='emergency') {
        s.tickContinuation='people';stepEmergency(s,this.data,this.eventHooks());
      } else if(stage==='people') {
        if(s.peopleTickResume===undefined)this.nativeVisualHook?.('before-actors'); //FD4B:FDE8.
        if(!emergencyActive(s))this.updatePeople(0.5);
        if(!s.dialogs.length)s.tickContinuation='actors';
      } else if(stage==='actors') {
        if(!emergencyActive(s))updateActors(this);
        if(!s.dialogs.length){this.nativeVisualHook?.('after-actors');s.tickContinuation='elevators';} //FD4B:FE05.
      } else if(stage==='elevators') {
        this.updateElevators(0.5);
        if(!s.dialogs.length){this.nativeFrameCompleteHook?.();s.tickContinuation='rooms';}
      } else if(stage==='rooms') {
        delete s.tickContinuation;
        // Legacy final stage: native FD4B ends after the actor/car chain.
        // There is no generic room occupancy or satisfaction update.
      }
    }
  }
  advance(ticks) { this.step(Math.round(ticks)); }
  save() { return JSON.stringify(this.state); }
  load(text) {
    const s = JSON.parse(text);
    if (!s || ![1, 2].includes(s.version) || !Number.isFinite(s.cash) || !Number.isInteger(s.day) || s.day < 1 || !Number.isFinite(s.minute) || s.minute < 0 || s.minute >= 1440 || !Number.isInteger(s.nextId) || ![1, 2, 3, 4, 5, 6].includes(s.star) || typeof s.name !== 'string' || s.name.length > 80 || !s.floors || Array.isArray(s.floors)) throw new Error('This is not a supported SimTower JS save.');
    for (const key of ['rooms', 'shafts', 'links', 'people', 'ledger', 'notices', 'history']) if (!Array.isArray(s[key]) || s[key].length > (key==='people'?100000:10000)) throw new Error('Invalid save data.');
    for (const [f, bounds] of Object.entries(s.floors)) if (!Number.isInteger(Number(f)) || +f < BASEMENT_LIMIT || +f > 103 || !Number.isInteger(bounds.x) || !Number.isInteger(bounds.width) || bounds.x < 0 || bounds.width < 1 || bounds.x + bounds.width > SITE_CELLS) throw new Error('Invalid floor data.');
    for (const r of [...s.rooms, ...s.shafts, ...s.links]) if (!CATALOG[r.key] || !Number.isInteger(r.id) || !Number.isInteger(r.x) || !Number.isInteger(r.width) || r.width < 1 || r.x < 0 || r.x + r.width > SITE_CELLS) throw new Error('Invalid facility data.');
    migrateNativeTransportSlots(s);
    s.nativeShaftSlotTypes=loadedNativeShaftSlotTypes(s);
    for (const r of s.rooms) if (!s.floors[r.floor] || !Number.isFinite(r.satisfaction) || !Number.isFinite(r.built) || ![0, 1, 2, 3].includes(r.price)) throw new Error('Invalid room data.');
    for(const room of s.rooms)if(['office','condo'].includes(room.key))validateTenantRoomState(room);
    for (const sh of s.shafts) if (!Array.isArray(sh.stops) || !Array.isArray(sh.cars) || sh.cars.length > 8 || !Number.isInteger(sh.low) || !Number.isInteger(sh.high) || sh.low > sh.high || !sh.stops.every(f => Number.isInteger(f) && f >= sh.low && f <= sh.high && s.floors[f]) || !sh.cars.every(c => Number.isFinite(c.floor) && Number.isFinite(c.target) && Number.isFinite(c.doors) && Array.isArray(c.people))) throw new Error('Invalid elevator data.');
    for (const p of s.people) if (!Array.isArray(p.path) || !Number.isFinite(p.x) || !Number.isFinite(p.floor) || !Number.isFinite(p.wait) || !['walk', 'queue', 'car', 'retry','link'].includes(p.stage) || ['retryTick','queueTick','linkTick'].some(k=>p[k]!==undefined&&(!Number.isInteger(p[k])||p[k]<0||p[k]>=CLOCK_PERIOD))) throw new Error('Invalid passenger data.');
    if (![s.seed, s.income, s.expenses].every(Number.isFinite)) throw new Error('Invalid simulation data.');
    // Legacy ground ramp records were invented by the browser prototype.
    const groundRamps=new Set(s.rooms.filter(r=>r.key==='ramp'&&r.floor>=0).map(r=>r.id));s.rooms=s.rooms.filter(r=>!groundRamps.has(r.id));if(Array.isArray(s.construction))s.construction=s.construction.filter(id=>!groundRamps.has(id));
    // The initial prototype incorrectly mapped ramps to a 12-cell fire strip.
    // Correct the footprint in saves made before the original ramp was mapped.
    for (const r of s.rooms) if (r.key === 'ramp' && r.width === 12) r.width = 16;
    if (s.version === 1) {
      //Version1 has logical footprints/minute age, not native record caches.
      //Discard later-layout fields before rebuilding the legacy geometry.
      delete s.nativeConstructionRing;delete s.nativeActorPool;
      for(const room of s.rooms){delete room.nativeConstructionParts;delete room.nativeActorBlocks;delete room.nativeInteriors;}
      s.tick = Math.floor(tickAtMinute(s.minute)); s.calendarDay = (s.day - 1) % DAY_COUNTER_PERIOD;
      s.elapsedTicks = 0; s.construction = [];
      for (const r of s.rooms) {
        r.height = 1; // Keep old occupied footprints intact until rebuilt.
        r.constructionRemaining = (s.day - 1) * 1440 + s.minute - r.built < 120 ? 12 : 0;
        r.visitors = 0;
        if (r.constructionRemaining) { if (s.construction.length === 10) { const old = s.rooms.find(r => r.id === s.construction.shift()); old.constructionRemaining = 0; } s.construction.push(r.id); }
      }
      s.version = 2;
      s.minute = clockTime(s.tick).minuteOfDay; s.day = s.calendarDay + 1;
    }
    if (!Number.isInteger(s.tick) || s.tick < 0 || s.tick >= CLOCK_PERIOD || !Number.isInteger(s.calendarDay) || s.calendarDay < 0 || s.calendarDay >= DAY_COUNTER_PERIOD || !Number.isInteger(s.elapsedTicks) || s.elapsedTicks < 0 || !Array.isArray(s.construction) || s.construction.length > 10 || new Set(s.construction).size !== s.construction.length || s.construction.some(id => !s.rooms.some(r => r.id === id && r.constructionRemaining > 0)) || s.rooms.some(r => !Number.isInteger(r.height) || r.height < 1 || r.height > facilityHeight(r.key) || !Number.isInteger(r.constructionRemaining) || r.constructionRemaining < 0 || r.constructionRemaining > 12 || (r.constructionRemaining > 0 && !s.construction.includes(r.id)) || !Number.isFinite(r.visitors) || r.visitors < 0)) throw new Error('Invalid native simulation data.');
    s.rain??=false;s.garbage??={stage:0,working:false};s.nativeFlags??={treasure:false,vipPassed:false,medicalReady:false};s.dialogs??=[];s.trackedPeople??=[];s.quarterBalance??=s.cash;
    s.accounts??=quarterAccounts(s.quarterBalance);
    s.audioEvents??=[];s.santa??=null;
    for(const sound of s.audioEvents)validateSoundRequest(sound);
    s.actors??=[];s.nextActorSlot??=0;s.vip??=null;s.nextQueueOrder??=0;
    if(!Array.isArray(s.actors)||s.actors.length>100000||!Number.isInteger(s.nextActorSlot)||s.nextActorSlot<0||s.actors.some(a=>!Number.isInteger(a.id)||!Number.isInteger(a.slot)||a.slot<0||!s.rooms.some(r=>r.id===a.room&&PERSISTENT_TYPES.has(r.key))||!Number.isInteger(a.resident)||a.resident<0||!Number.isInteger(a.index)||!Number.isInteger(a.state)||![0,1,2,3,4,5,16,32,33,34,35,37,38,39,64,65,66,69,96,97,98,99].includes(a.state)||!Number.isInteger(a.floor)||!Number.isInteger(a.appearance)||a.appearance<0||a.appearance>4||!Number.isFinite(a.delay)||a.delay<0||!Number.isInteger(a.trips)||a.trips<0||a.parking!==null&&!s.rooms.some(r=>r.key==='parking'&&r.id===a.parking)||a.nativeParkingBorrow!==undefined&&typeof a.nativeParkingBorrow!=='boolean'||a.parkingFloor!==undefined&&(!Number.isInteger(a.parkingFloor)||a.parkingFloor>0||a.parkingFloor< -63)||a.trip!==null&&!s.people.some(p=>p.id===a.trip&&p.actor===a.id)||a.name!==undefined&&(typeof a.name!=='string'||a.name.length>15))||new Set(s.actors.map(a=>a.id)).size!==s.actors.length||new Set(s.actors.map(a=>a.slot)).size!==s.actors.length||s.vip&&(!s.actors.some(a=>a.id===s.vip.actor&&a.room===s.vip.room)||!Number.isInteger(s.vip.day)||typeof s.vip.arrived!=='boolean'))throw new Error('Invalid persistent person data.');
    if(s.actors.some(a=>a.job!==undefined&&a.job!==null&&!s.rooms.some(r=>r.id===a.job)||a.visitTick!==undefined&&(!Number.isInteger(a.visitTick)||a.visitTick<0||a.visitTick>=CLOCK_PERIOD)))throw new Error('Invalid person service data.');
    if(!Array.isArray(s.audioEvents)||s.audioEvents.length>32||s.audioEvents.some(e=>!Number.isInteger(e.id)||![0,1,2].includes(e.category))||s.santa&&(!Number.isFinite(s.santa.x)||!Number.isFinite(s.santa.y)))throw new Error('Invalid effect data.');
    if(!Array.isArray(s.accounts.income)||s.accounts.income.length!==11||!Array.isArray(s.accounts.maintenance)||s.accounts.maintenance.length!==11||![...s.accounts.income,...s.accounts.maintenance,s.accounts.other,s.accounts.construction,s.accounts.previousBalance].every(Number.isFinite))throw new Error('Invalid finance data.');
    for(const r of s.rooms){r.tenure??=0;r.trips??=Array.from({length:['office','condo',...HOTELS].includes(r.key)?CATALOG[r.key].capacity:0},()=>({delay:0,trips:0}));if(r.key==='cinema'){r.movie??={index:0,days:0,attendance:0,active:false,receipts:0};r.movie.halfVisitors??=[0,0];}if(['cinema','partyhall'].includes(r.key))r.dailyPopulation??=r.movie?.attendance || (r.occupied?CATALOG[r.key].capacity:0);}
    for(const sh of s.shafts){sh.programs??=newElevatorPrograms();sh.visible??=true;for(const c of sh.cars)c.parkingFloor??=sh.low;initializeDispatch(sh);}
    for(const p of s.people){p.tripDelay??=0;p.resident??=-1;}
    if(!Array.isArray(s.dialogs)||s.dialogs.length>100||!Array.isArray(s.trackedPeople)||s.trackedPeople.length>512||s.rooms.some(r=>!Number.isInteger(r.tenure)||r.tenure<0||r.tenure>120||!Array.isArray(r.trips)||r.trips.length>6||r.trips.some(p=>!Number.isFinite(p.delay)||p.delay<0||!Number.isInteger(p.trips)||p.trips<0))||s.shafts.some(sh=>!Array.isArray(sh.programs)||sh.programs.length!==2||sh.programs.some(day=>!Array.isArray(day)||day.length!==7||day.some(p=>!Number.isInteger(p.response)||p.response<1||p.response>100||!Number.isInteger(p.wait)||p.wait<0||p.wait>3)))) throw new Error('Invalid original-system data.');
    const messages=new Set([1004,3000,3001,3002,3003,3010,3011,3012,3013,3014,3020,3021,3022,3023,3024,3030,3031,3032,3033,3034,3040]);
    if(s.dialogs.some(d=>!messages.has(d.id)||!Number.isFinite(d.value)) || typeof s.rain!=='boolean' || !Number.isInteger(s.seed) || s.seed<0 || s.seed>0xffffffff || !Number.isInteger(s.garbage.stage) || s.garbage.stage<0 || s.garbage.stage>6 || typeof s.garbage.working!=='boolean' || ['treasure','vipPassed','medicalReady'].some(k=>typeof s.nativeFlags[k]!=='boolean') || s.shafts.some(sh=>typeof sh.visible!=='boolean'||sh.cars.some(c=>!Number.isInteger(c.parkingFloor)||c.parkingFloor<sh.low||c.parkingFloor>sh.high)||sh.programs.flat().some(p=>![0,1,2].includes(p.departure))) || s.rooms.some(r=>r.name!==undefined&&(typeof r.name!=='string'||r.name.length>15)||r.movie&&(!Number.isInteger(r.movie.index)||r.movie.index<0||r.movie.index>13||!Number.isInteger(r.movie.days)||r.movie.days<0||r.movie.days>127||!Number.isInteger(r.movie.attendance)||r.movie.attendance<0||r.movie.attendance>120||typeof r.movie.active!=='boolean'||!Number.isFinite(r.movie.receipts)||!Array.isArray(r.movie.halfVisitors)||r.movie.halfVisitors.length!==2||r.movie.halfVisitors.some(n=>!Number.isInteger(n)||n<0)))) throw new Error('Invalid native behavior data.');
    if(!Number.isSafeInteger(s.nextQueueOrder)||s.nextQueueOrder<0||s.shafts.some(sh=>!sh.calls||Array.isArray(sh.calls)||typeof sh.calls!=='object'||Object.entries(sh.calls).some(([key,id])=>!/^[-]?\d+:[01]$/.test(key)||Number(key.split(':')[0])<sh.low||Number(key.split(':')[0])>sh.high||!sh.cars.some(c=>c.id===id))||sh.cars.some(c=>![0,1].includes(c.direction)||![0,1,2].includes(c.expressMode)||typeof c.visitArmed!=='boolean'||!Number.isInteger(c.visitTick)||c.visitTick<0||c.visitTick>=CLOCK_PERIOD||!Number.isInteger(c.turnFloor)||c.turnFloor<sh.low||c.turnFloor>sh.high||!Number.isInteger(c.departureFloor)||c.departureFloor<sh.low||c.departureFloor>sh.high||!Number.isInteger(c.motionCooldown)||c.motionCooldown<0||c.motionCooldown>5))||s.people.some(p=>p.queueOrder!==undefined&&(!Number.isSafeInteger(p.queueOrder)||p.queueOrder<0)))throw new Error('Invalid elevator dispatch data.');
    for(const r of s.rooms)if(r.key==='condo') {
      r.salePrice??=r.sold?rentAmount(this.data,9,r.price):0;
      if(!Number.isFinite(r.salePrice)||r.salePrice<0)throw new Error('Invalid condominium sale data.');
    }
    for(const r of s.rooms)if(['office','condo','shop'].includes(r.key)) {
      r.accepting??=true;
      if(typeof r.accepting!=='boolean')throw new Error('Invalid tenancy acceptance data.');
    }
    for(const actor of s.actors){if(actor.parking!==null){const space=s.rooms.find(room=>room.id===actor.parking);actor.parkingFloor??=space.floor;}Object.assign(actor,normalizeActorHistory(actor));validateActorHistory(actor);if(actor.missingVenue!==undefined&&typeof actor.missingVenue!=='boolean'||actor.admissionTick!==undefined&&(!Number.isInteger(actor.admissionTick)||actor.admissionTick<0||actor.admissionTick>=CLOCK_PERIOD))throw new Error('Invalid admission state.');}
    for(const room of s.rooms)if(room.key==='recycling'){initializeRecyclingRoom(room);validateRecyclingRoom(room);}
    for(const actor of s.actors)if(s.rooms.find(r=>r.id===actor.room)?.key==='metro'&&actor.resident>=METRO_ACTORS)throw new Error('Invalid metro actor identity.');
    for(const room of s.rooms)if(SHOW_TYPES.has(room.key)){room.show??=newShowState();validateShowState(room);}
    for(const actor of s.actors){const room=s.rooms.find(r=>r.id===actor.room);if(SHOW_TYPES.has(room?.key)){validateShowActor(actor);if(actor.resident>=showActorCount(room.key))throw new Error('Invalid show actor identity.');}}
    initializeProgression(s);
    s.lobbyHeight??=lobbyHeight(s);
    const migratingActorPool=!s.nativeActorPool;
    if(migratingActorPool){s.nativeActorPool=newActorPool();for(const room of [...s.rooms].sort((a,b)=>a.id-b.id)){const allocation=reserveRoomActorBlocks(s.nativeActorPool,room);s.nativeActorPool=allocation.pool;room.nativeActorBlocks=allocation.blocks;if(!room.constructionRemaining){const completion=completeRoomActorBlocks(s.nativeActorPool,room.nativeActorBlocks);s.nativeActorPool=completion.pool;room.nativeActorBlocks=completion.blocks;}}}
    if(!s.nativeConstructionRing){s.nativeFacilityStyles??=inferFacilityStyleCounters(s.rooms);s.nativePopulation??=inferPopulationCounters(s.rooms);const migration=new Tower(this.data);migration.state=s;migration.registerTenantSlots();initializeConstructionRing(s,(entry,part)=>migration.completeConstructionPart(entry,part));}
    validateConstructionRing(s);validateActorPoolRooms(s.nativeActorPool,s.rooms);
    for(const actor of s.actors){const room=s.rooms.find(r=>r.id===actor.room),slot=nativeActorSlotForResident(room,actor.resident);if(slot<0||!migratingActorPool&&actor.slot!==slot)throw new Error('Invalid native actor cohort slot.');actor.slot=slot;}
    for(const room of s.rooms.filter(room=>room.key==='parking')) {
      if(room.parkingActorSlot===undefined&&room.parkingActor!==undefined)room.parkingActorSlot=s.actors.find(actor=>actor.id===room.parkingActor)?.slot;
      if(room.parkingActorSlot!==undefined&&(!Number.isInteger(room.parkingActorSlot)||room.parkingActorSlot<0||room.parkingActorSlot>=s.nativeActorPool.capacity))throw new Error('Invalid native parking actor pointer.');
    }
    if(new Set(s.actors.map(actor=>actor.slot)).size!==s.actors.length || new Set(s.actors.map(actor=>`${actor.room}:${actor.resident}`)).size!==s.actors.length)throw new Error('Duplicate native actor identity.');
    const slotPlan=tenantSlotAllocation(s);for(const patch of slotPlan.rooms){const room=s.rooms.find(r=>r.id===patch.roomId);room.nativeTenantIndex=patch.nativeTenantIndex;room.nativeTenantSlots=patch.nativeTenantSlots;}for(const patch of slotPlan.floors)s.floors[patch.floor].nativeTenantIndex=patch.nativeTenantIndex;
    if(![1,2,3].includes(s.lobbyHeight))throw new Error('Invalid lobby height.');
    s.commercialSpecialDay??=false;
    if(typeof s.commercialSpecialDay!=='boolean')throw new Error('Invalid commercial day data.');
    for(const r of s.rooms) {
      if(COMMERCIAL_TYPES.has(r.key)){r.commercial??=newCommercialState(r.key,s.tick);validateCommercialState(r.commercial);}
      if(HOTELS.has(r.key)){validateHotelState(r);if(r.housekeepingOverlay!==undefined&&typeof r.housekeepingOverlay!=='boolean')throw new Error('Invalid housekeeping room state.');}
    }
    for(const actor of s.actors)validateCommercialActor(actor);
    initializeCommercialRegistry(s);validateCommercialRegistry(s);
    s.nativeFacilityStyles??=inferFacilityStyleCounters(s.rooms);validateFacilityStyleCounters(s.nativeFacilityStyles);
    const parkingPlan=parkingCatalogPlan(s,parkingReachable);
    if(s.nativeParkingAvailable!==undefined&&(!Array.isArray(s.nativeParkingAvailable)||JSON.stringify(s.nativeParkingAvailable)!==JSON.stringify(parkingPlan.available)))throw new Error('Invalid native parking index list.');
    for(const patch of parkingPlan.rooms)Object.assign(s.rooms.find(room=>room.id===patch.roomId),{nativeParkingSlot:patch.nativeParkingSlot,parkingAccessible:patch.parkingAccessible,nativeParkingFrame:patch.nativeParkingFrame});
    s.nativeParkingAvailable=parkingPlan.available;s.nativeParkingQuotas??=inferParkingQuotas(s,parkingPlan.available.length);validateParkingQuotas(s.nativeParkingQuotas);
    if(JSON.stringify(recomputeParkingQuotas(s.nativeParkingQuotas,parkingPlan.available.length).limits)!==JSON.stringify(s.nativeParkingQuotas.limits)&&!s.nativeParkingQuotas.limits.every(limit=>limit===0))throw new Error('Invalid native parking category limits.'); //17FE0→2FF10 clears limits until the next native rebuild.
    s.nativePopulation??=inferPopulationCounters(s.rooms);validatePopulationCounters(s.nativePopulation);
    initializeEvents(s);validateEvents(s);validateCathedral(s);validateVIPContinuation(s);
    if(s.facilityContinuation!==undefined&&(!s.vipContinuation||s.vipContinuation.action!=='clear'||!['damage','remove'].includes(s.facilityContinuation.kind)||!s.rooms.some(r=>r.id===s.facilityContinuation.room)||!Number.isInteger(s.facilityContinuation.nextActor)||s.facilityContinuation.nextActor<1||s.facilityContinuation.nextActor>s.actors.filter(a=>a.room===s.facilityContinuation.room).length||s.facilityContinuation.kind==='damage'&&(!Number.isInteger(s.facilityContinuation.floor)||!Number.isInteger(s.facilityContinuation.x)||!s.rooms.some(r=>r.id===s.facilityContinuation.room&&s.facilityContinuation.floor<=r.floor&&s.facilityContinuation.floor>r.floor-(r.height||1)&&s.facilityContinuation.x>=r.x&&s.facilityContinuation.x<r.x+r.width))))throw new Error('Invalid facility continuation.');
    if(s.vipActorContinuation!==undefined&&(!s.vipContinuation||!['arrival','reserve','release','failed-arrival'].includes(s.vipActorContinuation.action)||!s.actors.some(a=>a.id===s.vipActorContinuation.actor&&s.rooms.some(r=>r.id===a.room&&HOTELS.has(r.key)))))throw new Error('Invalid VIP actor continuation.');
    for(const [key,limit] of [['actorCohortResume',s.actors.length],['peopleTickResume',s.people.length]])if(s[key]!==undefined&&(!Number.isInteger(s[key])||s[key]<0||s[key]>limit||!s.dialogs.length))throw new Error('Invalid native cohort continuation.');
    if(s.elevatorTickResume!==undefined&&(!s.dialogs.length||!s.shafts.some(sh=>sh.id===s.elevatorTickResume.shaft&&sh.cars.some(car=>car.id===s.elevatorTickResume.car))))throw new Error('Invalid native elevator continuation.');
    if(s.tickContinuation!==undefined&&(!['calendar-tail','construction','rating','emergency','people','actors','elevators','rooms'].includes(s.tickContinuation)||!s.dialogs.length))throw new Error('Invalid native tick continuation.');
    initializeMedicalRegistry(s);validateMedicalRegistry(s);
    s.cathedralCeremony??=false;s.cathedralCeremonyStep??=0;s.rubble??=[];
    if(!Array.isArray(s.rubble)||s.rubble.length>10000||s.rubble.some(r=>!s.floors[r.floor]||!Number.isInteger(r.x)||r.x<0||!Number.isInteger(r.width)||r.width<1||r.x+r.width>SITE_CELLS))throw new Error('Invalid rubble data.');
    s.crane??=cranePlacement(s.floors);
    if(s.crane&&(!Number.isInteger(s.crane.floor)||!s.floors[s.crane.floor]||!Number.isInteger(s.crane.x)||s.crane.x<0||s.crane.x>=SITE_CELLS))throw new Error('Invalid crane data.');
    if(['securityBuilt','suitesBuilt','progressionWarned'].some(k=>typeof s.nativeFlags[k]!=='boolean'))throw new Error('Invalid progression data.');
    validateNativeInteriors(s);validateAffordabilityContinuation(s);
    this.state = s;
  }
}

export function demoTower(data) {
  const tower = new Tower(data, { sandbox: true });
  tower.state.name = 'The Metropolitan';
  tower.build('lobby', 0, 44, 139);
  for (let f = 1; f <= 12; f++) tower.build('floor', f, 44, f > 9 ? 119 : 139);
  for (let f = -1; f >= -2; f--) tower.build('floor', f, 44, 139);
  tower.build('elevator', -2, 88, 88, 12);
  tower.build('elevator', -2, 104, 104, 12);
  tower.build('service', 0, 116, 116, 12);
  for (let f = 1; f <= 12; f++) {
    const key = f <= 2 ? 'shop' : f <= 5 ? 'office' : f <= 8 ? 'condo' : 'twin';
    for (let x = 44; x + CATALOG[key].width <= 88; x += CATALOG[key].width) tower.build(key, f, x);
    for (let x = 98; x + CATALOG[key].width <= 116; x += CATALOG[key].width) tower.build(key, f, x);
    if (f <= 9) tower.build(f === 3 ? 'security' : f === 8 ? 'housekeeping' : f <= 2 ? 'fastfood' : 'office', f, 120);
  }
  // Native ramp begins in B1, connecting to the ground lobby above.
  for (let f = -1; f >= -2; f--) {
    tower.build('ramp', f, 124);
    for (let x = 44; x < 84; x += 4) tower.build('parking', f, x);
  }
  tower.setClock(540);
  while(tower.state.construction.length)tower.finishConstruction();
  for (const room of tower.state.rooms) { room.built = 0; room.constructionRemaining = 0; room.occupied = true; room.sold = true;if(room.key==='condo')room.salePrice=rentAmount(data,9,room.price); }
  tower.state.construction = [];
  tower.state.nativePopulation=inferPopulationCounters(tower.state.rooms);
  tower.state.cash = 2847500; tower.state.star = 3; tower.state.ledger = []; tower.state.income = 0; tower.state.expenses = 0; tower.state.notices = [];tower.state.dialogs=[];
  tower.notice('Welcome to The Metropolitan. This demo runs in sandbox mode.');
  tower.advance(25);
  return tower;
}
