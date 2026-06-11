const http = require('http');
const https = require('https');
const iconv = require('iconv-lite');

// 国外 API 服务
const FOREIGN_API_SERVICES = [
  {
    name: 'ipwho.is',
    type: 'foreign',
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
    }),
    checkSuccess: (data) => data.success !== false
  },
  {
    name: 'ipquery.io',
    type: 'foreign',
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
    }),
    checkSuccess: (data) => !!data.ip
  },
  {
    name: 'ipapi.co',
    type: 'foreign',
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
    }),
    checkSuccess: (data) => !data.error
  }
];

// 国内 API 服务
const DOMESTIC_API_SERVICES = [
  {
    name: 'ip9.com.cn',
    type: 'domestic',
    url: (ip) => ip ? `https://ip9.com.cn/get?ip=${ip}` : 'https://ip9.com.cn/get',
    parse: (data) => {
      const d = data.data || data;
      return {
        ip: d.ip,
        country: d.country,
        country_code: d.country_code,
        region: d.prov,
        region_code: d.city_short_code,
        city: d.city,
        city_code: d.city_code,
        area: d.area,
        postal: d.post_code,
        area_code: d.area_code,
        isp: d.isp,
        latitude: d.lat,
        longitude: d.lng,
        big_area: d.big_area
      };
    },
    checkSuccess: (data) => data.ret === 200 || (data.data && data.data.ip)
  },
  {
    name: 'pconline',
    type: 'domestic',
    url: (ip) => ip ? `https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=${ip}` : 'https://whois.pconline.com.cn/ipJson.jsp?json=true',
    parse: (data) => ({
      ip: data.ip,
      country: data.country,
      region: data.pro,
      city: data.city,
      isp: data.isp,
      latitude: data.lat,
      longitude: data.lng,
      address: data.addr
    }),
    checkSuccess: (data) => !!data.ip
  }
];

function parseJsonSafely(data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

function getCharsetFromContentType(contentType) {
  const match = contentType.match(/charset=([^;\s]+)/i);
  return match ? match[1].toLowerCase() : 'utf-8';
}

function decodeResponseBody(buffer, contentType) {
  const charset = getCharsetFromContentType(contentType);

  if (charset === 'utf-8' || charset === 'utf8') {
    return buffer.toString('utf8');
  }

  if (iconv.encodingExists(charset)) {
    return iconv.decode(buffer, charset);
  }

  return buffer.toString('utf8');
}

function decodeUnicodeEscapes(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return decodeUnicodeEscapes(value).trim();
}

function normalizeObjectText(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeObjectText(item));
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (value && typeof value === 'object') {
        return [key, normalizeObjectText(value)];
      }
      return [key, normalizeText(value)];
    })
  );
}

function fetchData(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IPQuery/1.0)',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 15000
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const contentType = (res.headers['content-type'] || '').toLowerCase();
        const buffer = Buffer.concat(chunks);
        const decoded = decodeResponseBody(buffer, contentType);
        const normalizedData = decoded.trim();
        const json = parseJsonSafely(normalizedData);

        if (json) {
          resolve(normalizeObjectText(json));
          return;
        }

        if (contentType.includes('application/json') || normalizedData.startsWith('{') || normalizedData.startsWith('[')) {
          reject(new Error(`Invalid JSON response (${res.statusCode})`));
          return;
        }

        reject(new Error(`Non-JSON response (${res.statusCode})`));
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

async function querySingleService(service, ip) {
  const targetIP = isPrivateOrLocalIp(ip) ? '' : ip;
  try {
    console.log(`[IP Query] Calling ${service.name} (${service.type}) for IP: ${targetIP || 'auto-detect'}`);
    const data = await fetchData(service.url(targetIP));
    console.log(`[IP Query] ${service.name} response:`, data);
    
    if (service.checkSuccess && !service.checkSuccess(data)) {
      console.log(`[IP Query] ${service.name} returned unsuccessful response`);
      return {
        success: false,
        error: '查询失败',
        source: service.name,
        type: service.type
      };
    }
    
    // 检查 IP 字段
    const ipValue = data.ip || (data.data && data.data.ip);
    if (!ipValue) {
      console.log(`[IP Query] ${service.name} response missing IP field`);
      return {
        success: false,
        error: '缺少 IP 字段',
        source: service.name,
        type: service.type
      };
    }
    
    const result = {
      success: true,
      ip: ipValue,
      info: service.parse(data),
      source: service.name,
      type: service.type
    };
    console.log(`[IP Query] Successfully got result from ${service.name}:`, result);
    
    return result;
  } catch (error) {
    console.error(`[IP Query] Error querying ${service.name}:`, error.message);
    return {
      success: false,
      error: error.message,
      source: service.name,
      type: service.type
    };
  }
}

async function queryIP(ip) {
  const isAutoDetect = isPrivateOrLocalIp(ip);
  const effectiveForeignServices = isAutoDetect
    ? FOREIGN_API_SERVICES.filter(service => service.name === 'ipwho.is')
    : FOREIGN_API_SERVICES;

  // 同时调用国内和国外 API
  const domesticPromises = DOMESTIC_API_SERVICES.map(service => querySingleService(service, ip));
  const foreignPromises = effectiveForeignServices.map(service => querySingleService(service, ip));
  
  const [domesticResults, foreignResults] = await Promise.all([
    Promise.all(domesticPromises),
    Promise.all(foreignPromises)
  ]);
  
  // 从结果中找出成功的
  const domesticSuccess = domesticResults.find(r => r.success);
  const foreignSuccess = foreignResults.find(r => r.success);
  
  return {
    success: true,
    domestic: domesticSuccess || { success: false, error: '国内查询失败', type: 'domestic' },
    foreign: foreignSuccess || { success: false, error: '国外查询失败', type: 'foreign' },
    allDomestic: domesticResults,
    allForeign: foreignResults
  };
}

module.exports = { queryIP };