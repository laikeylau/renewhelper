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

    <!-- DNSHE 配置 -->
    <div class="provider-card">
      <div class="provider-header">
        <div class="provider-info">
          <span class="provider-icon">🌐</span>
          <span class="provider-name">DNSHE</span>
          <span class="provider-status" :class="{ configured: isConfigured('dnshe') }">
            {{ isConfigured('dnshe') ? '已配置' : '未配置' }}
          </span>
        </div>
        <el-switch v-model="providers.dnshe.enabled" @change="saveProvider('dnshe')" />
      </div>
      <div v-if="providers.dnshe.enabled" class="provider-form">
        <el-form label-position="top">
          <el-form-item label="API Key">
            <el-input v-model="providers.dnshe.apiKey" placeholder="输入API Key" show-password @blur="saveProvider('dnshe')"></el-input>
          </el-form-item>
          <el-form-item label="API Secret">
            <el-input v-model="providers.dnshe.apiSecret" placeholder="输入API Secret" show-password @blur="saveProvider('dnshe')"></el-input>
          </el-form-item>
          <div class="provider-actions">
            <el-button size="small" type="primary" @click="testProvider('dnshe')" :loading="testing === 'dnshe'">
              测试连接
            </el-button>
            <el-button size="small" @click="syncDomains('dnshe')" :loading="syncing === 'dnshe'">
              同步域名
            </el-button>
          </div>
        </el-form>
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
import { ElMessage } from 'element-plus'

const emit = defineEmits(['synced'])

const providers = reactive({
  cloudflare: { enabled: false, apiKey: '', email: '', apiType: 'global' },
  porkbun: { enabled: false, apiKey: '', apiSecret: '' },
  dnshe: { enabled: false, apiKey: '', apiSecret: '' },
  digitalplat: { enabled: false, apiKey: '', apiSecret: '' }
})

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

const getToken = () => localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')

const loadConfig = async () => {
  try {
    const token = getToken()
    const response = await fetch('/api/domain-providers/config', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const data = await response.json()
    
    if (data.code === 200) {
      // Keep masked secrets in local state so later saves won't overwrite them with blanks.
      Object.keys(data.data).forEach(provider => {
        if (providers[provider]) {
          const config = data.data[provider]
          providers[provider].apiKey = config.apiKey || ''
          providers[provider].apiSecret = config.apiSecret || ''
          providers[provider].email = config.email || ''
          providers[provider].apiType = config.apiType || 'global'
          providers[provider].enabled = config.enabled || false
        }
      })
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

.provider-form {
  margin-top: 12px;
}

.provider-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
