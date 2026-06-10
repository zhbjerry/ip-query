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

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IP 查询</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px 0;
        }

        h1 {
            font-size: 2.5rem;
            color: #2d3748;
            margin-bottom: 10px;
        }

        .search-box {
            display: flex;
            gap: 12px;
            margin-bottom: 30px;
        }

        .search-input {
            flex: 1;
            padding: 14px 20px;
            font-size: 1.1rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            outline: none;
            transition: border-color 0.3s;
        }

        .search-input:focus {
            border-color: #4299e1;
        }

        .search-btn {
            padding: 14px 28px;
            font-size: 1.1rem;
            background: #4299e1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .search-btn:hover {
            background: #3182ce;
        }

        .my-ip-btn {
            padding: 14px 28px;
            font-size: 1.1rem;
            background: #48bb78;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .my-ip-btn:hover {
            background: #38a169;
        }

        .result-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        .result-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #f0f0f0;
        }

        .ip-address {
            font-size: 1.8rem;
            font-weight: bold;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .flag-emoji {
            font-size: 2.5rem;
        }

        .status-badge {
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .status-success {
            background: #c6f6d5;
            color: #22543d;
        }

        .status-error {
            background: #fed7d7;
            color: #742a2a;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .info-item {
            padding: 16px;
            background: #f7fafc;
            border-radius: 8px;
        }

        .info-label {
            font-size: 0.85rem;
            color: #718096;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: 1.1rem;
            color: #2d3748;
            font-weight: 500;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #718096;
        }

        .spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-top-color: #4299e1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error {
            text-align: center;
            padding: 40px;
            color: #c53030;
        }

        footer {
            text-align: center;
            margin-top: 40px;
            color: #718096;
            font-size: 0.9rem;
        }

        footer a {
            color: #4299e1;
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>IP 查询</h1>
        </header>

        <div class="search-box">
            <input type="text" class="search-input" id="ipInput" placeholder="输入 IP 地址（如 8.8.8.8）" />
            <button class="search-btn" id="searchBtn">查询</button>
            <button class="my-ip-btn" id="myIpBtn">我的 IP</button>
        </div>

        <div id="result"></div>

        <footer>
            <p>使用 <a href="https://api.ipquery.io/" target="_blank">ipquery.io</a>、<a href="https://ipwho.is/" target="_blank">ipwho.is</a> 和 <a href="https://ipapi.co/" target="_blank">ipapi.co</a> 提供数据</p>
        </footer>
    </div>

    <script>
        const ipInput = document.getElementById('ipInput');
        const searchBtn = document.getElementById('searchBtn');
        const myIpBtn = document.getElementById('myIpBtn');
        const resultDiv = document.getElementById('result');

        async function queryIP(ip) {
            showLoading();
            try {
                const url = ip ? '/api/ip?ip=' + encodeURIComponent(ip) : '/api/ip';
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.success) {
                    showResult(data);
                } else {
                    showError(data.error || '查询失败');
                }
            } catch (error) {
                showError('网络错误：' + error.message);
            }
        }

        function showLoading() {
            resultDiv.innerHTML = '<div class="result-card"><div class="loading"><div class="spinner"></div><p>正在查询...</p></div></div>';
        }

        function showError(message) {
            resultDiv.innerHTML = '<div class="result-card"><div class="result-header"><span class="ip-address">查询失败</span><span class="status-badge status-error">错误</span></div><div class="error"><p>' + message + '</p></div></div>';
        }

        function showResult(data) {
            const flagEmoji = data.info.flag_emoji || '';
            const infoItems = Object.entries(data.info)
                .filter(([key]) => !['flag_img', 'flag_emoji'].includes(key))
                .map(([key, value]) => {
                    const label = formatLabel(key);
                    if (key === 'in_eu') {
                        value = value ? '是' : '否';
                    }
                    if (key === 'timezone_dst') {
                        value = value ? '是' : '否';
                    }
                    return '<div class="info-item"><div class="info-label">' + label + '</div><div class="info-value">' + (value !== null && value !== undefined ? value : '-') + '</div></div>';
                }).join('');

            resultDiv.innerHTML = '<div class="result-card"><div class="result-header"><span class="ip-address">' + (flagEmoji ? '<span class="flag-emoji">' + flagEmoji + '</span>' : '') + data.ip + '</span><span class="status-badge status-success">成功</span></div><div class="info-grid">' + infoItems + '</div></div>';
        }

        function formatLabel(key) {
            const labels = {
                ip: 'IP 地址',
                version: '版本',
                city: '城市',
                region: '地区',
                region_code: '地区代码',
                country: '国家',
                country_code: '国家代码',
                country_code_iso3: 'ISO3 代码',
                country_capital: '首都',
                country_tld: '顶级域名',
                continent: '大洲',
                continent_code: '大洲代码',
                in_eu: '欧盟成员',
                postal: '邮编',
                latitude: '纬度',
                longitude: '经度',
                timezone: '时区',
                timezone_abbr: '时区缩写',
                timezone_utc: 'UTC 偏移',
                timezone_dst: '夏令时',
                utc_offset: 'UTC 偏移',
                country_calling_code: '国际区号',
                currency: '货币',
                currency_name: '货币名称',
                languages: '语言',
                country_area: '国家面积',
                country_population: '国家人口',
                asn: 'ASN',
                org: '组织',
                isp: 'ISP',
                hostname: '主机名',
                domain: '域名',
                borders: '接壤国家'
            };
            return labels[key] || key.replace(/_/g, ' ').toUpperCase();
        }

        searchBtn.addEventListener('click', () => {
            const ip = ipInput.value.trim();
            if (ip) {
                queryIP(ip);
            }
        });

        myIpBtn.addEventListener('click', () => {
            ipInput.value = '';
            queryIP('');
        });

        ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const ip = ipInput.value.trim();
                if (ip) {
                    queryIP(ip);
                }
            }
        });

        // 页面加载时自动查询本机 IP
        queryIP('');
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/ip') {
      const ip = url.searchParams.get('ip') || '';
      const result = await queryIP(ip);
      
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        status: result.success ? 200 : 500
      });
    }
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
