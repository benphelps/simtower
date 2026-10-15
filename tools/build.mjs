import { cp, mkdir, rm, readdir,readFile,writeFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import {normalizeBuildBase,rebaseAssetJSON,rebaseBrowserText} from './build-base.mjs';
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const base=normalizeBuildBase(process.env.BASE_PATH??'/');
// Browser entry modules are not imported by the model tests. Validate them
// before replacing the previous build, so malformed UI code fails the build.
for(const file of (await readdir(resolve(root,'src'))).filter(f=>f.endsWith('.js'))) {
  const result=spawnSync(process.execPath,['--check',resolve(root,'src',file)],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Invalid JavaScript in ${file}: ${result.stderr || result.error}`);
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist);
for (const path of ['index.html', 'style.css', 'src']) await cp(resolve(root, path), resolve(dist, path), { recursive: true });
await cp(resolve(root, 'public/assets'), resolve(dist, 'assets'), { recursive: true });
if(base!=='/') {
  async function transform(directory) {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const path=resolve(directory,entry.name);
      if(entry.isDirectory()){await transform(path);continue;}
      const extension=extname(path);
      if(!['.html','.css','.js','.json'].includes(extension))continue;
      const source=await readFile(path,'utf8');
      const emitted=extension==='.json'?JSON.stringify(rebaseAssetJSON(JSON.parse(source),base)):rebaseBrowserText(source,base);
      if(emitted!==source)await writeFile(path,emitted);
    }
  }
  await transform(dist);
}
console.log(`Built static browser game in dist/ (base ${base})`);
