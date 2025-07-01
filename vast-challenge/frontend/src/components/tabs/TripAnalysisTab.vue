<template>
  <div class="h-full flex flex-col gap-4">
    <div class="basis-2/5 overflow-hidden">
      <TimelineComponent class="h-full w-full" />
    </div>
    <div class="basis-3/5 overflow-hidden">
      <GeoJsonMap class="h-full w-full" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import TimelineComponent from '../TimelineComponent.vue';
import GeoJsonMap from '../GeoJsonMap.vue';

export default defineComponent({
  name: 'TripAnalysisTab',
  components: {
    TimelineComponent,
    GeoJsonMap,
  },
});
</script>

<style scoped></style>
