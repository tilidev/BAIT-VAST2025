<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Industry Sentiment Breakdown</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="!industry" class="text-center text-gray-500">Please select an industry.</div>
    <div v-else-if="processedData.length === 0 && industry" class="text-center text-gray-500">No sentiment data
      found for this industry.</div>
    <div v-else ref="chartContainer" class="w-full h-72">
      <GroupedBarChart :data="processedData" groupKey="dataset"
        :subGroupKeys="['positiveSentiment', 'negativeSentiment']" :width="chartWidth" :height="chartHeight"
        :margin="chartMargin" :subGroupColorScale="subGroupColorScale" :tooltipFormatter="tooltipFormatter"
        :xAxisLabelFormatter="xAxisLabelFormatter" :yAxisLabelFormatter="yAxisLabelFormatter" :showGridLines="true" />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { mapState } from 'pinia';
import GroupedBarChart from '../charts/GroupedBarChart.vue';
import { useVisualizationDataStore } from '../../stores/visualizationDataStore';
import { createSentimentColorScale, sentimentColorScale } from '../../utils/colors.ts'

export default {
  name: 'IndustrySentimentBreakdown',
  components: {
    GroupedBarChart,
  },
  props: {
    industry: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      chartContainer: null,
      chartWidth: 400,
      chartHeight: 300,
      chartMargin: { top: 30, right: 30, bottom: 40, left: 60 },
    };
  },
  computed: {
    ...mapState(useVisualizationDataStore, {
      rawData: 'industrySentimentRawData',
      isLoading: 'isLoadingIndustrySentimentRawData',
      error: 'errorIndustrySentimentRawData',
    }),
    availableIndustries() {
      if (this.rawData.length === 0) return [];
      const industries = new Set(this.rawData.map(item => item.industry));
      return Array.from(industries).sort();
    },
    processedData() {
      if (!this.industry || this.rawData.length === 0) {
        return [];
      }

      const filteredByIndustry = this.rawData.filter(item => item.industry === this.industry);

      const breakdownByDataset = {};
      const datasetsOrder = ['jo', 'fi', 'tr', 'all'];

      datasetsOrder.forEach(dsKey => {
        breakdownByDataset[dsKey] = { positive: 0, negative: 0 };
      });

      filteredByIndustry.forEach(item => {
        const dsKey = item.dataset;
        if (!breakdownByDataset[dsKey]) {
          breakdownByDataset[dsKey] = { positive: 0, negative: 0 };
        }
        if (item.sentiment_positive) {
          breakdownByDataset[dsKey].positive += Math.abs(item.agg_sentiment);
        } else {
          breakdownByDataset[dsKey].negative += Math.abs(item.agg_sentiment);
        }
      });

      return datasetsOrder.map(dsKey => ({
        dataset: dsKey,
        positiveSentiment: breakdownByDataset[dsKey].positive,
        negativeSentiment: breakdownByDataset[dsKey].negative,
      })).filter(d => d.positiveSentiment > 0 || d.negativeSentiment > 0);
    },
    subGroupColorScale() {
      return createSentimentColorScale()
    },
  },
  methods: {
    tooltipFormatter(d) {
      const typeLabel = d.key === 'positiveSentiment' ? 'Positive' : 'Negative';
      return `<div class="font-semibold text-blue-700">Dataset: ${d.group.toUpperCase()}</div><div>Type: ${typeLabel}</div><div>Agg. Sentiment: ${d.value.toFixed(2)}</div>`;
    },
    xAxisLabelFormatter(d) {
      return d.toUpperCase();
    },
    yAxisLabelFormatter(d) {
      return d.toString();
    },
  },
};
</script>

<style scoped>
/* No specific styles needed here as GroupedBarChart handles its own rendering */
</style>
