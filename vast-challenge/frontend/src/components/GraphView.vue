<template>
  <div v-if="isReady" class="flex">
    <AdjacencyMatrix class="flex-auto" :data="sentimentMatrixData" :rowLabels="personLabels" :colLabels="topicLabels"
      :colorScale="sentimentColorScale" :cellFilter="filterSentimentCells('jo')"
      :tooltipFormatter="sentimentTooltipFormatter" />
    <AdjacencyMatrix class="flex-auto" :data="sentimentMatrixData" :rowLabels="personLabels" :colLabels="topicLabels"
      :colorScale="sentimentColorScale" :cellFilter="filterSentimentCells('tr')"
      :tooltipFormatter="sentimentTooltipFormatter" />
    <AdjacencyMatrix class="flex-auto" :data="sentimentMatrixData" :rowLabels="personLabels" :colLabels="topicLabels"
      :colorScale="sentimentColorScale" :cellFilter="filterSentimentCells('fi')"
      :tooltipFormatter="sentimentTooltipFormatter" />
  </div>
  <div v-else>
    Loading...
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useGraphStore } from '../stores/graphStore';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import type { MatrixCell } from '../types/matrixTypes';
import * as d3 from 'd3';

export default defineComponent({
  name: 'GraphView',
  components: {
    AdjacencyMatrix,
  },
  data() {
    return {
      graphStore: useGraphStore(),
      isReady: false,
    };
  },
  async created() {
    await this.graphStore.init();
    this.isReady = true;
  },
  computed: {
    sentimentMatrixData(): MatrixCell[] {
      const data: MatrixCell[] = [];
      this.graphStore.sentimentPerTopic.forEach((entity: any) => {
        entity.topic_sentiments.forEach((topic: any) => {
          data.push({
            rowId: entity.entity_id,
            colId: topic.topic_id,
            value: topic.sentiment,
            rawData: topic, // Store raw data for filtering/tooltip
          });
        });
      });
      return data;
    },
    personLabels(): string[] {
      const persons = new Set<string>();
      this.graphStore.sentimentPerTopic.forEach((entity: any) => {
        persons.add(entity.entity_id);
      });
      return Array.from(persons).sort();
    },
    topicLabels(): string[] {
      const topics = new Set<string>();
      this.graphStore.sentimentPerTopic.forEach((entity: any) => {
        entity.topic_sentiments.forEach((topic: any) => {
          topics.add(topic.topic_id);
        });
      });
      return Array.from(topics).sort();
    },
    sentimentColorScale(): d3.ScaleLinear<string, number> {
      return d3.scaleLinear<string, number>()
        .domain([-1, 0, 1])
        .range(["#d15f5d", "#FFFFFF", "#6a9f58"]);
    },
  },
  methods: {
    filterSentimentCells(filterValue: string): (cell: MatrixCell) => boolean {
      return (cell: MatrixCell): boolean => {
        if (!cell.rawData || !cell.rawData.sentiment_recorded_in) {
          return false;
        }
        return cell.rawData.sentiment_recorded_in.includes(filterValue);
      };
    },
    sentimentTooltipFormatter(cell: MatrixCell): string {
      return `
        <div class="font-semibold text-blue-700">Person: ${cell.rowId}</div>
        <div>Topic: ${cell.colId}</div>
        <div>Sentiment: ${cell.value !== undefined ? cell.value : 'N/A'}</div>
      `;
    },
  },
});
</script>

<style scoped></style>
