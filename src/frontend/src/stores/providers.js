/**
 * Providers Store
 * Manages domain provider configurations
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProvidersStore = defineStore('providers', () => {
  // State
  const cloudflare = ref({ enabled: false, apiKey: '', email: '', apiType: 'global' })
  const porkbun = ref({ enabled: false, apiKey: '', apiSecret: '' })
  const dnsheAccounts = ref([])
  const digitalplat = ref({ enabled: false, apiKey: '', apiSecret: '' })
  
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const isCloudflareConfigured = computed(() => 
    cloudflare.value.enabled && cloudflare.value.apiKey && cloudflare.value.email
  )
  
  const isPorkbunConfigured = computed(() => 
    porkbun.value.enabled && porkbun.value.apiKey && porkbun.value.apiSecret
  )
  
  const isDnsheConfigured = computed(() => 
    dnsheAccounts.value.some(acc => acc.enabled && acc.apiKey && acc.apiSecret)
  )
  
  const isDigitalplatConfigured = computed(() => 
    digitalplat.value.enabled && (digitalplat.value.apiSecret || digitalplat.value.apiKey)
  )
  
  const dnsheAccountCount = computed(() => dnsheAccounts.value.length)
  
  const enabledDnsheAccounts = computed(() => 
    dnsheAccounts.value.filter(acc => acc.enabled && acc.apiKey && acc.apiSecret)
  )

  // Actions
  const getToken = () => localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')

  async function loadConfig() {
    loading.value = true
    error.value = null
    
    try {
      const token = getToken()
      const response = await fetch('/api/domain-providers/config', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      const data = await response.json()
      
      if (data.code === 200) {
        // Load non-DNSHE providers
        if (data.data.cloudflare) {
          cloudflare.value = { ...cloudflare.value, ...data.data.cloudflare }
        }
        if (data.data.porkbun) {
          porkbun.value = { ...porkbun.value, ...data.data.porkbun }
        }
        if (data.data.digitalplat) {
          digitalplat.value = { ...digitalplat.value, ...data.data.digitalplat }
        }
        
        // Load DNSHE accounts (array)
        if (Array.isArray(data.data.dnshe)) {
          dnsheAccounts.value = data.data.dnshe
        } else if (data.data.dnshe && typeof data.data.dnshe === 'object') {
          dnsheAccounts.value = data.data.dnshe.apiKey ? [data.data.dnshe] : []
        } else {
          dnsheAccounts.value = []
        }
      }
    } catch (err) {
      error.value = err.message
      console.error('Failed to load provider config:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveProvider(provider) {
    try {
      const token = getToken()
      let dataToSend = {}
      
      if (provider === 'cloudflare') {
        dataToSend = { cloudflare: cloudflare.value }
      } else if (provider === 'porkbun') {
        dataToSend = { porkbun: porkbun.value }
      } else if (provider === 'digitalplat') {
        dataToSend = { digitalplat: digitalplat.value }
      }
      
      const response = await fetch('/api/domain-providers/config', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })
      
      const data = await response.json()
      return data.code === 200
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  // DNSHE Account Management
  async function addDnsheAccount(account = {}) {
    try {
      const token = getToken()
      const response = await fetch('/api/dnshe/accounts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: account.name || 'DNSHE Account ' + (dnsheAccounts.value.length + 1),
          enabled: true,
          ...account
        })
      })
      
      const data = await response.json()
      if (data.code === 200) {
        dnsheAccounts.value.push(data.data)
        return { success: true, account: data.data }
      }
      return { success: false, error: data.msg }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function saveDnsheAccount(account) {
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
      if (data.code === 200) {
        const index = dnsheAccounts.value.findIndex(a => a.id === account.id)
        if (index > -1) {
          dnsheAccounts.value[index] = { ...dnsheAccounts.value[index], ...account }
        }
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function removeDnsheAccount(accountId) {
    try {
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
        if (index > -1) {
          dnsheAccounts.value.splice(index, 1)
        }
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  // Test & Sync
  async function testProvider(provider, accountId = null) {
    try {
      const token = getToken()
      const response = await fetch('/api/domain-providers/test', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, accountId })
      })
      
      const data = await response.json()
      return data.code === 200 ? data.data : { success: false, message: data.msg }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async function syncDomains(provider, accountId = null) {
    try {
      const token = getToken()
      const response = await fetch('/api/sync-domains/' + provider, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      })
      
      const data = await response.json()
      return data.code === 200 ? data.data : { error: data.msg }
    } catch (err) {
      return { error: err.message }
    }
  }

  return {
    // State
    cloudflare,
    porkbun,
    dnsheAccounts,
    digitalplat,
    loading,
    error,
    
    // Getters
    isCloudflareConfigured,
    isPorkbunConfigured,
    isDnsheConfigured,
    isDigitalplatConfigured,
    dnsheAccountCount,
    enabledDnsheAccounts,
    
    // Actions
    loadConfig,
    saveProvider,
    addDnsheAccount,
    saveDnsheAccount,
    removeDnsheAccount,
    testProvider,
    syncDomains
  }
})
