import { defineStore } from 'pinia';

export const useLinkingStore = defineStore('linking', {
  state: () => ({
    activeFilters: [], // Stores filter options as objects { type: 'island' | 'zone', value: string }
    hoveredFilters: [], // Stores filter options for previewing
    highlightedPlaceIds: [], // Stores place IDs for cross-component highlighting
    brushedPlaces: [], // Stores place names selected by the brush tool
    highlightedTrips: [], // Stores trip IDs for cross-component highlighting
    hoveredPlaceId: null, // Stores the ID of the hovered place on the map
  }),
  actions: {
    setBrushedPlaces(places) {
      this.brushedPlaces = places;
    },
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
    setHighlightedPlaceIds(placeIds) {
      this.highlightedPlaceIds = placeIds;
    },
    setHoveredFilters(filters) {
      this.hoveredFilters = filters;
    },
    setHighlightedTrips(tripIds) {
      this.highlightedTrips = tripIds;
    },
    setHoveredPlaceId(placeId) {
      this.hoveredPlaceId = placeId;
    },
    clearAllFilters() {
      this.activeFilters = [];
      this.brushedPlaces = [];
    },
  },
});
