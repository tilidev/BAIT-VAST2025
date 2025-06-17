<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Industry Sentiment Breakdown</h3>
    <div class="mb-4">
      <label for="industrySelector" class="block text-sm font-medium text-gray-700">Select Industry:</label>
      <select id="industrySelector" v-model="selectedIndustry" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
        <option disabled value="">Please select an industry</option>
        <option v-for="industry in availableIndustries" :key="industry" :value="industry">{{ industry.charAt(0).toUpperCase() + industry.slice(1) }}</option>
      </select>
    </div>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="!selectedIndustry" class="text-center text-gray-500">Please select an industry.</div>
    <div v-else-if="processedData.length === 0 && selectedIndustry" class="text-center text-gray-500">No sentiment data found for this industry.</div>
    <div v-else ref="chartContainer" class="w-full h-72"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { api as axiosInstance } from '../../lib/axios'; // Use named import
import type { GraphMembership, Entity } from '../../types/entity';

// Matches backend model IndustryProContraSentiment
interface IIndustryProContraSentiment {
  entity_id: string;
  entity_type: Entity;
  sentiment_positive: boolean;
  dataset: GraphMembership | 'all';
  industry: string;
  agg_sentiment: number;
  contributing_sentiments: any[]; // Define more strictly if needed
}

interface IProcessedBreakdownData {
  dataset: GraphMembership | 'all';
  positiveSentiment: number;
  negativeSentiment: number;
}

export default defineComponent({
  name: 'IndustrySentimentBreakdown',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const rawData = ref<IIndustryProContraSentiment[]>([]);
    const selectedIndustry = ref<string>(''); // e.g., 'tourism'

    const availableIndustries = computed<string[]>(() => {
      if (rawData.value.length === 0) return [];
      const industries = new Set(rawData.value.map(item => item.industry));
      return Array.from(industries).sort();
    });

    const processedData = computed<IProcessedBreakdownData[]>(() => {
      if (!selectedIndustry.value || rawData.value.length === 0) {
        return [];
      }

      const filteredByIndustry = rawData.value.filter(item => item.industry === selectedIndustry.value);
      
      const breakdownByDataset: Record<string, { positive: number; negative: number }> = {};
      const datasetsOrder: (GraphMembership | 'all')[] = ['jo', 'fi', 'tr', 'all'];


      datasetsOrder.forEach(dsKey => {
        breakdownByDataset[dsKey] = { positive: 0, negative: 0 };
      });

      filteredByIndustry.forEach(item => {
        const dsKey = item.dataset;
        if (!breakdownByDataset[dsKey]) { // Should not happen if datasetsOrder is comprehensive
          breakdownByDataset[dsKey] = { positive: 0, negative: 0 };
        }
        if (item.sentiment_positive) {
          breakdownByDataset[dsKey].positive += Math.abs(item.agg_sentiment); // Sum of absolute aggregated sentiments
        } else {
          breakdownByDataset[dsKey].negative += Math.abs(item.agg_sentiment);
        }
      });
      
      return datasetsOrder.map(dsKey => ({
        dataset: dsKey,
        positiveSentiment: breakdownByDataset[dsKey].positive,
        negativeSentiment: breakdownByDataset[dsKey].negative,
      })).filter(d => d.positiveSentiment > 0 || d.negativeSentiment > 0); // Only show datasets with data for this industry
    });

    async function fetchData() {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await axiosInstance.get<IIndustryProContraSentiment[]>('/industry-pro-contra-sentiments');
        rawData.value = response.data;
        if (availableIndustries.value.length > 0 && !selectedIndustry.value) {
          // selectedIndustry.value = availableIndustries.value[0]; // Auto-select first industry
        }
      } catch (e) {
        console.error("Error fetching industry sentiment breakdown:", e);
        error.value = (e as Error).message || "Failed to fetch data";
      } finally {
        isLoading.value = false;
      }
    }

    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0 || !selectedIndustry.value) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = processedData.value;
      const groupKeys = data.map(d => d.dataset); // Datasets: 'jo', 'fi', 'tr', 'all'
      const subGroupKeys = ['positiveSentiment', 'negativeSentiment'];

      const margin = { top: 30, right: 30, bottom: 40, left: 60 };
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x0 = d3.scaleBand()
        .domain(groupKeys)
        .range([0, width])
        .padding(0.2);

      const x1 = d3.scaleBand()
        .domain(subGroupKeys)
        .range([0, x0.bandwidth()])
        .padding(0.05);

      const yMax = d3.max(data, d => Math.max(d.positiveSentiment, d.negativeSentiment)) || 10;
      const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([height, 0]);

      const color = d3.scaleOrdinal<string>()
        .domain(subGroupKeys)
        .range(['#4ade80', '#f87171']); // Green for positive, Red for negative

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0));

      // Y axis
      svg.append("g")
        .call(d3.axisLeft(y));

      // Bars
      const group = svg.selectAll(".group")
        .data(data)
        .join("g")
          .attr("class", "group")
          .attr("transform", d => `translate(${x0(d.dataset)},0)`);

      group.selectAll("rect")
        .data(d => subGroupKeys.map(key => ({ key, value: (d as any)[key], dataset: d.dataset })))
        .join("rect")
          .attr("x", d => x1(d.key)!)
          .attr("y", d => y(d.value))
          .attr("width", x1.bandwidth())
          .attr("height", d => height - y(d.value))
          .attr("fill", d => color(d.key));
      
      // Legend
      const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "start") // Changed to start for typical legend layout
        .selectAll("g")
        .data(subGroupKeys)
        .join("g")
          .attr("transform", (d, i) => `translate(${width - 120},${i * 20})`); // Position top-right

      legend.append("rect")
          .attr("x", 0)
          .attr("width", 19)
          .attr("height", 19)
          .attr("fill", color);

      legend.append("text")
          .attr("x", 24)
          .attr("y", 9.5)
          .attr("dy", "0.32em")
          .text(d => d === 'positiveSentiment' ? 'Positive' : 'Negative');


      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      group.selectAll("rect")
        .on("mouseover", (event, d) => {
          const typedD = d as { key: string; value: number; dataset: GraphMembership | 'all' };
          tooltip
            .classed("hidden", false)
            .html(`Dataset: ${typedD.dataset}<br>Type: ${typedD.key === 'positiveSentiment' ? 'Positive' : 'Negative'}<br>Agg. Sentiment: ${typedD.value.toFixed(2)}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", () => {
          tooltip.classed("hidden", true);
        });
    }

    onMounted(fetchData);

    watch([processedData, selectedIndustry], () => {
      if (!isLoading.value) drawChart();
    }, { deep: true });

    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && processedData.value.length > 0 && selectedIndustry.value) {
            drawChart();
        } else if (!newIsLoading && chartContainer.value) {
             d3.select(chartContainer.value).selectAll("*").remove();
        }
    });

    return {
      chartContainer,
      isLoading,
      error,
      selectedIndustry,
      availableIndustries,
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
