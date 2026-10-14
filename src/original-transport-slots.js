//39904 scans shaft pool0..23;39D6C scans shared stairs/escalators0..63.
// Deletion clears the active byte, so the next construction reuses the
// lowest inactive index. Stable slots determine strict candidate tie order
// and the original descending shaft-mask bit (80000000h >> slot).
export const NATIVE_SHAFT_SLOTS=24,NATIVE_LINK_SLOTS=64,NATIVE_CAR_SLOTS=8;
export function nativeTransportSlotAssignments(items,limit,field='nativeTransportSlot') {
  if(!Array.isArray(items)||items.length>limit)throw new Error('Invalid native transportation pool.');
  const used=new Set();
  for(const item of items)if(item[field]!==undefined) {
    const slot=item[field];
    if(!Number.isInteger(slot)||slot<0||slot>=limit||used.has(slot))throw new Error('Invalid native transportation slot.');
    used.add(slot);
  }
  return items.map(item=>{
    let slot=item[field];
    if(slot===undefined){slot=0;while(used.has(slot))slot++;used.add(slot);}
    return slot;
  });
}
export function firstFreeNativeTransportSlot(items,limit) {
  const used=new Set(nativeTransportSlotAssignments(items,limit));
  for(let slot=0;slot<limit;slot++)if(!used.has(slot))return slot;
  return -1;
}
export function migrateNativeTransportSlots(state) {
  // Validate both pools before assigning any properties. Older browser
  // saves have no slots: preserve their active array ordering, reserving
  // explicit slots first when migrating a partially upgraded save.
  const shafts=nativeTransportSlotAssignments(state.shafts,NATIVE_SHAFT_SLOTS),links=nativeTransportSlotAssignments(state.links,NATIVE_LINK_SLOTS),cars=state.shafts.map(shaft=>nativeCarSlotAssignments(shaft.cars??[]));
  state.shafts.forEach((shaft,index)=>{shaft.nativeTransportSlot=shafts[index];(shaft.cars??[]).forEach((car,i)=>car.nativeCarSlot=cars[index][i]);});
  state.links.forEach((link,index)=>link.nativeTransportSlot=links[index]);
  return state;
}

//399A59 scans active byte2999 for physical car slots0..7. All dispatch
// and draw/boarding loops likewise scan eight slots rather than dense IDs.
export const nativeCarSlotAssignments=cars=>nativeTransportSlotAssignments(cars,NATIVE_CAR_SLOTS,'nativeCarSlot');
export function firstFreeNativeCarSlot(cars) {
  const used=new Set(nativeCarSlotAssignments(cars));for(let slot=0;slot<NATIVE_CAR_SLOTS;slot++)if(!used.has(slot))return slot;return -1;
}
export function nativeCarOrder(shaft) {
  const slots=nativeCarSlotAssignments(shaft.cars);return shaft.cars.map((car,index)=>({car,slot:slots[index]})).sort((a,b)=>a.slot-b.slot).map(item=>item.car);
}
export function nativeCarColumns(shaft) {
  //1355D /13DFE scan physicalslots but increment displaycolumn only
  //for activecars. Deleting a car closes its visual column without
  //changing the surviving dispatch slots or construction reuse order.
  return nativeCarOrder(shaft);
}

export function nativeShaftOrder(state) {
  const slots=nativeTransportSlotAssignments(state.shafts,NATIVE_SHAFT_SLOTS);return state.shafts.map((shaft,index)=>({shaft,slot:slots[index]})).sort((a,b)=>a.slot-b.slot).map(item=>item.shaft);
}
