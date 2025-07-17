<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Entity Sentiment Consistency</h3>
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
                <div><span class="font-semibold">Click</span> on a person or industry to filter.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
    <div class="flex-grow min-h-0">
      <div v-if="isLoading" class="flex-grow flex items-center justify-center text-gray-500">Loading data...</div>
      <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">Error loading data: {{ error }}</div>
      <div v-else-if="matrixData.length === 0" class="flex-grow flex items-center justify-center text-gray-500">No data available to display matrix.
      </div>
      <div v-else class="w-full h-full" ref="el">
        <AdjacencyMatrix v-if="width > 0 && height > 0" class="flex-auto" :data="matrixData" :rowLabels="rowLabels"
          :colLabels="colLabels" :colorScale="sentimentColorScaleLinear" :tooltipFormatter="matrixTooltipFormatter"
          :cellFilter="filterUndefinedCells" :cellRounded="true" :rotateColLabels="false" :width="width" :height="height"
          :highlightedRows="highlightedPeople" :highlightedCols="selectedIndustries"
          @row-label-click="togglePersonHighlight" @col-label-click="toggleIndustry"
          @row-label-mouseover="addPersonHover" @row-label-mouseout="removePersonHover"
          @col-label-mouseover="addIndustryHover" @col-label-mouseout="removeIndustryHover" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useGraphStore } from '../../stores/graphStore';
import { useLinkingStore, HighlightType } from '../../stores/linkingStore';
import { sentimentColorScaleLinear } from '../../utils/colors';
import AdjacencyMatrix from '../AdjacencyMatrix.vue';
import type { MatrixCell } from '../../types/matrixTypes';

export default defineComponent({
  name: 'EntitySentimentConsistencyMatrix',
  components: {
    AdjacencyMatrix,
  },
  setup() {
    const el = ref(null);
    const { width, height } = useElementSize(el);
    const linkingStore = useLinkingStore();

    const highlightedPeople = computed(() => linkingStore.highlightedPeople);

    const selectedIndustries = computed(() => linkingStore.selectedIndustries);

    function togglePersonHighlight(personId: string) {
      linkingStore.toggleFilter({ type: 'person', value: personId });
    }

    function toggleIndustry(industry: string) {
      linkingStore.toggleFilter({ type: 'industry', value: industry });
    }

    function addPersonHover(personId: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function removePersonHover(personId: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function addIndustryHover(industry: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.INDUSTRY, value: industry });
    }

    function removeIndustryHover(industry: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.INDUSTRY, value: industry });
    }

    return {
      el,
      width,
      height,
      linkingStore,
      highlightedPeople,
      selectedIndustries,
      togglePersonHighlight,
      toggleIndustry,
      addPersonHover,
      removePersonHover,
      addIndustryHover,
      removeIndustryHover,
    };
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
      showHelp: false,
    };
  },
  computed: {
    matrixData(): MatrixCell[] {
      const result: MatrixCell[] = [];
      const entities = this.graphStore.sentimentPerTopic.filter(
        (e: any) => this.entityTypesToShow.includes(e.entity_type)
      );

      entities.forEach((entity: any) => {
        const sentimentsByDataset: { [key: string]: { sum: number; count: number } } = {
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
      return Array.from(new Set(this.matrixData.map(d => d.rowId)));
    },
    colLabels() {
      return this.datasets;
    },
  },
  methods: {
    matrixTooltipFormatter(cell: MatrixCell) {
      return `
        <div class="font-semibold text-blue-700">Entity: ${cell.rowId}</div>
        <div>Dataset: ${cell.colId}</div>
        <div>Sentiment: ${cell.value !== undefined ? cell.value : 'N/A'}</div>
        <div>Count: ${cell.rawData.count}</div>
      `;
    },
    filterUndefinedCells(cell: MatrixCell) {
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
    } catch (e: any) {
      console.error("Error initializing matrix data:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
    }
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
