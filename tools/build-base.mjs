// Deployment-only URL conversion. Runtime sources and development manifests
// retain their original paths; no browser APIs are patched or intercepted.
export function normalizeBuildBase(value='/') {
  if(typeof value!=='string'||!value.startsWith('/')||/[?#\\%\s]/.test(value))throw new Error('BASE_PATH must be an absolute URL path such as /simtower/.');
  const parts=value.split('/').filter(Boolean);
  if(parts.some(part=>part==='.'||part==='..'||!/^[A-Za-z0-9._~-]+$/.test(part)))throw new Error('Invalid BASE_PATH segment.');
  return parts.length?`/${parts.join('/')}/`:'/';
}

export function rebaseAssetPath(value,base='/') {
  if(base==='/')return value;
  // These are the three manifest conventions consumed by current loaders:
  // original.path.replace('public/','/'), generated `/${resource.path}`,
  // and already absolute native-index resource paths.
  if(value.startsWith('public/assets/'))return `public${base}${value.slice(7)}`;
  if(value.startsWith('assets/'))return `${base.slice(1)}${value}`;
  if(/^\/(?:assets\/|src\/|style\.css(?:$|[?#]))/.test(value))return base+value.slice(1);
  return value;
}

export function rebaseAssetJSON(value,base='/') {
  if(typeof value==='string')return rebaseAssetPath(value,base);
  if(Array.isArray(value))return value.map(item=>rebaseAssetJSON(item,base));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,rebaseAssetJSON(item,base)]));
  return value;
}

export function rebaseBrowserText(text,base='/') {
  if(base==='/')return text;
  // Match only application URL prefixes at literal/attribute/CSS-url
  // boundaries. Also handles dynamic `/assets/...${id}` template literals.
  // External URLs, imports relative to modules, blob URLs, arbitrary slashes,
  // and the loaders' public/→/ conversion are intentionally unchanged.
  return text.replace(/(["'`(=\s])\/(assets\/|src\/|style\.css(?=["'`\s)>?#]))/g,
    (_,boundary,path)=>boundary+base+path)
    .replace(/(\bhref\s*=\s*["'])\/(["'])/g,(_,attribute,quote)=>attribute+base+quote);
}
