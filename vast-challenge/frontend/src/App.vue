<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
    <Sidebar :sidebar-expanded="sidebarExpanded" :active-tab="activeTab" @toggleSidebar="toggleSidebar"
      @update:activeTab="setActiveTab" />

    <!-- Main Content Area -->
    <main class="flex-grow p-4 flex flex-col gap-4 overflow-hidden transition-all duration-300 ease-in-out">
      <IdSelectionPanel />
      <div class="flex-grow overflow-hidden">
        <OverviewTab v-if="activeTab === 'overview'" />
        <DetailedAnalysisTab v-else-if="activeTab === 'detailed-analysis'" />
        <TripAnalysisTab v-else-if="activeTab === 'trip-analysis'" />
      </div>
    </main>
  </div>
</template>

<script>
import { defineAsyncComponent, defineComponent } from 'vue';
import Card from 'primevue/card';
import Sidebar from './components/Sidebar.vue';

import { useEntityStore } from './stores/entityStore';
import { useGraphStore } from './stores/graphStore';
import { useVisualizationDataStore } from './stores/visualizationDataStore';
import { useFilterStore } from './stores/filterStore';

const OverviewTab = defineAsyncComponent(() => import('./components/tabs/OverviewTab.vue'));
const DetailedAnalysisTab = defineAsyncComponent(() => import('./components/tabs/DetailedAnalysisTab.vue'));
const TripAnalysisTab = defineAsyncComponent(() => import('./components/tabs/TripAnalysisTab.vue'));

export default defineComponent({
  name: 'App',
  components: {
    Card,
    Sidebar,
    OverviewTab,
    DetailedAnalysisTab,
    TripAnalysisTab,
  },
  data() {
    return {
      activeTab: 'trip-analysis',
      sidebarExpanded: true,
      entityStore: useEntityStore(),
      graphStore: useGraphStore(),
      visualizationDataStore: useVisualizationDataStore(),
      filterStore: useFilterStore()
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
