import { createRouter, createWebHistory } from 'vue-router'
import InvestDashboard from '../views/InvestDashboard.vue'

const routes = [
  {
    path: '/',
    name: 'InvestDashboard',
    component: InvestDashboard,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
