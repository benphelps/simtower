import test from 'node:test';import assert from 'node:assert/strict';
import {browserSaveFilename,browserSaveTitle,browserTowerTitle,browserSaveRequest} from '../src/original-browser-saves.js';
import {readFileSync} from 'node:fs';
import {Tower} from '../src/simulation.js';
test('native Save requests a name until a path is established and Save As always requests a new one',()=>{
  const untitled={name:'Untitled tower'};
  assert.deepEqual(browserSaveRequest(untitled),{prompt:true,filename:'untitled.simtower.json'});
  const saved={name:'Old embedded title',browserSaveFilename:'New tower.simtower.json'};
  assert.deepEqual(browserSaveRequest(saved),{prompt:false,filename:'New tower.simtower.json'});
  assert.equal(browserSaveRequest(saved,true).prompt,true);
  assert.equal(browserTowerTitle(saved),'New tower');
  assert.equal(browserSaveRequest({name:'Legacy title'}).prompt,true);
});
test('browser adaptation uses file titles for captions and preserves cancellation without assigning a path',()=>{
  assert.equal(browserSaveFilename(''),null);assert.equal(browserSaveFilename('  '),null);
  for(const input of ['Hotel','Hotel.TDT','Hotel.json','Hotel.simtower.json','C:\\TOWER\\Hotel.TDT'])assert.equal(browserSaveFilename(input),'Hotel.simtower.json');
  assert.equal(browserSaveTitle('Hotel.simtower.json'),'Hotel');
  assert.equal(browserSaveFilename('Tower: East?'),'Tower_ East_.simtower.json');
  assert.equal(browserTowerTitle({name:'Untitled tower'}),'untitled');
  assert.equal(browserTowerTitle({name:'Old save title'}),'Old save title');
  const state={name:'Kept title'};browserSaveRequest(state,true);assert.deepEqual(state,{name:'Kept title'});
});
test('browser saves accept the same passenger limit as live spawning',()=>{
  const data=JSON.parse(readFileSync(new URL('../public/assets/game-data.json',import.meta.url))),tower=new Tower(data,{sandbox:true});
  tower.build('lobby',0,40,100);tower.build('floor',1,40,100);tower.build('office',1,40);assert.equal(tower.build('elevator',0,70,70,1).ok,true);
  while(tower.state.construction.length)tower.finishConstruction();
  const room=tower.state.rooms.find(r=>r.key==='office');
  for(let i=0;i<10001;i++)assert.ok(tower.spawn(room,0,1));
  const saved=tower.save(),copy=new Tower(data);copy.load(saved);
  assert.equal(copy.state.people.length,10001);assert.equal(copy.save(),saved);
  const candidate=JSON.parse(saved);candidate.people=Array(100001).fill(candidate.people[0]);
  assert.throws(()=>copy.load(JSON.stringify(candidate)),/Invalid save data/);assert.equal(copy.save(),saved);
});
