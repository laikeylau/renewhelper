/**
 * Router Configuration
 * Vue Router with lazy-loaded components
 */
import { createRouter, createWebHistory } from 'vue-router'

// Lazy-loaded route components
const Home = () => import('../views/Home.vue')
const Settings = () => import('../views/Settings.vue')
const DomainConfig = () => import('../views/DomainConfig.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '设置' }
  },
  {
    path: '/settings/domains',
    name: 'DomainConfig',
    component: DomainConfig,
    meta: { title: '域名商配置' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for page title
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'RenewHelper'} - RenewHelper`
  next()
})

export default router
