# IP 查询服务

一个简单的IP查询网站，支持自动显示访问者IP和查询任意IP地址信息。

## 功能特点

- 🔍 自动显示访问者的IP信息
- 🔎 支持查询任意IP地址
- 🚀 部署简单，无需维护数据库
- 💎 支持多平台部署（Vercel、Cloudflare Workers、Deno）
- 🔄 多个IP查询API服务冗余，按优先级自动切换

## IP查询服务优先级

1. ipquery.io
2. ipwho.is
3. ipapi.co

## 部署方式

### 1. 部署到 Vercel

1. 将项目推送到 GitHub 仓库
2. 访问 [Vercel](https://vercel.com) 并导入仓库
3. 等待部署完成即可

### 2. 部署到 Cloudflare Workers

使用 Wrangler CLI 部署：

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
wrangler deploy
```

### 3. 部署到 Deno Deploy

1. 访问 [Deno Deploy](https://deno.com/deploy)
2. 创建新项目，选择 `main.ts` 作为入口文件
3. 部署完成即可访问

### 4. 本地运行（Deno）

```bash
deno run --allow-net main.ts
```

## 项目结构

```
.
├── index.html          # 前端页面
├── api/ip.js           # Vercel API 路由
├── lib/ip-query.js     # IP查询逻辑
├── vercel.json         # Vercel 配置
├── worker.js           # Cloudflare Workers 代码
├── wrangler.toml       # Cloudflare Workers 配置
├── main.ts             # Deno 服务器
└── README.md           # 说明文档
```

## API 说明

### GET /api/ip

查询IP信息。

**参数：**
- `ip` (可选) - 要查询的IP地址，不提供则查询访问者IP

**响应示例：**
```json
{
  "success": true,
  "ip": "8.8.8.8",
  "info": {
    "ip": "8.8.8.8",
    "version": "IPv4",
    "city": "Mountain View",
    "region": "California",
    "country": "United States",
    "timezone": "America/Los_Angeles",
    "org": "Google LLC",
    ...
  },
  "source": "ipquery.io"
}
```

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Node.js (Vercel) / Cloudflare Workers / Deno
- 无数据库依赖

## 许可证

MIT
