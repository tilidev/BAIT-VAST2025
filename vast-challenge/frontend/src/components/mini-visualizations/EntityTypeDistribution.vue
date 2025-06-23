<template>
  <div class="p-4 border rounded-lg shadow-md bg-white h-full">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Entity Type Distribution</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No entity data found.</div>
    <div v-else ref="chartContainer" class="w-full h-full">
      <BarChart :data="processedData" xKey="type" yKey="count" :width="chartWidth" :height="chartHeight"
        :margin="chartMargin" :tooltipFormatter="tooltipFormatter" :xAxisLabelFormatter="xAxisLabelFormatter"
        :yAxisLabelFormatter="yAxisLabelFormatter" :xLabelRotation="45" :showGridLines="true" />
    </div>
  </div>
</template>

<script>
import { useEntityStore } from '../../stores/entityStore';
import BarChart from '../charts/BarChart.vue';
import * as d3 from 'd3';

export default {
  name: 'EntityTypeDistribution',
  components: {
    BarChart,
  },
  data() {
    return {
      isLoading: true,
      error: null,
      entityStore: useEntityStore(),
      chartContainer: null, // Re-add chartContainer ref to data
      chartWidth: 0,
      chartHeight: 0,
      chartMargin: { top: 20, right: 30, bottom: 90, left: 60 },
    };
  },
  computed: {
    processedData() {
      return [
        { type: 'Persons', count: this.entityStore.persons.length },
        { type: 'Organizations', count: this.entityStore.organizations.length },
        { type: 'Places', count: this.entityStore.places.length },
        { type: 'Meetings', count: this.entityStore.meetings.length },
        { type: 'Plans', count: this.entityStore.plans.length },
        { type: 'Topics', count: this.entityStore.topics.length },
        { type: 'Trips', count: this.entityStore.trips.length },
      ].filter(d => d.count > 0);
    },
  },
  methods: {
    tooltipFormatter(d) {
      return `<div class="font-semibold text-blue-700">Type: ${d.type}</div><div>Count: ${d.count}</div>`;
    },
    xAxisLabelFormatter(d) {
      return d;
    },
    yAxisLabelFormatter(d) {
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
    isLoading(newVal) {
      if (!newVal && this.processedData.length > 0) {
        this.$nextTick(() => {
          this.updateChartSize();
        });
      }
    },
    processedData: {
      handler(newVal) {
        if (newVal.length > 0 && !this.isLoading) {
          this.$nextTick(() => {
            this.updateChartSize();
          });
        }
      },
      deep: true,
    },
  },
  async mounted() {
    this.isLoading = true;
    this.error = null;
    try {
      // Assuming entityStore.init() or similar method exists to load data
      if (this.entityStore.persons.length === 0 && this.entityStore.organizations.length === 0 &&
          this.entityStore.places.length === 0 && this.entityStore.meetings.length === 0 &&
          this.entityStore.plans.length === 0 && this.entityStore.topics.length === 0 &&
          this.entityStore.trips.length === 0) {
        // Potentially call an init method on the store if it fetches data
        // await this.entityStore.init(); 
      }
    } catch (e) {
      console.error("Error initializing entity type distribution:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
    }
    window.addEventListener('resize', this.updateChartSize);
    this.$nextTick(() => {
      this.updateChartSize();
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateChartSize);
  }
};
</script>

<style scoped>
/* No specific styles needed here as BarChart handles its own rendering */
</style>
