import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import './style.css';
import App from './App.vue';
import VueGridLayout from 'vue-grid-layout-v3';

const pinia = createPinia();
const app = createApp(App);

// Use plugins
app.use(VueGridLayout)
app.use(pinia);
app.use(PrimeVue, {
  theme: {
    preset: Aura, // Use the base Aura preset
    options: {
      darkModeSelector: '.dark', // managed by useDark in App.vue)
      ripple: true // for animation
    }
  }
});

// Mount the app
app.mount('#app');

