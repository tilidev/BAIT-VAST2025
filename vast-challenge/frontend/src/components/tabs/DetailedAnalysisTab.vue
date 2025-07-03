<template>
  <div class="h-full">
    <CustomGridLayout :initial-layout="layout" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CustomGridLayout from '../CustomGridLayout.vue';

export default defineComponent({
  name: 'DetailedAnalysisTab',
  components: {
    CustomGridLayout,
  },
  data() {
    return {
      layout: [
        { x: 0, y: 0, w: 6, h: 8, i: '0', component: 'GraphView', props: { filterKey: 'jo' } },
        { x: 6, y: 0, w: 6, h: 8, i: '1', component: 'GraphView', props: { filterKey: 'tr' } },
        { x: 0, y: 8, w: 6, h: 8, i: '2', component: 'GraphView', props: { filterKey: 'fi' } },
        { x: 6, y: 8, w: 6, h: 8, i: '3', component: 'IndustrySentimentBreakdown' },
        { x: 0, y: 16, w: 12, h: 8, i: '4', component: 'PersonSentimentAcrossDatasets' },
        { x: 0, y: 24, w: 12, h: 8, i: '5', component: 'EntitySentimentConsistencyMatrix' },
      ],
    };
  },
});
</script>

<style scoped></style>
