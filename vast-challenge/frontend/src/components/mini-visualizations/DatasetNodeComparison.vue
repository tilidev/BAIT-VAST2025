<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Node Count by Dataset Source</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No dataset node data found.</div>
    <div v-else ref="chartContainer" class="w-full h-80"></div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { api as axiosInstance } from '../../lib/axios';

export default {
  name: 'DatasetNodeComparison',
  data() {
    return {
      chartContainer: null,
      isLoading: true,
      error: null,
      processedData: [],
      datasetsToFetch: ['jo', 'fi', 'tr'],
    };
  },
  methods: {
    async fetchDataForDatasets() {
      this.isLoading = true;
      this.error = null;
      const results = [];

      try {
        for (const dataset of this.datasetsToFetch) {
          const response = await axiosInstance.get(
            `/dataset-specific-nodes-edges?dataset=${dataset}`
          );
          results.push({
            dataset: dataset,
            nodeCount: response.data.nodes.length,
          });
        }
        this.processedData = results;
      } catch (e) {
        console.error("Error fetching dataset node counts:", e);
        this.error = e.message || "Failed to fetch data";
      } finally {
        this.isLoading = false;
      }
    },
    drawChart() {
      const container = this.$refs.chartContainer;
      if (!container || this.processedData.length === 0) {
        if(container) d3.select(container).selectAll("*").remove();
        return;
      }
      d3.select(container).selectAll("*").remove();

      const data = this.processedData;

      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const width = container.clientWidth - margin.left - margin.right;
      const height = container.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d.dataset.toUpperCase()))
        .range([0, width])
        .padding(0.3);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.nodeCount) || 10])
        .range([height, 0]);

      const color = d3.scaleOrdinal()
        .domain(this.datasetsToFetch)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      // Y axis
      svg.append("g")
        .call(d3.axisLeft(y).ticks(Math.min(10, d3.max(data, d => d.nodeCount) || 10)).tickFormat(d3.format("d")));

      // Bars
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.dataset.toUpperCase()))
          .attr("y", d => y(d.nodeCount))
          .attr("width", x.bandwidth())
          .attr("height", d => height - y(d.nodeCount))
          .attr("fill", d => color(d.dataset));

      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
          tooltip
            .classed("hidden", false)
            .html(`Dataset: ${d.dataset.toUpperCase()}<br>Node Count: ${d.nodeCount}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        });
    },
  },
  mounted() {
    this.fetchDataForDatasets();
  },
  watch: {
    processedData: {
      handler() {
        if (!this.isLoading && this.processedData.length > 0) {
          this.$nextTick(() => {
            this.drawChart();
          });
        }
      },
      deep: true,
    },
    isLoading(newIsLoading) {
      if (!newIsLoading && this.processedData.length > 0) {
        this.$nextTick(() => {
          this.drawChart();
        });
      }
    },
  },
};
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
