const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/script.js': ['script.js', 'text/javascript'], '/focus-timer.js': ['focus-timer.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': file[1] + '; charset=utf-8' });
  res.end(fs.readFileSync(path.join(__dirname, '..', file[0])));
}).listen(4173, '127.0.0.1');
