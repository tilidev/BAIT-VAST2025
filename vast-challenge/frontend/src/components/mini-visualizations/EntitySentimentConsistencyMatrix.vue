<template>
  <div class="p-4 border rounded-lg shadow-md bg-white h-full w-full flex flex-col">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Entity Sentiment Consistency Matrix</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="text-center text-red-500">Error loading data: {{ error }}</div>
    <div v-else-if="matrixData.length === 0" class="text-center text-gray-500">No data available to display matrix.
    </div>
    <div v-else class="w-full flex-grow">
      <AdjacencyMatrix :data="matrixData" :rowLabels="rowLabels" :colLabels="colLabels"
        :colorScale="sentimentColorScaleLinear" :tooltipFormatter="matrixTooltipFormatter"
        :cellFilter="filterUndefinedCells" :cellRounded="true" :rotateColLabels="false" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useGraphStore } from '../../stores/graphStore';
import { sentimentColorScaleLinear } from '../../utils/colors';
import AdjacencyMatrix from '../AdjacencyMatrix.vue';
import type { MatrixCell } from '../../types/matrixTypes';

export default defineComponent({
  name: 'EntitySentimentConsistencyMatrix',
  components: {
    AdjacencyMatrix,
  },
  props: {
    entityTypesToShow: {
      type: Array,
      default: () => ['ENTITY_PERSON', 'ENTITY_ORGANIZATION']
    },
    minSentimentCount: { // Minimum number of sentiments for an entity in a dataset to be included
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      datasets: ['jo', 'fi', 'tr'],
      sentimentColorScaleLinear,

    };
  },
  computed: {
    matrixData(): MatrixCell[] {
      const result: MatrixCell[] = [];
      const entities = this.graphStore.sentimentPerTopic.filter(
        (e: any) => this.entityTypesToShow.includes(e.entity_type)
      );

      entities.forEach((entity: any) => {
        const sentimentsByDataset = {
          jo: { sum: 0, count: 0 },
          fi: { sum: 0, count: 0 },
          tr: { sum: 0, count: 0 },
        };

        entity.topic_sentiments.forEach((ts: any) => {
          if (ts.sentiment === null || ts.sentiment === undefined) return;

          let attributedTo: string[] = [];
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
            sentimentsByDataset[dataset].sum += ts.sentiment;
            sentimentsByDataset[dataset].count += 1;
          });
        });

        this.datasets.forEach(dataset => {
          if (sentimentsByDataset[dataset].count >= this.minSentimentCount) {
            result.push({
              rowId: entity.entity_id,
              colId: dataset,
              value: sentimentsByDataset[dataset].sum / sentimentsByDataset[dataset].count,
              rawData: {
                entityType: entity.entity_type,
                count: sentimentsByDataset[dataset].count,
              }
            });
          } else {
            result.push({
              rowId: entity.entity_id,
              colId: dataset,
              value: undefined,
              rawData: {
                entityType: entity.entity_type,
                count: 0,
              }
            });
          }
        });
      });
      return result;
    },
    rowLabels() {
      return Array.from(new Set(this.matrixData.map(d => d.rowId))).sort();
    },
    colLabels() {
      return this.datasets;
    },
  },
  methods: {
    matrixTooltipFormatter(cell) {
      return `
        <div class="font-semibold text-blue-700">Entity: ${cell.rowId}</div>
        <div>Dataset: ${cell.colId}</div>
        <div>Sentiment: ${cell.value !== undefined ? cell.value : 'N/A'}</div>
        <div>Count: ${cell.rawData.count}</div>
      `;
    },
    filterUndefinedCells(cell) {
      return cell.value !== undefined;
    }
  },
  async mounted() {
    this.isLoading = true;
    this.error = null;
    try {
      if (this.graphStore.sentimentPerTopic.length === 0) {
        await this.graphStore.init();
      }
    } catch (e) {
      console.error("Error initializing matrix data:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
    }
  },
});
</script>

<style scoped>
/* Keep existing styles if needed */
</style>
