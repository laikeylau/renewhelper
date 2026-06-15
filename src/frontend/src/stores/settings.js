/**
 * Settings Store
 * Manages application settings
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const settings = ref({
    jwtSecret: '',
    language: 'zh',
    theme: 'dark',
    calendarSubscriptions: [],
    webhookUrl: '',
    autoRenew: true,
    defaultNotifyDays: 30,
    defaultNotifyTime: '09:00'
  })
  
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const language = computed(() => settings.value.language || 'zh')
  const theme = computed(() => settings.value.theme || 'dark')
  const isDarkMode = computed(() => theme.value === 'dark')
  const calendarSubscriptions = computed(() => settings.value.calendarSubscriptions || [])
  const webhookUrl = computed(() => settings.value.webhookUrl)

  // Actions
  const getToken = () => localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')

  async function loadSettings() {
    loading.value = true
    error.value = null
    
    try {
      const token = getToken()
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      const data = await response.json()
      
      if (data.code === 200) {
        settings.value = { ...settings.value, ...data.data }
      }
    } catch (err) {
      error.value = err.message
      console.error('Failed to load settings:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(updates) {
    try {
      const token = getToken()
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })
      
      const data = await response.json()
      if (data.code === 200) {
        settings.value = { ...settings.value, ...updates }
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function setLanguage(lang) {
    return saveSettings({ language: lang })
  }

  async function setTheme(newTheme) {
    return saveSettings({ theme: newTheme })
  }

  function toggleTheme() {
    const newTheme = theme.value === 'dark' ? 'light' : 'dark'
    return setTheme(newTheme)
  }

  return {
    // State
    settings,
    loading,
    error,
    
    // Getters
    language,
    theme,
    isDarkMode,
    calendarSubscriptions,
    webhookUrl,
    
    // Actions
    loadSettings,
    saveSettings,
    setLanguage,
    setTheme,
    toggleTheme
  }
})
