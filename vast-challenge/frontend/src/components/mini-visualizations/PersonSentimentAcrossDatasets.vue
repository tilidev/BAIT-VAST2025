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

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore'; // Assuming graphStore holds /retrieve-sentiments data
import type { EntityTopicSentiment, TopicSentiment } from '../../types/entity'; // Adjust path and types as needed

interface IProcessedSentimentData {
  topicId: string; // Or industry
  dataset: string; // 'jo', 'fi', 'tr'
  averageSentiment: number;
  count: number;
}

export default defineComponent({
  name: 'PersonSentimentAcrossDatasets',
  props: {
    personId: {
      type: String,
      required: true,
    },
    // Optional: Prop to select between topic or industry view
    sentimentGranularity: {
      type: String,
      default: 'topic', // 'topic' or 'industry'
    }
  },
  setup(props) {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const graphStore = useGraphStore();

    const processedData = computed<IProcessedSentimentData[]>(() => {
      if (!graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const personData = graphStore.sentimentPerTopic.find(
        (entity: EntityTopicSentiment) => entity.entity_id === props.personId
      );

      if (!personData) {
        return [];
      }

      const sentimentsByTopicAndDataset: Record<string, Record<string, { sum: number; count: number }>> = {};

      personData.topic_sentiments.forEach((ts: TopicSentiment) => {
        if (ts.sentiment === null || ts.sentiment === undefined) return;

        const key = props.sentimentGranularity === 'industry' ? (ts.topic_industry?.join(', ') || 'Unknown Industry') : ts.topic_id;
        
        // Determine datasets. 'sentiment_recorded_in' can be like ['jo'], ['fi'], ['tr'], ['jo', 'fi'], etc.
        // For simplicity, we'll consider each recorded dataset.
        // A more nuanced approach might be needed if a single sentiment record spans multiple primary datasets.
        // For now, if 'jo', 'fi', 'tr' are present, it's complex. Let's assume primary dataset context.
        // The backend endpoint /industry-pro-contra-sentiments already handles 'dataset' categorization.
        // If using /retrieve-sentiments, we need to infer or simplify.
        // Let's assume sentiment_recorded_in gives the relevant dataset(s).
        // For this example, we'll just pick the first one if multiple, or handle specific cases.
        
        let datasetsToAttribute: string[] = [];
        if (ts.sentiment_recorded_in?.includes('tr')) datasetsToAttribute.push('tr');
        if (ts.sentiment_recorded_in?.includes('fi')) datasetsToAttribute.push('fi');
        if (ts.sentiment_recorded_in?.includes('jo') && !ts.sentiment_recorded_in?.includes('tr') && !ts.sentiment_recorded_in?.includes('fi')) {
          // Only 'jo' if not also in 'tr' or 'fi' to avoid double counting if 'jo' is a general context
          datasetsToAttribute.push('jo');
        }
        if (datasetsToAttribute.length === 0 && ts.sentiment_recorded_in?.includes('jo')) {
            datasetsToAttribute.push('jo'); // Default to 'jo' if no other specific dataset context
        }


        datasetsToAttribute.forEach(dataset => {
          if (!sentimentsByTopicAndDataset[key]) {
            sentimentsByTopicAndDataset[key] = {};
          }
          if (!sentimentsByTopicAndDataset[key][dataset]) {
            sentimentsByTopicAndDataset[key][dataset] = { sum: 0, count: 0 };
          }
          sentimentsByTopicAndDataset[key][dataset].sum += ts.sentiment!;
          sentimentsByTopicAndDataset[key][dataset].count += 1;
        });
      });

      const result: IProcessedSentimentData[] = [];
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
    });

    function drawChart() {
      if (!chartContainer.value || processedData.value.length === 0) {
        // Clear previous chart if any
        if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove(); // Clear previous chart

      const data = processedData.value;

      const margin = { top: 20, right: 30, bottom: 70, left: 60 };
      const width = chartContainer.value.clientWidth - margin.left - margin.right;
      const height = chartContainer.value.clientHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Get unique topics/industries and datasets for scales
      const groupKeys = Array.from(new Set(data.map(d => d.topicId))); // Topics or Industries
      const subGroupKeys = Array.from(new Set(data.map(d => d.dataset))); // Datasets: 'jo', 'fi', 'tr'

      const x0 = d3.scaleBand()
        .domain(groupKeys)
        .range([0, width])
        .padding(0.2);

      const x1 = d3.scaleBand()
        .domain(subGroupKeys)
        .range([0, x0.bandwidth()])
        .padding(0.05);

      const y = d3.scaleLinear()
        .domain([-1, 1]) // Sentiment typically ranges from -1 to 1
        .range([height, 0]);

      const color = d3.scaleOrdinal<string>()
        .domain(subGroupKeys)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c']); // Example colors for 'jo', 'fi', 'tr'

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
            .tickFormat("" as any) // Type assertion for empty string
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
                 { topicId: groupKey, dataset: subGroupKey, averageSentiment: 0, count: 0 }; // Default if no data
        }))
        .join("rect")
          .attr("x", d => x1(d.dataset)!)
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
        .data(subGroupKeys.slice().reverse()) // To match color order
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
            const typedD = d as IProcessedSentimentData; // Type assertion
            tooltip
                .classed("hidden", false)
                .html(`Topic: ${typedD.topicId}<br>Dataset: ${typedD.dataset}<br>Avg. Sentiment: ${typedD.averageSentiment.toFixed(2)}<br>Count: ${typedD.count}`);
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
          // Assuming graphStore.init() fetches this data
          // Or, if not already fetched, trigger a fetch here or ensure it's fetched by a parent component
          await graphStore.init(); // This might fetch all graph store data
        }
        // Data processing is now in computed property `processedData`
      } catch (e) {
        console.error("Error initializing or processing data:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false;
      }
    });

    // Watch for changes in processedData (due to prop changes or store updates) and redraw
    watch([processedData, () => props.personId, () => props.sentimentGranularity], () => {
      if (!isLoading.value) { // Only draw if not in initial loading phase
        drawChart();
      }
    }, { immediate: false, deep: true }); // deep true for processedData if it's complex

    // Also explicitly call drawChart after initial loading is complete and data is ready
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
/* Add any component-specific styles here */
.tooltip {
  /* Tailwind classes are used directly, but you can add more specific styles */
  z-index: 50;
}
</style>
