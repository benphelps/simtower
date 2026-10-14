import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clinicPatientCount, clinicSprite, clinicAdmission } from '../src/original-clinics.js';
test('clinic metadata counts admitted patients rather than forty-person waiters or completed departures', () => {
  const clinic={id:1,key:'medical'},actors=Array.from({length:40},(_,id)=>({id,job:1,state:35,trip:null}));
  actors.push({id:40,job:1,state:66,trip:null},{id:41,job:1,state:99,trip:50});
  assert.equal(clinicPatientCount(clinic,actors),40);assert.equal(clinicAdmission(clinic,actors),'waiting');
  actors[0].state=99;actors[0].trip=51;assert.equal(clinicAdmission(clinic,actors),'admitted');
  assert.equal(clinicAdmission({...clinic,constructionRemaining:1},actors),'missing');
});
test('native clinic art distinguishes busy patients, daytime idle and nighttime idle', () => {
  const clinic={id:1,key:'medical'},manifest=JSON.parse(readFileSync(new URL('../public/assets/manifest.json',import.meta.url)));
  assert.equal(clinicSprite(clinic,[],1599).sheet,1833);assert.equal(clinicSprite(clinic,[],1600).sheet,1834);
  assert.equal(clinicSprite(clinic,[{job:1,state:35,trip:null}],1600).sheet,1832);
  for(const sheet of [1832,1833,1834])assert.ok(manifest.resources.find(r=>r.type===2&&r.id===sheet).width>=208);
});
