<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Topic Sentiment Overview</h3>
    <div class="mb-2">
      <label for="sortOrder" class="mr-2 text-sm font-medium text-gray-700">Sort by:</label>
      <select id="sortOrder" v-model="sortOrder" class="py-1 px-2 text-sm border-gray-300 rounded-md">
        <option value="avgSentimentDesc">Avg. Sentiment (High to Low)</option>
        <option value="avgSentimentAsc">Avg. Sentiment (Low to High)</option>
        <option value="topicId">Topic ID (A-Z)</option>
        <option value="sentimentCountDesc">No. of Sentiments (High to Low)</option>
      </select>
    </div>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No topic sentiment data found.</div>
    <div v-else ref="chartContainer" class="w-full" :style="{ height: chartHeight + 'px' }"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import type { EntityTopicSentiment, TopicSentiment } from '../../types/entity';

interface ITopicAverageSentiment {
  topicId: string;
  averageSentiment: number;
  sentimentCount: number; // Total number of sentiment records for this topic
}

type SortOrder = "avgSentimentDesc" | "avgSentimentAsc" | "topicId" | "sentimentCountDesc";

export default defineComponent({
  name: 'TopicSentimentOverview',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const graphStore = useGraphStore();
    const sortOrder = ref<SortOrder>('avgSentimentDesc');

    const processedData = computed<ITopicAverageSentiment[]>(() => {
      if (!graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const topicSentimentsMap: Record<string, { sum: number; count: number }> = {};

      graphStore.sentimentPerTopic.forEach((entity: EntityTopicSentiment) => {
        entity.topic_sentiments.forEach((ts: TopicSentiment) => {
          if (ts.sentiment === null || ts.sentiment === undefined) return;

          if (!topicSentimentsMap[ts.topic_id]) {
            topicSentimentsMap[ts.topic_id] = { sum: 0, count: 0 };
          }
          topicSentimentsMap[ts.topic_id].sum += ts.sentiment;
          topicSentimentsMap[ts.topic_id].count += 1;
        });
      });

      let result = Object.entries(topicSentimentsMap).map(([topicId, data]) => ({
        topicId,
        averageSentiment: data.sum / data.count,
        sentimentCount: data.count,
      }));

      // Sorting
      switch (sortOrder.value) {
        case 'avgSentimentDesc':
          result.sort((a, b) => b.averageSentiment - a.averageSentiment);
          break;
        case 'avgSentimentAsc':
          result.sort((a, b) => a.averageSentiment - b.averageSentiment);
          break;
        case 'topicId':
          result.sort((a, b) => a.topicId.localeCompare(b.topicId));
          break;
        case 'sentimentCountDesc':
          result.sort((a, b) => b.sentimentCount - a.sentimentCount);
          break;
      }
      return result.slice(0, 20); // Display top 20 for manageability
    });
    
    const chartHeight = computed(() => {
        // Adjust height based on number of items, e.g., 30px per item + margins
        return Math.max(300, processedData.value.length * 30 + 80); 
    });


    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = processedData.value;

      const margin = { top: 20, right: 50, bottom: 40, left: 150 }; // Increased left margin for topic IDs
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      // Height is now dynamic based on chartHeight computed property
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;


      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const y = d3.scaleBand()
        .domain(data.map(d => d.topicId))
        .range([0, height])
        .padding(0.1);

      const x = d3.scaleLinear()
        .domain([-1, 1]) // Sentiment range
        .range([0, width]);

      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([1, -1]); // Positive Blue, Negative Red

      // Y axis (Topic IDs)
      svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove(); // Remove axis line

      // X axis (Sentiment Score)
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5)); // Fewer ticks for sentiment range

      // X-axis grid lines
      svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(10) // More ticks for grid lines
            .tickSize(-height)
            .tickFormat("" as any)
        )
        .selectAll("line")
        .attr("stroke-opacity", 0.1);
      svg.select(".grid .domain").remove(); // Remove domain line from grid

      // Center line at 0 sentiment
      svg.append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "grey")
        .attr("stroke-dasharray", "2,2");

      // Bars
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
          .attr("class", "bar")
          .attr("y", d => y(d.topicId)!)
          .attr("x", d => d.averageSentiment < 0 ? x(d.averageSentiment) : x(0))
          .attr("width", d => Math.abs(x(d.averageSentiment) - x(0)))
          .attr("height", y.bandwidth())
          .attr("fill", d => colorScale(d.averageSentiment));

      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
          const typedD = d as ITopicAverageSentiment;
          tooltip
            .classed("hidden", false)
            .html(`Topic: ${typedD.topicId}<br>Avg. Sentiment: ${typedD.averageSentiment.toFixed(2)}<br>Records: ${typedD.sentimentCount}`);
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
          await graphStore.init();
        }
      } catch (e) {
        console.error("Error initializing topic sentiment overview:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false;
      }
    });

    watch([processedData, sortOrder, chartHeight], () => { // Watch chartHeight as well
      if (!isLoading.value) {
        // Ensure chart container is ready for new height
        requestAnimationFrame(() => { // Wait for next frame for DOM update
            drawChart();
        });
      }
    }, { deep: true });

    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && processedData.value.length > 0) {
             requestAnimationFrame(() => {
                drawChart();
            });
        }
    });

    return {
      chartContainer,
      isLoading,
      error,
      processedData,
      sortOrder,
      chartHeight
    };
  },
});
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
