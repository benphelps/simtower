import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
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
console.log('Built static browser game in dist/');
