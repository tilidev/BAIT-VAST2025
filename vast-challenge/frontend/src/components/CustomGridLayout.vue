<template>
  <div class="h-full">
    <div id="content" class="h-full">
      <!-- eslint-disable-next-line vue/no-v-model-argument -->
      <GridLayout v-model:layout="layout" :col-num="colNum" :row-height="30" :is-draggable="isDraggable"
        :is-resizable="isResizable" :vertical-compact="true" :use-css-transforms="true" class="h-full">
        <GridItem v-for="item in layout" :key="item.i" :i="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-in-out hover:shadow-xl"
          drag-allow-from=".drag-handle" drag-ignore-from=".no-drag">
          <div class="h-full w-full relative">
            <!-- draggable handle -->
            <div class="drag-handle absolute top-2 left-1/2 transform -translate-x-1/2 flex space-x-1 p-1 cursor-move"
              aria-label="Drag handle">
              <span class="block w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
              <span class="block w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
              <span class="block w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"></span>
            </div>

            <!-- remove button -->
            <button @click="removeItem(item.i)"
              class="absolute top-2 right-2 z-10 p-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white transition-colors duration-200"
              aria-label="Remove item">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- item content -->
            <div class="no-drag p-4 h-full w-full">
              <component :is="item.component" v-bind="item.props" />
            </div>
          </div>
        </GridItem>
      </GridLayout>
    </div>
  </div>
</template>


<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout-v3';
import GraphView from './GraphView.vue';
import GeoJsonMap from './GeoJsonMap.vue';
import AdjacencyMatrix from './AdjacencyMatrix.vue';
import IndustrySimilarityHeatmap from './IndustrySimilarityHeatmap.vue';
import TimelineComponent from './TimelineComponent.vue';
import DatasetNodeComparison from './mini-visualizations/DatasetNodeComparison.vue';
import EntitySentimentConsistencyMatrix from './mini-visualizations/EntitySentimentConsistencyMatrix.vue';
import HorizontalBarFilter from './mini-visualizations/HorizontalBarFilter.vue';
import IndustrySentimentBreakdown from './mini-visualizations/IndustrySentimentBreakdown.vue';
import PersonSentimentAcrossDatasets from './mini-visualizations/PersonSentimentAcrossDatasets.vue';
import TopicSentimentOverview from './mini-visualizations/TopicSentimentOverview.vue';
import TripDrilldownFilter from './mini-visualizations/TripDrilldownFilter.vue';
import EgoNetwork from './EgoNetwork.vue';
import TopicSentimentDistribution from './mini-visualizations/TopicSentimentDistribution.vue';


interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  static?: boolean;
  component: string;
  props?: Record<string, any>;
}

export default defineComponent({
  name: 'CustomGridLayout',
  components: {
    GridLayout,
    GridItem,
    GraphView,
    GeoJsonMap,
    AdjacencyMatrix,
    IndustrySimilarityHeatmap,
    TimelineComponent,
    DatasetNodeComparison,
    EntitySentimentConsistencyMatrix,
    HorizontalBarFilter,
    IndustrySentimentBreakdown,
    PersonSentimentAcrossDatasets,
    TopicSentimentOverview,
    TripDrilldownFilter,
    EgoNetwork,
    TopicSentimentDistribution,
  },
  props: {
    initialLayout: {
      type: Array as PropType<LayoutItem[]>,
      required: true,
    },
    isDraggable: {
      type: Boolean,
      default: true,
    },
    isResizable: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      layout: this.initialLayout,
      colNum: 12,
    };
  },
  methods: {
    removeItem(val: string) {
      const index = this.layout.findIndex(item => item.i === val);
      if (index !== -1) {
        this.layout.splice(index, 1);
      }
    },
  },
});
</script>

<style scoped>
.vue-grid-layout {
  @apply transition-all duration-500 ease-in-out;
}

.vue-grid-item.vue-grid-placeholder {
  @apply bg-blue-200 dark:bg-blue-800 rounded-lg opacity-50;
  -webkit-transition: all 300ms ease;
  -moz-transition: all 300ms ease;
  -o-transition: all 300ms ease;
  transition: all 300ms ease;
}

.vue-grid-item:not(.vue-grid-placeholder) {
  @apply border border-gray-200 dark:border-gray-700;
}
</style>
