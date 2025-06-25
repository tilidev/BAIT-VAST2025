<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Person Sentiment Across Datasets</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No sentiment data found for this
      person.</div>
    <div v-else class="w-full h-96">
      <GroupedBarChart :data="processedData" groupKey="groupKey" :subGroupKeys="['jo', 'fi', 'tr']" :width="chartWidth"
        :height="chartHeight" :margin="chartMargin" :subGroupColorScale="subGroupColorScale"
        :tooltipFormatter="tooltipFormatter" :xAxisLabelFormatter="xAxisLabelFormatter"
        :yAxisLabelFormatter="yAxisLabelFormatter" />
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import GroupedBarChart from '../charts/GroupedBarChart.vue';

export default {
  name: 'PersonSentimentAcrossDatasets',
  components: {
    GroupedBarChart,
  },
  props: {
    personId: {
      type: String,
      required: true,
    },
    sentimentGranularity: {
      type: String,
      default: 'topic', // 'topic' or 'industry'
    }
  },
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      chartWidth: 400,
      chartHeight: 300,
      chartMargin: { top: 20, right: 30, bottom: 70, left: 60 },
    };
  },
  computed: {
    processedData() {
      if (!this.graphStore.sentimentPerTopic || this.graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const personData = this.graphStore.sentimentPerTopic.find(
        (entity) => entity.entity_id === this.personId
      );

      if (!personData) {
        return [];
      }

      const sentimentsByGroupAndDataset = {};

      personData.topic_sentiments.forEach((ts) => {
        if (ts.sentiment === null || ts.sentiment === undefined) return;

        const groupKey = this.sentimentGranularity === 'industry' ? (ts.topic_industry?.join(', ') || 'Unknown Industry') : ts.topic_id;

        let datasetsToAttribute = [];
        if (ts.sentiment_recorded_in?.includes('tr')) datasetsToAttribute.push('tr');
        if (ts.sentiment_recorded_in?.includes('fi')) datasetsToAttribute.push('fi');
        if (ts.sentiment_recorded_in?.includes('jo') && !ts.sentiment_recorded_in?.includes('tr') && !ts.sentiment_recorded_in?.includes('fi')) {
          datasetsToAttribute.push('jo');
        }
        if (datasetsToAttribute.length === 0 && ts.sentiment_recorded_in?.includes('jo')) {
          datasetsToAttribute.push('jo');
        }

        datasetsToAttribute.forEach(dataset => {
          if (!sentimentsByGroupAndDataset[groupKey]) {
            sentimentsByGroupAndDataset[groupKey] = {
              jo: { sum: 0, count: 0 },
              fi: { sum: 0, count: 0 },
              tr: { sum: 0, count: 0 },
            };
          }
          sentimentsByGroupAndDataset[groupKey][dataset].sum += ts.sentiment;
          sentimentsByGroupAndDataset[groupKey][dataset].count += 1;
        });
      });

      const result = [];
      for (const groupKey in sentimentsByGroupAndDataset) {
        const entry = {
          groupKey: groupKey,
          jo: 0,
          fi: 0,
          tr: 0,
        };
        (['jo', 'fi', 'tr']).forEach(dataset => {
          const data = sentimentsByGroupAndDataset[groupKey][dataset];
          if (data && data.count > 0) {
            entry[dataset] = data.sum / data.count;
          }
        });
        result.push(entry);
      }
      return result;
    },
    subGroupColorScale() {
      return d3.scaleOrdinal()
        .domain(['jo', 'fi', 'tr'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);
    },
  },
  methods: {
    tooltipFormatter(d) {
      return `${this.sentimentGranularity === 'industry' ? 'Industry' : 'Topic'}: ${d.group}<br>Dataset: ${d.key.toUpperCase()}<br>Avg. Sentiment: ${d.value.toFixed(2)}`;
    },
    xAxisLabelFormatter(d) {
      return d;
    },
    yAxisLabelFormatter(d) {
      return d.toFixed(2);
    },
    async fetchDataForDatasets() {
      this.isLoading = true;
      this.error = null;
      try {
        if (this.graphStore.sentimentPerTopic.length === 0) {
          await this.graphStore.init();
        }
      } catch (e) {
        console.error("Error initializing or processing data:", e);
        this.error = e.message || "An unknown error occurred";
      } finally {
        this.isLoading = false;
      }
    },
  },
  async mounted() {
    await this.fetchDataForDatasets();
  },
  watch: {
    personId: {
      handler() {
        // Re-fetch data when personId or sentimentGranularity changes
        this.isLoading = true;
        this.fetchDataForDatasets();
      },
      immediate: true,
    },
    sentimentGranularity: {
      handler() {
        // Re-fetch data when personId or sentimentGranularity changes
        this.isLoading = true;
        this.fetchDataForDatasets();
      },
      immediate: true,
    },
  },
};
</script>

<style scoped>
/* No specific styles needed here as GroupedBarChart handles its own rendering */
</style>
