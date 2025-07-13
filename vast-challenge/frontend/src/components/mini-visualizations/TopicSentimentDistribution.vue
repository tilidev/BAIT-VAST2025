<template>
  <div class="h-full w-full" ref="el">
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <p class="text-gray-500">Loading data...</p>
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <p class="text-red-500">Error: {{ error }}</p>
    </div>
    <div v-else-if="sentimentData.length > 0" class="h-full w-full">
      <Histogram
        :data="sentimentData"
        :width="width"
        :height="height"
        :margin="{ top: 20, right: 30, bottom: 40, left: 60 }"
        :color="'#6366f1'"
        :bins="10"
        :show-grid-lines="true"
        :show-ticks="true"
      />
    </div>
    <div v-else class="flex items-center justify-center h-full">
      <p class="text-gray-500">No data available for the selected criteria.</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useElementSize } from '@vueuse/core';
import { useGraphStore } from '../../stores/graphStore';
import { useLinkingStore } from '../../stores/linkingStore';
import Histogram from '../charts/Histogram.vue';

export default defineComponent({
  name: 'TopicSentimentDistribution',
  components: {
    Histogram,
  },
  setup() {
    const graphStore = useGraphStore();
    const linkingStore = useLinkingStore();
    const el = ref(null);
    const { width, height } = useElementSize(el);
    const isLoading = ref(true);
    const error = ref<string | null>(null);

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

      let sentimentsToProcess = allSentiments;

      return sentimentsToProcess.flatMap((entity: any) =>
        entity.topic_sentiments
          .filter((topic: any) => {
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

            return topicMatch && inGraphMatch && !topicExcluded && !inGraphExcluded;
          })
          .map((topic: any) => topic.sentiment)
      );
    });

    return {
      sentimentData,
      width,
      height,
      el,
      isLoading,
      error,
    };
  },
});
</script>

<style scoped></style>
