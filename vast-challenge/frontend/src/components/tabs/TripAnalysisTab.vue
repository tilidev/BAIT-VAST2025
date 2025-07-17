<template>
  <div class="h-full">
    <CustomGridLayout :initial-layout="layout" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CustomGridLayout from '../CustomGridLayout.vue';

export default defineComponent({
  name: 'TripAnalysisTab',
  components: {
    CustomGridLayout,
  },
  data() {
    return {
      layout: [
        { x: 0, y: 0, w: 12, h: 10, i: '0', component: 'TimelineComponent' },
        { x: 0, y: 8, w: 12, h: 14, i: '1', component: 'GeoJsonMap' },
      ],
    };
  },
});
</script>

<style scoped></style>
