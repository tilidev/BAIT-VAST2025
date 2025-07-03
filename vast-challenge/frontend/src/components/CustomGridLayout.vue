<template>
  <div class="h-full">
    <div id="content" class="h-full">
      <GridLayout v-model:layout="layout" :col-num="colNum" :row-height="30" :is-draggable="isDraggable"
        :is-resizable="isResizable" :vertical-compact="true" :use-css-transforms="true" class="h-full">
        <GridItem v-for="item in layout" :key="item.i" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i">
          <span class="remove" @click="removeItem(item.i)">x</span>
          <div class="h-full w-full">
            <component :is="item.component" v-bind="item.props" />
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
import OverallSentimentDistribution from './mini-visualizations/OverallSentimentDistribution.vue';
import PersonSentimentAcrossDatasets from './mini-visualizations/PersonSentimentAcrossDatasets.vue';
import TopicSentimentOverview from './mini-visualizations/TopicSentimentOverview.vue';
import TripDrilldownFilter from './mini-visualizations/TripDrilldownFilter.vue';

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
    OverallSentimentDistribution,
    PersonSentimentAcrossDatasets,
    TopicSentimentOverview,
    TripDrilldownFilter,
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
  background: #eee;
}

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #ccc;
  border: 1px solid black;
  overflow: hidden;
}

.vue-grid-item .remove {
  position: absolute;
  right: 2px;
  top: 0;
  cursor: pointer;
}
</style>
