<template>
  <div class="home-view">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-value">{{ itemsStore.totalCount }}</div>
          <div class="stat-label">总计服务</div>
        </div>
      </div>
      
      <div class="stat-card active">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ itemsStore.activeCount }}</div>
          <div class="stat-label">活跃服务</div>
        </div>
      </div>
      
      <div class="stat-card warning">
        <div class="stat-icon">⚠️</div>
        <div class="stat-info">
          <div class="stat-value">{{ itemsStore.expiringCount }}</div>
          <div class="stat-label">即将到期</div>
        </div>
      </div>
      
      <div class="stat-card danger">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-value">{{ itemsStore.expiredCount }}</div>
          <div class="stat-label">已过期</div>
        </div>
      </div>
    </div>
    
    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="action-buttons">
        <el-button type="primary" @click="$router.push('/settings/domains')">
          🔗 域名同步
        </el-button>
        <el-button @click="$router.push('/settings')">
          ⚙️ 设置
        </el-button>
      </div>
    </div>
    
    <div class="recent-items" v-if="itemsStore.expiringSoon.length > 0">
      <h3>即将到期的服务</h3>
      <div class="item-list">
        <div v-for="item in itemsStore.expiringSoon.slice(0, 5)" :key="item.id" class="item-card">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-date">到期日期: {{ getNextRenewal(item) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useItemsStore } from '../stores/items'

const itemsStore = useItemsStore()

onMounted(() => {
  itemsStore.loadItems()
})

function getNextRenewal(item) {
  return itemsStore.calculateNextRenewal(item) || '未知'
}
</script>

<style scoped>
.home-view {
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stat-card.warning .stat-value { color: #e6a23c; }
.stat-card.danger .stat-value { color: #f56c6c; }

.quick-actions {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.quick-actions h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.recent-items {
  padding: 16px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
}

.recent-items h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 6px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.item-name {
  font-weight: 500;
}

.item-date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
