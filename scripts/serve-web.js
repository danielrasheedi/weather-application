// Local preview of the website version: node scripts/serve-web.js
// Serves the pages the way Vercel will, including the /api/weather function.
const http = require('http');
const fs = require('fs');
const path = require('path');
const weatherFunction = require('../api/weather');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIRS = ['renderer', 'graphics']; // nothing else (.env, data, main.js) is served
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/') {
    res.writeHead(302, { Location: '/renderer/home/read-home.html' });
    return res.end();
  }
  if (pathname === '/api/weather') return weatherFunction(req, res);

  const file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
  const top = path.relative(ROOT, file).split(path.sep)[0];
  if (!file.startsWith(ROOT) || !PUBLIC_DIRS.includes(top) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Website preview: http://127.0.0.1:${PORT}`));
