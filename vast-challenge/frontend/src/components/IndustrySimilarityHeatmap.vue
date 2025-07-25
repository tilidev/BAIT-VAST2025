<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Industry Similarity</h3>
      <div class="absolute top-2 right-2 z-10">
        <transition name="fade">
          <div v-if="showHelp"
            class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800">
            <p class="font-bold text-lg mb-3 text-gray-900">Chart Interactions</p>
            <ul class="space-y-3">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" />
                </svg>
                <div><span class="font-semibold">Hover</span> over cells to see similarity scores.</div>
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div><span class="font-semibold">Click</span> a cell to compare two industries.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
    <div class="mb-2 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">Use Weighted Mean</span>
      <button
        type="button"
        @click="toggleWeightedMean"
        :class="[
          'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-base',
          useWeightedMean ? 'bg-indigo-base' : 'bg-gray-200'
        ]"
        role="switch"
        :aria-checked="useWeightedMean"
      >
        <span
          :class="[
            'inline-block w-5 h-5 bg-white rounded-full shadow transform ring-0 transition ease-in-out duration-200',
            useWeightedMean ? 'translate-x-5' : 'translate-x-0'
          ]"
        ></span>
      </button>
    </div>
    <div class="flex-grow min-h-0">
      <div v-if="isReady" class="flex-auto">
        <AdjacencyMatrix :width="width" :height="height" :margin="{ top: 80, right: 10, bottom: 10, left: 80 }"
          :data="matrixData" :rowLabels="industryLabels" :colLabels="industryLabels" :colorScale="colorScale"
          :tooltipFormatter="tooltipFormatter" @cell-click="onCellClick" />
      </div>
      <div v-else class="flex-grow flex items-center justify-center text-gray-500">
        Loading industry similarity data...
      </div>
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

export default defineComponent({
  props: {
    width: { type: Number, default: 400 },
    height: { type: Number, default: 400 }
  },
  name: 'IndustrySimilarityHeatmap',
  components: { AdjacencyMatrix },
  data() {
    return {
      industrySimilarityStore: useIndustrySimilarityStore(),
      scaleStore: useScaleStore(),
      isReady: false,
      useWeightedMean: true,
      showHelp: false,
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
    toggleWeightedMean() {
      this.useWeightedMean = !this.useWeightedMean;
      this.fetchData();
    },
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
