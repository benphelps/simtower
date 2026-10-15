import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBuildBase,rebaseAssetPath,rebaseAssetJSON,rebaseBrowserText} from '../tools/build-base.mjs';

test('build base accepts root or project paths and rejects unsafe URL segments before output replacement',()=>{
  assert.equal(normalizeBuildBase(),'/');assert.equal(normalizeBuildBase('/simtower'),'/simtower/');assert.equal(normalizeBuildBase('/games/simtower/'),'/games/simtower/');
  for(const base of ['simtower','/../x/','/x/./','/x?y','/x#y','/x%2fy/','/x\\y/','/x y/'])assert.throws(()=>normalizeBuildBase(base),/BASE_PATH/);
});

test('deployment manifests preserve the original, waifu and indexed loader URL contracts',()=>{
  const base='/simtower/',original='public/assets/bitmaps/1512.png',waifu='assets/upscaled/waifu2x/1512.png',index='/assets/indices/1512.png';
  assert.equal(rebaseAssetPath(original,base).replace('public/','/'),'/simtower/assets/bitmaps/1512.png');
  assert.equal(`/${rebaseAssetPath(waifu,base)}`,'/simtower/assets/upscaled/waifu2x/1512.png');
  assert.equal(rebaseAssetPath(index,base),'/simtower/assets/indices/1512.png');
  const source={resources:[{id:1512,path:original}],nested:{path:index,sha:'abcd',offset:12},source:'SimTowerDOS/SIMTOWER.EXE'};
  const converted=rebaseAssetJSON(source,base);assert.equal(converted.resources[0].path,'public/simtower/assets/bitmaps/1512.png');assert.equal(converted.nested.path,'/simtower/assets/indices/1512.png');assert.equal(converted.source,source.source);assert.equal(source.resources[0].path,original);
});

test('emitted URL prefixes cover HTML, CSS and dynamic module strings without rewriting relative or external paths',()=>{
  const source='<link href="/style.css"><a href="/">Game</a><script src="/src/main.js"></script>\n'+
    'const url=`/assets/bitmaps/${id}.png`; const generated=`/${r.path}`; const original=r.path.replace("public/","/");\n'+
    'div{background:url(/assets/bitmaps/600.png)} img{src:url("/assets/fonts/vgasys.ttf")}\n'+
    'import "./renderer.js"; fetch("https://example.com/assets/x"); fetch("waifu2x/manifest.json");';
  const converted=rebaseBrowserText(source,'/simtower/');
  for(const path of ['/simtower/style.css','href="/simtower/"','/simtower/src/main.js','/simtower/assets/bitmaps/${id}.png','/simtower/assets/fonts/vgasys.ttf'])assert.ok(converted.includes(path),path);
  for(const unchanged of ['`/${r.path}`','replace("public/","/")','"./renderer.js"','https://example.com/assets/x','"waifu2x/manifest.json"'])assert.ok(converted.includes(unchanged),unchanged);
  assert.equal(rebaseBrowserText(converted,'/simtower/'),converted);
  assert.equal(rebaseBrowserText(source),source);assert.equal(rebaseAssetPath('assets/a.png'),'assets/a.png');
});

import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
test('all shipped original, tall, indexed, waifu and manual URLs resolve inside the project deployment',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),base='/simtower/';
  const json=path=>JSON.parse(readFileSync(resolve(root,'public/assets',path)));
  const originals=[...json('manifest.json').resources,...json('lobby-transports.json')];
  const native=json('native-indices.json'),waifu=json('upscaled/waifu2x/manifest.json');
  const urls=[...originals.filter(resource=>resource.path.startsWith('public/assets/')).map(resource=>rebaseAssetPath(resource.path,base).replace('public/','/')),
    ...Object.values(rebaseAssetJSON(native,base).resources).map(resource=>resource.path),
    ...rebaseAssetJSON(waifu,base).resources.map(resource=>`/${resource.path}`)];
  for(const url of urls){assert.ok(url.startsWith('/simtower/assets/'),url);assert.ok(existsSync(resolve(root,'public',url.slice(base.length))),url);}
  assert.ok(urls.length>750,'exercise the complete shipped inventories, not a few fixture names');
  const manual=rebaseBrowserText(readFileSync(resolve(root,'public/assets/manual/index.html'),'utf8'),base);
  assert.ok(manual.includes('href="/simtower/"'));assert.ok(manual.includes('src="/simtower/src/manual-viewer.js"'));
  for(const [,url]of manual.matchAll(/(?:href|src)="(\/simtower\/assets\/[^"?#]+)"/g))assert.ok(existsSync(resolve(root,'public',url.slice(base.length))),url);
  const viewer=rebaseBrowserText(readFileSync(resolve(root,'public/assets/upscaled/index.html'),'utf8'),base);
  assert.ok(viewer.includes("from '/simtower/src/renderer.js'"));assert.ok(viewer.includes('fetch(`${key}/manifest.json`)'),'model selector remains relative to the deployed viewer directory');
});
