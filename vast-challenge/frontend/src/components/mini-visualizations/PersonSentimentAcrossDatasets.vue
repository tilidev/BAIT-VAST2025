<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Person Sentiment Across Datasets</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="processedData.length === 0" class="text-center text-gray-500">No sentiment data found for this person.</div>
    <div v-else ref="chartContainer" class="w-full h-96"></div>
    <!-- Placeholder for a person selector if needed, or assume personId is passed as prop -->
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';

export default {
  name: 'PersonSentimentAcrossDatasets',
  props: {
    personId: {
      type: String,
      required: true,
    },
    sentimentGranularity: {
      type: String,
      default: 'topic',
    }
  },
  data() {
    return {
      chartContainer: null,
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
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

      const sentimentsByTopicAndDataset = {};

      personData.topic_sentiments.forEach((ts) => {
        if (ts.sentiment === null || ts.sentiment === undefined) return;

        const key = this.sentimentGranularity === 'industry' ? (ts.topic_industry?.join(', ') || 'Unknown Industry') : ts.topic_id;
        
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
          if (!sentimentsByTopicAndDataset[key]) {
            sentimentsByTopicAndDataset[key] = {};
          }
          if (!sentimentsByTopicAndDataset[key][dataset]) {
            sentimentsByTopicAndDataset[key][dataset] = { sum: 0, count: 0 };
          }
          sentimentsByTopicAndDataset[key][dataset].sum += ts.sentiment;
          sentimentsByTopicAndDataset[key][dataset].count += 1;
        });
      });

      const result = [];
      for (const topicKey in sentimentsByTopicAndDataset) {
        for (const dataset in sentimentsByTopicAndDataset[topicKey]) {
          result.push({
            topicId: topicKey,
            dataset: dataset,
            averageSentiment: sentimentsByTopicAndDataset[topicKey][dataset].sum / sentimentsByTopicAndDataset[topicKey][dataset].count,
            count: sentimentsByTopicAndDataset[topicKey][dataset].count,
          });
        }
      }
      return result;
    },
  },
  methods: {
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
    drawChart() {
      const container = this.$refs.chartContainer;
      if (!container || this.processedData.length === 0) {
        if(container) d3.select(container).selectAll("*").remove();
        return;
      }
      d3.select(container).selectAll("*").remove();

      const data = this.processedData;

      const margin = { top: 20, right: 30, bottom: 70, left: 60 };
      const width = container.clientWidth - margin.left - margin.right;
      const height = container.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const groupKeys = Array.from(new Set(data.map(d => d.topicId)));
      const subGroupKeys = Array.from(new Set(data.map(d => d.dataset)));

      const x0 = d3.scaleBand()
        .domain(groupKeys)
        .range([0, width])
        .padding(0.2);

      const x1 = d3.scaleBand()
        .domain(subGroupKeys)
        .range([0, x0.bandwidth()])
        .padding(0.05);

      const y = d3.scaleLinear()
        .domain([-1, 1])
        .range([height, 0]);

      const color = d3.scaleOrdinal()
        .domain(subGroupKeys)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

      // Y axis
      svg.append("g")
        .call(d3.axisLeft(y));
      
      // Y-axis grid lines
      svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .ticks(10)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke-opacity", 0.1);

      // Bars
      svg.append("g")
        .selectAll("g")
        .data(groupKeys)
        .join("g")
          .attr("transform", d => `translate(${x0(d)},0)`)
        .selectAll("rect")
        .data(groupKey => subGroupKeys.map(subGroupKey => {
          return data.find(d => d.topicId === groupKey && d.dataset === subGroupKey) || 
                 { topicId: groupKey, dataset: subGroupKey, averageSentiment: 0, count: 0 };
        }))
        .join("rect")
          .attr("x", d => x1(d.dataset))
          .attr("y", d => y(d.averageSentiment))
          .attr("width", x1.bandwidth())
          .attr("height", d => height - y(d.averageSentiment))
          .attr("fill", d => color(d.dataset));
      
      // Legend
      const legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data(subGroupKeys.slice().reverse())
        .join("g")
          .attr("transform", (d, i) => `translate(0,${i * 20})`);

      legend.append("rect")
          .attr("x", width - 19)
          .attr("width", 19)
          .attr("height", 19)
          .attr("fill", color);

      legend.append("text")
          .attr("x", width - 24)
          .attr("y", 9.5)
          .attr("dy", "0.32em")
          .text(d => d);

      // Tooltip (basic example)
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll("rect")
        .on("mouseover", (event, d) => {
            tooltip
                .classed("hidden", false)
                .html(`Topic: ${d.topicId}<br>Dataset: ${d.dataset}<br>Avg. Sentiment: ${d.averageSentiment.toFixed(2)}<br>Count: ${d.count}`);
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
    personId: {
      handler() {
        // Re-fetch data when personId changes
        this.isLoading = true; // Set loading true to show loading state
        this.fetchDataForDatasets(); // Re-fetch data for the new personId
      },
      immediate: true, // Fetch data immediately on mount with initial personId
    },
    sentimentGranularity: {
      handler() {
        // Re-draw chart when granularity changes, if data is already loaded
        if (!this.isLoading && this.processedData.length > 0) {
          this.$nextTick(() => {
            this.drawChart();
          });
        }
      },
    },
  },
};
</script>

<style scoped>
/* Add any component-specific styles here */
.tooltip {
  /* Tailwind classes are used directly, but you can add more specific styles */
  z-index: 50;
}
</style>

<style scoped>
/* Add any component-specific styles here */
.tooltip {
  /* Tailwind classes are used directly, but you can add more specific styles */
  z-index: 50;
}
</style>
