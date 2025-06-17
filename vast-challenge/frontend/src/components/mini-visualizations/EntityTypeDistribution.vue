<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Entity Type Distribution</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No entity data found.</div>
    <div v-else ref="chartContainer" class="w-full h-80"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useEntityStore } from '../../stores/entityStore';
import type { Entity } from '../../types/entity'; // Only Entity type needed from here

interface IEntityTypeData {
  type: string; // Entity type name e.g., "Persons", "Organizations"
  count: number;
}

export default defineComponent({
  name: 'EntityTypeDistribution',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const entityStore = useEntityStore();

    const processedData = computed<IEntityTypeData[]>(() => {
      if (entityStore.persons.length === 0 && entityStore.organizations.length === 0) { // Check if store is populated
        // Could be loading or genuinely empty
      }
      return [
        { type: 'Persons', count: entityStore.persons.length },
        { type: 'Organizations', count: entityStore.organizations.length },
        { type: 'Places', count: entityStore.places.length },
        { type: 'Meetings', count: entityStore.meetings.length },
        { type: 'Plans', count: entityStore.plans.length },
        { type: 'Topics', count: entityStore.topics.length },
        { type: 'Trips', count: entityStore.trips.length },
      ].filter(d => d.count > 0); // Optionally filter out zero-count types
    });

    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = processedData.value;

      const margin = { top: 20, right: 30, bottom: 90, left: 60 }; // Increased bottom margin for rotated labels
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d.type))
        .range([0, width])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count) || 10])
        .range([height, 0]);

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
          .attr("transform", "translate(-10,0)rotate(-45)")
          .style("text-anchor", "end");

      // Y axis
      svg.append("g")
        .call(d3.axisLeft(y).ticks(Math.min(10, d3.max(data, d => d.count) || 10)).tickFormat(d3.format("d")));

      // Bars
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.type)!)
          .attr("y", d => y(d.count))
          .attr("width", x.bandwidth())
          .attr("height", d => height - y(d.count))
          .attr("fill", "#6366f1"); // Example color: Indigo

      // Tooltip (optional, as counts are usually clear on axes or labels)
      // For consistency, let's add a simple one
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
          const typedD = d as IEntityTypeData;
          tooltip
            .classed("hidden", false)
            .html(`Type: ${typedD.type}<br>Count: ${typedD.count}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        });
    }

    onMounted(async () => {
      isLoading.value = true;
      error.value = null;
      try {
        // entityStore.init() should be called by a parent component or App.vue
        // We assume it's populated. If not, this chart will be empty or show loading.
        // Check if data is already available, if not, entityStore.init() might be needed.
        if (entityStore.persons.length === 0 && entityStore.organizations.length === 0) { // Basic check
            // Potentially call entityStore.init() if not managed globally
            // await entityStore.init(); // Uncomment if this component is responsible for init
        }
      } catch (e) {
        console.error("Error initializing entity type distribution data:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false; // Set to false even if init is not called here, relies on store reactivity
      }
    });

    watch(processedData, () => {
      if (!isLoading.value) drawChart();
    }, { deep: true, immediate: true }); // Immediate true to draw on mount if data is ready

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
