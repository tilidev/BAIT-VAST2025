<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">{{ title }}</h3>
    <div class="mb-3">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Search..."
        class="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    <div v-if="filteredData.length === 0" class="text-center text-gray-500">No data available or matches found.</div>
    <div v-else class="space-y-2">
      <div
        v-for="(item, index) in filteredData"
        :key="index"
        class="flex items-center justify-between group cursor-pointer py-1"
        @click="handleItemClick(item)"
        @mouseover="handleItemHover(item)"
        @mouseleave="handleItemUnhover()"
      >
        <div class="flex-grow flex items-center">
          <span
            class="text-sm font-medium mr-2"
            :class="{ 'text-blue-500 font-bold': isItemSelected(item[labelKey]), 'text-gray-800': !isItemSelected(item[labelKey]) }"
          >
            {{ item[labelKey] }} ({{ item[activeValueKey] }})
          </span>
          <div
            class="relative h-4 bg-gray-400 rounded-sm overflow-hidden"
            :style="{ width: calculateBarWidth(item[totalValueKey]) }"
          >
            <!-- Active bar (neutralBaseColor) -->
            <div
              class="absolute inset-0 transition-all duration-300 ease-out"
              :style="{ width: calculateBarWidth(item[activeValueKey]), backgroundColor: activeColor }"
            ></div>
            <!-- Preview bar (orange) -->
            <div
              class="absolute inset-0 bg-orange-500 transition-all duration-300 ease-out"
              :style="{ width: calculateBarWidth(item[previewValueKey]) }"
            ></div>
          </div>
        </div>
        <button
          v-if="!isItemSelected(item[labelKey])"
          class="ml-3 px-2 py-1 text-xs font-semibold text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          + Add filter
        </button>
        <button
          v-else
          @click.stop="handleItemClick(item)"
          class="ml-3 px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-md"
        >
          - Remove
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useLinkingStore } from '../../stores/linkingStore';

export default {
  name: 'HorizontalBarFilter',
  props: {
    data: {
      type: Array,
      required: true,
    },
    labelKey: {
      type: String,
      required: true,
    },
    totalValueKey: {
      type: String,
      required: true,
    },
    activeValueKey: {
      type: String,
      required: true,
    },
    previewValueKey: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    maxBarValue: {
      type: Number,
      default: null,
    },
    activeColor: { 
      type: String,
      default: '#6366f1',
    },
  },
  emits: ['item-selected', 'item-hover', 'item-unhover'],
  data() {
    return {
      searchQuery: '',
      linkingStore: useLinkingStore(),
    };
  },
  computed: {
    effectiveMaxBarValue() {
      if (this.maxBarValue !== null && this.maxBarValue !== undefined) {
        return this.maxBarValue;
      }
      const maxDataValue = Math.max(...this.data.map(d => d[this.totalValueKey]));
      return maxDataValue > 0 ? maxDataValue : 1;
    },
    filteredData() {
      if (!this.searchQuery) {
        return this.data;
      }
      const query = this.searchQuery.toLowerCase();
      return this.data.filter(item =>
        item[this.labelKey].toLowerCase().includes(query)
      );
    },
  },
  methods: {
    calculateBarWidth(value) {
      const percentage = (value / this.effectiveMaxBarValue) * 100;
      return `${percentage}%`;
    },
    handleItemClick(item) {
      this.$emit('item-selected', item[this.labelKey]);
    },
    handleItemHover(item) {
      this.$emit('item-hover', item[this.labelKey]);
    },
    handleItemUnhover() {
      this.$emit('item-unhover');
    },
    isItemSelected(value) {
      return this.linkingStore.activeFilters.some(
        filter => filter.type === this.labelKey && filter.value === value
      );
    },
  },
};
</script>
