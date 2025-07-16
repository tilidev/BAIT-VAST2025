<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Topic Sentiments {{filterKey}}</h3>
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
                <div><span class="font-semibold">Hover</span> over cells to see details.</div>
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div><span class="font-semibold">Click</span> on a person or topic to filter.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
    <div class="flex-1 w-full" ref="el">
      <AdjacencyMatrix v-if="width > 0 && height > 0" class="w-full h-full" :data="sentimentMatrixData"
      :rowLabels="personLabels" :colLabels="topicLabels" :colorScale="sentimentColorScaleLinear"
      :cellFilter="filterSentimentCells(filterKey)" :tooltipFormatter="sentimentTooltipFormatter" :width="width"
      :height="height" :highlightedRows="highlightedPeople" :highlightedCols="highlightedTopics"
      @row-label-click="togglePersonHighlight" @col-label-click="toggleTopicHighlight"
      @row-label-mouseover="addPersonHover" @row-label-mouseout="removePersonHover"
      @col-label-mouseover="addTopicHover" @col-label-mouseout="removeTopicHover" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useGraphStore } from '../stores/graphStore';
import { useLinkingStore, HighlightType } from '../stores/linkingStore';
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

    function addPersonHover(personId: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function removePersonHover(personId: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function addTopicHover(topicId: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: topicId });
    }

    function removeTopicHover(topicId: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: topicId });
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
      addPersonHover,
      removePersonHover,
      addTopicHover,
      removeTopicHover,
    };
  },
  data() {
    return {
      sentimentColorScaleLinear,
      showHelp: false,
    };
  },
  computed: {
    sentimentMatrixData(): MatrixCell[] {
      const data: MatrixCell[] = [];
      this.graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((topic) => {
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
      // The entities are already sorted by entity_type in the store
      return this.graphStore.sentimentPerTopic.map((entity) => entity.entity_id);
    },
    topicLabels(): string[] {
      const topics = new Set<string>();
      this.graphStore.sentimentPerTopic.forEach((entity: any) => {
        entity.topic_sentiments.forEach((topic: any) => {
          topics.add(topic.topic_id);
        });
      });
      return Array.from(topics).sort();
    }
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
