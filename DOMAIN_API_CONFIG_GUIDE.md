# 域名商API配置指南

## 概述

RenewHelper 现在支持通过管理界面直接配置域名商API密钥，无需在GitHub或Cloudflare后台设置环境变量。

## 支持的域名商

| 域名商 | 所需密钥 | 说明 |
|--------|----------|------|
| **Cloudflare** | API Key + Email 或 API Token | 支持 Global API Key 和 API Token 两种方式 |
| **Porkbun** | API Key + API Secret | 从 Porkbun 后台获取 |
| **DNSHE** | API Key + API Secret | 从 DNSHE 后台获取 |
| **DigitalPlat** | API Key + API Secret | 从 DigitalPlat 后台获取 |

## 配置步骤

### 1. 访问配置页面

1. 登录 RenewHelper 管理界面
2. 进入 **设置** 页面
3. 找到 **域名同步** 部分
4. 点击右上角的 **⚙️ 配置API密钥** 按钮

### 2. 配置域名商

#### Cloudflare

1. 开启 Cloudflare 开关
2. 选择API类型：
   - **Global API Key**: 使用账户全局API密钥
   - **API Token**: 使用创建的API Token（推荐，权限更小更安全）
3. 输入对应的密钥
4. 如果使用 Global API Key，还需输入邮箱
5. 点击 **测试连接** 验证配置

#### Porkbun

1. 开启 Porkbun 开关
2. 输入 API Key
3. 输入 API Secret
4. 点击 **测试连接** 验证配置

#### DNSHE

1. 开启 DNSHE 开关
2. 输入 API Key
3. 输入 API Secret
4. 点击 **测试连接** 验证配置

#### DigitalPlat

1. 开启 DigitalPlat 开关
2. 输入 API Key
3. 输入 API Secret
4. 点击 **测试连接** 验证配置

### 3. 同步域名

配置完成后，可以：
- 点击 **同步域名** 按钮同步单个提供商的域名
- 点击 **同步所有** 按钮同步所有已配置提供商的域名

## 安全说明

- API密钥存储在 Cloudflare KV 中，加密存储
- 在界面显示时，密钥会被掩码处理（只显示前8位）
- 只有在更新时才会实际修改密钥值
- 建议使用 API Token 而非 Global API Key（仅限Cloudflare）

## 从环境变量迁移

如果你之前通过环境变量配置了API密钥：

1. 访问配置页面
2. 输入相同的密钥
3. 保存后，系统会优先使用KV中存储的配置
4. 可以删除旧的环境变量（可选）

## 故障排除

### 测试连接失败

- 检查密钥是否正确输入
- 确认密钥有正确的权限
- 检查网络连接

### 同步失败

- 确保配置已保存
- 检查域名商API是否有访问限制
- 查看浏览器控制台获取详细错误信息

### 配置不生效

- 刷新页面重新加载配置
- 检查是否有多余的空格
- 尝试重新输入密钥
