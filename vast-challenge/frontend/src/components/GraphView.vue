<template>
  <div class="w-full h-full" ref="el">
    <AdjacencyMatrix v-if="width > 0 && height > 0" class="flex-auto" :data="sentimentMatrixData"
      :rowLabels="personLabels" :colLabels="topicLabels" :colorScale="sentimentColorScaleLinear"
      :cellFilter="filterSentimentCells(filterKey)" :tooltipFormatter="sentimentTooltipFormatter" :width="width"
      :height="height" :highlightedRows="highlightedPeople" :highlightedCols="highlightedTopics"
      @row-label-click="togglePersonHighlight" @col-label-click="toggleTopicHighlight" />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useGraphStore } from '../stores/graphStore';
import { useLinkingStore } from '../stores/linkingStore';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import type { MatrixCell } from '../types/matrixTypes';
import { sentimentColorScaleLinear } from '../utils/colors';

export default defineComponent({
  name: 'GraphView',
  components: {
    AdjacencyMatrix,
  },
  props: {
    filterKey: {
      type: String as PropType<'jo' | 'tr' | 'fi'>,
      required: true,
    },
  },
  setup() {
    const graphStore = useGraphStore();
    const linkingStore = useLinkingStore();
    const el = ref(null);
    const { width, height } = useElementSize(el);

    const highlightedPeople = computed(() => linkingStore.highlightedPeople);

    const highlightedTopics = computed(() => linkingStore.highlightedTopics);

    function togglePersonHighlight(personId: string) {
      linkingStore.toggleFilter({ type: 'person', value: personId });
    }

    function toggleTopicHighlight(topicId: string) {
      linkingStore.toggleFilter({ type: 'topic', value: topicId });
    }

    return {
      graphStore,
      linkingStore,
      el,
      width,
      height,
      highlightedPeople,
      highlightedTopics,
      togglePersonHighlight,
      toggleTopicHighlight,
    };
  },
  data() {
    return {
      sentimentColorScaleLinear,
    };
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
