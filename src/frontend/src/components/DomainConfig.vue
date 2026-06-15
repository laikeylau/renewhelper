<template>
  <div class="domain-config-panel">
    <!-- Cloudflare 配置 (支持多账户) -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">☁️</span>
          <span class="provider-name">Cloudflare</span>
          <span class="provider-status" :class="{ configured: isProviderConfigured('cloudflare') }">
            {{ isProviderConfigured('cloudflare') ? '已配置' : '未配置' }}
          </span>
          <span v-if="cloudflareAccounts.length > 0" class="account-count">
            ({{ cloudflareAccounts.length }} 个账户)
          </span>
        </div>
        <el-button size="small" type="primary" @click="addAccount('cloudflare')">
          + 添加账户
        </el-button>
      </div>
      
      <div v-if="cloudflareAccounts.length > 0" class="accounts-list">
        <div v-for="account in cloudflareAccounts" :key="account.id" class="account-item">
          <div class="account-header">
            <div class="account-info">
              <el-input v-model="account.name" size="small" style="width: 180px;" @blur="saveAccount('cloudflare', account)"></el-input>
              <el-switch v-model="account.enabled" size="small" @change="saveAccount('cloudflare', account)"></el-switch>
              <span class="account-status" :class="{ configured: account.apiKey && (account.email || account.apiType === 'token') }">
                {{ account.apiKey ? '✅ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
            <div class="account-actions">
              <el-button size="small" type="primary" link @click="testAccount('cloudflare', account)" :loading="testing === account.id">测试</el-button>
              <el-button size="small" type="success" link @click="syncAccount('cloudflare', account)" :loading="syncing === account.id">同步</el-button>
              <el-button size="small" type="danger" link @click="removeAccount('cloudflare', account.id)">删除</el-button>
            </div>
          </div>
          <div class="account-fields">
            <el-select v-model="account.apiType" size="small" style="width: 150px;" @change="saveAccount('cloudflare', account)">
              <el-option label="Global API Key" value="global"></el-option>
              <el-option label="API Token" value="token"></el-option>
            </el-select>
            <el-input v-model="account.apiKey" :placeholder="account.apiType === 'token' ? 'API Token' : 'Global API Key'" show-password size="small" @blur="saveAccount('cloudflare', account)"></el-input>
            <el-input v-if="account.apiType !== 'token'" v-model="account.email" placeholder="邮箱" size="small" @blur="saveAccount('cloudflare', account)"></el-input>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>尚未添加 Cloudflare 账户</p>
        <el-button size="small" type="primary" @click="addAccount('cloudflare')">添加第一个账户</el-button>
      </div>
    </div>

    <!-- Porkbun 配置 (支持多账户) -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🐷</span>
          <span class="provider-name">Porkbun</span>
          <span class="provider-status" :class="{ configured: isProviderConfigured('porkbun') }">
            {{ isProviderConfigured('porkbun') ? '已配置' : '未配置' }}
          </span>
          <span v-if="porkbunAccounts.length > 0" class="account-count">
            ({{ porkbunAccounts.length }} 个账户)
          </span>
        </div>
        <el-button size="small" type="primary" @click="addAccount('porkbun')">
          + 添加账户
        </el-button>
      </div>
      
      <div v-if="porkbunAccounts.length > 0" class="accounts-list">
        <div v-for="account in porkbunAccounts" :key="account.id" class="account-item">
          <div class="account-header">
            <div class="account-info">
              <el-input v-model="account.name" size="small" style="width: 180px;" @blur="saveAccount('porkbun', account)"></el-input>
              <el-switch v-model="account.enabled" size="small" @change="saveAccount('porkbun', account)"></el-switch>
              <span class="account-status" :class="{ configured: account.apiKey && account.apiSecret }">
                {{ account.apiKey && account.apiSecret ? '✅ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
            <div class="account-actions">
              <el-button size="small" type="primary" link @click="testAccount('porkbun', account)" :loading="testing === account.id">测试</el-button>
              <el-button size="small" type="success" link @click="syncAccount('porkbun', account)" :loading="syncing === account.id">同步</el-button>
              <el-button size="small" type="danger" link @click="removeAccount('porkbun', account.id)">删除</el-button>
            </div>
          </div>
          <div class="account-fields">
            <el-input v-model="account.apiKey" placeholder="API Key" show-password size="small" @blur="saveAccount('porkbun', account)"></el-input>
            <el-input v-model="account.apiSecret" placeholder="API Secret" show-password size="small" @blur="saveAccount('porkbun', account)"></el-input>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>尚未添加 Porkbun 账户</p>
        <el-button size="small" type="primary" @click="addAccount('porkbun')">添加第一个账户</el-button>
      </div>
    </div>

    <!-- DNSHE 配置 (支持多账户) -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🌐</span>
          <span class="provider-name">DNSHE</span>
          <span class="provider-status" :class="{ configured: isProviderConfigured('dnshe') }">
            {{ isProviderConfigured('dnshe') ? '已配置' : '未配置' }}
          </span>
          <span v-if="dnsheAccounts.length > 0" class="account-count">
            ({{ dnsheAccounts.length }} 个账户)
          </span>
        </div>
        <el-button size="small" type="primary" @click="addAccount('dnshe')">
          + 添加账户
        </el-button>
      </div>
      
      <div v-if="dnsheAccounts.length > 0" class="accounts-list">
        <div v-for="account in dnsheAccounts" :key="account.id" class="account-item">
          <div class="account-header">
            <div class="account-info">
              <el-input v-model="account.name" size="small" style="width: 180px;" @blur="saveAccount('dnshe', account)"></el-input>
              <el-switch v-model="account.enabled" size="small" @change="saveAccount('dnshe', account)"></el-switch>
              <span class="account-status" :class="{ configured: account.apiKey && account.apiSecret }">
                {{ account.apiKey && account.apiSecret ? '✅ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
            <div class="account-actions">
              <el-button size="small" type="primary" link @click="testAccount('dnshe', account)" :loading="testing === account.id">测试</el-button>
              <el-button size="small" type="success" link @click="syncAccount('dnshe', account)" :loading="syncing === account.id">同步</el-button>
              <el-button size="small" type="danger" link @click="removeAccount('dnshe', account.id)">删除</el-button>
            </div>
          </div>
          <div class="account-fields">
            <el-input v-model="account.apiKey" placeholder="API Key" show-password size="small" @blur="saveAccount('dnshe', account)"></el-input>
            <el-input v-model="account.apiSecret" placeholder="API Secret" show-password size="small" @blur="saveAccount('dnshe', account)"></el-input>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>尚未添加 DNSHE 账户</p>
        <el-button size="small" type="primary" @click="addAccount('dnshe')">添加第一个账户</el-button>
      </div>
    </div>

    <!-- DigitalPlat 配置 (支持多账户) -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🔑</span>
          <span class="provider-name">DigitalPlat</span>
          <span class="provider-status" :class="{ configured: isProviderConfigured('digitalplat') }">
            {{ isProviderConfigured('digitalplat') ? '已配置' : '未配置' }}
          </span>
          <span v-if="digitalplatAccounts.length > 0" class="account-count">
            ({{ digitalplatAccounts.length }} 个账户)
          </span>
        </div>
        <el-button size="small" type="primary" @click="addAccount('digitalplat')">
          + 添加账户
        </el-button>
      </div>
      
      <div v-if="digitalplatAccounts.length > 0" class="accounts-list">
        <div v-for="account in digitalplatAccounts" :key="account.id" class="account-item">
          <div class="account-header">
            <div class="account-info">
              <el-input v-model="account.name" size="small" style="width: 180px;" @blur="saveAccount('digitalplat', account)"></el-input>
              <el-switch v-model="account.enabled" size="small" @change="saveAccount('digitalplat', account)"></el-switch>
              <span class="account-status" :class="{ configured: account.apiSecret || account.apiKey }">
                {{ account.apiSecret || account.apiKey ? '✅ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
            <div class="account-actions">
              <el-button size="small" type="primary" link @click="testAccount('digitalplat', account)" :loading="testing === account.id">测试</el-button>
              <el-button size="small" type="success" link @click="syncAccount('digitalplat', account)" :loading="syncing === account.id">同步</el-button>
              <el-button size="small" type="danger" link @click="removeAccount('digitalplat', account.id)">删除</el-button>
            </div>
          </div>
          <div class="account-fields">
            <el-input v-model="account.apiSecret" placeholder="API Secret / Token" show-password size="small" @blur="saveAccount('digitalplat', account)"></el-input>
            <el-input v-model="account.apiKey" placeholder="API Key (可选)" show-password size="small" @blur="saveAccount('digitalplat', account)"></el-input>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>尚未添加 DigitalPlat 账户</p>
        <el-button size="small" type="primary" @click="addAccount('digitalplat')">添加第一个账户</el-button>
      </div>
    </div>

    <!-- 批量操作 -->
    <div class="batch-section">
      <div class="batch-header">
        <h3>批量操作</h3>
      </div>
      <div class="batch-actions">
        <el-button type="primary" @click="syncAllProviders" :loading="syncing === 'all'">
          🔄 同步所有已配置的账户
        </el-button>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".csv,.json"
          @change="handleFileUpload"
        >
          <el-button type="success">📁 批量导入 (CSV/JSON)</el-button>
        </el-upload>
      </div>
      <div class="batch-info">
        <p>支持的 CSV 格式: name/domain/域名, expiry/到期日期, price/价格, currency/币种, notes/备注</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits(['synced'])

// Account lists for each provider
const cloudflareAccounts = ref([])
const porkbunAccounts = ref([])
const dnsheAccounts = ref([])
const digitalplatAccounts = ref([])

const testing = ref(null)
const syncing = ref(null)
const uploadRef = ref(null)

// Check if provider has any configured accounts
const isProviderConfigured = (provider) => {
  const accounts = getAccounts(provider)
  return accounts.some(acc => acc.enabled && isAccountConfigured(provider, acc))
}

const isAccountConfigured = (provider, account) => {
  if (provider === 'cloudflare') {
    return account.apiKey && (account.email || account.apiType === 'token')
  } else if (provider === 'digitalplat') {
    return account.apiSecret || account.apiKey
  }
  return account.apiKey && account.apiSecret
}

const getAccounts = (provider) => {
  switch (provider) {
    case 'cloudflare': return cloudflareAccounts.value
    case 'porkbun': return porkbunAccounts.value
    case 'dnshe': return dnsheAccounts.value
    case 'digitalplat': return digitalplatAccounts.value
    default: return []
  }
}

const setAccounts = (provider, accounts) => {
  switch (provider) {
    case 'cloudflare': cloudflareAccounts.value = accounts; break
    case 'porkbun': porkbunAccounts.value = accounts; break
    case 'dnshe': dnsheAccounts.value = accounts; break
    case 'digitalplat': digitalplatAccounts.value = accounts; break
  }
}

const getToken = () => localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')

const loadConfig = async () => {
  try {
    const token = getToken()
    const response = await fetch('/api/domain-providers/config', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const data = await response.json()
    
    if (data.code === 200) {
      // Load each provider's accounts
      for (const provider of ['cloudflare', 'porkbun', 'dnshe', 'digitalplat']) {
        if (Array.isArray(data.data[provider])) {
          setAccounts(provider, data.data[provider])
        } else if (data.data[provider] && typeof data.data[provider] === 'object') {
          // Migrate old single account format to array
          const acc = data.data[provider]
          if (acc.apiKey || acc.apiSecret) {
            setAccounts(provider, [{ ...acc, id: 'default', name: 'Default' }])
          } else {
            setAccounts(provider, [])
          }
        } else {
          setAccounts(provider, [])
        }
      }
    }
  } catch (error) {
    console.error('Failed to load provider config:', error)
  }
}

const addAccount = async (provider) => {
  try {
    const token = getToken()
    const accounts = getAccounts(provider)
    const newAccount = {
      id: provider + '_' + Date.now().toString(36),
      name: `${provider.toUpperCase()} Account ${accounts.length + 1}`,
      enabled: true,
      apiKey: '',
      apiSecret: '',
      email: '',
      apiType: provider === 'cloudflare' ? 'global' : undefined
    }
    
    // For DNSHE, use the dedicated endpoint
    if (provider === 'dnshe') {
      const response = await fetch('/api/dnshe/accounts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAccount)
      })
      const data = await response.json()
      if (data.code === 200) {
        dnsheAccounts.value.push(data.data)
        ElMessage.success('账户已添加')
        return
      }
    }
    
    // For other providers, add locally and save
    accounts.push(newAccount)
    await saveProviderConfig(provider, accounts)
    ElMessage.success('账户已添加')
  } catch (error) {
    ElMessage.error('添加失败: ' + error.message)
  }
}

const saveAccount = async (provider, account) => {
  try {
    const token = getToken()
    const accounts = getAccounts(provider)
    
    if (provider === 'dnshe') {
      await fetch('/api/dnshe/accounts/update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId: account.id, ...account })
      })
    } else {
      await saveProviderConfig(provider, accounts)
    }
  } catch (error) {
    console.error('Save failed:', error)
  }
}

const removeAccount = async (provider, accountId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个账户吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const token = getToken()
    
    if (provider === 'dnshe') {
      await fetch('/api/dnshe/accounts/delete', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      })
      const index = dnsheAccounts.value.findIndex(a => a.id === accountId)
      if (index > -1) dnsheAccounts.value.splice(index, 1)
    } else {
      const accounts = getAccounts(provider)
      const index = accounts.findIndex(a => a.id === accountId)
      if (index > -1) accounts.splice(index, 1)
      await saveProviderConfig(provider, accounts)
    }
    
    ElMessage.success('账户已删除')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const saveProviderConfig = async (provider, accounts) => {
  try {
    const token = getToken()
    const response = await fetch('/api/domain-providers/config', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [provider]: { accounts } })
    })
    const data = await response.json()
    return data.code === 200
  } catch (error) {
    console.error('Save config failed:', error)
    return false
  }
}

const testAccount = async (provider, account) => {
  try {
    testing.value = account.id
    const token = getToken()
    const response = await fetch('/api/domain-providers/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider, accountId: account.id })
    })
    
    const data = await response.json()
    if (data.code === 200 && data.data.success) {
      ElMessage.success(`${account.name}: 连接成功`)
    } else {
      ElMessage.error(`${account.name}: 连接失败 - ${data.data?.message || data.msg}`)
    }
  } catch (error) {
    ElMessage.error('测试失败: ' + error.message)
  } finally {
    testing.value = null
  }
}

const syncAccount = async (provider, account) => {
  try {
    syncing.value = account.id
    const token = getToken()
    const response = await fetch(`/api/sync-domains/${provider}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: account.id })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success(`${account.name}: 同步完成！导入 ${data.data.synced} 个，跳过 ${data.data.skipped} 个`)
      emit('synced', { provider, result: data.data })
    } else {
      ElMessage.error('同步失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message)
  } finally {
    syncing.value = null
  }
}

const syncAllProviders = async () => {
  try {
    syncing.value = 'all'
    const token = getToken()
    const response = await fetch('/api/sync-domains/all', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    if (data.code === 200) {
      const result = data.data
      let message = `同步完成！总计 ${result.total} 个域名`
      ElMessage.success(message)
      emit('synced', { provider: 'all', result })
    } else {
      ElMessage.error('同步失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message)
  } finally {
    syncing.value = null
  }
}

const handleFileUpload = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  
  if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
    ElMessage.error('请上传 CSV 或 JSON 文件')
    return
  }
  
  try {
    const token = getToken()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('provider', 'batch-import')
    
    ElMessage.info('正在导入...')
    
    const response = await fetch('/api/import/batch', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      body: formData
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success(`导入完成！导入 ${data.data.synced} 个，跳过 ${data.data.skipped} 个`)
      emit('synced', { provider: 'batch-import', result: data.data })
    } else {
      ElMessage.error('导入失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  }
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.domain-config-panel {
  padding: 0;
}

.provider-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.provider-card:last-child {
  margin-bottom: 0;
}

.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-icon {
  font-size: 18px;
}

.provider-name {
  font-weight: 600;
}

.provider-status {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.provider-status.configured {
  color: #67c23a;
}

.account-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.accounts-list {
  margin-top: 12px;
}

.account-item {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.account-item:last-child {
  margin-bottom: 0;
}

.account-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-status {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.account-status.configured {
  color: #67c23a;
}

.account-actions {
  display: flex;
  gap: 4px;
}

.account-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-secondary);
}

.empty-state p {
  margin: 0 0 12px 0;
}

.batch-section {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.batch-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.batch-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.batch-info {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.batch-info p {
  margin: 0;
}
</style>
