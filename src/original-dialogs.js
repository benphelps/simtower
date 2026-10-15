import {nativeDialogModeless} from './original-menus.js';
import {nativeDialogFontSize,nativeDialogField} from './original-dialog-fonts.js';
import {nativeDialogControlState,nativeDialogInitialFocus,nativeDialogKeyCommand} from './original-dialog-keyboard.js';
import {OriginalAlertTimer} from './original-alert-timer.js';
import {attachNativeModalCaption} from './native-modal-caption.js';
import {nativeDialogFrameLayout,drawNativeDialogFrame} from './original-dialog-frame.js';
// Win16 RT_DIALOG controls positioned by DTMP, as in 0xDD65 / 0xDF91.
// Bitmap-backed panels keep their original pixels, including button chrome.
export class OriginalDialogs {
  constructor(element, templates, assets) {
    this.element=element;this.templates=templates;this.assets=assets;this.alertTimer=new OriginalAlertTimer();
    this.resetCaptionPosition=attachNativeModalCaption(element);
    element.addEventListener('close',()=>this.alertTimer.stop());
    element.addEventListener('cancel',event=>{
      if(!element.dataset.template)return;
      event.preventDefault();this.dispatchKey?.('Escape','keydown');
    });
    for(const phase of ['keydown','keyup'])element.addEventListener(phase,event=>{
      if(event.altKey&&event.key==='F4'){
        event.preventDefault();event.stopImmediatePropagation();
        if(phase==='keydown'){if(element.dataset.template)this.dispatchKey?.('Escape','keydown');else element.close();}
        return;
      }
      if(!element.dataset.template||event.altKey||event.ctrlKey||event.metaKey)return;
      const id=Number(element.dataset.template);
      if(event.key==='Escape')event.preventDefault();
      if(id===500&&['Enter',' ','Tab'].includes(event.key))event.preventDefault();
      if(id===400&&['Enter',' ','Tab'].includes(event.key)) {
        event.preventDefault();
        if(event.key==='Tab'&&phase==='keydown')(element.querySelector('[data-control="7"][tabindex="0"]')||element).focus();
      }
      if(this.dispatchKey?.(event.key,phase)){event.preventDefault();event.stopPropagation();}
    });
  }
  show(id, { title, value=0, command=()=>{}, fields={}, options={} }={}) {
    const d=this.templates[id];
    if(!d) throw new Error(`Missing original dialog ${id}`);
    const dialog=this.element, content=dialog.querySelector('[data-dialog-content],#dialog-content');
    const background=this.assets.get(+d.background),{width,height,outerWidth,outerHeight,caption,paintBevel}=nativeDialogFrameLayout(d,background,{id});
    const modeless=nativeDialogModeless(id);
    if(dialog.dataset.template!==String(id))this.resetCaptionPosition();
    if(dialog.open&&modeless!==(dialog.dataset.modeless==='true'))dialog.close();
    dialog.dataset.modeless=String(modeless);
    dialog.dataset.template=String(id);dialog.classList.add('native-dialog'); dialog.classList.toggle('native-caption',caption);
    dialog.dataset.title=title ?? d.title; content.replaceChildren();
    dialog.style.setProperty('--native-outer-width',`${outerWidth}px`);dialog.style.setProperty('--native-outer-height',`${outerHeight}px`);
    const panel=document.createElement('div');panel.className='native-panel';panel.style.width=`${width}px`;panel.style.height=`${height}px`;panel.style.setProperty('--native-text-size',`${nativeDialogFontSize(id)}px`);
    if(background) panel.style.backgroundImage=`url('/assets/bitmaps/${d.background}.png')`;
    if(paintBevel) {
      const frame=document.createElement('canvas');frame.width=width;frame.height=height;frame.setAttribute('aria-hidden','true');frame.className='native-client-frame';
      drawNativeDialogFrame(frame.getContext('2d'),width,height);panel.append(frame);
    }
    content.append(panel);
    const place=(el,rect)=>{ const [x,y,w,h]=rect;Object.assign(el.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});panel.append(el);return el; };
    const rect=cid=>{const [x,y,right,bottom]=d.hotspots[cid];return [x,y,right-x,bottom-y];};
    const text=s=>String(s).replace(/[\^#]0/g,String(value));
    for(const decoration of d.icons || []) {
      const image=this.assets.get(decoration.id);if(!image) continue;
      const el=document.createElement('img');el.src=`/assets/bitmaps/${decoration.id}.png`;el.alt='';
      place(el,[decoration.x,decoration.y,image.width,image.height]);
    }
    const controls=[];
    for(const c of d.controls) {
      if(!c.rect || c.rect[2]<=0 || c.rect[3]<=0 || c.class==='scrollbar') continue;
      let el;
      if(c.class==='button') { el=document.createElement('button');el.textContent=text(c.text);el.onclick=()=>command(c.id,el,panel); }
      else if(c.class==='edit') { el=document.createElement('input');el.maxLength=15;el.value=fields[c.id] || ''; }
      else if(c.class==='combobox' || c.class==='listbox') {
        el=document.createElement('select');if(c.class==='listbox') el.size=8;
        for(const [value,label] of options[c.id] || []) el.add(new Option(label,value));
        if(fields[c.id]!==undefined) el.value=fields[c.id];
        el.onchange=()=>command(c.id,el,panel);
      } else { el=document.createElement('span');el.textContent=text(c.text);el.style.textAlign=(c.style & 3)===2 ? 'right' : 'left'; }
      el.dataset.control=c.id;el.className=`native-${c.class}`;
      const state=nativeDialogControlState(id,c,fields);controls.push({...c,...state,element:el});
      if(['button','edit','combobox','listbox'].includes(c.class)) {el.disabled=state.disabled;el.tabIndex=state.tabStop?0:-1;}
      if(state.defaultButton)el.classList.add('native-default-button');
      const r=[...c.rect];if(c.class==='combobox') r[3]=21;
      place(el,r);
    }
    const updateDefault=()=>{
      const active=controls.find(c=>c.element===document.activeElement&&c.class==='button'&&!c.element.disabled);
      for(const c of controls)c.element.classList.toggle('native-default-button',Boolean(active?c===active:c.defaultButton));
    };
    panel.addEventListener('focusin',updateDefault);panel.addEventListener('focusout',()=>queueMicrotask(updateDefault));
    if([730,732].includes(Number(id)))panel.querySelector('[data-control="4"]').addEventListener('input',event=>{
      panel.querySelector('[data-control="1"]').disabled=!event.target.value.length;
    });
    this.dispatchKey=(key,phase)=>{
      const current=controls.map(c=>({...c,disabled:c.element.disabled})),focused=Number(document.activeElement?.dataset.control);
      const cid=nativeDialogKeyCommand(id,key,phase,current,focused);
      if(cid===null)return false;
      const button=panel.querySelector(`button[data-control="${cid}"]`);
      if(button) {if(!button.disabled)button.click();}
      else command(cid,null,panel);
      return true;
    };
    const api={panel,rect,place,
      text:(cid,value,cls='native-field')=>{const field=nativeDialogField(id,cid,value),el=document.createElement('span');el.className=cls;el.textContent=field.text;Object.assign(el.style,field.style);el.dataset.field=cid;return place(el,rect(cid));},
      hotspot:(cid,label,onclick,pressed=d.background ? +d.background+1 : null)=>{
        const el=document.createElement('button');el.className='native-hotspot';el.setAttribute('aria-label',label);el.title=label;
        if([400,500].includes(Number(id)))el.tabIndex=-1; // Bitmap hit regions are not USER child controls.
        if(Number(id)===400)el.onpointerdown=event=>event.preventDefault();
        const [x,y]=d.hotspots[cid];if(pressed && this.assets.has(pressed)) {el.style.setProperty('--pressed',`url('/assets/bitmaps/${pressed}.png')`);el.style.backgroundPosition=`-${x}px -${y}px`;}
        el.onclick=onclick;el.dataset.control=cid;return place(el,rect(cid));
      }
    };
    if(!dialog.open){if(modeless)dialog.show();else dialog.showModal();}
    const initial=nativeDialogInitialFocus(id,controls);
    if(initial===null&&Number(id)===500){dialog.tabIndex=-1;dialog.focus();}
    else controls.find(c=>c.id===initial)?.element.focus();
    this.alertTimer.start(id,(cid,context)=>{
      if(dialog.open&&dialog.dataset.template===String(id)&&content.contains(panel))command(cid,null,panel,context);
    });
    return api;
  }
}
