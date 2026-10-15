import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeDialogFrameLayout,nativeDialogFrameCommands,drawNativeDialogFrame} from '../src/original-dialog-frame.js';
const templates=JSON.parse(fs.readFileSync(new URL('../public/assets/dialogs.json',import.meta.url)));
const palette=JSON.parse(fs.readFileSync(new URL('../public/assets/native-indices.json',import.meta.url))).basePalette;
const bitmap=id=>{const bytes=fs.readFileSync(new URL(`../public/assets/bitmaps/${id}.png`,import.meta.url));return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};};
const dimensions=layout=>[layout.outerWidth,layout.outerHeight,layout.width,layout.height,layout.caption,layout.paintBevel];

test('DD65 bitmap dimensions already include captionless client frames',()=>{
  assert.deepEqual(dimensions(nativeDialogFrameLayout(templates[500],bitmap(500))),[343,364,343,364,false,false]);
  assert.deepEqual(dimensions(nativeDialogFrameLayout(templates[510],bitmap(510))),[300,211,300,211,false,false]);
  assert.deepEqual(dimensions(nativeDialogFrameLayout(templates[748])),[282,265,282,265,false,true]);
  for(const template of Object.values(templates))if(!(template.style&0x00c00000))assert.equal(template.style&0x00800000,0,'no captionless resource requests an external WS_BORDER');
});
test('captioned schedule applies1256D metric math while New Movie retains DD65 outer DTMP dimensions',()=>{
  const schedule=nativeDialogFrameLayout(templates[400],bitmap(400),{id:400}),movie=nativeDialogFrameLayout(templates[731]);
  assert.deepEqual(dimensions(schedule),[202,447,200,427,true,false]);
  assert.deepEqual(dimensions(movie),[280,136,278,116,true,true]);
  for(const template of [templates[400],templates[731]])assert.equal(template.style&0x80,0,'no DS_MODALFRAME adds a thick USER frame');
  for(const layout of [schedule,movie])assert.deepEqual([layout.borderX,layout.borderY,layout.captionHeight],[1,1,18]);
  assert.equal(schedule.height,bitmap(400).height-1,'the source outer math clips the final bitmap row instead of adding an invented pixel');
});
test('3788E paints its original six-pixel bevel within the existing client bounds using exact palette grays',()=>{
  const width=40,height=30,pixels=new Map(),context={fillRect(x,y,w,h){assert.ok(x>=0&&y>=0&&x+w<=width&&y+h<=height);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels.set(`${xx},${yy}`,this.fillStyle);}};
  drawNativeDialogFrame(context,width,height);
  for(const [x,y,color] of [[0,0,'#b3b3b3'],[2,2,'#b3b3b3'],[3,3,'#666666'],[5,5,'#666666'],[6,6,'#cccccc'],[10,29,'#8c8c8c'],[39,10,'#8c8c8c'],[10,26,'#e6e6e6'],[36,10,'#e6e6e6']])assert.equal(pixels.get(`${x},${y}`),color);
  assert.equal(pixels.has('39,0'),false,'GDI LineTo excludes its final endpoint');
  assert.deepEqual(nativeDialogFrameCommands(width,height).at(-1),{color:'#cccccc',rect:[6,6,28,18]});
  for(const gray of [0xb3,0x8c,0x66,0xe6,0xcc])assert.ok(palette.some(rgb=>rgb.every(channel=>channel===gray)));
});
