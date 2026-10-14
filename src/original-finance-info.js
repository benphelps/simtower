import { calendar } from './original-clock.js';
import { CATALOG,HOTELS } from './catalog.js';

// 0xD55E / 0xD5F8: native COUNT window row orders. Composite floor
// types 19,30,34,35 share their parent business category.
export const FINANCE_INCOME_TYPES=[7,3,4,5,10,12,6,29,18,9];
export const FINANCE_MAINTENANCE_TYPES=[24,1,42,43,27,44,20,31,15,14];
export function financeIncomeCategory(type) {
  const canonical={19:18,30:29,34:18,35:18}[type]??type;
  return FINANCE_INCOME_TYPES.indexOf(canonical);
}
export function financeMaintenanceCategory(type) {return FINANCE_MAINTENANCE_TYPES.indexOf(type);}

// The original panel states that monetary figures are multiplied by 100.
// 0xD119 prints the internal integer accounting counters directly; browser
// accounts store display dollars, so scale only monetary fields back down.
export function financeInfo(state,populationByCategory=[],moneyScale=100) {
  const accounts=state.accounts,period=calendar(state.calendarDay);
  const units=value=>Math.trunc(value/moneyScale);
  const income=accounts.income.reduce((n,v)=>n+v,0),maintenance=accounts.maintenance.reduce((n,v)=>n+v,0);
  return {
    fields:{6:units(income),7:units(maintenance),8:period.year,9:period.quarter,10:units(income-maintenance),11:units(accounts.other),12:units(accounts.construction),13:units(accounts.previousBalance),14:units(state.cash)},
    rows:FINANCE_INCOME_TYPES.map((type,index)=>({
      incomeType:type,maintenanceType:FINANCE_MAINTENANCE_TYPES[index],
      population:populationByCategory[index]??0,
      income:units(accounts.income[index]),maintenance:units(accounts.maintenance[index]),
    })),
  };
}

//D497's population registers include accepted leases/day allowances, not
// just actors physically in a facility. Composite floor records count once.
export function financePopulationRows(state) {
  if(state.nativePopulation?.categories)return [...state.nativePopulation.categories];
  const rows=Array(10).fill(0);
  for(const room of state.rooms) {
    if(room.constructionRemaining>0)continue;
    const category=financeIncomeCategory(CATALOG[room.key]?.id);if(category<0)continue;
    let count=0;
    if(['fastfood','restaurant','shop'].includes(room.key))count=room.commercial?.population??0;
    else if(['cinema','partyhall'].includes(room.key))count=room.dailyPopulation??0;
    else if(room.occupied)count=room.key==='office'?6:room.key==='condo'?3:HOTELS.has(room.key)?room.key==='single'?1:2:0;
    rows[category]+=count;
  }
  return rows;
}
//D119 /3727F expose exact text anchors for canvas or positioned DOM.
export function financeTextRuns(template,info) {
  const result=[];
  for(const [control,value] of Object.entries(info.fields)) {
    const id=+control,[left,top,right]=template.hotspots[id],offset=id===8||id===9?60:id>=10?64:0;
    result.push({control:id,text:String(value),x:right+offset,y:top+(id===8||id===9?2:1),align:'right',baseline:'top',font:id<8?14:12});
  }
  for(let index=0;index<10;index++)for(const [control,key] of [[3,'population'],[4,'income'],[5,'maintenance']]) {
    const [,top,right]=template.hotspots[control];
    result.push({control,row:index,text:String(info.rows[index][key]),x:right-4,y:top+14+index*13,align:'right',baseline:'bottom',font:12});
  }
  return result;
}

