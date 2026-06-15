<template>
  <div class="domain-config-panel">
    <!-- Cloudflare 配置 -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">☁️</span>
          <span class="provider-name">Cloudflare</span>
          <span class="provider-status" :class="{ configured: isConfigured('cloudflare') }">
            {{ isConfigured('cloudflare') ? '已配置' : '未配置' }}
          </span>
        </div>
        <el-switch v-model="providers.cloudflare.enabled" @change="saveProvider('cloudflare')" />
      </div>
      <div v-if="providers.cloudflare.enabled" class="provider-form">
        <el-form label-position="top">
          <el-form-item label="API类型">
            <el-select v-model="providers.cloudflare.apiType" style="width: 100%;" @change="saveProvider('cloudflare')">
              <el-option label="Global API Key" value="global"></el-option>
              <el-option label="API Token" value="token"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="providers.cloudflare.apiType === 'token' ? 'API Token' : 'Global API Key'">
            <el-input v-model="providers.cloudflare.apiKey" placeholder="输入API密钥" show-password @blur="saveProvider('cloudflare')"></el-input>
          </el-form-item>
          <el-form-item v-if="providers.cloudflare.apiType !== 'token'" label="邮箱 (Email)">
            <el-input v-model="providers.cloudflare.email" placeholder="Cloudflare账户邮箱" @blur="saveProvider('cloudflare')"></el-input>
          </el-form-item>
          <div class="provider-actions">
            <el-button size="small" type="primary" @click="testProvider('cloudflare')" :loading="testing === 'cloudflare'">
              测试连接
            </el-button>
            <el-button size="small" @click="syncDomains('cloudflare')" :loading="syncing === 'cloudflare'">
              同步域名
            </el-button>
          </div>
        </el-form>
      </div>
    </div>

    <!-- Porkbun 配置 -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🐷</span>
          <span class="provider-name">Porkbun</span>
          <span class="provider-status" :class="{ configured: isConfigured('porkbun') }">
            {{ isConfigured('porkbun') ? '已配置' : '未配置' }}
          </span>
        </div>
        <el-switch v-model="providers.porkbun.enabled" @change="saveProvider('porkbun')" />
      </div>
      <div v-if="providers.porkbun.enabled" class="provider-form">
        <el-form label-position="top">
          <el-form-item label="API Key">
            <el-input v-model="providers.porkbun.apiKey" placeholder="输入API Key" show-password @blur="saveProvider('porkbun')"></el-input>
          </el-form-item>
          <el-form-item label="API Secret">
            <el-input v-model="providers.porkbun.apiSecret" placeholder="输入API Secret" show-password @blur="saveProvider('porkbun')"></el-input>
          </el-form-item>
          <div class="provider-actions">
            <el-button size="small" type="primary" @click="testProvider('porkbun')" :loading="testing === 'porkbun'">
              测试连接
            </el-button>
            <el-button size="small" @click="syncDomains('porkbun')" :loading="syncing === 'porkbun'">
              同步域名
            </el-button>
          </div>
        </el-form>
      </div>
    </div>

    <!-- DNSHE 配置 (支持多账户) -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🌐</span>
          <span class="provider-name">DNSHE</span>
          <span class="provider-status" :class="{ configured: isDnsheConfigured() }">
            {{ isDnsheConfigured() ? '已配置' : '未配置' }}
          </span>
          <span v-if="dnsheAccounts.length > 0" class="account-count">
            ({{ dnsheAccounts.length }} 个账户)
          </span>
        </div>
        <el-button size="small" type="primary" @click="addDnsheAccount()">
          + 添加账户
        </el-button>
      </div>
      
      <!-- DNSHE 账户列表 -->
      <div v-if="dnsheAccounts.length > 0" class="dnshe-accounts">
        <div v-for="(account, index) in dnsheAccounts" :key="account.id" class="dnshe-account-item">
          <div class="account-header">
            <div class="account-info">
              <el-input 
                v-model="account.name" 
                size="small" 
                style="width: 180px;"
                @blur="saveDnsheAccount(account)"
              ></el-input>
              <el-switch 
                v-model="account.enabled" 
                size="small" 
                @change="saveDnsheAccount(account)"
              ></el-switch>
              <span class="account-status" :class="{ configured: account.apiKey && account.apiSecret }">
                {{ account.apiKey && account.apiSecret ? '✅ 已配置' : '⚠️ 未配置' }}
              </span>
            </div>
            <div class="account-actions">
              <el-button size="small" type="primary" link @click="testDnsheAccount(account)" :loading="testing === account.id">
                测试
              </el-button>
              <el-button size="small" type="success" link @click="syncDnsheAccount(account)" :loading="syncing === account.id">
                同步
              </el-button>
              <el-button size="small" type="danger" link @click="removeDnsheAccount(account.id)">
                删除
              </el-button>
            </div>
          </div>
          <div class="account-fields">
            <el-input 
              v-model="account.apiKey" 
              placeholder="API Key" 
              show-password 
              size="small" 
              @blur="saveDnsheAccount(account)"
            ></el-input>
            <el-input 
              v-model="account.apiSecret" 
              placeholder="API Secret" 
              show-password 
              size="small" 
              @blur="saveDnsheAccount(account)"
            ></el-input>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p>尚未添加 DNSHE 账户</p>
        <el-button size="small" type="primary" @click="addDnsheAccount()">
          添加第一个账户
        </el-button>
      </div>
      
      <!-- 批量操作 -->
      <div v-if="dnsheAccounts.length > 1" class="batch-actions">
        <el-button size="small" type="primary" @click="testAllDnsheAccounts()" :loading="testing === 'all-dnshe'">
          测试所有账户
        </el-button>
        <el-button size="small" type="success" @click="syncAllDnsheAccounts()" :loading="syncing === 'all-dnshe'">
          同步所有账户
        </el-button>
      </div>
    </div>

    <!-- DigitalPlat 配置 -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🔑</span>
          <span class="provider-name">DigitalPlat</span>
          <span class="provider-status" :class="{ configured: isConfigured('digitalplat') }">
            {{ isConfigured('digitalplat') ? '已配置' : '未配置' }}
          </span>
        </div>
        <el-switch v-model="providers.digitalplat.enabled" @change="saveProvider('digitalplat')" />
      </div>
      <div v-if="providers.digitalplat.enabled" class="provider-form">
        <el-form label-position="top">
          <el-form-item label="API Secret / Token">
            <el-input v-model="providers.digitalplat.apiSecret" placeholder="输入 DigitalPlat API Secret" show-password @blur="saveProvider('digitalplat')"></el-input>
          </el-form-item>
          <el-form-item label="API Key（可选）">
            <el-input v-model="providers.digitalplat.apiKey" placeholder="如提供商分配了 API Key 可填写，否则留空" show-password @blur="saveProvider('digitalplat')"></el-input>
          </el-form-item>
          <div class="provider-actions">
            <el-button size="small" type="primary" @click="testProvider('digitalplat')" :loading="testing === 'digitalplat'">
              测试连接
            </el-button>
            <el-button size="small" @click="syncDomains('digitalplat')" :loading="syncing === 'digitalplat'">
              同步域名
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits(['synced'])

