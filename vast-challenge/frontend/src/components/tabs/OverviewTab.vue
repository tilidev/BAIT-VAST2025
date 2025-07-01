<template>
  <div class="h-full">
    <CustomGridLayout :initial-layout="layout" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CustomGridLayout from '../CustomGridLayout.vue';

export default defineComponent({
  name: 'OverviewTab',
  components: {
    CustomGridLayout,
  },
  data() {
    return {
      layout: [
        { x: 0, y: 0, w: 4, h: 4, i: '0', component: 'OverallSentimentDistribution' },
        { x: 4, y: 0, w: 4, h: 4, i: '1', component: 'DatasetNodeComparison' },
        { x: 0, y: 4, w: 8, h: 6, i: '2', component: 'TopicSentimentOverview' },
        { x: 0, y: 10, w: 12, h: 8, i: '3', component: 'IndustrySimilarityHeatmap' },
      ],
    };
  },
});
</script>

<style scoped></style>
