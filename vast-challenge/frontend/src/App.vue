<template>
  <div>
    <div class="container mx-auto">
      <div class="flex justify-end mb-4">
        <ThemeSwitcher />
      </div>
      <Card class="shadow-xl rounded-lg overflow-hidden">
        <template #title>
          <h1 class="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 py-4">Main Application</h1>
        </template>
        <template #content>
          <GraphView></GraphView>
        </template>
      </Card>

      <IdSelectionPanel
        :selected-person-id="selectedPersonId"
        @update:selected-person-id="selectedPersonId = $event"
        :selected-entity-id="selectedEntityId"
        @update:selected-entity-id="selectedEntityId = $event"
        :person-options="personOptions"
        :organization-options="organizationOptions"
      />
      <MiniVizShowcase :selected-person-id="selectedPersonId" :selected-entity-id="selectedEntityId" />
    </div>
  </div>
</template>

<script>
import ExampleComponent from './components/ExampleComponent.vue';
import Card from 'primevue/card';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import GraphView from './components/GraphView.vue';
import MiniVizShowcase from './components/MiniVizShowcase.vue';
import IdSelectionPanel from './components/IdSelectionPanel.vue';

import { useEntityStore } from './stores/entityStore';
import { useGraphStore } from './stores/graphStore';
import { useVisualizationDataStore } from './stores/visualizationDataStore';

export default {
  components: {
    ExampleComponent,
    Card,
    ThemeSwitcher,
    GraphView,
    MiniVizShowcase,
    IdSelectionPanel,
  },
  data() {
    return {
      selectedPersonId: '',
      selectedEntityId: '',
    };
  },
  computed: {
    entityStore() {
      return useEntityStore();
    },
    graphStore() {
      return useGraphStore();
    },
    visualizationDataStore() {
      return useVisualizationDataStore();
    },
    personOptions() {
      return this.entityStore.persons.map(person => ({
        label: person.name,
        value: person.id
      }));
    },
    organizationOptions() {
      return this.entityStore.organizations.map(org => ({
        label: org.id,
        value: org.id
      }));
    },
  },
  async mounted() {
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
  },
};
</script>

<style>
/* The mini-viz-grid style is now in MiniVizShowcase.vue */
</style>
