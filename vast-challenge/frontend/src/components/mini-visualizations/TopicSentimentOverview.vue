<template>
  <div class="p-4 border rounded-lg shadow-md bg-white w-full h-full flex flex-col">
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
    <div v-if="isLoading" class="flex-grow flex items-center justify-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="flex-grow flex items-center justify-center text-gray-500">No topic sentiment data found.</div>
    <div v-else ref="chartContainer" class="w-full flex-grow min-h-0"></div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';

export default {
  name: 'TopicSentimentOverview',
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      sortOrder: 'avgSentimentDesc',
      resizeObserver: null,
    };
  },
  computed: {
    processedData() {
      if (!this.graphStore.sentimentPerTopic || this.graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const topicSentimentsMap = {};

      this.graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((ts) => {
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
      switch (this.sortOrder) {
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
    },
    showChart() {
      return !this.isLoading && !this.error && this.processedData.length > 0;
    }
  },
  methods: {
    drawChart() {
      if (!this.$refs.chartContainer || this.processedData.length === 0) {
        if(this.$refs.chartContainer) d3.select(this.$refs.chartContainer).selectAll("*").remove();
        return;
      }
      d3.select(this.$refs.chartContainer).selectAll("*").remove();

      const data = this.processedData;

      const margin = { top: 20, right: 50, bottom: 40, left: 150 }; // Increased left margin for topic IDs
      const width = this.$refs.chartContainer.offsetWidth - margin.left - margin.right;
      const height = this.$refs.chartContainer.offsetHeight - margin.top - margin.bottom;


      const svg = d3.select(this.$refs.chartContainer)
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
            .tickFormat("")
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
          .attr("y", d => y(d.topicId))
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
          const typedD = d;
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
    },
  },
  watch: {
    processedData: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
      immediate: true
    },
    sortOrder() {
      if (this.showChart) {
        this.$nextTick(() => this.drawChart());
      }
    },
    showChart(isShown) {
      if (isShown) {
        this.$nextTick(() => {
          if (this.$refs.chartContainer) {
            this.resizeObserver.observe(this.$refs.chartContainer);
            this.drawChart();
          }
        });
      } else {
        if (this.$refs.chartContainer) {
          this.resizeObserver.unobserve(this.$refs.chartContainer);
        }
      }
    }
  },
  async mounted() {
    this.isLoading = true;
    this.error = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.showChart) {
        this.drawChart();
      }
    });
    try {
      if (this.graphStore.sentimentPerTopic.length === 0) {
        await this.graphStore.init();
      }
    } catch (e) {
      console.error("Error initializing topic sentiment overview:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
    }
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    const tooltip = d3.select("body").select(".tooltip");
    if (!tooltip.empty()) {
      tooltip.remove();
    }
  },
};
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
