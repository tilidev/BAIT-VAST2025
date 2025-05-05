<template>
  <div class="flex items-center space-x-2">
    <i class="pi pi-sun text-yellow-500"></i>
    <ToggleSwitch v-model="isDark" />
    <i class="pi pi-moon text-indigo-400"></i>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ToggleSwitch from 'primevue/toggleswitch';
import { useDark } from '@vueuse/core'; 

export default defineComponent({
  name: 'ThemeSwitcher',
  components: {
    ToggleSwitch,
  },
  setup() {
    // isDark manages the 'dark' class on <html> based on OS preference and local storage
    const isDark = useDark();
    return {
      isDark,
    };
  },
});
</script>

<style scoped>
/* Add component-specific styles if needed */
</style>
