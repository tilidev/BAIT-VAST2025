<template>
  <aside :class="sidebarExpanded ? 'w-64' : 'w-20'"
    class="bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col transition-all duration-300 ease-in-out">
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

    <!-- Navigation -->
    <nav
      :class="[sidebarExpanded ? 'flex-row space-x-2' : 'flex-col space-y-4', { 'justify-center': !sidebarExpanded }]"
      class="mb-6 flex">
      <button @click="emit('update:activeTab', 'overview')"
        :class="{ 'bg-blue-500 text-white': activeTab === 'overview', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'overview', 'w-full': sidebarExpanded }"
        class="p-2 rounded-md transition-colors duration-200 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" :class="{ 'mr-2': sidebarExpanded }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span v-if="sidebarExpanded">Overview</span>
      </button>
      <button @click="emit('update:activeTab', 'detailed-analysis')"
        :class="{ 'bg-blue-500 text-white': activeTab === 'detailed-analysis', 'hover:bg-gray-200 dark:hover:bg-gray-700': activeTab !== 'detailed-analysis', 'w-full': sidebarExpanded }"
        class="p-2 rounded-md transition-colors duration-200 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" :class="{ 'mr-2': sidebarExpanded }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span v-if="sidebarExpanded">Detailed Analysis</span>
      </button>
    </nav>

    <!-- Controls -->
    <div v-if="sidebarExpanded" class="space-y-4 mb-6">
      <h3 class="text-lg font-semibold mb-2">Controls</h3>
      <div class="p-2 border border-gray-300 dark:border-gray-600 rounded-md">
        <IdSelectionPanel :selected-person-id="selectedPersonId"
          @update:selected-person-id="emit('update:selectedPersonId', $event)" :selected-entity-id="selectedEntityId"
          @update:selected-entity-id="emit('update:selectedEntityId', $event)" :person-options="personOptions"
          :organization-options="organizationOptions" />
      </div>
    </div>

    <!-- Future Options Placeholder -->
    <div v-if="sidebarExpanded" class="flex-grow border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 class="text-lg font-semibold mb-2">Options</h3>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        More options will be added here in the future.
      </p>
    </div>

    <!-- Theme Switcher at the bottom -->
    <div class="mt-auto p-2 flex justify-center">
      <ThemeSwitcher />
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import ThemeSwitcher from './ThemeSwitcher.vue';
import IdSelectionPanel from './IdSelectionPanel.vue';

interface Option {
  label: string;
  value: string;
}

export default defineComponent({
  name: 'Sidebar',
  components: {
    ThemeSwitcher,
    IdSelectionPanel,
  },
  props: {
    sidebarExpanded: {
      type: Boolean,
      required: true,
    },
    activeTab: {
      type: String,
      required: true,
    },
    selectedPersonId: {
      type: String,
      required: true,
    },
    selectedEntityId: {
      type: String,
      required: true,
    },
    personOptions: {
      type: Array as PropType<Option[]>,
      required: true,
    },
    organizationOptions: {
      type: Array as PropType<Option[]>,
      required: true,
    },
  },
  emits: ['toggleSidebar', 'update:selectedPersonId', 'update:selectedEntityId', 'update:activeTab'],
  setup(props, { emit }) {
    const toggleSidebar = () => {
      emit('toggleSidebar');
    };

    return {
      toggleSidebar,
      emit,
    };
  },
});
</script>

<style scoped>
/* Add any specific styles for the sidebar here if needed */
</style>
