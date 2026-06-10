const { queryIP } = require('../lib/ip-query');

// 获取用户真实 IP 的函数
function getClientIp(req) {
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
      // x-forwarded-for 可能包含多个 IP，取第一个
      const ips = value.split(',').map(ip => ip.trim());
      for (const ip of ips) {
        if (ip && !isPrivateIp(ip)) {
          return ip;
        }
      }
    }
  }
  
  // 如果没有代理头，直接使用 socket 地址
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}

// 判断是否是私有 IP
function isPrivateIp(ip) {
  if (!ip) return false;
  
  // IPv4 私有地址范围
  const ipv4Private = /^(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.)/;
  // IPv6 本地地址
  const ipv6Private = /^(?:::1|fc00:|fd00:|fe80:)/;
  
  return ipv4Private.test(ip) || ipv6Private.test(ip);
}

module.exports = async (req, res) => {
  let ip = req.query.ip || '';
  
  // 如果没有指定 IP，尝试获取用户真实 IP
  if (!ip) {
    ip = getClientIp(req);
  }
  
  const result = await queryIP(ip);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  res.status(result.success ? 200 : 500).json(result);
};
