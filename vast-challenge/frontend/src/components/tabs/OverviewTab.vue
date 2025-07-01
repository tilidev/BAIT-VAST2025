<template>
  <div class="h-full">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      <OverallSentimentDistribution :selected-entity-id="filterStore.selectedEntityId" />
      <DatasetNodeComparison :selected-entity-id="filterStore.selectedEntityId" />
      <TopicSentimentOverview class="col-span-2" :selected-entity-id="filterStore.selectedEntityId" />
      <IndustrySimilarityHeatmap class="col-span-full"/>
    </div>
  </div>
</template>

<script>
import { defineAsyncComponent, defineComponent } from 'vue';
import { useFilterStore } from '../../stores/filterStore';

const OverallSentimentDistribution = defineAsyncComponent(() => import('../mini-visualizations/OverallSentimentDistribution.vue'));
const TopicSentimentOverview = defineAsyncComponent(() => import('../mini-visualizations/TopicSentimentOverview.vue'));
const DatasetNodeComparison = defineAsyncComponent(() => import('../mini-visualizations/DatasetNodeComparison.vue'));
const IndustrySimilarityHeatmap = defineAsyncComponent(() => import('../IndustrySimilarityHeatmap.vue'))

export default defineComponent({
  name: 'OverviewTab',
  components: {
    OverallSentimentDistribution,
IndustrySimilarityHeatmap,
    TopicSentimentOverview,
    DatasetNodeComparison,
  },
  data() {
    return {
      filterStore: useFilterStore()
    };
  }
});
</script>

<style scoped></style>
