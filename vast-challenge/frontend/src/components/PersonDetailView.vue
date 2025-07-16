<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">
        Dataset Details for
        <span v-if="personName" class="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-lg font-semibold border-2 border-blue-200 shadow-sm ml-2">
          {{ personName }}
        </span>
        <span v-else class="inline-block px-3 py-1 bg-gray-100 text-gray-500 rounded-lg border-2 border-gray-200 ml-2">
          Select a person above
        </span>
      </h3>
      <div v-if="personRole" class="mt-1 text-sm text-gray-600">
        Role: {{ personRole }}
      </div>
    </div>
    <div class="flex-grow min-h-0">
      <PCPChart
        v-if="lines.length"
        :metrics="metrics"
        :metricLabels="metricLabels"
        :domains="domains"
        :lines="lines"
        class="w-full h-full"
        :disable-selection-highlighting="true"
        @reorder-axes="onReorderAxes"
      />
      <div v-else class="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 text-sm">
        Click a line above to view details
      </div>
    </div>
    <div v-if="lines.length" class="mt-3 flex justify-center space-x-4 text-sm">
      <div v-for="ds in datasets" :key="ds" class="flex items-center">
        <span class="w-4 h-2 inline-block mr-1 rounded" :style="{ backgroundColor: detailColors[ds] }"></span>
        <span class="capitalize text-gray-700">{{ ds }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import PCPChart from './PCPChart.vue';

export default {
  name: 'PersonDetailView',
  components: { PCPChart },
  props: {
    personName: String,
    personRole: String,
    metrics: Array,
    metricLabels: Object,
    domains: Object,
    lines: Array,
    datasets: Array,
    detailColors: Object,
  },
  emits: ['reorder-axes'],
  methods: {
    onReorderAxes(fromIndex, toIndex) {
      this.$emit('reorder-axes', fromIndex, toIndex);
    },
  },
};
</script>
