/**
 * Items Store
 * Manages service/reminder items
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useItemsStore = defineStore('items', () => {
  // State
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const activeItems = computed(() => items.value.filter(i => i.enabled))
  
  const domainItems = computed(() => items.value.filter(i => i.tags?.includes('Domain')))
  
  const expiringSoon = computed(() => {
    const now = new Date()
    return items.value.filter(i => {
      if (!i.enabled || !i.lastRenewDate) return false
      const nextDate = calculateNextRenewal(i)
      if (!nextDate) return false
      const daysUntil = Math.ceil((new Date(nextDate) - now) / (1000 * 60 * 60 * 24))
      return daysUntil >= 0 && daysUntil <= 30
    })
  })
  
  const expiredItems = computed(() => {
    const now = new Date()
    return items.value.filter(i => {
      if (!i.enabled || !i.lastRenewDate) return false
      const nextDate = calculateNextRenewal(i)
      if (!nextDate) return false
      return new Date(nextDate) < now
    })
  })
  
  const totalCount = computed(() => items.value.length)
  const activeCount = computed(() => activeItems.value.length)
  const expiringCount = computed(() => expiringSoon.value.length)
  const expiredCount = computed(() => expiredItems.value.length)

  // Actions
  const getToken = () => localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token')

  function calculateNextRenewal(item) {
    if (!item.lastRenewDate) return null
    
    const [year, month, day] = item.lastRenewDate.split('-').map(Number)
    const interval = item.intervalDays || 365
    const unit = item.cycleUnit || 'year'
    
    const date = new Date(year, month - 1, day)
    
    switch (unit) {
      case 'year':
        date.setFullYear(date.getFullYear() + Math.floor(interval / 365))
        date.setDate(date.getDate() + (interval % 365))
        break
      case 'month':
        date.setMonth(date.getMonth() + interval)
        break
      case 'day':
        date.setDate(date.getDate() + interval)
        break
    }
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  async function loadItems() {
    loading.value = true
    error.value = null
    
    try {
      const token = getToken()
      const response = await fetch('/api/items', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      const data = await response.json()
      
      if (data.code === 200) {
        items.value = data.data || []
      }
    } catch (err) {
      error.value = err.message
      console.error('Failed to load items:', err)
    } finally {
      loading.value = false
    }
  }

  async function addItem(item) {
    try {
      const token = getToken()
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      })
      
      const data = await response.json()
      if (data.code === 200) {
        items.value.push(data.data)
        return { success: true, item: data.data }
      }
      return { success: false, error: data.msg }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function updateItem(itemId, updates) {
    try {
      const token = getToken()
      const response = await fetch('/api/items/update', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, ...updates })
      })
      
      const data = await response.json()
      if (data.code === 200) {
        const index = items.value.findIndex(i => i.id === itemId)
        if (index > -1) {
          items.value[index] = { ...items.value[index], ...updates }
        }
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function deleteItem(itemId) {
    try {
      const token = getToken()
      const response = await fetch('/api/items/delete', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemIds: [itemId] })
      })
      
      const data = await response.json()
      if (data.code === 200) {
        const index = items.value.findIndex(i => i.id === itemId)
        if (index > -1) {
          items.value.splice(index, 1)
        }
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function deleteItems(itemIds) {
    try {
      const token = getToken()
      const response = await fetch('/api/items/delete', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemIds })
      })
      
      const data = await response.json()
      if (data.code === 200) {
        const idSet = new Set(itemIds)
        items.value = items.value.filter(i => !idSet.has(i.id))
        return true
      }
      return false
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  async function toggleItem(itemId) {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return false
    return updateItem(itemId, { enabled: !item.enabled })
  }

  return {
    // State
    items,
    loading,
    error,
    
    // Getters
    activeItems,
    domainItems,
    expiringSoon,
    expiredItems,
    totalCount,
    activeCount,
    expiringCount,
    expiredCount,
    
    // Actions
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    toggleItem,
    calculateNextRenewal
  }
})
