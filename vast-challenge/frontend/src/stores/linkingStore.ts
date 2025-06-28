import { defineStore } from 'pinia';

export const useLinkingStore = defineStore('linking', {
  state: () => ({
    activeFilters: [], // Stores filter options as objects { type: 'island' | 'zone', value: string }
    hoveredFilters: [], // Stores filter options for previewing
    highlightedPlaces: [], // Stores place names for cross-component highlighting
  }),
  actions: {
    toggleFilter(newFilter) {
      const index = this.activeFilters.findIndex(
        (f) => f.type === newFilter.type && f.value === newFilter.value
      );
      if (index === -1) {
        this.activeFilters.push(newFilter);
      } else {
        this.activeFilters.splice(index, 1);
      }
    },
    setHighlightedPlaces(elements) {
      this.highlightedPlaces = elements;
    },
    setHoveredFilters(filters) {
      this.hoveredFilters = filters;
    },
    clearAllFilters() {
      this.activeFilters = [];
    },
  },
});
