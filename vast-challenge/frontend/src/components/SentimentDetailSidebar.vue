<template>
  <transition name="slide-fade">
    <div v-if="visible" ref="sidebarRef" class="fixed top-20 right-4 h-[80vh] w-96 bg-white shadow-2xl rounded-lg border border-gray-200 flex flex-col z-50">
    <div class="sticky top-0 bg-gray-50 z-10 px-4 py-3 border-b rounded-t-lg flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-800">Sentiment Details</h3>
      <button @click="close" class="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div v-if="data" class="flex-1 overflow-y-auto p-4">
      <div class="mb-4 p-3 bg-indigo-50 rounded-lg">
        <p class="font-semibold text-indigo-800">Sentiment Range: <span class="font-normal">[{{ (data.x0 ?? 0).toFixed(2) }}, {{ (data.x1 ?? 0).toFixed(2) }})</span></p>
        <p class="font-semibold text-indigo-800">Total Count: <span class="font-normal">{{ data.length }}</span></p>
      </div>
      <div v-for="(group, industry) in groupedData" :key="industry" class="mb-4 last:mb-0">
        <h4 class="text-md font-semibold text-gray-100 mb-2 capitalize p-2 rounded-md bg-gray-700">{{ industry }}</h4>
        <ul class="space-y-2 text-sm">
          <li
            v-for="(item, i) in group"
            :key="i"
            class="p-3 bg-gray-50 rounded-md shadow-sm hover:bg-indigo-100 hover:shadow-md transition-all duration-200 cursor-pointer"
            @mouseenter="addHighlight(item)"
            @mouseleave="removeHighlight(item)"
          >
            <p><strong class="text-gray-600">Topic:</strong> {{ item.topic_id }}</p>
            <p><strong class="text-gray-600">Entity:</strong> {{ item.entity_id }}</p>
            <p v-if="item.reason" class="mt-1 text-gray-500 italic">"{{ item.reason }}"</p>
          </li>
        </ul>
      </div>
    </div>
    <div v-else class="p-4 text-sm italic text-gray-500 flex items-center justify-center h-full">
      <p>No data selected.</p>
    </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed, ref } from 'vue';
import type { Bin } from 'd3-array';
import { onClickOutside } from '@vueuse/core';
import { useLinkingStore, HighlightType } from '../stores/linkingStore';

interface DataObject {
  sentiment: number;
  topic_id?: string;
  entity_id?: string;
  topic_industry?: string;
  [key: string]: any;
}

export default defineComponent({
  name: 'SentimentDetailSidebar',
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    data: {
      type: Object as PropType<Bin<DataObject, number> | null>,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const sidebarRef = ref(null);
    const linkingStore = useLinkingStore();

    function close() {
      emit('close');
    }

    onClickOutside(sidebarRef, close);

    const groupedData = computed(() => {
      if (!props.data) return {};
      return props.data.reduce((acc, item) => {
        const industry = item.topic_industry || 'uncategorized';
        if (!acc[industry]) {
          acc[industry] = [];
        }
        acc[industry].push(item);
        return acc;
      }, {} as Record<string, DataObject[]>);
    });

    function addHighlight(item: DataObject) {
      if (item.topic_id) {
        linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: item.topic_id });
      }
      if (item.entity_id) {
        linkingStore.addHoverHighlight({ type: HighlightType.PERSON, value: item.entity_id });
      }
    }

    function removeHighlight(item: DataObject) {
      if (item.topic_id) {
        linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: item.topic_id });
      }
      if (item.entity_id) {
        linkingStore.removeHoverHighlight({ type: HighlightType.PERSON, value: item.entity_id });
      }
    }

    return {
      close,
      groupedData,
      sidebarRef,
      addHighlight,
      removeHighlight,
    };
  },
});
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.15s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.15s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
