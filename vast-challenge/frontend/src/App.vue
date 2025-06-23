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
          <div class="p-4 sm:p-6">
            <ExampleComponent />
          </div>
          <GraphView></GraphView>
        </template>
      </Card>

      <Card class="shadow-xl rounded-lg overflow-hidden mt-8">
        <template #title>
          <h2 class="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 py-3">Mini Visualizations Showcase
          </h2>
        </template>
        <template #content>
          <div class="p-4 sm:p-6 mini-viz-grid">
            <EntityTypeDistribution />
            <OverallSentimentDistribution />
            <DatasetNodeComparison />
            <TopicSentimentOverview />
            <IndustrySentimentBreakdown />
            <EntityActivityCard :entity-id="selectedEntityId || ''" />
            <PersonSentimentAcrossDatasets :person-id="selectedPersonId || ''" />
            <EntitySentimentConsistencyMatrix />
          </div>
        </template>
      </Card>

      <Panel header="Dynamic ID Selection" class="shadow-xl rounded-lg overflow-hidden mt-8">
        <template #header>
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Select Entity and Person</h2>
        </template>
        <div class="p-4 sm:p-6 flex gap-4">
          <div>
            <label for="person-dropdown" class="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-100">Select
              Person:</label>
            <Dropdown id="person-dropdown" v-model="selectedPersonId" :options="personOptions" optionLabel="label"
              optionValue="value" placeholder="Select a Person"
              class="w-full md:w-20rem" />
          </div>
          <div>
            <label for="entity-dropdown" class="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-100">Select
              Entity:</label>
            <Dropdown id="entity-dropdown" v-model="selectedEntityId" :options="organizationOptions"
              optionLabel="label" optionValue="value" placeholder="Select an Entity"
              class="w-full md:w-20rem" />
          </div>
        </div>
      </Panel>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ExampleComponent from './components/ExampleComponent.vue';
import Card from 'primevue/card';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import Dropdown from 'primevue/dropdown';
import Panel from 'primevue/panel';
import GraphView from './components/GraphView.vue';

import { useEntityStore } from './stores/entityStore';
import { useGraphStore } from './stores/graphStore';
import { useVisualizationDataStore } from './stores/visualizationDataStore';

import PersonSentimentAcrossDatasets from './components/mini-visualizations/PersonSentimentAcrossDatasets.vue';
import EntitySentimentConsistencyMatrix from './components/mini-visualizations/EntitySentimentConsistencyMatrix.vue';
import EntityTypeDistribution from './components/mini-visualizations/EntityTypeDistribution.vue';
import IndustrySentimentBreakdown from './components/mini-visualizations/IndustrySentimentBreakdown.vue';
import OverallSentimentDistribution from './components/mini-visualizations/OverallSentimentDistribution.vue';
import EntityActivityCard from './components/mini-visualizations/EntityActivityCard.vue';
import DatasetNodeComparison from './components/mini-visualizations/DatasetNodeComparison.vue';
import TopicSentimentOverview from './components/mini-visualizations/TopicSentimentOverview.vue';
import { ref, computed } from 'vue';

const entityStore = useEntityStore();
const graphStore = useGraphStore();
const visualizationDataStore = useVisualizationDataStore();

const selectedPersonId = ref('');
const selectedEntityId = ref('');

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

onMounted(async () => {
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
});
</script>

<style>
.mini-viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
}
</style>
