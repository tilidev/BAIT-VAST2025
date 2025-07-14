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
        { x: 4, y: 0, w: 4, h: 8, i: '1', component: 'DatasetNodeComparison' },
        { x: 0, y: 4, w: 5, h: 12, i: '2', component: 'TopicSentimentOverview' },
        { x: 8, y: 0, w: 4, h: 8, i: '3', component: 'TopicSentimentDistribution' },
        // { x: 0, y: 10, w: 12, h: 8, i: '4', component: 'IndustrySimilarityHeatmap' },
        { x: 5, y: 4, w: 7, h: 12, i: '5', component: 'EgoNetwork' },
      ],
    };
  },
});
</script>

<style scoped></style>
