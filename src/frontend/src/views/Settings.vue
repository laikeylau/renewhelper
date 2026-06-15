<template>
  <div class="settings-view">
    <h2>设置</h2>
    
    <div class="settings-section">
      <h3>外观设置</h3>
      <div class="setting-item">
        <label>主题</label>
        <el-switch
          v-model="isDarkMode"
          active-text="深色"
          inactive-text="浅色"
          @change="settingsStore.toggleTheme()"
        />
      </div>
      
      <div class="setting-item">
        <label>语言</label>
        <el-select v-model="currentLanguage" @change="settingsStore.setLanguage($event)">
          <el-option label="中文" value="zh" />
          <el-option label="English" value="en" />
        </el-select>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>通知设置</h3>
      <div class="setting-item">
        <label>默认提前提醒天数</label>
        <el-input-number
          v-model="defaultNotifyDays"
          :min="1"
          :max="365"
          @change="saveDefaultNotifyDays"
        />
      </div>
      
      <div class="setting-item">
        <label>默认提醒时间</label>
        <el-time-picker
          v-model="defaultNotifyTime"
          format="HH:mm"
          @change="saveDefaultNotifyTime"
        />
      </div>
    </div>
    
    <div class="settings-section">
      <h3>Webhook 配置</h3>
      <div class="setting-item">
        <label>Webhook URL</label>
        <el-input
          v-model="webhookUrl"
          placeholder="https://your-webhook-url.com"
          @blur="saveWebhookUrl"
        />
      </div>
    </div>
    
    <div class="settings-section">
      <h3>日历订阅</h3>
      <div class="calendar-subscriptions">
        <div v-for="(sub, index) in calendarSubscriptions" :key="sub.id" class="subscription-item">
          <span>{{ sub.name }}</span>
          <el-button size="small" type="primary" link @click="copySubscriptionUrl(sub)">
            复制链接
          </el-button>
        </div>
      </div>
    </div>
    
    <div class="settings-section">
      <h3>数据管理</h3>
      <div class="data-actions">
        <el-button @click="exportData">导出数据</el-button>
        <el-button @click="importData">导入数据</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()

const currentLanguage = ref('zh')
const defaultNotifyDays = ref(30)
const defaultNotifyTime = ref('09:00')
const webhookUrl = ref('')

const isDarkMode = computed(() => settingsStore.isDarkMode)
const calendarSubscriptions = computed(() => settingsStore.calendarSubscriptions)

onMounted(async () => {
  await settingsStore.loadSettings()
  currentLanguage.value = settingsStore.language
  defaultNotifyDays.value = settingsStore.settings.defaultNotifyDays || 30
  defaultNotifyTime.value = settingsStore.settings.defaultNotifyTime || '09:00'
  webhookUrl.value = settingsStore.webhookUrl || ''
})

async function saveDefaultNotifyDays() {
  await settingsStore.saveSettings({ defaultNotifyDays: defaultNotifyDays.value })
  ElMessage.success('设置已保存')
}

async function saveDefaultNotifyTime() {
  await settingsStore.saveSettings({ defaultNotifyTime: defaultNotifyTime.value })
  ElMessage.success('设置已保存')
}

async function saveWebhookUrl() {
  await settingsStore.saveSettings({ webhookUrl: webhookUrl.value })
  ElMessage.success('Webhook URL 已保存')
}

function copySubscriptionUrl(sub) {
  const baseUrl = window.location.origin
  const url = `${baseUrl}/api/calendar.ics?token=${sub.token}&sub=${sub.id}`
  navigator.clipboard.writeText(url)
  ElMessage.success('链接已复制到剪贴板')
}

async function exportData() {
  try {
    const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')
    const response = await fetch('/api/export', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const data = await response.json()
    
    if (data.code === 200) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `renewhelper-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('数据导出成功')
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

async function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      if (result.code === 200) {
        ElMessage.success('数据导入成功')
        window.location.reload()
      } else {
        ElMessage.error('导入失败: ' + result.msg)
      }
    } catch (error) {
      ElMessage.error('导入失败: ' + error.message)
    }
  }
  input.click()
}
</script>

<style scoped>
.settings-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin: 0 0 24px 0;
}

.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.settings-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-weight: 500;
}

.calendar-subscriptions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subscription-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--el-bg-color);
}

.data-actions {
  display: flex;
  gap: 12px;
}
</style>
