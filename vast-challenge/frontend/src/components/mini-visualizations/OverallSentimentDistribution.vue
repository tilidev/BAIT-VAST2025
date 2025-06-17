<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Overall Sentiment Score Distribution</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="sentimentScores.length === 0" class="text-center text-gray-500">No sentiment scores found.</div>
    <div v-else ref="chartContainer" class="w-full h-80"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import type { EntityTopicSentiment, TopicSentiment } from '../../types/entity';

export default defineComponent({
  name: 'OverallSentimentDistribution',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const graphStore = useGraphStore();

    const sentimentScores = computed<number[]>(() => {
      if (!graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }
      const scores: number[] = [];
      graphStore.sentimentPerTopic.forEach((entity: EntityTopicSentiment) => {
        entity.topic_sentiments.forEach((ts: TopicSentiment) => {
          if (ts.sentiment !== null && ts.sentiment !== undefined) {
            scores.push(ts.sentiment);
          }
        });
      });
      return scores;
    });

    function drawChart() {
      if (!chartContainer.value || sentimentScores.value.length === 0) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = sentimentScores.value;

      const margin = { top: 20, right: 30, bottom: 50, left: 50 };
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // X axis: scale for sentiment scores (-1 to 1)
      const x = d3.scaleLinear()
        .domain([-1, 1]) // Sentiment range
        .range([0, width]);
      
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
      svg.append("text") // X axis label
          .attr("text-anchor", "end")
          .attr("x", width / 2 + margin.left /3)
          .attr("y", height + margin.top + 20)
          .text("Sentiment Score");


      // Set up the histogram generator
      const histogram = d3.bin<number, number>()
        .value(d => d)   // I need to give the vector of value
        .domain(x.domain() as [number, number])  // then the domain of the graphic
        .thresholds(x.ticks(20)); // then the numbers of bins (e.g., 20 bins from -1 to 1)

      const bins = histogram(data);

      // Y axis: scale for frequency
      const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(bins, d => d.length) || 10]); // Max frequency
      
      svg.append("g")
        .call(d3.axisLeft(y));
      svg.append("text") // Y axis label
          .attr("text-anchor", "end")
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + 15)
          .attr("x", -height / 2 + margin.top)
          .text("Frequency");

      // Bars for the histogram
      svg.selectAll("rect")
        .data(bins)
        .join("rect")
          .attr("x", 1)
          .attr("transform", (d: d3.Bin<number, number>) => `translate(${x(d.x0!)}, ${y(d.length)})`)
          .attr("width", (d: d3.Bin<number, number>) => Math.max(0, x(d.x1!) - x(d.x0!) - 1)) // -1 for padding between bars
          .attr("height", (d: d3.Bin<number, number>) => height - y(d.length))
          .style("fill", "#2563eb"); // Example color: Blue

      // Tooltip (optional for histogram, but can show bin range and count)
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll("rect")
        .on("mouseover", (event, d: any) => { // d is inferred as d3.Bin<number, number> here from the selection
          const binData = d as d3.Bin<number, number>;
          tooltip
            .classed("hidden", false)
            .html(`Range: [${binData.x0?.toFixed(2)}, ${binData.x1?.toFixed(2)})<br>Frequency: ${binData.length}`);
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
        if (graphStore.sentimentPerTopic.length === 0) {
          await graphStore.init(); // Ensure data is loaded
        }
      } catch (e) {
        console.error("Error initializing overall sentiment distribution:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false;
      }
    });

    watch(sentimentScores, () => {
      if (!isLoading.value) drawChart();
    }, { deep: true });

    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && sentimentScores.value.length > 0) {
            drawChart();
        }
    });

    return {
      chartContainer,
      isLoading,
      error,
      sentimentScores, // For template debugging
    };
  },
});
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
