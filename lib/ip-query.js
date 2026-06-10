const http = require('http');
const https = require('https');

const API_SERVICES = [
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${ip || ''}`,
    parse: (data) => ({
      ip: data.ip,
      success: data.success,
      type: data.type,
      version: data.type,
      continent: data.continent,
      continent_code: data.continent_code,
      country: data.country,
      country_code: data.country_code,
      region: data.region,
      region_code: data.region_code,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      is_eu: data.is_eu,
      postal: data.postal,
      calling_code: data.calling_code,
      capital: data.capital,
      borders: data.borders,
      flag: data.flag,
      connection: data.connection,
      timezone: data.timezone,
      timezone_id: data.timezone?.id,
      timezone_abbr: data.timezone?.abbr,
      timezone_utc: data.timezone?.utc,
      timezone_offset: data.timezone?.offset,
      timezone_dst: data.timezone?.is_dst,
      country_capital: data.capital,
      country_calling_code: data.calling_code,
      asn: data.connection?.asn,
      org: data.connection?.org,
      isp: data.connection?.isp,
      domain: data.connection?.domain,
      flag_img: data.flag?.img,
      flag_emoji: data.flag?.emoji
    })
  },
  {
    name: 'ipquery.io',
    url: (ip) => `https://api.ipquery.io/${ip || ''}`,
    parse: (data) => ({
      ip: data.ip,
      city: data.location?.city,
      region: data.location?.state,
      region_code: data.location?.state,
      country: data.location?.country,
      country_code: data.location?.country_code,
      postal: data.location?.zipcode,
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      timezone: data.location?.timezone,
      asn: data.isp?.asn,
      org: data.isp?.org,
      isp: data.isp?.isp
    })
  },
  {
    name: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${ip || ''}/json/`,
    parse: (data) => ({
      ip: data.ip,
      version: data.version,
      city: data.city,
      region: data.region,
      region_code: data.region_code,
      country: data.country_name,
      country_code: data.country_code,
      country_capital: data.country_capital,
      continent_code: data.continent_code,
      in_eu: data.in_eu,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      utc_offset: data.utc_offset,
      country_calling_code: data.country_calling_code,
      currency: data.currency,
      currency_name: data.currency_name,
      languages: data.languages,
      asn: data.asn,
      org: data.org
    })
  }
];

function fetchData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IPQuery/1.0)',
        'Accept': 'application/json'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// 判断是否是私有/本地 IP
function isPrivateOrLocalIp(ip) {
  console.log(`[IP Check] Checking if IP is private/local: ${ip}`);
  if (!ip) {
    console.log(`[IP Check] IP is empty, treating as private/local`);
    return true;
  }
  
  // 先处理 IPv6 映射的 IPv4 地址 (::ffff:xxx.xxx.xxx.xxx)
  let cleanIp = ip;
  const ipv6MappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv6MappedMatch) {
    cleanIp = ipv6MappedMatch[1];
    console.log(`[IP Check] Detected IPv6 mapped IPv4, cleaned to: ${cleanIp}`);
  }
  
  // IPv4 私有/本地地址范围
  const ipv4Private = /^(?:10\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.)/;
  // IPv6 本地地址
  const ipv6Private = /^(?:::1|fc00:|fd00:|fe80:)/;
  
  const isPrivate = ipv4Private.test(cleanIp) || ipv6Private.test(ip);
  console.log(`[IP Check] IP ${ip} (cleaned: ${cleanIp}) is private/local: ${isPrivate}`);
  
  return isPrivate;
}

async function queryIP(ip) {
  // 如果是私有/本地 IP，不传参数让外部 API 自动检测
  const targetIP = isPrivateOrLocalIp(ip) ? '' : ip;
  
  for (const service of API_SERVICES) {
    try {
      console.log(`[IP Query] Calling ${service.name} for IP: ${targetIP || 'auto-detect'}`);
      const data = await fetchData(service.url(targetIP));
      console.log(`[IP Query] ${service.name} response:`, data);
      
      if (data.success === false || data.error) {
        console.log(`[IP Query] ${service.name} returned error, skipping...`);
        continue;
      }
      
      if (!data.ip) {
        console.log(`[IP Query] ${service.name} response missing IP field, skipping...`);
        continue;
      }
      
      const result = {
        success: true,
        ip: data.ip,
        info: service.parse(data),
        source: service.name
      };
      console.log(`[IP Query] Successfully got result from ${service.name}:`, result);
      
      return result;
    } catch (error) {
      console.error(`[IP Query] Error querying ${service.name}:`, error.message);
      continue;
    }
  }
  
  const errorResult = {
    success: false,
    error: '所有IP查询服务均不可用'
  };
  console.log(`[IP Query] All services failed, returning error:`, errorResult);
  
  return errorResult;
}

module.exports = { queryIP };