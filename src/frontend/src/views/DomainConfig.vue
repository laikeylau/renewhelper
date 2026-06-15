<template>
  <div class="domain-config-view">
    <div class="view-header">
      <h2>域名商配置</h2>
      <el-button @click="$router.back()">← 返回</el-button>
    </div>
    
    <DomainConfigPanel @synced="onSynced" />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import DomainConfigPanel from '../components/DomainConfig.vue'

function onSynced({ provider, result }) {
  ElMessage.success(`${provider} 同步完成！导入 ${result.synced} 个，跳过 ${result.skipped} 个`)
}
</script>

<style scoped>
.domain-config-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.view-header h2 {
  margin: 0;
}
</style>
