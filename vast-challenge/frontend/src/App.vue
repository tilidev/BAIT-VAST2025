<template>
  <!-- root full-height flex container and hide overflow (make visible in main)-->
  <div class="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

    <!-- Sidebar stays fixed -->
    <Sidebar
      :sidebar-expanded="sidebarExpanded"
      :active-tab="activeTab"
      @toggleSidebar="toggleSidebar"
      @update:activeTab="setActiveTab"
    />

    <!-- Add overflow here to make only this area scrollable -->
    <main class="flex flex-col flex-grow overflow-y-auto p-4 transition-all duration-300 ease-in-out min-h-0">
      <AnalysisTab v-if="activeTab === 'analysis'" />
      <TripAnalysisTab v-else-if="activeTab === 'trip-analysis'" />
      <ScaleTab v-else-if="activeTab === 'scale'" />
    </main>
  </div>
</template>

<script>
import { defineAsyncComponent, defineComponent } from 'vue';
import Sidebar from './components/Sidebar.vue';

import { useEntityStore } from './stores/entityStore';
import { useGraphStore } from './stores/graphStore';
import { useVisualizationDataStore } from './stores/visualizationDataStore';

const AnalysisTab = defineAsyncComponent(() => import('./components/tabs/AnalysisTab.vue'));
const TripAnalysisTab = defineAsyncComponent(() => import('./components/tabs/TripAnalysisTab.vue'));
const ScaleTab = defineAsyncComponent(() => import('./components/tabs/ScaleTab.vue'));

export default defineComponent({
  name: 'App',
  components: {
    Sidebar,
    AnalysisTab,
    TripAnalysisTab,
    ScaleTab,
  },
  data() {
    return {
      activeTab: 'analysis',
      sidebarExpanded: true,
      entityStore: useEntityStore(),
      graphStore: useGraphStore(),
      visualizationDataStore: useVisualizationDataStore(),
    };
  },
  methods: {
    toggleSidebar() {
      this.sidebarExpanded = !this.sidebarExpanded;
    },
    setActiveTab(tab) {
      this.activeTab = tab;
    }
  },
  mounted() {
    (async () => {
      try {
        if (this.entityStore.persons.length === 0) {
          await this.entityStore.init();
        }
        if (this.graphStore.sentimentPerTopic.length === 0) {
          await this.graphStore.init();
        }
        if (this.visualizationDataStore.datasetNodeCounts.length === 0 && this.visualizationDataStore.industrySentimentRawData.length === 0) {
          await this.visualizationDataStore.init();
        }
      } catch (error) {
        console.error("Error initializing stores in App.vue:", error);
      }
    })();
  }
});
</script>

<style></style>
