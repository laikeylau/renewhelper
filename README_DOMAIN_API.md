# 🌐 RenewHelper 域名 API 集成

本项目在原版 [RenewHelper](https://github.com/ieax/renewhelper) 基础上，新增了域名 API 自动同步功能。

## ✨ 新增功能

- **自动导入域名**：通过 Cloudflare / Porkbun API 自动获取域名列表
- **智能去重**：已存在的域名不会重复添加
- **自动分类**：域名自动添加 `Domain` 标签
- **批量同步**：一键同步所有配置的域名商

## 📋 支持的域名商

| 域名商 | 域名查询 | API 类型 |
|--------|----------|----------|
| Cloudflare | ✅ | Global API Key / Token API |
| Porkbun | ✅ | API Key + Secret |
| DNSHE | ✅ | API Key + Secret |
| DigitalPlat | ✅ | API Key + Secret |

## 🚀 快速开始

### 方式一：Cloudflare Workers 部署（推荐）

1. **Fork 项目**
   ```
   https://github.com/laikeylau/renewhelper
   ```

2. **创建 Cloudflare KV**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Workers & Pages -> KV -> Create namespace
   - 命名为 `RENEW_KV`
   - 复制 KV ID

3. **配置 GitHub Secrets**
   
   进入你的 Fork 仓库 -> Settings -> Secrets and variables -> Actions：

   **必填：**
   | Secret | 说明 |
   |--------|------|
   | `CF_API_TOKEN` | Cloudflare API Token |
   | `CF_ACCOUNT_ID` | Cloudflare Account ID |
   | `CF_KV_ID` | KV Namespace ID |
   | `AUTH_PASSWORD` | 登录密码 |

   **可选（域名 API）：**
   | Secret | 说明 |
   |--------|------|
   | `CF_DOMAIN_API_KEY` | Cloudflare API Key 或 Token |
   | `CF_DOMAIN_EMAIL` | Cloudflare 邮箱 |
   | `CF_DOMAIN_API_TYPE` | API 类型：`global` 或 `token` |
   | `PORKBUN_API_KEY` | Porkbun API Key |
   | `PORKBUN_API_SECRET` | Porkbun API Secret |
   | `DNSHE_API_KEY` | DNSHE API Key |
   | `DNSHE_API_SECRET` | DNSHE API Secret |
   | `DIGITALPLAT_API_KEY` | DigitalPlat API Key |
   | `DIGITALPLAT_API_SECRET` | DigitalPlat API Secret |

4. **触发部署**
   - 进入 Actions 标签页
   - 点击 "Deploy to Cloudflare Workers" -> Run workflow

5. **获取 API Key**

   **Cloudflare Global API Key：**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 右上角头像 -> My Profile -> API Tokens
   - API Keys -> Global API Key -> View

   **Cloudflare API Token（推荐）：**
   - 右上角头像 -> My Profile -> API Tokens
   - Create Token
   - 选择 "Edit zone DNS" 模板
   - 权限：Zone: Zone Read
   - 创建并复制 Token

   **Porkbun API：**
   - 登录 [Porkbun](https://porkbun.com/)
   - Account -> API Access
   - Enable API access
   - 复制 API Key 和 Secret

   **DNSHE API：**
   - 登录 [DNSHE Client Area](https://my.dnshe.com/)
   - Free Domain Management -> API Management
   - Create API Key
   - 复制 API Key 和 API Secret

   **DigitalPlat API：**
   - 登录 [DigitalPlat Dashboard](https://dash.domain.digitalplat.org/)
   - Dashboard -> API Keys
   - Create API Key
   - 复制 API Key 和 API Secret

### 方式二：Docker 部署

1. **克隆项目**
   ```bash
   git clone https://github.com/laikeylau/renewhelper.git
   cd renewhelper
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件填写配置
   ```

3. **启动服务**
   ```bash
   docker compose up -d
   ```

4. **访问服务**
   ```
   http://localhost:9787
   ```

## 📡 API 端点

### 获取配置状态

```bash
GET /api/domain-providers
```

### 同步域名

```bash
# 同步 Cloudflare
POST /api/sync-domains/cloudflare

# 同步 Porkbun
POST /api/sync-domains/porkbun

# 同步 DNSHE
POST /api/sync-domains/dnshe

# 同步 DigitalPlat
POST /api/sync-domains/digitalplat

# 同步所有
POST /api/sync-domains/all
```

## 📁 项目结构

```
renewhelper/
├── src/
│   ├── backend/
│   │   └── index.js          # 主后端代码
│   ├── domain-api.js         # 域名 API 模块 ⭐ 新增
│   ├── domain-api-routes.js  # API 路由定义 ⭐ 新增
│   └── frontend/
├── .github/
│   └── workflows/
│       └── deploy.yml        # 部署工作流 ⭐ 更新
├── wrangler.toml             # Worker 配置 ⭐ 更新
├── docker-compose.yml        # Docker 配置
├── .env.example              # 环境变量模板 ⭐ 新增
├── DOMAIN_API_INTEGRATION.md # 功能详细文档 ⭐ 新增
├── INTEGRATION_GUIDE.md      # 集成指南 ⭐ 新增
└── README_DOMAIN_API.md      # 本文档 ⭐ 新增
```

## 📚 文档

- [DOMAIN_API_INTEGRATION.md](./DOMAIN_API_INTEGRATION.md) - 功能详细文档
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 集成指南

## ⚠️ 注意事项

1. **API 限制**
   - Cloudflare Free 每天 100,000 次 API 请求
   - 建议每天同步一次即可

2. **安全建议**
   - API Key 只需读取权限
   - 不要使用有删除权限的 Key

3. **数据同步**
   - 已存在的域名会被跳过
   - 同步不会覆盖现有数据

## 🤝 致谢

- [RenewHelper](https://github.com/ieax/renewhelper) - 原版项目 by LOSTFREE
- [dmn](https://github.com/v3xlabs/dmn) - 域名管理灵感来源

## 📄 License

MIT License