const providers = reactive({
  cloudflare: { enabled: false, apiKey: '', email: '', apiType: 'global' },
  porkbun: { enabled: false, apiKey: '', apiSecret: '' },
  digitalplat: { enabled: false, apiKey: '', apiSecret: '' }
})

const dnsheAccounts = ref([])

const testing = ref(null)
const syncing = ref(null)

const isConfigured = (provider) => {
  const config = providers[provider]
  if (!config.enabled) return false
  if (provider === 'cloudflare') {
    return !!(config.apiKey && config.email)
  }
  if (provider === 'digitalplat') {
    return !!(config.apiSecret || config.apiKey)
  }
  return !!(config.apiKey && config.apiSecret)
}

const isDnsheConfigured = () => {
  return dnsheAccounts.value.some(acc => acc.enabled && acc.apiKey && acc.apiSecret)
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
      // Load non-DNSHE providers
      Object.keys(providers).forEach(provider => {
        if (data.data[provider]) {
          const config = data.data[provider]
          providers[provider].apiKey = config.apiKey || ''
          providers[provider].apiSecret = config.apiSecret || ''
          providers[provider].email = config.email || ''
          providers[provider].apiType = config.apiType || 'global'
          providers[provider].enabled = config.enabled || false
        }
      })
      
      // Load DNSHE accounts (array)
      if (Array.isArray(data.data.dnshe)) {
        dnsheAccounts.value = data.data.dnshe
      } else if (data.data.dnshe && typeof data.data.dnshe === 'object') {
        // Migrate old format
        dnsheAccounts.value = data.data.dnshe.apiKey ? [data.data.dnshe] : []
      } else {
        dnsheAccounts.value = []
      }
    }
  } catch (error) {
    console.error('Failed to load provider config:', error)
  }
}