// 0x26E31 chooses ordinal suffixes from the original STR713 resource.
export function nativeOrdinal(data,value) {
  const suffix=value>=10&&value<20?13:[10,11,12][value%10-1]??13;
  return `${value}${data.strings[713][suffix]}`;
}
// English branch of 0x263C6. Weekend is a separately colored text run;
// monetary/population displays use %ld, without grouping or added units.
export function nativeInfoBar(data,state,population) {
  const period=calendar(state.calendarDay),text=data.strings[713];
  const prefix=period.weekend?text[9]:nativeOrdinal(data,period.dayOfQuarter)+text[8];
  const suffix=`${text[7]}${period.quarter}${text[3]}${text[7]}${nativeOrdinal(data,period.year)}${text[0]}`;
  return {cash:`${text[14]}${Math.trunc(state.cash)}`,population:String(Math.trunc(population)),
    date:prefix+suffix,dateRuns:period.weekend?[{text:prefix,color:'#b30000'},{text:suffix,color:'#262626'}]:[{text:prefix+suffix,color:'#262626'}],
    rating:state.star===6?{sheet:327,x:42,y:10,width:106,height:22}:Array.from({length:5},(_,i)=>({sheet:i<state.star?322:323,x:43+i*21,y:11,width:21,height:19}))};
}

// 0x2777B creates these floating windows at desktop coordinates. Geometry
// includes the eight-pixel native handle; external border metrics are separate.
export const NATIVE_FLOATING_WINDOWS={
  info:{x:204,y:4,width:431,height:49},map:{x:2,y:4,width:200,height:314},
  tools:{x:134,y:178,width:63,height:100},
};

// 0x26A68/26AF3 errors and demands have priority2; 26C0A construction
// selection has priority1; 26B7E income has priority0. The wall-clock gate
// 26A28 clears after more than300 units of GetTickCount>>4 (about4.8s).
export function nativeInfoMessage(current,data,resource,index,wallTimeMs) {
  const priority=resource===1007?0:resource===1009?1:2;
  if((current?.priority??0)>priority)return current;
  if(index===0)return null;
  return {text:data.strings[resource]?.[index-1]??'',priority,gate:Math.floor(wallTimeMs/16)};
}
export function expireInfoMessage(current,wallTimeMs) {
  return current?.gate&&Math.abs(Math.floor(wallTimeMs/16)-current.gate)>300?null:current;
}
//261D3 paints262×11px at(41,33). Messages use12px Arial, darkgray ink,
// a gray fill and black line underneath. Posting never triggers sound by
// itself:26A68/26AF3/26B7E/26C0A only update text/gate/priority and redraw.
export const NATIVE_INFO_MESSAGE_STYLE={x:41,y:33,width:262,height:11,font:12,color:'#262626',background:'#d9d9d9',bottomLine:'#000000',sound:null};

export function nativeNoticeMessage(current,data,notice,wallTimeMs) {
  if(!notice)return current;
  if(notice.resource)return nativeInfoMessage(current,data,notice.resource,notice.index,wallTimeMs);
  const index=data.strings[1010].indexOf(notice.text);
  return index<0?current:nativeInfoMessage(current,data,1010,index+1,wallTimeMs);
}
export function nativeConstructionErrorIndex(data,text) {
  const clean=value=>String(value).toLowerCase().replace(/[.]/g,'').trim();
  const direct=data.strings[1003].findIndex(value=>value&&clean(value)===clean(text));
  if(direct>=0)return direct+1;
  if(/money/i.test(text))return 7;
  if(/maximum.*(?:height|depth)|height or width/i.test(text))return 5;
  if(/cathedral.*100th/i.test(text))return 16;
  if(/cannot be removed|select a room.*demolish/i.test(text))return 21;
  if(/no more.*(?:facilities|spaces|centers|theaters)/i.test(text))return 30;
  return 3;
}
export function nativeIncomeInfoIndex(type) {
  //26B7E's ten income categories share eightoriginalmessages.
  return {7:1,3:2,4:2,5:2,9:3,6:4,12:5,10:6,18:7,19:7,34:7,35:7,29:8,30:8}[type]??0;
}
