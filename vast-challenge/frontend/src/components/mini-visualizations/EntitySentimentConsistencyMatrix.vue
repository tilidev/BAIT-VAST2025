<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Entity Sentiment Consistency Matrix</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="matrixData.length === 0" class="text-center text-gray-500">No data available to display matrix.</div>
    <div v-else ref="chartContainer" class="w-full" style="height: 500px;"></div>
    <!-- Consider adding entity type filter (Person/Organization) -->
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import type { EntityTopicSentiment, TopicSentiment, GraphMembership, Entity } from '../../types/entity';

interface IMatrixCell {
  rowId: string; // entity_id
  colId: GraphMembership; // dataset: 'jo', 'fi', 'tr'
  value: number | null; // average sentiment
  count: number; // number of sentiments contributing
  entityType: Entity;
}

export default defineComponent({
  name: 'EntitySentimentConsistencyMatrix',
  props: {
    entityTypesToShow: {
      type: Array as () => Entity[],
      default: () => ['ENTITY_PERSON', 'ENTITY_ORGANIZATION']
    },
    minSentimentCount: { // Minimum number of sentiments for an entity in a dataset to be included
      type: Number,
      default: 1
    }
  },
  setup(props) {
    const chartContainer = ref<HTMLElement | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);
    const graphStore = useGraphStore();

    const datasets: GraphMembership[] = ['jo', 'fi', 'tr'];

    const matrixData = computed<IMatrixCell[]>(() => {
      if (!graphStore.sentimentPerTopic || graphStore.sentimentPerTopic.length === 0) {
        return [];
      }

      const result: IMatrixCell[] = [];
      const entities = graphStore.sentimentPerTopic.filter(
        (e: EntityTopicSentiment) => props.entityTypesToShow.includes(e.entity_type)
      );

      entities.forEach((entity: EntityTopicSentiment) => {
        const sentimentsByDataset: Record<GraphMembership, { sum: number; count: number }> = {
          jo: { sum: 0, count: 0 },
          fi: { sum: 0, count: 0 },
          tr: { sum: 0, count: 0 },
        };

        entity.topic_sentiments.forEach((ts: TopicSentiment) => {
          if (ts.sentiment === null || ts.sentiment === undefined) return;

          let attributedTo: GraphMembership[] = [];
          if (ts.sentiment_recorded_in?.includes('tr')) attributedTo.push('tr');
          if (ts.sentiment_recorded_in?.includes('fi')) attributedTo.push('fi');
          // If only 'jo' and not in 'tr' or 'fi'
          if (ts.sentiment_recorded_in?.includes('jo') && !ts.sentiment_recorded_in?.includes('tr') && !ts.sentiment_recorded_in?.includes('fi')) {
            attributedTo.push('jo');
          }
          // If no specific dataset context but 'jo' is present, attribute to 'jo'
          if (attributedTo.length === 0 && ts.sentiment_recorded_in?.includes('jo')) {
            attributedTo.push('jo');
          }
          
          attributedTo.forEach(dataset => {
            sentimentsByDataset[dataset].sum += ts.sentiment!;
            sentimentsByDataset[dataset].count += 1;
          });
        });

        datasets.forEach(dataset => {
          if (sentimentsByDataset[dataset].count >= props.minSentimentCount) {
            result.push({
              rowId: entity.entity_id,
              colId: dataset,
              value: sentimentsByDataset[dataset].sum / sentimentsByDataset[dataset].count,
              count: sentimentsByDataset[dataset].count,
              entityType: entity.entity_type
            });
          } else {
             result.push({ // Add null value if below threshold, so cell is rendered as "no data"
              rowId: entity.entity_id,
              colId: dataset,
              value: null, // Explicitly null for filtering in D3
              count: 0,
              entityType: entity.entity_type
            });
          }
        });
      });
      return result;
    });

    const rowLabels = computed(() => {
      return Array.from(new Set(matrixData.value.map(d => d.rowId))).sort();
    });

    const colLabels = computed(() => datasets);

    function drawChart() {
      if (!chartContainer.value || matrixData.value.length === 0 || rowLabels.value.length === 0) {
         if(chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }
      d3.select(chartContainer.value).selectAll("*").remove();

      const data = matrixData.value;
      
      const margin = { top: 50, right: 50, bottom: 100, left: 150 }; // Adjusted for labels
      const containerWidth = chartContainer.value.clientWidth;
      const containerHeight = chartContainer.value.clientHeight || 500; // Fallback height

      const width = containerWidth - margin.left - margin.right;
      const height = containerHeight - margin.top - margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .range([0, width])
        .domain(colLabels.value)
        .padding(0.05);

      svg.append("g")
        .style("font-size", 12)
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(0))
        .select(".domain").remove();

      const y = d3.scaleBand()
        .range([height, 0])
        .domain(rowLabels.value)
        .padding(0.05);

      svg.append("g")
        .style("font-size", 10)
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

      const colorScale = d3.scaleSequential(d3.interpolateRdYlBu) // Red-Yellow-Blue: good for sentiment (-1 to 1)
        .domain([1, -1]); // Reversed so positive is blue, negative is red

      // Define patterns for null/undefined values
      svg.append("defs")
        .append("pattern")
        .attr("id", "crosshatch-matrix") // Unique ID
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8)
        .attr("height", 8)
        .append("image")
        .attr("xlink:href", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==")
        .attr("x", 0).attr("y", 0).attr("width", 8).attr("height", 8);
      
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none")
        .style("z-index", "100"); // Ensure tooltip is on top

      svg.selectAll()
        .data(data, (d: any) => d.rowId + ':' + d.colId)
        .join("rect")
          .attr("x", d => x(d.colId)!)
          .attr("y", d => y(d.rowId)!)
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("width", x.bandwidth())
          .attr("height", y.bandwidth())
          .style("fill", d => d.value === null ? "url(#crosshatch-matrix)" : colorScale(d.value))
          .style("stroke-width", 4)
          .style("stroke", "none")
          .style("opacity", 0.8)
        .on("mouseover", function(event, d) {
          d3.select(this).style("opacity", 1).style("stroke", "black");
          const cellData = d as IMatrixCell;
          tooltip
            .classed("hidden", false)
            .html(`Entity: ${cellData.rowId} (${cellData.entityType})<br>Dataset: ${cellData.colId}<br>Avg. Sentiment: ${cellData.value !== null ? cellData.value.toFixed(2) : 'N/A'}<br>Count: ${cellData.count}`);
        })
        .on("mousemove", (event) => {
          tooltip.style("left", (event.pageX + 15) + "px")
                 .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).style("opacity", 0.8).style("stroke", "none");
          tooltip.classed("hidden", true);
        });
      
      // Add title
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 0 - (margin.top / 2) + 10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Entity Sentiment by Dataset");
    }

    onMounted(async () => {
      isLoading.value = true;
      error.value = null;
      try {
        if (graphStore.sentimentPerTopic.length === 0) {
          await graphStore.init();
        }
      } catch (e) {
        console.error("Error initializing matrix data:", e);
        error.value = (e as Error).message || "An unknown error occurred";
      } finally {
        isLoading.value = false;
      }
    });

    watch([matrixData, () => props.entityTypesToShow, () => props.minSentimentCount], () => {
       if (!isLoading.value) drawChart();
    }, { deep: true });
    
    watch(isLoading, (newIsLoading) => {
        if (!newIsLoading && matrixData.value.length > 0) {
            drawChart();
        }
    });


    return {
      chartContainer,
      isLoading,
      error,
      matrixData, // For template debugging if needed
    };
  },
});
</script>

<style scoped>
.tooltip {
  z-index: 50;
}
</style>
