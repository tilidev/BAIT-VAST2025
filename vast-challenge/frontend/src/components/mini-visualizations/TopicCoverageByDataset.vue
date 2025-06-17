<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Topic Coverage By Dataset</h3>
    <div class="mb-4">
      <label for="topicSelector" class="block text-sm font-medium text-gray-700">Select Topic:</label>
      <select id="topicSelector" v-model="selectedTopicId" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
        <option disabled value="">Please select a topic</option>
        <option v-for="topic in availableTopics" :key="topic" :value="topic">{{ topic }}</option>
      </select>
    </div>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="!selectedTopicId" class="text-center text-gray-500">Please select a topic to see coverage.</div>
    <div v-else-if="processedData.length === 0 && selectedTopicId" class="text-center text-gray-500">No coverage data found for this topic.</div>
    <div v-else ref="chartContainer" class="w-full h-72"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import type { EntityTopicSentiment, TopicSentiment, GraphMembership } from '../../types/entity';

interface IProcessedCoverageData {
  dataset: GraphMembership;
  count: number; // Number of entities discussing/having sentiment on the topic in this dataset
  totalSentimentRecords: number; // Total sentiment records for this topic in this dataset
}

export default defineComponent({
  name: 'TopicCoverageByDataset',
  setup() {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const graphStore = useGraphStore();
    const selectedTopicId = ref<string>('');

    const availableTopics = computed<string[]>(() => {
      if (!graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }
      const topics = new Set<string>();
      graphStore.sentimentPerTopic.forEach((entity: EntityTopicSentiment) => {
        entity.topic_sentiments.forEach((ts: TopicSentiment) => {
          topics.add(ts.topic_id);
        });
      });
      return Array.from(topics).sort();
    });

    const processedData = computed<IProcessedCoverageData[]>(() => {
      if (!selectedTopicId.value || !graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const coverageByDataset: Record<GraphMembership, { entities: Set<string>; sentimentRecords: number }> = {
        jo: { entities: new Set(), sentimentRecords: 0 },
        fi: { entities: new Set(), sentimentRecords: 0 },
        tr: { entities: new Set(), sentimentRecords: 0 },
      };

      graphStore.sentimentPerTopic.forEach((entity: EntityTopicSentiment) => {
        entity.topic_sentiments.forEach((ts: TopicSentiment) => {
          if (ts.topic_id === selectedTopicId.value) {
            if (ts.sentiment === null || ts.sentiment === undefined) return;

            let attributedTo: GraphMembership[] = [];
            if (ts.sentiment_recorded_in?.includes('tr')) attributedTo.push('tr');
            if (ts.sentiment_recorded_in?.includes('fi')) attributedTo.push('fi');
            if (ts.sentiment_recorded_in?.includes('jo') && !ts.sentiment_recorded_in?.includes('tr') && !ts.sentiment_recorded_in?.includes('fi')) {
              attributedTo.push('jo');
            }
            if (attributedTo.length === 0 && ts.sentiment_recorded_in?.includes('jo')) {
                attributedTo.push('jo');
            }
            
            attributedTo.forEach(dataset => {
              coverageByDataset[dataset].entities.add(entity.entity_id);
              coverageByDataset[dataset].sentimentRecords += 1;
            });
          }
        });
      });

      return (['jo', 'fi', 'tr'] as GraphMembership[]).map(dataset => ({
        dataset: dataset,
        count: coverageByDataset[dataset].entities.size,
        totalSentimentRecords: coverageByDataset[dataset].sentimentRecords,
      }));
    });

    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0 || !selectedTopicId.value) {
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = processedData.value;

      const margin = { top: 20, right: 30, bottom: 40, left: 50 };
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(data.map(d => d.dataset))
        .range([0, width])
        .padding(0.4); // Increased padding for fewer bars

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count) || 10]) // Max of entity counts
        .range([height, 0]);

      const color = d3.scaleOrdinal<string>()
        .domain(['jo', 'fi', 'tr'] as GraphMembership[])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      // Y axis
      svg.append("g")
        .call(d3.axisLeft(y).ticks(Math.min(10, d3.max(data, d => d.count) || 10 )).tickFormat(d3.format("d"))); // Integer format for counts

      // Bars
      svg.selectAll(".bar")
        .data(data)
        .join("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.dataset)!)
          .attr("y", d => y(d.count))
          .attr("width", x.bandwidth())
          .attr("height", d => height - y(d.count))
          .attr("fill", d => color(d.dataset));

      // Tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none");

      svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
          const typedD = d as IProcessedCoverageData;
          tooltip
            .classed("hidden", false)
            .html(`Dataset: ${typedD.dataset}<br>Entities: ${typedD.count}<br>Sentiment Records: ${typedD.totalSentimentRecords}`);
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
        if (availableTopics.value.length > 0) {
          // selectedTopicId.value = availableTopics.value[0]; // Auto-select first topic
        }
      } catch (e) {
        console.error("Error initializing topic coverage data:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false;
      }
    });

    watch([processedData, selectedTopicId], () => {
      if (!isLoading.value) drawChart();
    }, { deep: true });

    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && processedData.value.length > 0 && selectedTopicId.value) {
            drawChart();
        } else if (!newIsLoading && chartContainer.value) {
            d3.select(chartContainer.value).selectAll("*").remove(); // Clear if no data for selected topic
        }
    });

    return {
      chartContainer,
      isLoading,
      error,
      selectedTopicId,
      availableTopics,
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
