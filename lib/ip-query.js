const API_SERVICES = [
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${ip || ''}`,
    parse: (data) => ({
      ip: data.ip,
      version: data.type,
      city: data.city,
      region: data.region,
      region_code: data.region_code,
      country: data.country,
      country_code: data.country_code,
      country_capital: data.capital,
      continent: data.continent,
      continent_code: data.continent_code,
      in_eu: data.is_eu,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id,
      timezone_abbr: data.timezone?.abbr,
      timezone_utc: data.timezone?.utc,
      timezone_dst: data.timezone?.is_dst,
      country_calling_code: data.calling_code,
      borders: data.borders,
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
      version: data.version,
      city: data.location?.city,
      region: data.location?.state,
      region_code: data.region_code,
      country: data.location?.country,
      country_code: data.location?.country_code,
      country_code_iso3: data.country_code_iso3,
      country_capital: data.country_capital,
      country_tld: data.country_tld,
      continent_code: data.continent_code,
      in_eu: data.in_eu,
      postal: data.location?.zipcode,
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      timezone: data.location?.timezone,
      utc_offset: data.utc_offset,
      country_calling_code: data.country_calling_code,
      currency: data.currency,
      currency_name: data.currency_name,
      languages: data.languages,
      country_area: data.country_area,
      country_population: data.country_population,
      asn: data.isp?.asn,
      org: data.isp?.org,
      isp: data.isp?.isp,
      hostname: data.hostname
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
      country_code_iso3: data.country_code_iso3,
      country_capital: data.country_capital,
      country_tld: data.country_tld,
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
      country_area: data.country_area,
      country_population: data.country_population,
      asn: data.asn,
      org: data.org,
      isp: null,
      hostname: data.hostname
    })
  }
];

async function queryIP(ip) {
  // 如果是本地IP，不传参数让API服务自动检测
  const isLocalIP = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '';
  const targetIP = isLocalIP ? '' : ip;
  
  for (const service of API_SERVICES) {
    try {
      const response = await fetch(service.url(targetIP));
      if (!response.ok) {
        continue;
      }
      
      // 先检查响应内容类型
      const contentType = response.headers.get('content-type') || '';
      let data;
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // 如果不是JSON，尝试直接解析为IP（针对ipquery.io的特殊处理）
        const text = await response.text();
        const possibleIP = text.trim();
        if (possibleIP && /^[\d.]+$/.test(possibleIP)) {
          // 如果看起来像IP，重新调用该服务但传入这个IP
          const retryResponse = await fetch(service.url(possibleIP));
          if (retryResponse.ok) {
            data = await retryResponse.json();
          } else {
            continue;
          }
        } else {
          continue;
        }
      }
      
      // 检查是否有错误
      if (data.success === false || data.error) {
        continue;
      }
      
      // 检查是否有IP字段
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
      console.error(`Error querying ${service.name}:`, error);
      continue;
    }
  }
  
  return {
    success: false,
    error: '所有IP查询服务均不可用'
  };
}

module.exports = { queryIP };
