// Native menu40003 uses19EC3 only after a path has been established; otherwise
// it falls through to Save As19F79.19F79/19DDE derive the caption from the
// selected file title, excluding .TDT. Native TDT and OS dialogs are deferred:
// this adapter preserves those decisions for the browser JSON download flow.
export function browserSaveFilename(input) {
  const selected=String(input??'').trim().split(/[\\/]/).at(-1);
  if(!selected)return null;
  const stem=selected.replace(/\.(?:simtower\.)?json$|\.tdt$/i,'').replace(/[<>:"|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,80);
  return stem?`${stem}.simtower.json`:null;
}
export function browserSaveTitle(filename) {
  return filename.replace(/\.simtower\.json$/i,'');
}
export function browserTowerTitle(state) {
  const filename=browserSaveFilename(state.browserSaveFilename);
  if(filename)return browserSaveTitle(filename);
  return !state.name||state.name==='Untitled tower'?'untitled':state.name;
}
export function browserSaveRequest(state,saveAs=false) {
  const remembered=browserSaveFilename(state.browserSaveFilename);
  return {prompt:saveAs||!remembered,filename:remembered||browserSaveFilename(browserTowerTitle(state))};
}
