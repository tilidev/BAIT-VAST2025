<template>
  <div class="h-full">
    <div id="content" class="h-full">
      <GridLayout :ref="setLayoutRef" :layout.sync="layout" :col-num="colNum" :row-height="30" :is-draggable="true"
        :is-resizable="true" :vertical-compact="true" :use-css-transforms="true" class="h-full">
        <GridItem v-for="item in layout" :key="item.i" :ref="e => setItemRef(item, e)" :x="item.x" :y="item.y"
          :w="item.w" :h="item.h" :i="item.i">
          <span class="remove" @click="removeItem(item.i)">x</span>
          <div class="h-full w-full">
            <component :is="item.component" />
          </div>
        </GridItem>
      </GridLayout>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
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
  },
  data() {
    return {
      layout: this.initialLayout,
      colNum: 12,
      layoutRef: {} as any,
      itemRefs: {} as { [key: string]: any },
    };
  },
  methods: {
    setItemRef(item: LayoutItem, e: any) {
      this.itemRefs[item.i] = e;
    },
    setLayoutRef(e: any) {
      this.layoutRef = e;
    },
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
