// AHOTTADLOGFILTER0xD9EC calls SETTIMER(hwnd,10,0x93E0,0).
// WM_TIMER at0xDABD kills it, marks automaticchoice and dispatches2.
export const NATIVE_ALERT_TIMEOUT_MS=0x93e0;
export const nativeAlertTimedDefault=id=>Number(id)>=3000&&Number(id)<=4001;
export class OriginalAlertTimer {
  // USER timers are wall-clock timers. Browser timer methods require their
  // Window receiver; storing them as methods of our clock changes that receiver.
  constructor(clock={setTimeout:(...args)=>globalThis.setTimeout(...args),clearTimeout:handle=>globalThis.clearTimeout(handle)}){this.clock=clock;this.generation=0;this.handle=null;}
  stop(){this.generation++;if(this.handle!==null)this.clock.clearTimeout(this.handle);this.handle=null;}
  start(id,callback){
    this.stop();if(!nativeAlertTimedDefault(id))return;
    const generation=this.generation;
    this.handle=this.clock.setTimeout(()=>{if(this.generation!==generation)return;this.handle=null;callback(2,{automatic:true});},NATIVE_ALERT_TIMEOUT_MS);
  }
}
