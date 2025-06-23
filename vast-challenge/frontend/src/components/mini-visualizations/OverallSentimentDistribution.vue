<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Overall Sentiment Score Distribution</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="sentimentScores.length === 0" class="text-center text-gray-500">No sentiment scores found.</div>
    <div v-else class="w-full h-80">
      <Histogram :data="sentimentScores" :bins="20" :width="chartWidth" :height="chartHeight" :margin="chartMargin"
        :color="neutralBaseColor" :tooltipFormatter="histogramTooltipFormatter"
        :xAxisLabelFormatter="xAxisLabelFormatter" :yAxisLabelFormatter="yAxisLabelFormatter" :showGridLines="true" />
    </div>
  </div>
</template>

<script>
import { useGraphStore } from '../../stores/graphStore';
import Histogram from '../charts/Histogram.vue';
import { neutralBaseColor } from '../../utils/colors';

export default {
  name: 'OverallSentimentDistribution',
  components: {
    Histogram,
  },
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      chartWidth: 400,
      chartHeight: 300,
      chartMargin: { top: 20, right: 30, bottom: 50, left: 50 },
    };
  },
  computed: {
    sentimentScores() {
      if (!this.graphStore.sentimentPerTopic || this.graphStore.sentimentPerTopic.length === 0) {
        return [];
      }
      const scores = [];
      this.graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((ts) => {
          if (ts.sentiment !== null && ts.sentiment !== undefined) {
            scores.push(ts.sentiment);
          }
        });
      });
      return scores;
    },
  },
  methods: {
    histogramTooltipFormatter(d) {
      return `Range: [${d.x0?.toFixed(2)}, ${d.x1?.toFixed(2)})<br>Frequency: ${d.length}`;
    },
    xAxisLabelFormatter(d) {
      return d.toFixed(1); // Format sentiment scores to one decimal place
    },
    yAxisLabelFormatter(d) {
      return d.toString(); // Default string conversion for frequency
    },
  },
  async mounted() {
    this.isLoading = true;
    this.error = null;
    try {
      if (this.graphStore.sentimentPerTopic.length === 0) {
        await this.graphStore.init(); // Ensure data is loaded
      }
    } catch (e) {
      console.error("Error initializing overall sentiment distribution:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
    }
  },
};
</script>

<style scoped>
/* No specific styles needed here as Tailwind classes are applied directly or via props */
</style>
