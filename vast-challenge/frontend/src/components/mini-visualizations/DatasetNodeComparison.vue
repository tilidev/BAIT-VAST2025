<template>
  <div class=" w-full h-full flex flex-col">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Unique Node Count by Dataset Source</h3>
    <div v-if="isLoading" class="flex-grow flex items-center justify-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">Error loading data: {{ error
    }}</div>
    <div v-else-if="processedData.length === 0" class="flex-grow flex items-center justify-center text-gray-500">No
      dataset node data found.</div>
    <div v-else ref="chartContainer" class="w-full flex-grow min-h-0">
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
      chartWidth: 0,
      chartHeight: 0,
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
    showChart() {
      return !this.isLoading && !this.error && this.processedData.length > 0;
    }
  },
  methods: {
    colorScale(s) {
      switch (s.toLowerCase()) {
        case 'filah':
          return '#3B82F6';
        case 'trout':
          return '#22C55E';
        case 'journalist':
          return '#8B5CF6';
        default:
          return neutralBaseColor;
      }
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
    updateChartSize() {
      if (this.$refs.chartContainer) {
        this.chartWidth = this.$refs.chartContainer.offsetWidth;
        this.chartHeight = this.$refs.chartContainer.offsetHeight;
      }
    }
  },
  watch: {
    showChart(isShown) {
      this.$nextTick(() => {
        if (isShown && this.$refs.chartContainer) {
          this.updateChartSize();
          this.resizeObserver.observe(this.$refs.chartContainer);
        } else if (this.$refs.chartContainer) {
          this.resizeObserver.unobserve(this.$refs.chartContainer);
        }
      });
    }
  },
  mounted() {
    this.resizeObserver = new ResizeObserver(this.updateChartSize);
    if (this.showChart) {
      this.$nextTick(() => {
        if (this.$refs.chartContainer) {
          this.updateChartSize();
          this.resizeObserver.observe(this.$refs.chartContainer);
        }
      });
    }
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
};
</script>

<style scoped>
/* No specific styles needed here as BarChart handles its own rendering */
</style>
