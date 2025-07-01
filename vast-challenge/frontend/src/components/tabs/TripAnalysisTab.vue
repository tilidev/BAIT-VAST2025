<template>
  <div class="h-full">
    <div class="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 p-4 h-full">
      <TripDrilldownFilter />
      <TimelineComponent />
      <GeoJsonMap class="lg:col-start-2 lg:row-span-2 h-full" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import TripDrilldownFilter from '../mini-visualizations/TripDrilldownFilter.vue';
import TimelineComponent from '../TimelineComponent.vue';
import GeoJsonMap from '../GeoJsonMap.vue';

export default defineComponent({
  name: 'TripAnalysisTab',
  components: {
    TripDrilldownFilter,
    TimelineComponent,
    GeoJsonMap,
  },
});
</script>

<style scoped></style>
