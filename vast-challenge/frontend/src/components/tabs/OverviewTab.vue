<template>
  <div class="h-full">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      <!-- Signature Charts for Aggregated Data -->
      <OverallSentimentDistribution />
      <!-- <EntityTypeDistribution /> -->
      <!-- <EntityActivityCard :entity-id="selectedEntityId || ''" /> -->
      <DatasetNodeComparison />
      <TopicSentimentOverview class="col-span-2" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, PropType } from 'vue';

const EntityTypeDistribution = defineAsyncComponent(() => import('../mini-visualizations/EntityTypeDistribution.vue'));
const OverallSentimentDistribution = defineAsyncComponent(() => import('../mini-visualizations/OverallSentimentDistribution.vue'));
const TopicSentimentOverview = defineAsyncComponent(() => import('../mini-visualizations/TopicSentimentOverview.vue'));
const EntityActivityCard = defineAsyncComponent(() => import('../mini-visualizations/EntityActivityCard.vue'));
const DatasetNodeComparison = defineAsyncComponent(() => import('../mini-visualizations/DatasetNodeComparison.vue'));

export default defineComponent({
  name: 'OverviewTab',
  components: {
    EntityTypeDistribution,
    OverallSentimentDistribution,
    TopicSentimentOverview,
    EntityActivityCard,
    DatasetNodeComparison,
  },
  props: {
    selectedEntityId: {
      type: String,
      required: true,
    },
  },
});
</script>

<style scoped></style>
