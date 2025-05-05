import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css'; // Import Element Plus styles
import './style.css'; // Import Tailwind styles
import App from './App.vue';

// Create Pinia instance
const pinia = createPinia();

// Create Vue app instance
const app = createApp(App);

// Use plugins
app.use(pinia)
app.use(ElementPlus) // Use Element Plus

// Mount the app
app.mount('#app')
