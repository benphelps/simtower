import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.wav': 'audio/wav' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname.startsWith('/assets/') ? `/public${pathname}` : pathname;
    const path = resolve(root, `.${relative === '/' ? '/index.html' : relative}`);
    if (!path.startsWith(root + sep) || !/^\/(index\.html|src\/|assets\/|style\.css|$)/.test(pathname)) {
      res.writeHead(404).end('Not found'); return;
    }
    if (!(await stat(path)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`SimTower: http://localhost:${port}`));
