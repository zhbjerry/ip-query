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

async function queryIP(ip) {
  const targetIP = ip || '';
  
  for (const service of API_SERVICES) {
    try {
      const data = await fetchData(service.url(targetIP));
      
      if (data.success === false || data.error) {
        continue;
      }
      
      if (!data.ip) {
        continue;
      }
      
      return {
        success: true,
        ip: data.ip,
        info: service.parse(data),
        source: service.name
      };
    } catch (error) {
      console.error(`Error querying ${service.name}:`, error.message);
      continue;
    }
  }
  
  return {
    success: false,
    error: '所有IP查询服务均不可用'
  };
}

module.exports = { queryIP };