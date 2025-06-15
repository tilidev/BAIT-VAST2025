<template>
  <div v-if="isReady" class="flex">
    <AdjacencyMatrix
      class="flex-auto"
      :data="matrixData"
      :rowLabels="industryLabels"
      :colLabels="industryLabels"
      :width="500"
      :height="500"
      :margin="{ top: 150, right: 0, bottom: 10, left: 150 }"
      :colorScale="colorScale"
      :tooltipFormatter="tooltipFormatter"
    />
  </div>
  <div v-else>
    Loading industry similarity data...
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useIndustrySimilarityStore } from '../stores/industrySimilarityStore';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import type { MatrixCell } from '../types/matrixTypes';
import * as d3 from 'd3';

export default defineComponent({
  name: 'IndustrySimilarityHeatmap',
  components: {
    AdjacencyMatrix,
  },
  data() {
    return {
      industrySimilarityStore: useIndustrySimilarityStore(),
      isReady: false,
    };
  },
  async created() {
    await this.industrySimilarityStore.init();
    this.isReady = true;
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
        .range(["#d15f5d", "#FFFFFF", "#6a9f58"]); // Consistent with GraphView.vue sentiment scale
    },
  },
  methods: {
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
/* Add any specific styles for the heatmap wrapper here */
</style>
