<template>
  <div class="h-full">
    <PersonVis />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PersonVis from '../PersonVis.vue';

export default defineComponent({
  name: 'PersonAnalysisTab',
  components: {
    PersonVis,
  },
});
</script>

<style scoped></style>
