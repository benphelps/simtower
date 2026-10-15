import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeQueueBounds,nativeQueuePosition,nativeQueueVisibleSpan} from '../src/people-sprites.js';
import {nativeQueuePersonAt} from '../src/original-inspection.js';
import {findPersonTarget,createFindMarker} from '../src/original-markers.js';
import {Tower} from '../src/simulation.js';
const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url)));
function scene({x=20,width=60}={}) {
  const shaft={id:1,key:'elevator',x:40,width:4,low:0,high:4};
  const room={id:2,key:'office',x:20,width:9,floor:1};
  const actors=[{id:3,index:2,room:2,trip:5},{id:4,index:2,room:2,trip:6}];
  const people=[{id:5,actor:3,room:2,stage:'queue',floor:1,queueOrder:0,path:[{id:1,to:4}]},
    {id:6,actor:4,room:2,stage:'queue',floor:1,queueOrder:1,path:[{id:1,to:0}]}];
  return {shaft,state:{shafts:[shaft],floors:{1:{x,width}},rooms:[room],actors,people,tick:0,star:1}};
}
function span(state,shaft,person,width=1,earlier=[]) {
  const frame={width:width*8},x=nativeQueuePosition(shaft,person,earlier,frame);
  return nativeQueueVisibleSpan(nativeQueueBounds(state,shaft,person.floor),x,width,person.path[0].to>person.floor);
}
test('edge shafts hide unsupported queue sprites without switching their directional side',()=>{
  for(const [floor,visible]of [[{x:40,width:40},1],[{x:20,width:24},0],[{x:40,width:4},-1]]) {
    const {state,shaft}=scene(floor);
    for(const [index,person]of state.people.entries()) {
      const result=span(state,shaft,person);
      assert.equal(Boolean(result),index===visible);
      const x=index===0?37:46;
      assert.equal(nativeQueuePersonAt(data,state,1,x+.5)?.id,index===visible?person.id:undefined);
      const target=findPersonTarget(state,state.actors[index],data);
      assert.deepEqual(target,index===visible?{outside:false,x,floor:1}:{outside:false,hidden:true,floor:1});
      assert.equal(Boolean(createFindMarker(target,0)),index===visible);
    }
    assert.equal(state.people.length,2,'visibility never removes a waiting passenger');
  }
});
test('a missing floor hides both rings and extending its structural bounds reveals the same identities',()=>{
  const {state,shaft}=scene();delete state.floors[1];
  for(const p of state.people)assert.equal(span(state,shaft,p),null);
  state.floors[1]={x:20,width:60};
  assert.deepEqual(state.people.map(p=>span(state,shaft,p)?.x),[37,46]);
});
test('wide portraits crop their outer eight-pixel half at either floor edge',()=>{
  const {state,shaft}=scene({x:37,width:10});
  assert.deepEqual(span(state,shaft,state.people[0],2),{x:37,width:1,sourceX:1});
  assert.deepEqual(span(state,shaft,state.people[1],2),{x:46,width:1,sourceX:0});
  assert.equal(span(state,shaft,state.people[0],1,[{width:8}]),null);
  assert.equal(span(state,shaft,state.people[1],1,[{width:8}]),null);
});
test('queue areas split at native shaft-left midpoints, including express and machinery rows',()=>{
  const {state,shaft}=scene({x:0,width:100});
  state.shafts.push({id:7,key:'express',x:20,width:6,low:2,high:5},{id:8,x:61,width:4,low:0,high:0},
    {id:9,x:30,width:4,low:3,high:8});
  const bounds=nativeQueueBounds(state,shaft,1);
  assert.deepEqual(bounds,{left:32,right:53,floorLeft:0,floorRight:100});
  assert.deepEqual(nativeQueueVisibleSpan(bounds,31,2,true),{x:31,width:2,sourceX:0},'second cell crosses midpoint');
  assert.equal(nativeQueueVisibleSpan(bounds,30,2,true),null);
  assert.deepEqual(nativeQueueVisibleSpan(bounds,52,2,false),{x:52,width:2,sourceX:0});
  assert.equal(nativeQueueVisibleSpan(bounds,53,1,false),null);
});
test('queues remain FIFO and board when their assigned side has no floor',()=>{
  for(const [from,to,edge]of [[0,4,'left'],[4,0,'right']]) {
    const tower=new Tower(data,{sandbox:true});
    tower.build('lobby',0,10,99);
    for(let floor=1;floor<=4;floor++)tower.build('floor',floor,10,99);
    tower.build('office',4,10);tower.build('elevator',0,40,40,4);
    const shaft=tower.state.shafts[0],car=shaft.cars[0];
    tower.state.floors[from]=edge==='left'?{x:40,width:60}:{x:10,width:34};
    car.floor=from;car.target=from;car.parkingFloor=from;car.direction=Number(to>from);car.doors=0;
    const passengers=Array.from({length:3},()=>{
      const p=tower.spawn(tower.state.rooms[0],from,to);p.stage='queue';return p;
    });
    for(const p of passengers)assert.equal(span(tower.state,shaft,p),null);
    tower.updateElevators();assert.deepEqual(car.people,[passengers[0].id]);
    for(let tick=0;tick<4;tick++)tower.updateElevators();
    assert.deepEqual(car.people,passengers.map(p=>p.id));
    assert.ok(passengers.every(p=>p.stage==='car'));
  }
});
