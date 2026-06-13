# 域名 API 集成文档

## 🎯 功能概述

支持 Cloudflare、Porkbun、DNSHE 和 DigitalPlat 域名 API，自动导入域名到 RenewHelper。

### 支持的域名商

| 域名商 | 域名查询 | API 类型 |
|--------|----------|----------|
| Cloudflare | ✅ | Global API Key 或 Token API |
| Porkbun | ✅ | API Key + Secret |
| DNSHE | ✅ | API Key + Secret |
| DigitalPlat | ✅ | API Key + Secret |

## 🔧 环境变量

### Cloudflare Workers 部署

在 Cloudflare Dashboard -> Workers & Pages -> Settings -> Variables 中添加：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `AUTH_PASSWORD` | ✅ | 登录密码 |
| `CF_DOMAIN_API_KEY` | ❌ | Cloudflare API Key |
| `CF_DOMAIN_EMAIL` | ❌ | Cloudflare 邮箱 |
| `CF_DOMAIN_API_TYPE` | ❌ | `global` 或 `token` |
| `PORKBUN_API_KEY` | ❌ | Porkbun API Key |
| `PORKBUN_API_SECRET` | ❌ | Porkbun API Secret |
| `DNSHE_API_KEY` | ❌ | DNSHE API Key |
| `DNSHE_API_SECRET` | ❌ | DNSHE API Secret |
| `DIGITALPLAT_API_KEY` | ❌ | DigitalPlat API Key |
| `DIGITALPLAT_API_SECRET` | ❌ | DigitalPlat API Secret |

## 📡 API 端点

### 获取配置状态

```
GET /api/domain-providers
```

### 同步域名

```
POST /api/sync-domains/cloudflare
POST /api/sync-domains/porkbun
POST /api/sync-domains/dnshe
POST /api/sync-domains/digitalplat
POST /api/sync-domains/all
```

## 🔑 API Key 获取

### Cloudflare

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. My Profile -> API Tokens
3. Global API Key 或 Create Token

### Porkbun

1. 登录 [Porkbun](https://porkbun.com/)
2. Account -> API Access
3. Enable API access

### DNSHE

1. 登录 [DNSHE Client Area](https://my.dnshe.com/)
2. Free Domain Management -> API Management
3. Create API Key
4. 保存 API Key 和 API Secret

> API 地址：`https://api005.dnshe.com/index.php?m=domain_hub`
> 认证必须通过请求头传递：`X-API-Key` / `X-API-Secret`

### DigitalPlat

1. 登录 [DigitalPlat Dashboard](https://dash.domain.digitalplat.org/)
2. 获取可用的 API Secret / Token
3. 如平台额外分配 API Key，可一并填写；若没有 API Key，可只填写 API Secret

> 集成说明：服务端同步优先调用 `https://domain-api.digitalplat.org/api/v1`。
> 当前实现会优先使用 API Key，没有时回退为仅使用 API Secret 进行 Bearer 认证，并同时发送 `X-API-Secret`。
> 如果返回 `403` 或 Cloudflare challenge 页面，说明该接口当前被浏览器验证拦截，需要在提供商侧放行服务端 API 请求。
