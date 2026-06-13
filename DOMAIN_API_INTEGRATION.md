# 域名 API 集成文档

## 🎯 功能概述

支持 Cloudflare 和 Porkbun 域名 API，自动导入域名到 RenewHelper。

### 支持的域名商

| 域名商 | 域名查询 | API 类型 |
|--------|----------|----------|
| Cloudflare | ✅ | Global API Key 或 Token API |
| Porkbun | ✅ | API Key + Secret |

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

## 📡 API 端点

### 获取配置状态

```
GET /api/domain-providers
```

### 同步域名

```
POST /api/sync-domains/cloudflare
POST /api/sync-domains/porkbun
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
