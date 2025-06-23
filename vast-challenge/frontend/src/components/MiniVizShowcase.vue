<template>
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
</template>

<script>
import Card from 'primevue/card';
import PersonSentimentAcrossDatasets from './mini-visualizations/PersonSentimentAcrossDatasets.vue';
import EntitySentimentConsistencyMatrix from './mini-visualizations/EntitySentimentConsistencyMatrix.vue';
import EntityTypeDistribution from './mini-visualizations/EntityTypeDistribution.vue';
import IndustrySentimentBreakdown from './mini-visualizations/IndustrySentimentBreakdown.vue';
import OverallSentimentDistribution from './mini-visualizations/OverallSentimentDistribution.vue';
import EntityActivityCard from './mini-visualizations/EntityActivityCard.vue';
import DatasetNodeComparison from './mini-visualizations/DatasetNodeComparison.vue';
import TopicSentimentOverview from './mini-visualizations/TopicSentimentOverview.vue';

export default {
  components: {
    Card,
    PersonSentimentAcrossDatasets,
    EntitySentimentConsistencyMatrix,
    EntityTypeDistribution,
    IndustrySentimentBreakdown,
    OverallSentimentDistribution,
    EntityActivityCard,
    DatasetNodeComparison,
    TopicSentimentOverview,
  },
  props: {
    selectedPersonId: {
      type: String,
      default: ''
    },
    selectedEntityId: {
      type: String,
      default: ''
    }
  }
};
</script>

<style scoped>
.mini-viz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1rem;
}
</style>
