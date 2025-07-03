<template>
  <aside :class="sidebarExpanded ? 'w-80' : 'w-20'"
    class="h-screen bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col transition-all duration-300 ease-in-out">
    <div class="flex items-center justify-between mb-6">
      <h1 v-if="sidebarExpanded" class="text-2xl font-bold text-center">Visual Analytics Dashboard</h1>
      <button @click="toggleSidebar" class="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
        <svg v-if="sidebarExpanded" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M6 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-grow overflow-y-auto">
      <!-- Navigation -->
      <nav class="mb-6 flex flex-col space-y-4">
        <button @click="setActiveTab('overview')"
          :class="{ 'bg-blue-500 text-white': activeTab === 'overview', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'overview' }"
          class="p-2 rounded-md transition-colors duration-200 flex items-center"
          :style="{ 'justify-content': sidebarExpanded ? 'flex-start' : 'center' }">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" :class="{ 'mr-2': sidebarExpanded }" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span v-if="sidebarExpanded">Overview</span>
        </button>
        <button @click="setActiveTab('detailed-analysis')"
          :class="{ 'bg-blue-500 text-white': activeTab === 'detailed-analysis', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'detailed-analysis' }"
          class="p-2 rounded-md transition-colors duration-200 flex items-center"
          :style="{ 'justify-content': sidebarExpanded ? 'flex-start' : 'center' }">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" :class="{ 'mr-2': sidebarExpanded }" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span v-if="sidebarExpanded">Detailed Analysis</span>
        </button>
        <button @click="setActiveTab('trip-analysis')"
          :class="{ 'bg-blue-500 text-white': activeTab === 'trip-analysis', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'trip-analysis' }"
          class="p-2 rounded-md transition-colors duration-200 flex items-center"
          :style="{ 'justify-content': sidebarExpanded ? 'flex-start' : 'center' }">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 8.71v8.128c0 1.043 0 1.565.283 1.958s.778.558 1.768.888l1.165.388c1.367.456 2.05.684 2.739.591L9 20.657v-14a3 3 0 0 1-.34.031c-.54.019-1.074-.16-2.141-.515c-1.398-.466-2.097-.699-2.629-.462a1.5 1.5 0 0 0-.497.358C3 6.5 3 7.236 3 8.71m18 6.58V7.163c0-1.043 0-1.565-.283-1.958s-.778-.558-1.768-.888l-1.165-.388c-1.367-.456-2.05-.684-2.739-.591L15 3.343v14q.17-.025.34-.031c.54-.019 1.074.16 2.141.515c1.398.466 2.097.699 2.629.462a1.5 1.5 0 0 0 .497-.358C21 17.5 21 16.764 21 15.29" opacity="0.5"/><path fill="currentColor" d="M9.247 6.61q-.123.027-.247.047v14c.67-.104 1.269-.503 2.442-1.285l1.382-.922c.936-.624 1.404-.936 1.93-1.06q.12-.03.246-.047v-14c-.67.103-1.269.503-2.442 1.284l-1.382.922c-.936.624-1.404.936-1.93 1.06m8.235 11.218l.254.084z"/></svg>
          <span v-if="sidebarExpanded">Trip Analysis</span>
        </button>
        <button @click="setActiveTab('scale')"
          :class="{ 'bg-blue-500 text-white': activeTab === 'scale', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'scale' }"
          class="p-2 rounded-md transition-colors duration-200 flex items-center"
          :style="{ 'justify-content': sidebarExpanded ? 'flex-start' : 'center' }">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48 48 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0q1.515.215 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202zm-16.5.52q1.485-.305 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a6 6 0 0 1-2.031.352a6 6 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202z"/></svg>
          <span v-if="sidebarExpanded">Scale</span>
        </button>
      </nav>

      <!-- Controls -->
      <div v-if="sidebarExpanded" class="space-y-4 mb-6">
      </div>

      <!-- Future Options Placeholder -->
      <div v-if="sidebarExpanded" class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h2 class="text-lg font-semibold mb-2">Options</h2>

        <div v-if="activeTab === 'trip-analysis'">
          <TripDrilldownFilter />
        </div>

        <IdSelectionPanel v-else-if="activeTab === 'detailed-analysis'" />

        <ScaleOptions v-else-if="activeTab === 'scale'" />

        <p v-else class="text-sm text-gray-600 dark:text-gray-400">
          More options will be added here in the future.
        </p>
      </div>
    </div>

    <!-- Theme Switcher at the bottom -->
    <div class="p-2 flex justify-center">
      <ThemeSwitcher />
    </div>
  </aside>
</template>

<script>
import { defineComponent } from 'vue';
import ThemeSwitcher from './ThemeSwitcher.vue';
import TripDrilldownFilter from './mini-visualizations/TripDrilldownFilter.vue';
import { useFilterStore } from '../stores/filterStore';
import IdSelectionPanel from './IdSelectionPanel.vue';
import ScaleOptions from './ScaleOptions.vue';

export default defineComponent({
  name: 'Sidebar',
  components: {
    ThemeSwitcher,
    TripDrilldownFilter,
    IdSelectionPanel,
    ScaleOptions,
  },
  props: {
    sidebarExpanded: {
      type: Boolean,
      required: true,
    },
    activeTab: {
      type: String,
      required: true,
    }
  },
  emits: ['toggleSidebar', 'update:activeTab'],
  data() {
    return {
      filterStore: useFilterStore()
    };
  },
  methods: {
    toggleSidebar() {
      this.$emit('toggleSidebar');
    },
    setActiveTab(tab) {
      this.$emit('update:activeTab', tab);
    }
  }
});
</script>

<style scoped>
/* Add any specific styles for the sidebar here if needed */
</style>
