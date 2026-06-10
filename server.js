const http = require('http');
const fs = require('fs');
const path = require('path');
const { queryIP } = require('./lib/ip-query');

const PORT = 3000;

// 获取用户真实 IP 的函数
function getClientIp(req) {
  console.log(`[Server] Getting client IP from request`);
  console.log(`[Server] Request headers:`, req.headers);
  
  // 检查各种代理头
  const headers = req.headers;
  
  // 常见的代理头
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded',
    'x-forwarded'
  ];
  
  for (const header of ipHeaders) {
    const value = headers[header];
    if (value) {
      console.log(`[Server] Found header ${header}: ${value}`);
      // x-forwarded-for 可能包含多个 IP，取第一个
      const ips = value.split(',').map(ip => ip.trim());
      for (const ip of ips) {
        if (ip && !isPrivateIp(ip)) {
          console.log(`[Server] Found public IP from header ${header}: ${ip}`);
          return ip;
        }
      }
    }
  }
  
  // 如果没有代理头，直接使用 socket 地址
  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  console.log(`[Server] Using socket IP: ${socketIp}`);
  return socketIp;
}

// 判断是否是私有 IP
function isPrivateIp(ip) {
  if (!ip) return false;
  
  // 先处理 IPv6 映射的 IPv4 地址 (::ffff:xxx.xxx.xxx.xxx)
  let cleanIp = ip;
  const ipv6MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv6MappedMatch) {
    cleanIp = ipv6MappedMatch[1];
  }
  
  // IPv4 私有地址范围
  const ipv4Private = /^(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.)/;
  // IPv6 本地地址
  const ipv6Private = /^(?:::1|fc00:|fd00:|fe80:)/;
  
  const isPrivate = ipv4Private.test(cleanIp) || ipv6Private.test(ip);
  console.log(`[Server] IP ${ip} (cleaned: ${cleanIp}) is private: ${isPrivate}`);
  return isPrivate;
}

const server = http.createServer(async (req, res) => {
  console.log(`\n[Server] New request: ${req.method} ${req.url}`);
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // API路由
  if (url.pathname === '/api/ip') {
    let ip = url.searchParams.get('ip') || '';
    console.log(`[Server] Requested IP from query: ${ip}`);
    
    // 如果没有指定 IP，尝试获取用户真实 IP
    if (!ip) {
      ip = getClientIp(req);
    }
    console.log(`[Server] Final IP to query: ${ip}`);
    
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
