<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
    <Sidebar :sidebar-expanded="sidebarExpanded" :active-tab="activeTab" :selected-person-id="selectedPersonId"
      :selected-entity-id="selectedEntityId" :person-options="personOptions" :organization-options="organizationOptions"
      @toggle-sidebar="toggleSidebar" @update:selected-person-id="selectedPersonId = $event"
      @update:selected-entity-id="selectedEntityId = $event" @update:active-tab="activeTab = $event" />

    <!-- Main Content Area -->
    <main 
      class="flex-grow p-4 overflow-auto transition-all duration-300 ease-in-out">
      <OverviewTab v-if="activeTab === 'overview'" :selected-entity-id="selectedEntityId" />
      <DetailedAnalysisTab v-else-if="activeTab === 'detailed-analysis'" :selected-person-id="selectedPersonId" />
    </main>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, ref, computed } from 'vue';
import Card from 'primevue/card';
import Sidebar from './components/Sidebar.vue';

import { useEntityStore } from './stores/entityStore';
import { useGraphStore } from './stores/graphStore';
import { useVisualizationDataStore } from './stores/visualizationDataStore';

const OverviewTab = defineAsyncComponent(() => import('./components/tabs/OverviewTab.vue'));
const DetailedAnalysisTab = defineAsyncComponent(() => import('./components/tabs/DetailedAnalysisTab.vue'));

export default defineComponent({
  name: 'App',
  components: {
    Card,
    Sidebar,
    OverviewTab,
    DetailedAnalysisTab,
  },
  setup() {
    const selectedPersonId = ref('');
    const selectedEntityId = ref('');
    const activeTab = ref('overview');
    const sidebarExpanded = ref(true);

    const entityStore = useEntityStore();
    const graphStore = useGraphStore();
    const visualizationDataStore = useVisualizationDataStore();

    const toggleSidebar = () => {
      sidebarExpanded.value = !sidebarExpanded.value;
    };

    const personOptions = computed(() => {
      return entityStore.persons.map(person => ({
        label: person.name,
        value: person.id
      }));
    });

    const organizationOptions = computed(() => {
      return entityStore.organizations.map(org => ({
        label: org.id,
        value: org.id
      }));
    });

    // Initialize stores
    (async () => {
      try {
        if (entityStore.persons.length === 0) {
          await entityStore.init();
        }
        if (graphStore.sentimentPerTopic.length === 0) {
          await graphStore.init();
        }
        if (visualizationDataStore.datasetNodeCounts.length === 0 && visualizationDataStore.industrySentimentRawData.length === 0) {
          await visualizationDataStore.init();
        }
      } catch (error) {
        console.error("Error initializing stores in App.vue:", error);
      }
    })();

    return {
      selectedPersonId,
      selectedEntityId,
      activeTab,
      sidebarExpanded,
      toggleSidebar,
      personOptions,
      organizationOptions,
    };
  },
});
</script>

<style></style>
