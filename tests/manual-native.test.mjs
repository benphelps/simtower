import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {MANUAL_INDEX,manualSearch} from '../src/original-manual.js';
test('manual search matches whole-topic terms across blocks, ranks titles and returns readable excerpts',()=>{
  const entries=[{id:'p',title:'Parking places and ramps',text:'Suite guests require parking. Keep ramps aligned.'},{id:'h',title:'Hotels',text:'A suite needs parking before arrival.'},{id:'t',title:'Transport',text:'Lift capacity and direction.'}];
  const matches=manualSearch(entries,'parking');assert.deepEqual(matches.map(x=>x.id),['p','h']);
  assert.equal(matches[0].snippet,'Suite guests require parking. Keep ramps aligned.');
  assert.deepEqual(manualSearch(entries,'SUITE parking').map(x=>x.id),['p','h']);
  assert.equal(manualSearch(entries,'suite helicopter').length,0);assert.equal(manualSearch(entries,'  ').length,0);
});
test('published manual has unique topic destinations and all twenty-five captured game-UI illustrations',()=>{
  const html=readFileSync(new URL('../public/assets/manual/index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
  for(const id of Object.values(MANUAL_INDEX))assert.ok(ids.includes(id),`Missing index destination ${id}`);
  const links=[...html.matchAll(/href="#([^"]+)"/g)].map(x=>x[1]);for(const id of links)assert.ok(ids.includes(id),`Broken topic link ${id}`);
  const illustrations=JSON.parse(readFileSync(new URL('../public/assets/manual/illustrations.json',import.meta.url)));
  assert.equal(illustrations.length,25);
  assert.ok(illustrations.some(figure=>figure.file.endsWith('/startup.jpg')));
  for(const figure of illustrations){assert.ok(figure.alt&&figure.caption);const file=new URL('../public'+figure.file,import.meta.url);assert.ok(existsSync(file),`Missing ${figure.file}`);const bytes=readFileSync(file);assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length>1000);}
  assert.ok(html.includes('id="manual-history"'));assert.ok(html.includes('id="manual-search"'));
});
