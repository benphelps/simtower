import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_COLORS,projectMapPoint,mapFacilityRect,mapShaftLine,mapViewportRect,mapNavigation,diagnosticAppearance} from '../src/original-map.js';

test('native entire-site projection places ground, basements and top at exact map coordinates',()=>{
  assert.deepEqual(projectMapPoint(0,-3960),{x:0,y:0});
  assert.deepEqual(projectMapPoint(3000,360),{x:200,y:288});
  assert.deepEqual(projectMapPoint(0,0),{x:0,y:264});
  assert.deepEqual(mapFacilityRect({x:40,width:20,floor:0}),{x:21,y:261,width:11,height:3});
  assert.deepEqual(mapFacilityRect({x:40,width:20,floor:-1,height:3}),{x:21,y:264,width:11,height:7});
});
test('native map shaft colors match express blue, ordinary black, and service red even with Show off',()=>{
  for(const [key,color] of [['express','#0000ff'],['elevator','#000000'],['service','#ff0000']]){
    assert.equal(MAP_COLORS[key],color);
    assert.deepEqual(mapShaftLine({key,x:40,low:0,high:3,visible:false}),{x:21,y:252,height:14,color});
  }
});
test('map navigation centers continuously and clamps full highlighted rectangle at every site edge',()=>{
  const viewport={width:40,height:60};
  const mid=mapNavigation({x:100,y:144},viewport);assert.deepEqual(mid,{x:80,y:114,width:40,height:60,camera:{x:1500,y:-1800}});
  assert.deepEqual(mapNavigation({x:0,y:0},viewport),{x:0,y:0,width:40,height:60,camera:{x:300,y:-3510}});
  assert.deepEqual(mapNavigation({x:199,y:287},viewport),{x:160,y:228,width:40,height:60,camera:{x:2700,y:-90}});
  assert.equal(mapNavigation({x:200,y:144},viewport),null);
  assert.deepEqual(mapViewportRect(mid.camera,600,900),{x:80,y:114,width:40,height:60});
});
test('native diagnostics distinguish eval states, four prices and original hatch columns',()=>{
  for(const [evaluation,color,sx] of [[0,'#e60000',24],[1,'#cccc00',16],[2,'#00ffff',0],[3,'#00ffff',0]]) {
    assert.deepEqual(diagnosticAppearance({key:'office',evaluation},1),{color,hatch:{sheet:1003,sx,sy:0,width:8,height:36}});
  }
  assert.equal(diagnosticAppearance({key:'office',evaluation:-1},1),null);
  for(const [price,color] of [[0,'#e60000'],[1,'#cccc00'],[2,'#00ff00'],[3,'#00ffff']])assert.equal(diagnosticAppearance({key:'condo',price},2).color,color);
  assert.equal(diagnosticAppearance({key:'office',price:4},2),null);
  assert.equal(diagnosticAppearance({key:'medical',price:1},2),null);
});
test('hotel diagnostics mark native dirty states and vacated dirty legacy rooms, rather than every occupied room with dust',()=>{
  assert.equal(diagnosticAppearance({key:'single',hotelState:48,nativeState:24,dirt:0,occupied:true},3).color,'#e60000');
  assert.equal(diagnosticAppearance({key:'single',hotelState:0,nativeState:40,dirt:100,occupied:false},3),null);
  assert.equal(diagnosticAppearance({key:'single',nativeState:39,dirt:100,occupied:false},3),null);
  assert.equal(diagnosticAppearance({key:'single',nativeState:40,dirt:0,occupied:true},3).color,'#e60000');
  assert.equal(diagnosticAppearance({key:'twin',dirt:1,occupied:true},3),null);
  assert.equal(diagnosticAppearance({key:'twin',dirt:100,occupied:false},3).color,'#e60000');
  assert.equal(diagnosticAppearance({key:'office',dirt:100,occupied:false},3),null);
});
