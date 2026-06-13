# 集成指南

## 📋 文件说明

### 新增文件

1. `src/domain-api.js` - 域名 API 核心模块
2. `src/domain-api-routes.js` - API 路由定义
3. `src/frontend-domain-sync.html` - 前端 UI 组件

### 更新文件

1. `wrangler.toml` - 添加域名 API 环境变量
2. `.github/workflows/deploy.yml` - 添加 Secrets 传递

## 🔧 集成步骤

### 步骤 1：复制新增文件

```bash
# 复制域名 API 模块
cp src/domain-api.js /path/to/your/project/src/
cp src/domain-api-routes.js /path/to/your/project/src/
cp src/frontend-domain-sync.html /path/to/your/project/src/
```

### 步骤 2：更新 wrangler.toml

在 `[vars]` 部分添加：

```toml
[vars]
AUTH_PASSWORD = "admin"

# 域名 API 配置
# CF_DOMAIN_API_KEY = ""
# CF_DOMAIN_EMAIL = ""
# CF_DOMAIN_API_TYPE = "global"
# PORKBUN_API_KEY = ""
# PORKBUN_API_SECRET = ""
```

### 步骤 3：更新 GitHub Actions

在 `.github/workflows/deploy.yml` 的 secrets 中添加：

```yaml
secrets: |
  AUTH_PASSWORD
  CF_DOMAIN_API_KEY
  CF_DOMAIN_EMAIL
  CF_DOMAIN_API_TYPE
  PORKBUN_API_KEY
  PORKBUN_API_SECRET
```

### 步骤 4：添加路由到 _worker.js

在路由定义部分添加：

```javascript
// 域名 API 路由
router.get('/api/domain-providers', domainRoutes.getProviderStatus);
router.post('/api/sync-domains/cloudflare', domainRoutes.syncCloudflare);
router.post('/api/sync-domains/porkbun', domainRoutes.syncPorkbun);
router.post('/api/sync-domains/all', domainRoutes.syncAll);
```

## 🧪 测试

```bash
# 测试获取配置状态
curl -H "Authorization: Bearer TOKEN" \
     https://your-worker.workers.dev/api/domain-providers

# 测试同步
curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     https://your-worker.workers.dev/api/sync-domains/cloudflare
```
