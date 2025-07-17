<template>
  <div class="h-full w-full flex flex-col p-2">
    <h3 class="text-lg font-semibold text-gray-800 mb-2">Topic Sentiment Distribution</h3>
    <div class="flex-grow" ref="el">
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <p class="text-gray-500">Loading data...</p>
      </div>
      <div v-else-if="error" class="flex items-center justify-center h-full">
        <p class="text-red-500">Error: {{ error }}</p>
      </div>
      <div v-else-if="sentimentData.length > 0 || unfilteredSentimentData.length > 0" class="h-full w-full">
        <Histogram
          :data="sentimentData"
          :background-data="unfilteredSentimentData"
          :width="width"
          :height="height"
          :margin="{ top: 20, right: 30, bottom: 40, left: 60 }"
          :color="sentimentColorScaleLinear"
          :bins="20"
          :show-grid-lines="true"
          :show-ticks="false"
          :fixed-x-domain="[-1, 1.1]"
          :show-density="true"
          density-color="rgba(79, 70, 229, 0.5)"
          background-density-color="rgba(156, 163, 175, 0.3)"
          @bar-click="handleBarClick"
        />
      </div>
      <div v-else class="flex items-center justify-center h-full">
        <p class="text-gray-500">No data available for the selected criteria.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useGraphStore } from '../../stores/graphStore';
import { useLinkingStore } from '../../stores/linkingStore';
import Histogram from '../charts/Histogram.vue';
import { sentimentColorScaleLinear } from '../../utils/colors';
import type { Bin } from 'd3-array';

interface DataObject {
  sentiment: number;
  [key: string]: any;
}

export default defineComponent({
  name: 'TopicSentimentDistribution',
  components: {
    Histogram,
  },
  emits: ['bar-click'],
  setup(props, { emit }) {
    const graphStore = useGraphStore();
    const linkingStore = useLinkingStore();
    const el = ref(null);
    const { width, height } = useElementSize(el);
    const isLoading = ref(true);
    const error = ref<string | null>(null);

    function handleBarClick(data: Bin<DataObject, number>) {
      emit('bar-click', data);
    }

    onMounted(async () => {
      isLoading.value = true;
      error.value = null;
      try {
        if (graphStore.sentimentPerTopic.length === 0) {
          await graphStore.init();
        }
      } catch (e: any) {
        console.error('Error initializing topic sentiment distribution:', e);
        error.value = e.message || 'An unknown error occurred';
      } finally {
        isLoading.value = false;
      }
    });

    const unfilteredSentimentData = computed(() => {
      if (isLoading.value || error.value) return [];
      const allSentiments = graphStore.sentimentPerTopic;
      if (!allSentiments || allSentiments.length === 0) return [];

      return allSentiments.flatMap((entity: any) =>
        entity.topic_sentiments.map((topic: any) => ({
          sentiment: topic.sentiment,
          reason: topic.reason,
          topic_id: topic.topic_id,
          entity_id: entity.entity_id,
          topic_industry: topic.topic_industry,
        }))
      );
    });

    const sentimentData = computed(() => {
      if (isLoading.value || error.value) return [];
      const allSentiments = graphStore.sentimentPerTopic;
      if (!allSentiments || allSentiments.length === 0) return [];

      const topicFilters = linkingStore.activeFilters
        .filter((f) => f.type === 'topic')
        .map((f) => f.value);

      const inGraphFilters = linkingStore.activeFilters
        .filter((f) => f.type === 'in_graph')
        .map((f) => f.value);

      const excludedTopicFilters = linkingStore.excludedFilters
        .filter((f) => f.type === 'topic')
        .map((f) => f.value);

      const excludedInGraphFilters = linkingStore.excludedFilters
        .filter((f) => f.type === 'in_graph')
        .map((f) => f.value);

      const hoveredTopics = linkingStore.hoverHighlights
        .filter((h) => h.type === 'topic')
        .map((h) => h.value);

      const hasActiveFilters =
        topicFilters.length > 0 ||
        inGraphFilters.length > 0 ||
        excludedTopicFilters.length > 0 ||
        excludedInGraphFilters.length > 0 ||
        hoveredTopics.length > 0;

      if (!hasActiveFilters) {
        return unfilteredSentimentData.value;
      }

      return allSentiments.flatMap((entity: any) =>
        entity.topic_sentiments
          .filter((topic: any) => {
            const hoverMatch =
              hoveredTopics.length === 0 ||
              hoveredTopics.includes(topic.topic_id);

            const topicMatch =
              topicFilters.length === 0 ||
              topicFilters.includes(topic.topic_id);

            const inGraphMatch =
              inGraphFilters.length === 0 ||
              inGraphFilters.some((filter) => topic.sentiment_recorded_in.includes(filter));

            const topicExcluded = excludedTopicFilters.includes(topic.topic_id);

            const inGraphExcluded = excludedInGraphFilters.some((filter) =>
              topic.sentiment_recorded_in.includes(filter)
            );

            return hoverMatch && topicMatch && inGraphMatch && !topicExcluded && !inGraphExcluded;
          })
          .map((topic: any) => ({
            sentiment: topic.sentiment,
            reason: topic.reason,
            topic_id: topic.topic_id,
            entity_id: entity.entity_id,
            topic_industry: topic.topic_industry,
          }))
      );
    });

    return {
      sentimentData,
      unfilteredSentimentData,
      width,
      height,
      el,
      isLoading,
      error,
      sentimentColorScaleLinear,
      handleBarClick,
    };
  },
});
</script>

<style scoped></style>
