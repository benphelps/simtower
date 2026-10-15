import test from 'node:test';
import assert from 'node:assert/strict';
import { financeInfo,financePopulationRows,financeTextRuns,financeIncomeCategory,financeMaintenanceCategory,FINANCE_INCOME_TYPES,FINANCE_MAINTENANCE_TYPES } from '../src/original-finance-info.js';
import { nativeOrdinal,nativeInfoBar,drawNativeInfoBarText,NATIVE_FLOATING_WINDOWS,nativeInfoMessage,expireInfoMessage,nativeNoticeMessage } from '../src/original-finance-info.js';
import { readFileSync } from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
const dialogs=JSON.parse(readFileSync(new URL('../public/assets/dialogs.json',import.meta.url)));

test('native finance categories include composite cinema/party floors and exclude service populations',()=>{
  assert.deepEqual(FINANCE_INCOME_TYPES,[7,3,4,5,10,12,6,29,18,9]);
  assert.deepEqual(FINANCE_MAINTENANCE_TYPES,[24,1,42,43,27,44,20,31,15,14]);
  assert.equal(financeIncomeCategory(19),8);assert.equal(financeIncomeCategory(30),7);assert.equal(financeIncomeCategory(34),8);assert.equal(financeIncomeCategory(35),8);
  for(const type of [0,1,11,13,14,15,20,24,31,36,42,43])assert.equal(financeIncomeCategory(type),-1);
  assert.equal(financeMaintenanceCategory(43),3);assert.equal(financeMaintenanceCategory(13),-1);
});

