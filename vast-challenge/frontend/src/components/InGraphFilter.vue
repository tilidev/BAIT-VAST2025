<template>
  <div class="p-4 space-y-6 bg-gray-50 rounded-lg shadow-inner font-sans">
    <div>
      <h3 class="text-sm font-semibold text-gray-600 mb-2">Graph Data</h3>
      <div class="flex rounded-md shadow-sm">
        <label
          v-for="(graph, index) in graphs"
          :key="graph"
          :class="[
            'relative flex-1 px-4 py-2 text-sm font-medium text-center border-gray-200 cursor-pointer focus:z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-base transition-colors duration-150',
            { 'bg-indigo-base text-white hover:bg-indigo-base/90': selectedGraphs.includes(graph) },
            { 'bg-white text-gray-700 hover:bg-gray-100': !selectedGraphs.includes(graph) },
            { 'rounded-l-md': index === 0 },
            { 'rounded-r-md': index === graphs.length - 1 },
            { 'border-r-0': index < graphs.length - 1 }
          ]"
        >
          <input
            type="checkbox"
            name="graph-option"
            :value="graph"
            class="sr-only"
            :checked="selectedGraphs.includes(graph)"
            @change="updateSelectedGraphs(graph)"
          />
          {{ graph.toUpperCase() }}
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch } from 'vue';
import { useLinkingStore, FilterType } from '../stores/linkingStore';

export default defineComponent({
  name: 'InGraphFilter',
  setup() {
    const linkingStore = useLinkingStore();
    const graphs = ['fi', 'tr', 'jo'];
    const selectedGraphs = ref(linkingStore.activeFilters
      .filter(f => f.type === FilterType.IN_GRAPH)
      .map(f => f.value));

    const updateSelectedGraphs = (graph) => {
      linkingStore.toggleFilter({ type: FilterType.IN_GRAPH, value: graph });
    };

    watch(() => linkingStore.activeFilters, (newFilters) => {
      selectedGraphs.value = newFilters
        .filter(f => f.type === FilterType.IN_GRAPH)
        .map(f => f.value);
    }, { deep: true });

    return {
      graphs,
      selectedGraphs,
      updateSelectedGraphs,
    };
  },
});
</script>
