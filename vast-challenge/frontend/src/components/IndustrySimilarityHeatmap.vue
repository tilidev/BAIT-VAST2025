<template>
  <div class="flex flex-col">
    <!-- Toggle on top -->
    <div class="mb-4 flex items-center">
      <ToggleSwitch
        v-model="useWeightedMean"
        @change="fetchData"
        inputId="weighted-mean-toggle"
      />
      <label for="weighted-mean-toggle" class="ml-2 text-gray-700">
        Use Weighted Mean
      </label>
    </div>

    <!-- Heatmap below -->
    <div v-if="isReady" class="flex-auto">
      <AdjacencyMatrix
        :width="width"
        :height="height"
        :margin="{ top: 80, right: 10, bottom: 10, left: 80 }"
        :data="matrixData"
        :rowLabels="industryLabels"
        :colLabels="industryLabels"
        :colorScale="colorScale"
        :tooltipFormatter="tooltipFormatter"
        @cell-click="onCellClick"
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
import { useScaleStore } from '../stores/scaleStore';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import type { MatrixCell } from '../types/matrixTypes';
import * as d3 from 'd3';
import ToggleSwitch from 'primevue/toggleswitch';

export default defineComponent({
  props: {
    width: { type: Number, default: 400 },
    height: { type: Number, default: 400 }
  },
  name: 'IndustrySimilarityHeatmap',
  components: { AdjacencyMatrix, ToggleSwitch },
  data() {
    return {
      industrySimilarityStore: useIndustrySimilarityStore(),
      scaleStore: useScaleStore(),
      isReady: false,
      useWeightedMean: true
    };
  },
  async created() {
    await this.fetchData();
  },
  computed: {
    industrySimilarityMatrix(): Record<string, Record<string, number>> {
      return this.industrySimilarityStore.industrySimilarityMatrix;
    },
    industryLabels(): string[] {
      return Object.keys(this.industrySimilarityMatrix || {});
    },
    matrixData(): MatrixCell[] {
      const data: MatrixCell[] = [];
      const labels = this.industryLabels;
      labels.forEach(rowLabel => {
        labels.forEach(colLabel => {
          const value = this.industrySimilarityMatrix[rowLabel]?.[colLabel];
          data.push({ rowId: rowLabel, colId: colLabel, value: value !== undefined ? value : null });
        });
      });
      return data;
    },
    colorScale(): d3.ScaleLinear<string, number> {
      return d3.scaleLinear<string, number>()
        .domain([-1, 0, 1])
        .range(["#d15f5d", "#FFFFFF", "#6a9f58"]);
    }
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
      const bgClass = cell.value > 0
        ? 'bg-green-500'
        : cell.value < 0
        ? 'bg-red-500'
        : 'bg-gray-400';
      return `
        <div class="font-semibold text-blue-700">Industry 1: ${cell.rowId}</div>
        <div>Industry 2: ${cell.colId}</div>
        <div>
          Similarity:&nbsp;
          <span class="px-2 py-0.5 rounded text-white text-xs font-semibold ${bgClass}">
            ${cell.value.toFixed(2)}
          </span>
        </div>
      `;
    },
    onCellClick(cell: { row: string; col: string }) {
      this.scaleStore.setLeftIndustry(cell.row);
      this.scaleStore.setRightIndustry(cell.col);
    }
  }
});
</script>

<style scoped>
</style>
