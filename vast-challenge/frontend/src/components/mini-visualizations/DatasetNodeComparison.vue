<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Node Count by Dataset Source</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No dataset node data found.</div>
    <div v-else ref="chartContainer" class="w-full h-80"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { api as axiosInstance } from '../../lib/axios';
import type { GraphMembership } from '../../types/entity'; // GraphMembership: 'jo', 'fi', 'tr'

interface IDatasetNodeCount {
  dataset: GraphMembership;
  nodeCount: number;
}

// Simplified structure for API response from /dataset-specific-nodes-edges
interface IDatasetSpecificGraph {
  nodes: Array<{ id: string; [key: string]: any }>; // Assuming nodes have an 'id'
  edges: Array<{ source: string; target: string; [key: string]: any }>;
}

export default defineComponent({
  name: 'DatasetNodeComparison',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const processedData = ref<IDatasetNodeCount[]>([]);

    const datasetsToFetch: GraphMembership[] = ['jo', 'fi', 'tr'];

    async function fetchDataForDatasets() {
      isLoading.value = true;
      error.value = null;
      const results: IDatasetNodeCount[] = [];

      try {
        for (const dataset of datasetsToFetch) {
          const response = await axiosInstance.get<IDatasetSpecificGraph>(
            `/dataset-specific-nodes-edges?dataset=${dataset}`
          );
          // We are interested in nodes *only* in this dataset,
          // The backend endpoint returns nodes that have the dataset in their 'in_graph' property.
          // For a true "only in" count, the backend logic might need adjustment or further client-side filtering if full graph data were available.
          // For now, we assume the endpoint gives a relevant count of nodes associated primarily with this dataset.
          results.push({
            dataset: dataset,
            nodeCount: response.data.nodes.length,
          });
        }
        processedData.value = results;
      } catch (e) {
        console.error("Error fetching dataset node counts:", e);
        error.value = (e as Error).message || "Failed to fetch data";
      } finally {
        isLoading.value = false;
      }
    }

    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = processedData.value;

      const margin = { top: 20, right: 30, bottom: 40, left: 60 };
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d.dataset.toUpperCase())) // Display as JO, FI, TR
        .range([0, width])
        .padding(0.3);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.nodeCount) || 10])
        .range([height, 0]);

      const color = d3.scaleOrdinal<string>()
        .domain(datasetsToFetch)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']); // Colors for 'jo', 'fi', 'tr'

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
          .attr("x", d => x(d.dataset.toUpperCase())!)
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
          const typedD = d as IDatasetNodeCount;
          tooltip
            .classed("hidden", false)
            .html(`Dataset: ${typedD.dataset.toUpperCase()}<br>Node Count: ${typedD.nodeCount}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        });
    }

    onMounted(fetchDataForDatasets);

    watch(processedData, () => { // Watch processedData directly as it's a ref
      if (!isLoading.value) drawChart();
    }, { deep: true });
    
    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && processedData.value.length > 0) {
            drawChart();
        }
    });

    return {
      chartContainer,
      isLoading,
      error,
      processedData,
    };
  },
});
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
