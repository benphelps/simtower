//3CEF6 gates normal ticks on six(GetTickCount>>4) units. Original Fast
//bypasses that gate, but4A256 runs one full update/paint per idle pass.
//The browser limits Fast to one16ms unit and one tick per paint callback;
//batching hundreds of invisible ticks made decades pass on modern CPUs.
export const NORMAL_CLOCK_UNITS=6;
export const FAST_CLOCK_UNITS=1;
export class OriginalTickScheduler {
  constructor({now=()=>performance.now()}={}) {
    this.now=now;
    this.reset();
  }
  reset(){this.lastUnits=Math.trunc(this.now()/16);} //3CD60 resets56968 during New/Open initialization.
  frame(step,{fast=false,paused=false,hidden=false,modal=false}={}) {
    const start=this.now(),units=Math.trunc(start/16);
    if(paused||hidden||modal)return 0;
    if(units<this.lastUnits+(fast?FAST_CLOCK_UNITS:NORMAL_CLOCK_UNITS))return 0;
    this.lastUnits=units;step();return 1;
  }
}
