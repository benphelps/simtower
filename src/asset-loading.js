// Count assets after their usable representation is ready, rather than after
// starting a request. Shared requests and decoded images are reused by loaders.
export class AssetPreloader {
  constructor({onProgress=()=>{},fetch:fetcher=(...args)=>globalThis.fetch(...args),createImage=()=>new Image(),createObjectURL=blob=>URL.createObjectURL(blob),concurrency=8}={}) {
    this.onProgress=onProgress;this.fetcher=fetcher;this.createImage=createImage;this.createObjectURL=createObjectURL;
    this.inventory=new Set();this.completed=new Set();this.requests=new Map();this.values=new Map();
    this.concurrency=concurrency;this.active=0;this.waiting=[];
  }
  register(urls){for(const url of urls)this.inventory.add(url);this.report();}
  report(){const total=this.inventory.size,loaded=[...this.inventory].filter(url=>this.completed.has(url)).length;this.onProgress({loaded,total,percent:total?Math.floor(loaded*100/total):0});}
  finish(url){this.completed.add(url);this.report();}
  memo(key,load){if(!this.values.has(key))this.values.set(key,Promise.resolve().then(load));return this.values.get(key);}
  async run(load){
    if(this.active>=this.concurrency)await new Promise(resolve=>this.waiting.push(resolve));else this.active++;
    try{return await load();}finally{const next=this.waiting.shift();if(next)next();else this.active--;}
  }
  blob(url){
    if(!this.requests.has(url))this.requests.set(url,this.fetcher(url).then(response=>{if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.blob();}));
    return this.requests.get(url);
  }
  objectURL(url){return this.memo(`url:${url}`,async()=>this.createObjectURL(await this.blob(url)));}
  loadJSON=url=>this.memo(`json:${url}`,async()=>{const value=JSON.parse(await (await this.blob(url)).text());this.finish(url);return value;});
  loadImage=url=>this.memo(`image:${url}`,()=>this.run(async()=>{const image=this.createImage();image.src=await this.objectURL(url);await image.decode();this.finish(url);return image;}));
  loadBinary=url=>this.memo(`binary:${url}`,()=>this.run(async()=>{const source=await this.objectURL(url);this.finish(url);return source;}));
  loadSound=url=>this.loadBinary(url);
  async loadFont(url,family,descriptors={}){
    return this.run(async()=>{const face=new FontFace(family,await (await this.blob(url)).arrayBuffer(),descriptors);await face.load();document.fonts.add(face);this.finish(url);return face;});
  }
}
