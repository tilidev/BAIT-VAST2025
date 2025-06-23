<template>
  <div> <!--
    class="min-h-screen bg-gradient-to-br from-teal-100 via-sky-100 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-neutral-900 p-4 sm:p-8 transition-colors duration-300">
    -->

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
          <!-- <GeoJsonMap></GeoJsonMap> -->
          <!-- <EntityComponent></EntityComponent> -->
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
            <EntityActivityCard :entity-id="exampleEntityId" />
            <PersonSentimentAcrossDatasets :person-id="examplePersonId" />
            <EntitySentimentConsistencyMatrix />
          </div>
        </template>
      </Card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ExampleComponent from './components/ExampleComponent.vue';
import Card from 'primevue/card'; // Import PrimeVue Card
import ThemeSwitcher from './components/ThemeSwitcher.vue'; // Import the new component
// import GeoJsonMap from './components/GeoJsonMap.vue';
// import EntityComponent from './components/EntityComponent.vue';
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

const entityStore = useEntityStore();
const graphStore = useGraphStore();
const visualizationDataStore = useVisualizationDataStore();

// Placeholder IDs for components that need them
// TODO: will be changed to dynamic approach 
const examplePersonId = 'Seal';
const exampleEntityId = 'Teddy Goldstein';

onMounted(async () => {
  try {
    // Initialize stores if they haven't been already
    // Check a basic property to see if init might be needed.
    // A more robust check or global init in main.ts might be better.
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
/* Add global styles if needed, or ensure Tailwind base styles are included in main.ts/style.css */
.mini-viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
}
</style>
