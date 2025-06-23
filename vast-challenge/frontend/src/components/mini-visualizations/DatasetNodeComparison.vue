<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Node Count by Dataset Source</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No dataset node data found.</div>
    <div v-else ref="chartContainer" class="w-full h-80">
      <BarChart :data="processedData" xKey="dataset" yKey="nodeCount" :width="chartWidth" :height="chartHeight"
        :margin="chartMargin" :colorScale="colorScale" :tooltipFormatter="tooltipFormatter"
        :xAxisLabelFormatter="xAxisLabelFormatter" :yAxisLabelFormatter="yAxisLabelFormatter" :showGridLines="true" />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { mapState } from 'pinia';
import BarChart from '../charts/BarChart.vue';
import { neutralBaseColor } from '../../utils/colors';
import { useVisualizationDataStore } from '../../stores/visualizationDataStore';

export default {
  name: 'DatasetNodeComparison',
  components: {
    BarChart,
  },
  data() {
    return {
      chartContainer: null,
      chartWidth: 400,
      chartHeight: 300,
      chartMargin: { top: 20, right: 30, bottom: 40, left: 60 },
      resizeObserver: null,
    };
  },
  computed: {
    ...mapState(useVisualizationDataStore, {
      processedData: 'datasetNodeCounts',
      isLoading: 'isLoadingDatasetNodeCounts',
      error: 'errorDatasetNodeCounts',
    }),
  },
  methods: {
    colorScale(s) {
      console.log(this.processedData);

      return neutralBaseColor;
    },
    tooltipFormatter(d) {
      return `<div class="font-semibold text-blue-700">Dataset: ${d.dataset.toUpperCase()}</div><div>Node Count: ${d.nodeCount}</div>`;
    },
    xAxisLabelFormatter(d, i) {
      return d.toUpperCase();
    },
    yAxisLabelFormatter(d, i) {
      return d3.format("d")(d);
    },
  },
  mounted() {
  },
};
</script>

<style scoped>
/* No specific styles needed here as BarChart handles its own rendering */
</style>
