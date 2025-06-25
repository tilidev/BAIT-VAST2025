<template>
  <div class="flex">
    <div class="mb-4 flex items-center">
      <ToggleSwitch v-model="useWeightedMean" @change="fetchData" inputId="weighted-mean-toggle" />
      <label for="weighted-mean-toggle" class="ml-2 text-gray-700">Use Weighted Mean</label>
    </div>
    <div v-if="isReady">
      <AdjacencyMatrix
        class="flex-auto"
        :data="matrixData"
        :rowLabels="industryLabels"
        :colLabels="industryLabels"
        :colorScale="colorScale"
        :tooltipFormatter="tooltipFormatter"
      />
    </div>
    <div v-else>
      Loading industry similarity data...
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useIndustrySimilarityStore } from '../stores/industrySimilarityStore';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import type { MatrixCell } from '../types/matrixTypes';
import * as d3 from 'd3';
import ToggleSwitch from 'primevue/toggleswitch';

export default defineComponent({
  name: 'IndustrySimilarityHeatmap',
  components: {
    AdjacencyMatrix,
    ToggleSwitch, 
  },
  data() {
    return {
      industrySimilarityStore: useIndustrySimilarityStore(),
      isReady: false,
      useWeightedMean: false,
    };
  },
  async created() {
    await this.fetchData();
  },
  computed: {
    industrySimilarityMatrix(): any {
      return this.industrySimilarityStore.industrySimilarityMatrix;
    },
    industryLabels(): string[] {
      if (this.industrySimilarityMatrix && Object.keys(this.industrySimilarityMatrix).length > 0) {
        return Object.keys(this.industrySimilarityMatrix);
      }
      return [];
    },
    matrixData(): MatrixCell[] {
      const data: MatrixCell[] = [];
      const labels = this.industryLabels;

      if (labels.length > 0) {
        labels.forEach(rowLabel => {
          labels.forEach(colLabel => {
            const value = this.industrySimilarityMatrix[rowLabel]?.[colLabel];
            data.push({
              rowId: rowLabel,
              colId: colLabel,
              value: value !== undefined ? value : null,
            });
          });
        });
      }
      return data;
    },
    colorScale(): d3.ScaleLinear<string, number> {
      return d3.scaleLinear<string, number>()
        .domain([-1, 0, 1])
        .range(["#d15f5d", "#FFFFFF", "#6a9f58"]);
    },
  },
  methods: {
    async fetchData() {
      this.isReady = false;
      await this.industrySimilarityStore.init(this.useWeightedMean);
      this.isReady = true;
    },
    tooltipFormatter(cell: MatrixCell): string {
      if (cell.value === null) {
        return `
          <div class="font-semibold text-blue-700">Industry 1: ${cell.rowId}</div>
          <div>Industry 2: ${cell.colId}</div>
          <div>Similarity: No data</div>
        `;
      }
      return `
        <div class="font-semibold text-blue-700">Industry 1: ${cell.rowId}</div>
        <div>Industry 2: ${cell.colId}</div>
        <div>Similarity: ${cell.value?.toFixed(2)}</div>
      `;
    },
  },
});
</script>

<style scoped>
</style>
