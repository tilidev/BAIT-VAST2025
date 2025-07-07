<template>
  <div class="h-full">
    <ForceSim />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ForceSim from '../ForceSim.vue';

export default defineComponent({
  name: 'ScaleTab',
  components: {
    ForceSim,
  },
});
</script>

<style scoped></style>
