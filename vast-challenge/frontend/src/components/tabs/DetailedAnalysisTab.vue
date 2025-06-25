<template>
  <div class="h-full">
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
      <!-- Detailed Charts for Filtered Raw Data -->
      <Card class="shadow-lg rounded-lg overflow-hidden">
        <template #title>
          <h2 class="text-xl font-semibold mb-2">Sentiment Adjacency Matrix (Journalist)</h2>
        </template>
        <template #content>
          <GraphView filterKey="jo" />
        </template>
      </Card>
      <Card class="shadow-lg rounded-lg overflow-hidden">
        <template #title>
          <h2 class="text-xl font-semibold mb-2">Sentiment Adjacency Matrix (Trout)</h2>
        </template>
        <template #content>
          <GraphView filterKey="tr" />
        </template>
      </Card>
      <Card class="shadow-lg rounded-lg overflow-hidden">
        <template #title>
          <h2 class="text-xl font-semibold mb-2">Sentiment Adjacency Matrix (Filah)</h2>
        </template>
        <template #content>
          <GraphView filterKey="fi" />
        </template>
      </Card>
      <IndustrySentimentBreakdown :industry="filterStore.selectedIndustry" />
      <PersonSentimentAcrossDatasets :person-id="filterStore.selectedPersonId || ''" />
      <EntitySentimentConsistencyMatrix />
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent, defineComponent } from 'vue';
import Card from 'primevue/card';
import { useFilterStore } from '../../stores/filterStore';

const GraphView = defineAsyncComponent(() => import('../GraphView.vue'));
const IndustrySentimentBreakdown = defineAsyncComponent(() => import('../mini-visualizations/IndustrySentimentBreakdown.vue'));
const PersonSentimentAcrossDatasets = defineAsyncComponent(() => import('../mini-visualizations/PersonSentimentAcrossDatasets.vue'));
const EntitySentimentConsistencyMatrix = defineAsyncComponent(() => import('../mini-visualizations/EntitySentimentConsistencyMatrix.vue'));

export default defineComponent({
  name: 'DetailedAnalysisTab',
  components: {
    Card,
    GraphView,
    IndustrySentimentBreakdown,
    PersonSentimentAcrossDatasets,
    EntitySentimentConsistencyMatrix,
  },
  data() {
    return {
      filterStore: useFilterStore(),
    };
  },
});
</script>

<style scoped></style>
