const http = require('http');
const fs = require('fs');
const path = require('path');
const { queryIP } = require('./lib/ip-query');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // API路由
  if (url.pathname === '/api/ip') {
    const ip = url.searchParams.get('ip') || '';
    
    const result = await queryIP(ip);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    res.writeHead(result.success ? 200 : 500);
    res.end(JSON.stringify(result));
    return;
  }
  
  // 静态文件服务
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(content);
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`✨ 服务器已启动!`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`\n按 Ctrl+C 停止服务器`);
});
