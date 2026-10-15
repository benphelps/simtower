import {MANUAL_INDEX,manualSearch} from './original-manual.js';
const search=document.getElementById('manual-search'),results=document.getElementById('manual-results'),sidebar=document.getElementById('manual-sidebar'),layout=document.querySelector('.manual-layout'),content=document.getElementById('manual-content');
const sections=[...document.querySelectorAll('.manual-section')];
const entries=sections.map(section=>({id:section.querySelector('h1,h2,h3').id,title:section.dataset.title,
  text:[...section.querySelectorAll('p,li,th,td,aside,figcaption')].map(block=>block.textContent).join(' ').replace(/\s+/g,' ').trim()}));
const byId=new Map(entries.map((entry,index)=>[entry.id,{...entry,index}]));
const link=(title,id)=>{const a=document.createElement('a');a.textContent=title;a.href='#'+id;return a;};
for(const [term,id] of Object.entries(MANUAL_INDEX).sort(([a],[b])=>a.localeCompare(b)))document.getElementById('manual-index').append(link(term,id));
// The authored HTML remains a complete printable/readable book without JS.
// The interactive presentation follows WinHelp's single-topic document pane.
for(let i=0;i<sections.length;i++)if(sections[i].dataset.level!=='3'){
  const nav=document.createElement('nav');nav.className='topic-list';nav.setAttribute('aria-label','Related topics');
  if(i===0){for(let j=1;j<sections.length;j++)if(sections[j].dataset.level==='2'){const a=link(entries[j].title,entries[j].id);a.className='chapter-link';nav.append(a);}}
  else {for(let j=i+1;j<sections.length&&sections[j].dataset.level==='3';j++)nav.append(link(entries[j].title,entries[j].id));}
  sections[i].append(nav);
}
let current='',backStack=[],visited=[],backNavigation=false;
function pane(open){layout.classList.toggle('contents-closed',!open);document.getElementById('manual-nav-toggle').setAttribute('aria-expanded',String(open));}
function showTopic(){
  const raw=location.hash.slice(1),id=byId.has(raw)?raw:current||'overview',entry=byId.get(id);
  if(current&&current!==id&&!backNavigation)backStack.push(current);
  backNavigation=false;current=id;if(!visited.includes(id))visited.push(id);
  for(const section of sections)section.hidden=section.querySelector('h1,h2,h3').id!==id;
  document.querySelectorAll('nav a[aria-current]').forEach(a=>a.removeAttribute('aria-current'));
  document.querySelector(`#manual-sidebar nav a[href="#${id}"]`)?.setAttribute('aria-current','location');
  document.getElementById('manual-back').disabled=!backStack.length;
  document.getElementById('manual-previous').disabled=entry.index===0;
  document.getElementById('manual-next').disabled=entry.index===entries.length-1;
  content.scrollTop=0;document.title=`${entry.title} - SimTower Help`;
}
function navigate(id){if(id===current)showTopic();else location.hash=id;}
function updateSearch(){
  const query=search.value.trim();results.replaceChildren();results.hidden=!query;if(!query)return;
  const found=manualSearch(entries,query),p=document.createElement('p');p.textContent=found.length?`${found.length} matching topics`:'No matching topics. Try a shorter phrase.';results.append(p);
  for(const result of found){const item=document.createElement('div');item.className='search-result';item.append(link(result.title,result.id));const snippet=document.createElement('small');snippet.textContent=result.snippet;item.append(snippet);results.append(item);}
}
search.addEventListener('input',updateSearch);
window.addEventListener('hashchange',showTopic);
document.addEventListener('keydown',event=>{
  if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();pane(true);search.focus();}
  if(event.key==='Escape'&&document.activeElement===search){search.value='';updateSearch();}
});
document.getElementById('manual-print').onclick=()=>window.print();
document.getElementById('manual-nav-toggle').onclick=()=>{pane(layout.classList.contains('contents-closed'));navigate('overview');};
document.getElementById('manual-index-toggle').onclick=()=>{pane(true);sidebar.querySelector('details').open=true;sidebar.querySelector('summary').scrollIntoView({block:'start'});};
document.getElementById('manual-search-toggle').onclick=()=>{pane(true);sidebar.scrollTop=0;search.focus();};
document.getElementById('manual-back').onclick=()=>{const previous=backStack.pop();if(previous){backNavigation=true;navigate(previous);}};
document.getElementById('manual-previous').onclick=()=>navigate(entries[byId.get(current).index-1].id);
document.getElementById('manual-next').onclick=()=>navigate(entries[byId.get(current).index+1].id);
const historyDialog=document.getElementById('manual-history');
document.getElementById('manual-history-button').onclick=()=>{const items=document.getElementById('history-topics');items.replaceChildren();for(const id of [...visited].reverse())items.append(link(byId.get(id).title,id));historyDialog.showModal();};
document.getElementById('history-close').onclick=()=>historyDialog.close();
historyDialog.addEventListener('click',event=>{if(event.target.closest('a'))historyDialog.close();});
sidebar.addEventListener('click',event=>{if(event.target.closest('a'))pane(false);});
pane(false);showTopic();
const query=new URLSearchParams(location.search).get('q');if(query){search.value=query;updateSearch();pane(true);}
const helpSource=new URLSearchParams(location.search);
if(helpSource.get('from')==='game'){
  const close=document.querySelector('.return-game');close.textContent='Close Help';close.href='#';
  close.onclick=event=>{event.preventDefault();if(helpSource.get('embedded')==='1')parent.postMessage('close-simtower-help',location.origin);else window.close();};
}
if(helpSource.get('embedded')==='1'){
  document.body.classList.add('embedded-manual');
  document.addEventListener('keydown',event=>{if(event.altKey&&event.key==='F4'){event.preventDefault();event.stopImmediatePropagation();parent.postMessage('close-simtower-help',location.origin);}},true);
}