test('Info Bar uses native ordinal resource strings, quarter sequence and separate weekend color',()=>{
  assert.equal(nativeOrdinal(data,1),'1st ');assert.equal(nativeOrdinal(data,2),'2nd ');
  assert.equal(nativeOrdinal(data,3),'3rd ');assert.equal(nativeOrdinal(data,11),'11th ');
  assert.equal(nativeOrdinal(data,21),'21st ');
  const first=nativeInfoBar(data,{calendarDay:0,cash:2000000,star:1},1234);
  assert.equal(first.date,'1st WD/1Q/1st Year');assert.equal(first.cash,'$2000000');assert.equal(first.population,'1234');
  const weekend=nativeInfoBar(data,{calendarDay:11,cash:-10000,star:6},15000);
  assert.equal(weekend.date,'WE/4Q/1st Year');assert.equal(weekend.cash,'$-10000');
  assert.deepEqual(weekend.dateRuns,[{text:'WE',color:'#b30000'},{text:'/4Q/1st Year',color:'#262626'}]);
  assert.deepEqual(weekend.rating,{sheet:327,x:42,y:10,width:106,height:22});
  assert.equal(nativeInfoBar(data,{calendarDay:12,cash:0,star:3},0).date,'1st WD/1Q/2nd Year');
});
test('initial native floating windows use recovered desktop positions and client dimensions',()=>{
  assert.deepEqual(NATIVE_FLOATING_WINDOWS.info,{x:204,y:4,width:431,height:49});
  assert.deepEqual(NATIVE_FLOATING_WINDOWS.map,{x:2,y:4,width:200,height:314});
  assert.deepEqual(NATIVE_FLOATING_WINDOWS.tools,{x:134,y:178,width:63,height:100});
});
test('Info Bar paints source baseline positions and retains darkgray negative funds',()=>{
  const draws=[],ctx={clearRect(){},measureText(text){return {width:text.length*7};},fillText(text,x,y){draws.push({text,x,y,font:this.font,align:this.textAlign,baseline:this.textBaseline,color:this.fillStyle});}};
  drawNativeInfoBarText(ctx,nativeInfoBar(data,{calendarDay:11,cash:-10000,star:1},-3));
  assert.deepEqual(draws,[
    {text:'WE',x:159,y:28,font:'14px Arial',align:'left',baseline:'alphabetic',color:'#b30000'},
    {text:'/4Q/1st Year',x:173,y:28,font:'14px Arial',align:'left',baseline:'alphabetic',color:'#262626'},
    {text:'$-10000',x:423,y:26,font:'13px Arial',align:'right',baseline:'alphabetic',color:'#262626'},
    {text:'-3',x:423,y:43,font:'13px Arial',align:'right',baseline:'alphabetic',color:'#262626'},
  ]);
});
test('native Info Bar messages preserve error/demand precedence and expire at wall-clock gate',()=>{
  const selected=nativeInfoMessage(null,data,1009,8,1600);
  assert.equal(selected.text,'Office - $40000');assert.equal(selected.priority,1);
  assert.equal(nativeInfoMessage(selected,data,1007,1,2000),selected);
  const error=nativeInfoMessage(selected,data,1003,7,2000);
  assert.equal(error.text,'Not enough money for construction');assert.equal(error.priority,2);
  assert.equal(nativeInfoMessage(error,data,1009,0,2100),error);
  assert.equal(expireInfoMessage(error,6800),error);
  assert.equal(expireInfoMessage(error,6816),null);
  assert.equal(nativeInfoMessage(error,data,1003,0,2100),null);
  //26A28 treats a zero gate as the no-expiration sentinel.
  const zero=nativeInfoMessage(null,data,1003,7,0);assert.equal(expireInfoMessage(zero,9000),zero);
});
test('finance population rows count leases and day allowances rather than current indoor attendance',()=>{
  const rooms=[{key:'office',occupied:true},{key:'condo',occupied:true},{key:'single',occupied:true},{key:'twin',occupied:true},{key:'suite',occupied:true},
    {key:'shop',commercial:{population:10,inside:2}},{key:'fastfood',commercial:{population:22,inside:1}},
    {key:'restaurant',commercial:{population:35,inside:0}},{key:'cinema',dailyPopulation:120,visitors:3},
    {key:'partyhall',dailyPopulation:50,visitors:0},{key:'security',occupied:true},
    {key:'office',occupied:true,constructionRemaining:5},{key:'single',occupied:false}];
  assert.deepEqual(financePopulationRows({rooms}),[6,1,2,2,10,22,35,50,120,3]);
});
test('finance text anchors use native fonts, headline offsets and bottom-aligned thirteen-pixel rows',()=>{
  const info=financeInfo({calendarDay:0,cash:0,accounts:{income:Array(11).fill(0),maintenance:Array(11).fill(0),other:0,construction:0,previousBalance:0}});
  const runs=financeTextRuns(dialogs[500],info),six=runs.find(r=>r.control===6),eight=runs.find(r=>r.control===8),row=runs.find(r=>r.control===3&&r.row===0);
  assert.equal(six.font,14);assert.equal(eight.font,12);assert.equal(eight.x,dialogs[500].hotspots[8][2]+60);assert.equal(eight.y,dialogs[500].hotspots[8][1]+2);
  assert.deepEqual([row.x,row.y,row.font,row.baseline],[dialogs[500].hotspots[3][2]-4,dialogs[500].hotspots[3][1]+14,12,'bottom']);
});
test('finance panel prints monetary counters in original hundred-dollar units while population/date remain unscaled',()=>{
  const state={calendarDay:10,cash:1900123,accounts:{income:[50000,0,0,0,0,0,0,0,0,-150000,0],maintenance:[10000,0,0,0,0,0,0,0,0,0,0],other:1000000,construction:60000,previousBalance:2000000}};
  const result=financeInfo(state,[6,1,2,2,10,12,16,50,120,3]);
  assert.deepEqual(result.fields,{6:-1000,7:100,8:1,9:4,10:-1100,11:10000,12:600,13:20000,14:19001});
  assert.deepEqual(result.rows[0],{incomeType:7,maintenanceType:24,population:6,income:500,maintenance:100});
  assert.deepEqual(result.rows[9],{incomeType:9,maintenanceType:14,population:3,income:-1500,maintenance:0});
  assert.equal(result.rows.length,10);
});

test('Finance displays the original retained category counters rather than recounting present rooms',()=>{
  const categories=[10,6,3,1,2,2,0,50,50,0];
  const result=financePopulationRows({rooms:[],nativePopulation:{categories,total:124}});
  assert.deepEqual(result,categories);assert.notEqual(result,categories);
});


test('native Info Bar ignores browser log prose and expires source messages without creating sound',()=>{
  const initial=nativeNoticeMessage(null,data,{text:'Welcome. Build a lobby.'},1600);assert.equal(initial,null);
  const demand=nativeNoticeMessage(initial,data,{text:data.strings[1010][4]},1600);
  assert.equal(demand.text,data.strings[1010][4]);assert.equal(demand.priority,2);
  assert.equal(nativeNoticeMessage(demand,data,{resource:1007,index:1},2000),demand);
  assert.equal(expireInfoMessage(demand,6500),null);
});