const saveProvider = async (provider) => {
  try {
    const token = getToken()
    const response = await fetch('/api/domain-providers/config', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [provider]: providers[provider] })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success('配置已保存')
    } else {
      ElMessage.error('保存失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

// DNSHE Account Management
const addDnsheAccount = async () => {
  try {
    const token = getToken()
    const response = await fetch('/api/dnshe/accounts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'DNSHE Account ' + (dnsheAccounts.value.length + 1),
        enabled: true
      })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      dnsheAccounts.value.push(data.data)
      ElMessage.success('账户已添加')
    } else {
      ElMessage.error('添加失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('添加失败: ' + error.message)
  }
}

const saveDnsheAccount = async (account) => {
  try {
    const token = getToken()
    const response = await fetch('/api/dnshe/accounts/update', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: account.id, ...account })
    })
    
    const data = await response.json()
    if (data.code !== 200) {
      ElMessage.error('保存失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

const removeDnsheAccount = async (accountId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个 DNSHE 账户吗？', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const token = getToken()
    const response = await fetch('/api/dnshe/accounts/delete', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      const index = dnsheAccounts.value.findIndex(a => a.id === accountId)
      if (index > -1) dnsheAccounts.value.splice(index, 1)
      ElMessage.success('账户已删除')
    } else {
      ElMessage.error('删除失败: ' + data.msg)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const testDnsheAccount = async (account) => {
  try {
    testing.value = account.id
    const token = getToken()
    const response = await fetch('/api/domain-providers/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'dnshe', accountId: account.id })
    })
    
    const data = await response.json()
    if (data.code === 200 && data.data.success) {
      ElMessage.success(account.name + ': 连接成功')
    } else {
      ElMessage.error(account.name + ': 连接失败 - ' + (data.data?.message || data.msg))
    }
  } catch (error) {
    ElMessage.error('测试失败: ' + error.message)
  } finally {
    testing.value = null
  }
}

const syncDnsheAccount = async (account) => {
  try {
    syncing.value = account.id
    const token = getToken()
    const response = await fetch('/api/sync-domains/dnshe', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId: account.id })
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success(account.name + ': 同步完成！导入 ' + data.data.synced + ' 个，跳过 ' + data.data.skipped + ' 个')
      emit('synced', { provider: 'dnshe', result: data.data })
    } else {
      ElMessage.error('同步失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message)
  } finally {
    syncing.value = null
  }
}

const testAllDnsheAccounts = async () => {
  try {
    testing.value = 'all-dnshe'
    const token = getToken()
    const response = await fetch('/api/domain-providers/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider: 'dnshe' })
    })
    
    const data = await response.json()
    if (data.code === 200 && data.data.accounts) {
      const results = data.data.accounts
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      let message = `测试完成: ${successCount} 个成功`
      if (failCount > 0) {
        message += `, ${failCount} 个失败`
      }
      
      if (failCount > 0) {
        ElMessage.warning(message)
      } else {
        ElMessage.success(message)
      }
    } else {
      ElMessage.error('测试失败: ' + (data.msg || 'Unknown error'))
    }
  } catch (error) {
    ElMessage.error('测试失败: ' + error.message)
  } finally {
    testing.value = null
  }
}

const syncAllDnsheAccounts = async () => {
  try {
    syncing.value = 'all-dnshe'
    const token = getToken()
    const response = await fetch('/api/sync-domains/dnshe', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success('同步完成！导入 ' + data.data.synced + ' 个，跳过 ' + data.data.skipped + ' 个')
      emit('synced', { provider: 'dnshe', result: data.data })
    } else {
      ElMessage.error('同步失败: ' + data.msg)
    }
  } catch (error) {
    ElMessage.error('同步失败: ' + error.message)
  } finally {
    syncing.value = null
  }
}

const testProvider = async (provider) => {
  try {
    testing.value = provider
    const token = getToken()
    const response = await fetch('/api/domain-providers/test', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    })
    
    const data = await response.json()
    if (data.code === 200 && data.data.success) {
      ElMessage.success('连接成功: ' + data.data.message)
    } else {
      ElMessage.error('连接失败: ' + (data.data?.message || data.msg))
    }
  } catch (error) {
    ElMessage.error('测试失败: ' + error.message)
  } finally {
    testing.value = null
  }
}

const syncDomains = async (provider) => {
  try {
    syncing.value = provider
    const token = getToken()
    const response = await fetch('/api/sync-domains/' + provider, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    if (data.code === 200) {
      ElMessage.success('同步完成！导入 ' + data.data.synced + ' 个，跳过 ' + data.data.skipped + ' 个')
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

.provider-form {
  margin-top: 12px;
}

.provider-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* DNSHE Multi-Account Styles */
.dnshe-accounts {
  margin-top: 12px;
}

.dnshe-account-item {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--el-bg-color);
}

.dnshe-account-item:last-child {
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
  grid-template-columns: 1fr 1fr;
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

.batch-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  gap: 8px;
}
</style>
