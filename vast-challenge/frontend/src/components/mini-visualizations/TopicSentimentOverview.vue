<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Topic Sentiment Overview</h3>
      <div class="absolute top-2 right-2 z-10">
        <button @mouseover="showHelp = true" @mouseleave="showHelp = false"
          class="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <transition name="fade">
          <div v-if="showHelp"
            class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800">
            <p class="font-bold text-lg mb-3 text-gray-900">Chart Interactions</p>
            <ul class="space-y-3">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" />
                </svg>
                <div><span class="font-semibold">Hover</span> over bars or labels to see details.</div>
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div><span class="font-semibold">Click</span> on a topic label to filter by that topic across the
                  application.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
    <div class="mb-2">
      <label for="sortOrder" class="mr-2 text-sm font-medium text-gray-700">Sort by:</label>
      <select id="sortOrder" v-model="sortOrder" class="py-1 px-2 text-sm border-gray-300 rounded-md">
        <option value="avgSentimentDesc">Avg. Sentiment (High to Low)</option>
        <option value="avgSentimentAsc">Avg. Sentiment (Low to High)</option>
        <option value="peakSentiment">Peak Sentiment per Dataset</option>
        <option value="topicId">Topic ID (A-Z)</option>
        <option value="sentimentCountDesc">No. of Sentiments (High to Low)</option>
      </select>
    </div>
    <div v-if="isLoading" class="flex-grow flex items-center justify-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">Error loading data: {{ error
    }}</div>
    <div v-else-if="processedData.length === 0" class="flex-grow flex items-center justify-center text-gray-500">No
      topic sentiment data found.</div>
    <div v-else ref="chartContainer" class="w-full flex-grow min-h-0"></div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import { useLinkingStore, FilterType } from '../../stores/linkingStore';

