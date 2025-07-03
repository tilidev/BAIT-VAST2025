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
        { x: 0, y: 0, w: 4, h: 10, i: '0', component: 'GraphView', props: { filterKey: 'jo' } },
        { x: 4, y: 0, w: 4, h: 10, i: '1', component: 'GraphView', props: { filterKey: 'tr' } },
        { x: 8, y: 0, w: 4, h: 10, i: '2', component: 'GraphView', props: { filterKey: 'fi' } },
        { x: 0, y: 8, w: 4, h: 10, i: '3', component: 'IndustrySentimentBreakdown' },
        { x: 4, y: 8, w: 4, h: 10, i: '4', component: 'PersonSentimentAcrossDatasets' },
        { x: 8, y: 8, w: 4, h: 10, i: '5', component: 'EntitySentimentConsistencyMatrix' },
      ],
    };
  },
});
</script>

<style scoped></style>
