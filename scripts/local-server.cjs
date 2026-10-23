// Dependency-free loopback server used by the Windows portable package.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const APP = 'three-kingdoms-local-v1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };

function createGameServer(root) {
  root = path.resolve(root);
  return http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    const reply = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(text); };
    if (!['GET', 'HEAD'].includes(req.method)) return reply(405, 'Method not allowed');
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch { return reply(400, 'Bad path'); }
    if (pathname === '/__game_health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ app: APP }));
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || pathname.includes('\\') || pathname.includes('\0')) return reply(403, 'Forbidden');
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) return reply(404, 'Not found');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    });
  });
}

function openBrowser(url) {
  if (process.env.THREE_KINGDOMS_NO_BROWSER === '1') return;
  const child = spawn('explorer.exe', [url], { windowsHide: true, stdio: 'ignore' });
  child.on('error', () => console.log('请手动在浏览器中打开：' + url));
  child.unref();
}

async function main() {
  const port = Number(process.env.THREE_KINGDOMS_PORT || 18743);
  const root = path.join(__dirname, 'www');
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('游戏文件不完整，请重新复制整个本地版文件夹。');
  const url = `http://127.0.0.1:${port}/`;
  const server = createGameServer(root);
  server.on('error', async error => {
    if (error.code === 'EADDRINUSE') {
      try {
        const response = await fetch(url + '__game_health', { signal: AbortSignal.timeout(2000) });
        if ((await response.json()).app === APP) {
          console.log('游戏已经启动，正在打开浏览器。');
          openBrowser(url);
          return;
        }
      } catch {}
      console.error(`端口 ${port} 已被其他程序占用。请关闭占用程序后重新启动游戏。`);
    } else console.error('启动失败：' + error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('\n乱世行旅 · 本地版\n\n游戏地址：' + url);
    console.log('浏览器将自动打开。游玩时请保留此窗口，关闭此窗口即可停止游戏服务。\n');
    openBrowser(url);
  });
}

module.exports = { createGameServer };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
