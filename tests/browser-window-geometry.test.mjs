import test from 'node:test';
import assert from 'node:assert/strict';
import {resizeDesktopRect,browserMaximizedRect} from '../src/browser-window-geometry.js';

test('browser tower resize exceeds original maximum without moving opposite edges',()=>{
  const rect={x:204,y:53,width:815,height:575},min={width:124,height:214};
  assert.deepEqual(resizeDesktopRect(rect,'se',700,500,min),{...rect,width:1515,height:1075});
  assert.deepEqual(resizeDesktopRect(rect,'nw',-700,-500,min),{x:-496,y:-447,width:1515,height:1075});
  assert.deepEqual(resizeDesktopRect(rect,'nw',2000,2000,min),{x:895,y:414,width:124,height:214});
});
test('maximize fills any desktop, including desktops larger than the original maximum',()=>{
  assert.deepEqual(browserMaximizedRect(1920,1080),{x:-4,y:-4,width:1928,height:1088});
});
