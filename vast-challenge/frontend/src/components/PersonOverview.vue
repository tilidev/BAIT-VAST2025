<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Overview Person Activity</h3>
    </div>
    <div class="flex-grow min-h-0">
      <PCPChart
        v-if="lines.length"
        :metrics="metrics"
        :metricLabels="metricLabels"
        :domains="domains"
        :lines="lines"
        class="w-full h-full"
        @hover="onHover"
        @leave="onLeave"
        @reorder-axes="onReorderAxes"
      />
      <div v-else class="flex items-center justify-center h-full text-gray-500 text-sm">
        Loading data...
      </div>
    </div>
  </div>
</template>

<script>
import PCPChart from './PCPChart.vue';

export default {
  name: 'PersonOverview',
  components: { PCPChart },
  props: {
    metrics: Array,
    metricLabels: Object,
    domains: Object,
    lines: Array,
  },
  emits: ['hover', 'leave', 'reorder-axes'],
  methods: {
    onHover(id, event) {
      this.$emit('hover', id, event);
    },
    onLeave() {
      this.$emit('leave');
    },
    onReorderAxes(fromIndex, toIndex) {
      this.$emit('reorder-axes', fromIndex, toIndex);
    },
  },
};
</script>
