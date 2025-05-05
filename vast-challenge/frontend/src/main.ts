import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // Import Element Plus styles
import './style.css' // Import Tailwind styles
import App from './App.vue'

// Create Pinia instance
const pinia = createPinia()

// Define routes (add actual routes later)
const routes = [
  { path: '/', component: { template: '<div>Home Page Example</div>' } }, // Example route
]

// Create Router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Create Vue app instance
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)
app.use(ElementPlus) // Use Element Plus

// Mount the app
app.mount('#app')
