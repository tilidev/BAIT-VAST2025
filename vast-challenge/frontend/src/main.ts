import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import './style.css';
import App from './App.vue';
import VueGridLayout from 'vue-grid-layout-v3';
import Tooltip from 'primevue/tooltip';

const pinia = createPinia();
const app = createApp(App);

// Use plugins
app.use(VueGridLayout)
app.use(pinia);
app.directive('tooltip', Tooltip);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark', // managed by useDark in App.vue)
      ripple: true // for animation
    }
  }
});

app.mount('#app');