export default {
  name: 'TopicSentimentOverview',
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      linkingStore: useLinkingStore(),
      sortOrder: 'avgSentimentDesc',
      resizeObserver: null,
      tooltip: null,
      showHelp: false,
    };
  },
  computed: {
    highlightedTopics() {
      return this.linkingStore.activeFilters
        .filter(f => f.type === FilterType.TOPIC)
        .map(f => f.value);
    },
    selectedInGraphs() {
      return this.linkingStore.selectedInGraphs;
    },
    sentimentData() {
      if (!this.graphStore.sentimentPerTopic || this.graphStore.sentimentPerTopic.length === 0) {
        return [];
      }
      const topicSentimentsMap = {};

      this.graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((ts) => {
          if (ts.sentiment === null || ts.sentiment === undefined) return;

          if (!topicSentimentsMap[ts.topic_id]) {
            topicSentimentsMap[ts.topic_id] = {
              totalSum: 0, totalCount: 0, activeSum: 0, activeCount: 0, sentimentByDataset: {}
            };
          }
          const topic = topicSentimentsMap[ts.topic_id];

          topic.totalSum += ts.sentiment;
          topic.totalCount += 1;

          const sentimentMatchesFilter = this.selectedInGraphs.length === 0 ||
            ts.sentiment_recorded_in.some(d => this.selectedInGraphs.includes(d));

          if (sentimentMatchesFilter) {
            topic.activeSum += ts.sentiment;
            topic.activeCount += 1;
          }

          ts.sentiment_recorded_in.forEach(dataset => {
            if (!topic.sentimentByDataset[dataset]) {
              topic.sentimentByDataset[dataset] = { sum: 0, count: 0 };
            }
            topic.sentimentByDataset[dataset].sum += ts.sentiment;
            topic.sentimentByDataset[dataset].count += 1;
          });
        });
      });

      return Object.entries(topicSentimentsMap).map(([topicId, data]) => {
        const peakSentiment = Object.values(data.sentimentByDataset).reduce((max, current) => {
          const avg = current.count > 0 ? current.sum / current.count : 0;
          return Math.abs(avg) > Math.abs(max) ? avg : max;
        }, 0);

        return {
          topicId,
          totalAverageSentiment: data.totalCount > 0 ? data.totalSum / data.totalCount : 0,
          totalSentimentCount: data.totalCount,
          activeAverageSentiment: data.activeCount > 0 ? data.activeSum / data.activeCount : 0,
          activeSentimentCount: data.activeCount,
          peakSentiment: peakSentiment,
        };
      });
    },
    processedData() {
      let result = [...this.sentimentData];
      switch (this.sortOrder) {
        case 'avgSentimentDesc':
          result.sort((a, b) => b.activeAverageSentiment - a.activeAverageSentiment);
          break;
        case 'avgSentimentAsc':
          result.sort((a, b) => a.activeAverageSentiment - b.activeAverageSentiment);
          break;
        case 'topicId':
          result.sort((a, b) => a.topicId.localeCompare(b.topicId));
          break;
        case 'sentimentCountDesc':
          result.sort((a, b) => b.activeSentimentCount - a.activeSentimentCount);
          break;
        case 'peakSentiment':
          result.sort((a, b) => Math.abs(b.peakSentiment) - Math.abs(a.peakSentiment));
          break;
      }
      return result.slice(0, 20);
    },
    showChart() {
      return !this.isLoading && !this.error && this.processedData.length > 0;
    }
  },
  methods: {
    toggleTopicFilter(topicId) {
      this.linkingStore.toggleFilter({ type: FilterType.TOPIC, value: topicId });
    },
    drawChart() {
      if (!this.$refs.chartContainer || this.processedData.length === 0) {
        if (this.$refs.chartContainer) d3.select(this.$refs.chartContainer).selectAll("*").remove();
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

      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([1, -1]);

      // Y axis (Topic IDs)
      const yAxis = svg.append("g")
        .call(d3.axisLeft(y).tickSize(0));

      yAxis.select(".domain").remove(); // Remove axis line

      yAxis.selectAll(".tick text")
        .attr("class", "cursor-pointer hover:font-bold")
        .style("font-weight", d => this.highlightedTopics.includes(d) ? "bold" : "normal")
        .on("click", (event, d) => this.toggleTopicFilter(d))
        .on("mouseover", (event, d) => {
          const topicData = this.processedData.find(t => t.topicId === d);
          if (!topicData) return;
          this.tooltip
            .classed("hidden", false)
            .html(`<div class="font-semibold text-blue-700">Topic: ${topicData.topicId}</div>
                   <div>Avg. Sentiment (Active): ${topicData.activeAverageSentiment.toFixed(2)} (${topicData.activeSentimentCount} records)</div>
                   <div>Avg. Sentiment (Total): ${topicData.totalAverageSentiment.toFixed(2)} (${topicData.totalSentimentCount} records)</div>`);
        })
        .on("mousemove", (event) => {
          this.tooltip.style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
          this.tooltip.classed("hidden", true);
        });


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

      // Background bars (Total Sentiment) - Sleeve
      svg.selectAll(".bg-bar")
        .data(data)
        .join("rect")
        .attr("class", "bg-bar")
        .attr("y", d => y(d.topicId))
        .attr("x", d => d.totalAverageSentiment < 0 ? x(d.totalAverageSentiment) : x(0))
        .attr("width", d => Math.abs(x(d.totalAverageSentiment) - x(0)))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.totalAverageSentiment))
        .attr("opacity", 0.3);

      // Foreground bars (Active Sentiment)
      const barHeight = y.bandwidth() * 0.6;
      const barYOffset = (y.bandwidth() - barHeight) / 2;
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.topicId) + barYOffset)
        .attr("x", d => d.activeAverageSentiment < 0 ? x(d.activeAverageSentiment) : x(0))
        .attr("width", d => Math.abs(x(d.activeAverageSentiment) - x(0)))
        .attr("height", barHeight)
        .attr("fill", d => colorScale(d.activeAverageSentiment));

      svg.selectAll(".bar, .bg-bar")
        .on("mouseover", (event, d) => {
          this.tooltip
            .classed("hidden", false)
            .html(`<div class="font-semibold text-blue-700">Topic: ${d.topicId}</div>
                   <div>Avg. Sentiment (Active): ${d.activeAverageSentiment.toFixed(2)} (${d.activeSentimentCount} records)</div>
                   <div>Avg. Sentiment (Total): ${d.totalAverageSentiment.toFixed(2)} (${d.totalSentimentCount} records)</div>`);
        })
        .on("mousemove", (event) => {
          this.tooltip.style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => {
          this.tooltip.classed("hidden", true);
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
    highlightedTopics: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
    },
    selectedInGraphs: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
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
    this.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50");

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
    if (this.tooltip) {
      this.tooltip.remove();
    }
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
