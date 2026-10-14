//1A448 initializes independent WORD style counters; demolition never rewinds.
export const NATIVE_FACILITY_STYLE_COUNTS={single:2,twin:4,suite:2,office:6,condo:3,restaurant:5,shop:11,fastfood:5};
export function facilityStyleStage(key){return ['restaurant','shop','fastfood'].includes(key)?'completion':'placement';}
export function newFacilityStyleCounters(){return Object.fromEntries(Object.keys(NATIVE_FACILITY_STYLE_COUNTS).map(key=>[key,0]));}
export function inferFacilityStyleCounters(rooms) {
  const counters=newFacilityStyleCounters();
  // Legacy JSON lacks demolition history. Continue after the latest surviving
  // style rather than pretending its current live count is the native counter.
  for(const room of [...rooms].sort((a,b)=>a.id-b.id))if(room.key in counters&&(facilityStyleStage(room.key)!=='completion'||!room.constructionRemaining))counters[room.key]=((room.variant||0)+1)%NATIVE_FACILITY_STYLE_COUNTS[room.key];
  return counters;
}
export function takeFacilityStyle(counters,key,stage) {
  if(!(key in NATIVE_FACILITY_STYLE_COUNTS)||facilityStyleStage(key)!==stage)return {counters,variant:0};
  const variant=counters[key],count=NATIVE_FACILITY_STYLE_COUNTS[key];
  return {counters:{...counters,[key]:(variant+1)%count},variant};
}
export function validateFacilityStyleCounters(counters) {
  if(!counters||Array.isArray(counters)||typeof counters!=='object'||Object.entries(NATIVE_FACILITY_STYLE_COUNTS).some(([key,count])=>!Number.isInteger(counters[key])||counters[key]<0||counters[key]>=count))throw new Error('Invalid original facility style counters.');
  return true;
}
